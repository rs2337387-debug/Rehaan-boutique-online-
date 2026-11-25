import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import {
  db,
  generateOrderCode,
  initializeDatabase,
  mapDesignRow,
  mapMediaRow,
  mapOrderRow,
  normalizePhone,
} from './server/db.ts';
import { DESIGN_CATEGORIES, ORDER_STATUSES, type DesignCategory, type OrderStatus } from './src/types.ts';

initializeDatabase();

const PORT = 3000;
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const EPHEMERAL_SESSION_SECRET = crypto.randomBytes(32).toString('hex');
function getSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  return envSecret && envSecret.length >= 16 ? envSecret : EPHEMERAL_SESSION_SECRET;
}

function getEnvAdminPasscode(): string | null {
  const raw = process.env.ADMIN_PASSCODE?.trim();
  return raw && raw.length > 0 ? raw : null;
}

function getStoredAdminHash(): string | null {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get('admin_password_hash') as
    | { value: string }
    | undefined;
  return row ? row.value : null;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasswordHash(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, hashHex] = parts;
  if (!salt || !hashHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function safeComparePasscode(input: string, expected: string): boolean {
  const inputDigest = crypto.createHash('sha256').update(input).digest();
  const expectedDigest = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(inputDigest, expectedDigest);
}

function createAdminToken(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: expiresAt })).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  return { token: `${payload}.${sig}`, expiresAt };
}

function verifyAdminToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  if (!payload || !sig) return false;
  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    if (decoded.role !== 'admin' || typeof decoded.exp !== 'number') return false;
    return decoded.exp > Date.now();
  } catch {
    return false;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Invalid or expired admin session.' });
    return;
  }
  next();
}

const ALLOWED_IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const ALLOWED_VIDEO_MIME_TO_EXT: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
      const ext =
        ALLOWED_IMAGE_MIME_TO_EXT[file.mimetype] ||
        ALLOWED_VIDEO_MIME_TO_EXT[file.mimetype] ||
        '';
      if (!ext) {
        cb(new Error('Unsupported file type'), '');
        return;
      }
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 2,
  },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'photo' || file.fieldname === 'image') {
      if (ALLOWED_IMAGE_MIME_TO_EXT[file.mimetype]) {
        cb(null, true);
        return;
      }
      cb(new Error('Photo must be JPG, PNG, or WebP.'));
      return;
    }
    if (file.fieldname === 'video') {
      if (ALLOWED_VIDEO_MIME_TO_EXT[file.mimetype]) {
        cb(null, true);
        return;
      }
      cb(new Error('Video must be MP4, WebM, or MOV.'));
      return;
    }
    if (file.fieldname === 'file') {
      if (ALLOWED_IMAGE_MIME_TO_EXT[file.mimetype] || ALLOWED_VIDEO_MIME_TO_EXT[file.mimetype]) {
        cb(null, true);
        return;
      }
      cb(new Error('Media must be JPG, PNG, WebP, MP4, WebM, or MOV.'));
      return;
    }
    cb(new Error('Unexpected upload field.'));
  },
});

function isValidCategory(value: unknown): value is DesignCategory {
  return typeof value === 'string' && (DESIGN_CATEGORIES as readonly string[]).includes(value);
}

function isValidOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}

function isSafeLocalMediaUrl(url: string): boolean {
  return (
    /^\/src\/assets\/images\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(url) ||
    /^\/uploads\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|mp4|webm|mov)$/i.test(url)
  );
}

function deleteLocalUploadIfOwned(url: string | null): void {
  if (!url || !url.startsWith('/uploads/')) return;
  const filename = path.basename(url);
  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|mp4|webm|mov)$/i.test(filename)) return;
  const resolved = path.resolve(UPLOADS_DIR, filename);
  if (!resolved.startsWith(UPLOADS_DIR + path.sep)) return;
  if (fs.existsSync(resolved)) {
    fs.unlinkSync(resolved);
  }
}

async function startServer(): Promise<void> {
  const app = express();

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  app.get('/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|mp4|webm|mov)$/i.test(filename)) {
      res.status(400).json({ error: 'Invalid filename.' });
      return;
    }
    const resolved = path.resolve(UPLOADS_DIR, filename);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep)) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
    if (!fs.existsSync(resolved)) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }
    res.sendFile(resolved);
  });

  // Public Endpoints
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/settings/public', (_req, res) => {
    const whatsappRow = db.prepare(`SELECT value FROM settings WHERE key = ?`).get('whatsapp_number') as
      | { value: string }
      | undefined;
    res.json({
      whatsappNumber: whatsappRow?.value || '919876543210',
    });
  });

  app.get('/api/designs', (req, res) => {
    const category = req.query.category;
    if (typeof category === 'string' && category !== 'All') {
      if (!isValidCategory(category)) {
        res.status(400).json({ error: 'Invalid category.' });
        return;
      }
      const rows = db
        .prepare(`SELECT * FROM designs WHERE category = ? ORDER BY is_featured DESC, created_at DESC`)
        .all(category) as Record<string, unknown>[];
      res.json({ designs: rows.map(mapDesignRow) });
      return;
    }
    const rows = db
      .prepare(`SELECT * FROM designs ORDER BY is_featured DESC, created_at DESC`)
      .all() as Record<string, unknown>[];
    res.json({ designs: rows.map(mapDesignRow) });
  });

  app.get('/api/media', (_req, res) => {
    const rows = db
      .prepare(`SELECT * FROM media_items ORDER BY created_at DESC`)
      .all() as Record<string, unknown>[];
    res.json({ media: rows.map(mapMediaRow) });
  });

  app.post('/api/orders', (req, res) => {
    const body = req.body as Record<string, unknown>;
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const designId = typeof body.designId === 'string' ? body.designId.trim() : null;
    const designName = typeof body.designName === 'string' ? body.designName.trim() : '';
    const size = typeof body.size === 'string' ? body.size.trim() : '';
    const customInstructions =
      typeof body.customInstructions === 'string' ? body.customInstructions.trim() : '';

    if (customerName.length < 2 || customerName.length > 80) {
      res.status(400).json({ error: 'Please enter a valid full name (2-80 characters).' });
      return;
    }
    const normalized = normalizePhone(phone);
    if (normalized.length < 10 || normalized.length > 15) {
      res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
      return;
    }
    if (address.length < 8 || address.length > 400) {
      res.status(400).json({ error: 'Please enter your complete delivery address including city and PIN code.' });
      return;
    }
    if (designName.length < 2 || designName.length > 140) {
      res.status(400).json({ error: 'Please specify a design name.' });
      return;
    }
    if (size.length < 1 || size.length > 40) {
      res.status(400).json({ error: 'Please select a size or Custom Measurements.' });
      return;
    }
    if (customInstructions.length > 600) {
      res.status(400).json({ error: 'Custom instructions must be under 600 characters.' });
      return;
    }

    let verifiedDesignId: string | null = null;
    if (designId) {
      const found = db.prepare(`SELECT id FROM designs WHERE id = ?`).get(designId) as
        | { id: string }
        | undefined;
      if (found) verifiedDesignId = found.id;
    }

    const id = crypto.randomUUID();
    let orderCode = generateOrderCode();
    const existingCode = db.prepare(`SELECT id FROM orders WHERE order_code = ?`).get(orderCode);
    if (existingCode) {
      orderCode = generateOrderCode();
    }
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO orders (
        id, order_code, customer_name, phone, normalized_phone, address,
        design_id, design_name, size, custom_instructions, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      orderCode,
      customerName,
      phone,
      normalized,
      address,
      verifiedDesignId,
      designName,
      size,
      customInstructions,
      'New Order',
      now,
      now,
    );

    res.status(201).json({
      receipt: {
        orderCode,
        customerName,
        designName,
        size,
        status: 'New Order',
        createdAt: now,
      },
    });
  });

  app.post('/api/orders/track', (req, res) => {
    const body = req.body as Record<string, unknown>;
    const orderCode = typeof body.orderCode === 'string' ? body.orderCode.trim().toUpperCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const normalized = normalizePhone(phone);

    if (!/^RBC-\d{6}$/.test(orderCode) || normalized.length < 10) {
      res.status(400).json({ error: 'Enter a valid Order ID (e.g. RBC-123456) and your 10-digit mobile number.' });
      return;
    }

    const row = db
      .prepare(
        `SELECT order_code, customer_name, design_name, size, status, created_at, updated_at
         FROM orders WHERE order_code = ? AND normalized_phone = ?`,
      )
      .get(orderCode, normalized) as Record<string, unknown> | undefined;

    if (!row) {
      res.status(404).json({ error: 'No matching order found for that Order ID and mobile number.' });
      return;
    }

    res.json({
      order: {
        orderCode: String(row.order_code),
        customerName: String(row.customer_name),
        designName: String(row.design_name),
        size: String(row.size),
        status: String(row.status),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      },
    });
  });

  // Admin Authentication Endpoints
  app.get('/api/admin/auth-status', (_req, res) => {
    const envPasscode = getEnvAdminPasscode();
    const storedHash = getStoredAdminHash();
    res.json({
      configured: Boolean(envPasscode || storedHash),
      envOverride: Boolean(envPasscode),
    });
  });

  app.post('/api/admin/bootstrap', (req, res) => {
    if (getEnvAdminPasscode() || getStoredAdminHash()) {
      res.status(409).json({ error: 'Owner passcode is already configured.' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const password = typeof body.password === 'string' ? body.password : '';
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Owner passcode must be between 8 and 128 characters.' });
      return;
    }
    const hash = hashPassword(password);
    const result = db
      .prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`)
      .run('admin_password_hash', hash);
    if (result.changes === 0) {
      res.status(409).json({ error: 'Owner passcode is already configured.' });
      return;
    }
    const session = createAdminToken();
    res.status(201).json(session);
  });

  app.post('/api/admin/login', (req, res) => {
    const body = req.body as Record<string, unknown>;
    const password = typeof body.password === 'string' ? body.password : '';
    if (!password) {
      res.status(400).json({ error: 'Passcode is required.' });
      return;
    }
    const envPasscode = getEnvAdminPasscode();
    let valid = false;
    if (envPasscode) {
      valid = safeComparePasscode(password, envPasscode);
    } else {
      const storedHash = getStoredAdminHash();
      if (!storedHash) {
        res.status(400).json({ error: 'Owner passcode has not been configured yet.' });
        return;
      }
      valid = verifyPasswordHash(password, storedHash);
    }

    if (!valid) {
      res.status(401).json({ error: 'Incorrect owner passcode.' });
      return;
    }
    const session = createAdminToken();
    res.json(session);
  });

  // Protected Admin Routes
  app.get('/api/admin/orders', requireAdmin, (_req, res) => {
    const rows = db.prepare(`SELECT * FROM orders ORDER BY created_at DESC`).all() as Record<string, unknown>[];
    res.json({ orders: rows.map(mapOrderRow) });
  });

  app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    if (!isValidOrderStatus(body.status)) {
      res.status(400).json({ error: 'Invalid order status.' });
      return;
    }
    const now = new Date().toISOString();
    const result = db
      .prepare(`UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`)
      .run(body.status, now, id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    const updated = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as Record<string, unknown>;
    res.json({ order: mapOrderRow(updated) });
  });

  app.delete('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const result = db.prepare(`DELETE FROM orders WHERE id = ?`).run(id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    res.json({ deleted: true });
  });

  app.post(
    '/api/admin/designs',
    requireAdmin,
    upload.fields([
      { name: 'photo', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
    (req, res) => {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const photoFile = files?.photo?.[0];
      const videoFile = files?.video?.[0];
      const body = req.body as Record<string, unknown>;

      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const category = body.category;
      const description = typeof body.description === 'string' ? body.description.trim() : '';
      const rawPrice = typeof body.price === 'string' ? body.price.trim() : '';
      const existingImageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
      const isFeatured = body.isFeatured === 'true' || body.isFeatured === true ? 1 : 0;

      if (name.length < 2 || name.length > 120) {
        if (photoFile) deleteLocalUploadIfOwned(`/uploads/${photoFile.filename}`);
        if (videoFile) deleteLocalUploadIfOwned(`/uploads/${videoFile.filename}`);
        res.status(400).json({ error: 'Design name must be between 2 and 120 characters.' });
        return;
      }
      if (!isValidCategory(category)) {
        if (photoFile) deleteLocalUploadIfOwned(`/uploads/${photoFile.filename}`);
        if (videoFile) deleteLocalUploadIfOwned(`/uploads/${videoFile.filename}`);
        res.status(400).json({ error: 'Invalid design category.' });
        return;
      }

      let price: number | null = null;
      if (rawPrice.length > 0) {
        const parsed = Number(rawPrice);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10000000) {
          if (photoFile) deleteLocalUploadIfOwned(`/uploads/${photoFile.filename}`);
          if (videoFile) deleteLocalUploadIfOwned(`/uploads/${videoFile.filename}`);
          res.status(400).json({ error: 'Price must be a valid positive amount.' });
          return;
        }
        price = Math.round(parsed);
      }

      let finalImageUrl = '';
      if (photoFile) {
        finalImageUrl = `/uploads/${photoFile.filename}`;
      } else if (isSafeLocalMediaUrl(existingImageUrl)) {
        finalImageUrl = existingImageUrl;
      } else {
        if (videoFile) deleteLocalUploadIfOwned(`/uploads/${videoFile.filename}`);
        res.status(400).json({ error: 'Please upload a valid JPG, PNG, or WebP photo for the design.' });
        return;
      }

      const finalVideoUrl = videoFile ? `/uploads/${videoFile.filename}` : null;
      const id = `dsn-${crypto.randomUUID().slice(0, 12)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO designs (id, name, category, price, description, image_url, video_url, is_featured, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        name,
        category,
        price,
        description.slice(0, 500) || 'Handcrafted custom boutique design tailored to your measurements.',
        finalImageUrl,
        finalVideoUrl,
        isFeatured,
        now,
      );

      const created = db.prepare(`SELECT * FROM designs WHERE id = ?`).get(id) as Record<string, unknown>;
      res.status(201).json({ design: mapDesignRow(created) });
    },
  );

  app.patch('/api/admin/designs/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const existing = db.prepare(`SELECT * FROM designs WHERE id = ?`).get(id) as
      | Record<string, unknown>
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Design not found.' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : String(existing.name);
    const category = body.category !== undefined ? body.category : existing.category;
    const description =
      typeof body.description === 'string' ? body.description.trim() : String(existing.description);

    if (name.length < 2 || name.length > 120) {
      res.status(400).json({ error: 'Design name must be between 2 and 120 characters.' });
      return;
    }
    if (!isValidCategory(category)) {
      res.status(400).json({ error: 'Invalid category.' });
      return;
    }

    let price: number | null =
      existing.price === null || existing.price === undefined ? null : Number(existing.price);
    if (body.price !== undefined) {
      if (body.price === null || body.price === '') {
        price = null;
      } else {
        const parsed = Number(body.price);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10000000) {
          res.status(400).json({ error: 'Price must be a valid positive amount.' });
          return;
        }
        price = Math.round(parsed);
      }
    }

    db.prepare(`UPDATE designs SET name = ?, category = ?, price = ?, description = ? WHERE id = ?`).run(
      name,
      category,
      price,
      description.slice(0, 500),
      id,
    );

    const updated = db.prepare(`SELECT * FROM designs WHERE id = ?`).get(id) as Record<string, unknown>;
    res.json({ design: mapDesignRow(updated) });
  });

  app.delete('/api/admin/designs/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const existing = db.prepare(`SELECT image_url, video_url FROM designs WHERE id = ?`).get(id) as
      | { image_url: string; video_url: string | null }
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Design not found.' });
      return;
    }
    db.prepare(`DELETE FROM designs WHERE id = ?`).run(id);
    deleteLocalUploadIfOwned(existing.image_url);
    deleteLocalUploadIfOwned(existing.video_url);
    res.json({ deleted: true });
  });

  app.post('/api/admin/media', requireAdmin, upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Please choose a photo or video file to upload.' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const category = isValidCategory(body.category) ? body.category : 'New Collection';
    const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';

    if (title.length < 2 || title.length > 100) {
      deleteLocalUploadIfOwned(`/uploads/${file.filename}`);
      res.status(400).json({ error: 'Media title must be 2-100 characters.' });
      return;
    }

    const id = `med-${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    const url = `/uploads/${file.filename}`;

    db.prepare(`
      INSERT INTO media_items (id, title, media_type, url, category, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, title, mediaType, url, category, now);

    const created = db.prepare(`SELECT * FROM media_items WHERE id = ?`).get(id) as Record<string, unknown>;
    res.status(201).json({ media: mapMediaRow(created) });
  });

  app.delete('/api/admin/media/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const existing = db.prepare(`SELECT url FROM media_items WHERE id = ?`).get(id) as
      | { url: string }
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Media item not found.' });
      return;
    }
    db.prepare(`DELETE FROM media_items WHERE id = ?`).run(id);
    deleteLocalUploadIfOwned(existing.url);
    res.json({ deleted: true });
  });

  app.patch('/api/admin/settings', requireAdmin, (req, res) => {
    const body = req.body as Record<string, unknown>;
    const rawWhatsapp = typeof body.whatsappNumber === 'string' ? body.whatsappNumber.replace(/\D/g, '') : '';
    if (rawWhatsapp.length < 10 || rawWhatsapp.length > 15) {
      res.status(400).json({ error: 'Enter a valid WhatsApp number with country code (e.g. 919876543210).' });
      return;
    }
    db.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run('whatsapp_number', rawWhatsapp);
    res.json({ whatsappNumber: rawWhatsapp });
  });

  // Multer & Express error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'Request failed.';
    res.status(400).json({ error: message });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`REHAN BOUTIQUE COLLECTION server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

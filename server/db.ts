import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { DesignCategory, DesignItem, MediaItem, OrderRecord, OrderStatus } from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'boutique.db');
export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS designs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price INTEGER,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    video_url TEXT,
    is_featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_code TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    normalized_phone TEXT NOT NULL,
    address TEXT NOT NULL,
    design_id TEXT,
    design_name TEXT NOT NULL,
    size TEXT NOT NULL,
    custom_instructions TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'New Order',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS media_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    media_type TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

export function initializeDatabase(): void {
  const existingWhatsapp = db.prepare(`SELECT value FROM settings WHERE key = ?`).get('whatsapp_number') as
    | { value: string }
    | undefined;
  if (!existingWhatsapp) {
    db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`).run('whatsapp_number', '919876543210');
  }

  const countRow = db.prepare(`SELECT COUNT(*) AS count FROM designs`).get() as { count: number };
  if (countRow.count === 0) {
    const now = new Date().toISOString();
    const initialDesigns: Array<{
      id: string;
      name: string;
      category: DesignCategory;
      price: number | null;
      description: string;
      imageUrl: string;
      videoUrl: string | null;
      isFeatured: number;
    }> = [
      {
        id: 'dsn-maharani-zardozi',
        name: 'Maharani Peacock Zardozi Bridal Blouse',
        category: 'Bridal Blouse',
        price: 18500,
        description:
          'Deep maroon raw silk bridal blouse hand-embroidered with twin peacock motifs, antique gold dabka, resham, and fine kundan border work.',
        imageUrl: '/src/assets/images/design_bridal_blouse_1795632425573.jpg',
        videoUrl: null,
        isFeatured: 1,
      },
      {
        id: 'dsn-noor-pearl-blouse',
        name: 'Noor Ivory Pearl & Mirror Designer Blouse',
        category: 'Designer Blouse',
        price: 8900,
        description:
          'Ivory raw silk couture blouse finished with delicate freshwater pearl edging, real glass mirror detailing, and custom tailored fit.',
        imageUrl: '/src/assets/images/design_designer_blouse_1795632426260.jpg',
        videoUrl: null,
        isFeatured: 1,
      },
      {
        id: 'dsn-shahi-obsidian-lehenga',
        name: 'Shahi Obsidian & Antique Gold Bridal Lehenga',
        category: 'Lehenga',
        price: 68000,
        description:
          'Handcrafted midnight black silk lehenga featuring dense antique gold zari florals, heavy can-can flare, and scalloped net dupatta.',
        imageUrl: '/src/assets/images/design_royal_lehenga_1795632426884.jpg',
        videoUrl: null,
        isFeatured: 1,
      },
      {
        id: 'dsn-begum-chanderi-suit',
        name: 'Begum Cream Chanderi Gota Patti Suit',
        category: 'Suits',
        price: 14500,
        description:
          'Three-piece warm cream Chanderi silk straight suit paired with hand-worked gota patti neckline and scalloped organza dupatta.',
        imageUrl: '/src/assets/images/design_designer_suit_1795632427146.jpg',
        videoUrl: null,
        isFeatured: 1,
      },
      {
        id: 'dsn-sultana-aari-embroidery',
        name: 'Sultana Zardozi & Pearl Custom Sleeve Embroidery',
        category: 'Embroidery',
        price: null,
        description:
          'Bespoke hand-worked aari, kasab, and pearl embroidery panel crafted directly onto your chosen silk or velvet fabric.',
        imageUrl: '/src/assets/images/design_hand_embroidery_1795632426917.jpg',
        videoUrl: null,
        isFeatured: 1,
      },
      {
        id: 'dsn-royal-velvet-blouse',
        name: 'Zarina Black Velvet Couture Bridal Set',
        category: 'New Collection',
        price: 24500,
        description:
          'Latest festive atelier edition on micro-velvet with full heavy zari sleeve embroidery and matching handloom waist belt.',
        imageUrl: '/src/assets/images/hero_royal_boutique_1795632424197.jpg',
        videoUrl: null,
        isFeatured: 1,
      },
      {
        id: 'dsn-gulbahar-bridal-blouse',
        name: 'Gulbahar Velvet Bridal Maggam Blouse',
        category: 'Bridal Blouse',
        price: 16200,
        description:
          'Custom-stitched princess-cut bridal blouse with intricate maggam threadwork, back tassel detailing, and pure cotton lining.',
        imageUrl: '/src/assets/images/design_bridal_blouse_1795632425573.jpg',
        videoUrl: null,
        isFeatured: 0,
      },
      {
        id: 'dsn-chandni-silk-suit',
        name: 'Chandni Organza & Silk Festive Suit',
        category: 'New Collection',
        price: 16800,
        description:
          'New season ivory gold festive ensemble tailored to custom measurements with hand-embroidered yoke and cuff borders.',
        imageUrl: '/src/assets/images/design_designer_suit_1795632427146.jpg',
        videoUrl: null,
        isFeatured: 0,
      },
    ];

    const insertStmt = db.prepare(`
      INSERT INTO designs (id, name, category, price, description, image_url, video_url, is_featured, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const d of initialDesigns) {
      insertStmt.run(
        d.id,
        d.name,
        d.category,
        d.price,
        d.description,
        d.imageUrl,
        d.videoUrl,
        d.isFeatured,
        now,
      );
    }
  }
}

export function mapDesignRow(row: Record<string, unknown>): DesignItem {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category) as DesignCategory,
    price: row.price === null || row.price === undefined ? null : Number(row.price),
    description: String(row.description),
    imageUrl: String(row.image_url),
    videoUrl: row.video_url ? String(row.video_url) : null,
    isFeatured: Number(row.is_featured) === 1,
    createdAt: String(row.created_at),
  };
}

export function mapOrderRow(row: Record<string, unknown>): OrderRecord {
  return {
    id: String(row.id),
    orderCode: String(row.order_code),
    customerName: String(row.customer_name),
    phone: String(row.phone),
    address: String(row.address),
    designId: row.design_id ? String(row.design_id) : null,
    designName: String(row.design_name),
    size: String(row.size),
    customInstructions: String(row.custom_instructions || ''),
    status: String(row.status) as OrderStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapMediaRow(row: Record<string, unknown>): MediaItem {
  return {
    id: String(row.id),
    title: String(row.title),
    mediaType: String(row.media_type) === 'video' ? 'video' : 'image',
    url: String(row.url),
    category: String(row.category) as DesignCategory,
    createdAt: String(row.created_at),
  };
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) {
    return digits.slice(-10);
  }
  return digits;
}

export function generateOrderCode(): string {
  const rand = crypto.randomInt(100000, 999999);
  return `RBC-${rand}`;
}

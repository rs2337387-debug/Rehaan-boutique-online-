import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Edit3,
  Film,
  Image as ImageIcon,
  Lock,
  LogOut,
  Phone,
  Plus,
  Settings,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import {
  DESIGN_CATEGORIES,
  ORDER_STATUSES,
  type AdminAuthStatus,
  type DesignCategory,
  type DesignItem,
  type MediaItem,
  type OrderRecord,
  type OrderStatus,
} from '../types';
import { SafeImage } from './SafeImage';

interface AdminPanelProps {
  onBackToStore: () => void;
  onCatalogUpdated: () => void;
  whatsappNumber: string;
}

type AdminTab = 'orders' | 'designs' | 'media';

export function AdminPanel({ onBackToStore, onCatalogUpdated, whatsappNumber }: AdminPanelProps) {
  const [authStatus, setAuthStatus] = useState<AdminAuthStatus | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [designs, setDesigns] = useState<DesignItem[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'All' | OrderStatus>('All');
  const [loadingData, setLoadingData] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Design form
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<DesignCategory>('Bridal Blouse');
  const [newPrice, setNewPrice] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [newVideo, setNewVideo] = useState<File | null>(null);
  const [savingDesign, setSavingDesign] = useState(false);

  // Inline edit design price/name
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState<DesignCategory>('Bridal Blouse');

  // Upload standalone photo/video
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaCategory, setMediaCategory] = useState<DesignCategory>('Embroidery');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Boutique WhatsApp number
  const [waInput, setWaInput] = useState(whatsappNumber);
  const [savingWa, setSavingWa] = useState(false);

  useEffect(() => {
    setWaInput(whatsappNumber);
  }, [whatsappNumber]);

  useEffect(() => {
    fetch('/api/admin/auth-status')
      .then((res) => res.json())
      .then((data: AdminAuthStatus) => setAuthStatus(data))
      .catch(() => setAuthStatus({ configured: true, envOverride: false }));
  }, []);

  async function loadAdminData(activeToken: string) {
    setLoadingData(true);
    try {
      const [ordersRes, designsRes, mediaRes] = await Promise.all([
        fetch('/api/admin/orders', {
          headers: { Authorization: `Bearer ${activeToken}` },
        }),
        fetch('/api/designs'),
        fetch('/api/media'),
      ]);
      if (ordersRes.status === 401) {
        setToken(null);
        return;
      }
      const ordersJson = (await ordersRes.json()) as { orders?: OrderRecord[] };
      const designsJson = (await designsRes.json()) as { designs?: DesignItem[] };
      const mediaJson = (await mediaRes.json()) as { media?: MediaItem[] };

      setOrders(ordersJson.orders || []);
      setDesigns(designsJson.designs || []);
      setMediaItems(mediaJson.media || []);
    } catch {
      setFeedback({ type: 'error', text: 'Could not refresh boutique data.' });
    } finally {
      setLoadingData(false);
    }
  }

  async function handleBootstrap(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    if (passcode.length < 8) {
      setAuthError('Passcode must be at least 8 characters.');
      return;
    }
    if (passcode !== confirmPasscode) {
      setAuthError('Passcodes do not match.');
      return;
    }
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passcode }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Could not set owner passcode.');
      }
      setToken(data.token);
      setAuthStatus({ configured: true, envOverride: false });
      setPasscode('');
      setConfirmPasscode('');
      await loadAdminData(data.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Setup failed.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passcode }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Invalid owner passcode.');
      }
      setToken(data.token);
      setPasscode('');
      await loadAdminData(data.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleOrderStatusChange(orderId: string, nextStatus: OrderStatus) {
    if (!token) return;
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = (await res.json()) as { order?: OrderRecord; error?: string };
      if (!res.ok || !data.order) {
        throw new Error(data.error || 'Failed to update status.');
      }
      setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order! : o)));
      setFeedback({ type: 'success', text: `Order ${data.order.orderCode} updated to ${nextStatus}.` });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Update failed.' });
    }
  }

  async function handleAddDesign(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!newPhoto) {
      setFeedback({ type: 'error', text: 'Please select a photo for the new design.' });
      return;
    }
    setSavingDesign(true);
    setFeedback(null);
    try {
      const form = new FormData();
      form.append('name', newName);
      form.append('category', newCategory);
      form.append('price', newPrice);
      form.append('description', newDescription);
      form.append('photo', newPhoto);
      if (newVideo) {
        form.append('video', newVideo);
      }

      const res = await fetch('/api/admin/designs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = (await res.json()) as { design?: DesignItem; error?: string };
      if (!res.ok || !data.design) {
        throw new Error(data.error || 'Could not publish design.');
      }
      setDesigns((prev) => [data.design!, ...prev]);
      setNewName('');
      setNewPrice('');
      setNewDescription('');
      setNewPhoto(null);
      setNewVideo(null);
      setFeedback({ type: 'success', text: `Added "${data.design.name}" to catalog.` });
      onCatalogUpdated();
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed.' });
    } finally {
      setSavingDesign(false);
    }
  }

  async function handleSaveDesignEdit(id: string) {
    if (!token) return;
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/designs/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          category: editCategory,
          price: editPrice.trim() === '' ? null : Number(editPrice),
        }),
      });
      const data = (await res.json()) as { design?: DesignItem; error?: string };
      if (!res.ok || !data.design) {
        throw new Error(data.error || 'Update failed.');
      }
      setDesigns((prev) => prev.map((d) => (d.id === id ? data.design! : d)));
      setEditingId(null);
      setFeedback({ type: 'success', text: `Updated "${data.design.name}".` });
      onCatalogUpdated();
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Update failed.' });
    }
  }

  async function handleDeleteDesign(id: string, name: string) {
    if (!token) return;
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/designs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Could not delete design.');
      }
      setDesigns((prev) => prev.filter((d) => d.id !== id));
      setFeedback({ type: 'success', text: `Removed "${name}" from catalog.` });
      onCatalogUpdated();
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed.' });
    }
  }

  async function handleUploadMedia(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !mediaFile) return;
    setUploadingMedia(true);
    setFeedback(null);
    try {
      const form = new FormData();
      form.append('title', mediaTitle);
      form.append('category', mediaCategory);
      form.append('file', mediaFile);

      const res = await fetch('/api/admin/media', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = (await res.json()) as { media?: MediaItem; error?: string };
      if (!res.ok || !data.media) {
        throw new Error(data.error || 'Could not upload media.');
      }
      setMediaItems((prev) => [data.media!, ...prev]);
      setMediaTitle('');
      setMediaFile(null);
      setFeedback({ type: 'success', text: `Uploaded "${data.media.title}".` });
      onCatalogUpdated();
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed.' });
    } finally {
      setUploadingMedia(false);
    }
  }

  async function handleDeleteMedia(id: string) {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/media/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed.');
      setMediaItems((prev) => prev.filter((m) => m.id !== id));
      setFeedback({ type: 'success', text: 'Media removed.' });
      onCatalogUpdated();
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed.' });
    }
  }

  async function handleSaveWhatsapp(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingWa(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ whatsappNumber: waInput }),
      });
      const data = (await res.json()) as { whatsappNumber?: string; error?: string };
      if (!res.ok || !data.whatsappNumber) {
        throw new Error(data.error || 'Could not update WhatsApp number.');
      }
      setWaInput(data.whatsappNumber);
      setFeedback({ type: 'success', text: 'WhatsApp boutique number updated.' });
      onCatalogUpdated();
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Save failed.' });
    } finally {
      setSavingWa(false);
    }
  }

  const filteredOrders =
    statusFilter === 'All' ? orders : orders.filter((o) => o.status === statusFilter);

  const newOrdersCount = orders.filter((o) => o.status === 'New Order').length;
  const stitchingCount = orders.filter((o) => o.status === 'Stitching' || o.status === 'Confirmed').length;
  const shippedCount = orders.filter((o) => o.status === 'Shipped' || o.status === 'Delivered').length;

  // Unauthenticated View (First-run Owner Setup OR Owner Sign-In)
  if (!token) {
    const needsSetup = authStatus && !authStatus.configured;

    return (
      <div className="min-h-screen bg-[#0D0C0A] text-[#FAF6EE] flex flex-col">
        <header className="border-b border-[#C89B3C]/20 px-4 sm:px-8 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToStore}
            className="min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium text-[#E6C77D] hover:bg-white/5 inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Storefront</span>
          </button>
          <span className="font-royal text-lg tracking-wide text-[#FAF6EE]">
            REHAN BOUTIQUE COLLECTION
          </span>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-[#16130F] border border-[#C89B3C]/30 shadow-2xl space-y-6">
            <div className="space-y-2">
              <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                <Lock className="w-5 h-5" />
              </div>
              <p className="text-xs tracking-[0.2em] uppercase text-[#D4AF37] pt-1">
                Boutique Owner Portal
              </p>
              <h1 className="font-royal text-3xl font-semibold text-[#FAF6EE]">
                {needsSetup ? 'Create Owner Passcode' : 'Admin Sign In'}
              </h1>
              <p className="text-sm text-[#C7BEA9] leading-relaxed">
                {needsSetup
                  ? 'Set your private owner passcode once to protect customer orders, design pricing, and media uploads.'
                  : 'Sign in with your boutique owner passcode to manage customer orders, statuses, designs, and uploads.'}
              </p>
            </div>

            {authError && (
              <div role="alert" className="p-3 rounded-xl bg-[#7F1D1D]/25 border border-[#F87171]/30 text-sm text-[#FCA5A5]">
                {authError}
              </div>
            )}

            {needsSetup ? (
              <form onSubmit={handleBootstrap} className="space-y-4">
                <div>
                  <label htmlFor="owner-new-pass" className="block text-xs uppercase tracking-wider text-[#C7BEA9] mb-1.5">
                    Create Passcode (min 8 chars)
                  </label>
                  <input
                    id="owner-new-pass"
                    type="password"
                    required
                    minLength={8}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter private passcode"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0D0C0A] border border-[#C89B3C]/30 text-sm text-[#FAF6EE] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label htmlFor="owner-confirm-pass" className="block text-xs uppercase tracking-wider text-[#C7BEA9] mb-1.5">
                    Confirm Passcode
                  </label>
                  <input
                    id="owner-confirm-pass"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="Re-enter passcode"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0D0C0A] border border-[#C89B3C]/30 text-sm text-[#FAF6EE] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C6973F] text-[#0D0C0A] font-semibold text-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {authLoading ? 'Securing Portal...' : 'Claim Owner Access'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="owner-pass" className="block text-xs uppercase tracking-wider text-[#C7BEA9] mb-1.5">
                    Owner Passcode
                  </label>
                  <input
                    id="owner-pass"
                    type="password"
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter owner passcode"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0D0C0A] border border-[#C89B3C]/30 text-sm text-[#FAF6EE] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C6973F] text-[#0D0C0A] font-semibold text-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {authLoading ? 'Verifying...' : 'Unlock Admin Panel'}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#161310] pb-16">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-30 bg-[#0D0C0A] text-[#FAF6EE] border-b border-[#C89B3C]/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToStore}
              className="min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium text-[#E6C77D] hover:bg-white/5 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Storefront</span>
            </button>
            <span className="font-royal text-lg sm:text-xl font-semibold tracking-wide truncate">
              Admin Workspace
            </span>
          </div>

          <button
            type="button"
            onClick={() => setToken(null)}
            className="min-h-[44px] px-3.5 py-2 rounded-lg border border-[#C89B3C]/35 text-xs font-medium text-[#FAF6EE] hover:bg-white/10 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-[#D4AF37]" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#C89B3C]/25">
            <p className="text-xs uppercase tracking-wider text-[#6E6251]">Total Orders</p>
            <p className="mt-1 font-royal text-3xl font-semibold tabular-nums text-[#12100D]">
              {orders.length}
            </p>
          </div>
          <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#C89B3C]/25">
            <p className="text-xs uppercase tracking-wider text-[#6E6251]">New Orders</p>
            <p className="mt-1 font-royal text-3xl font-semibold tabular-nums text-[#8A641E]">
              {newOrdersCount}
            </p>
          </div>
          <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#C89B3C]/25">
            <p className="text-xs uppercase tracking-wider text-[#6E6251]">In Stitching</p>
            <p className="mt-1 font-royal text-3xl font-semibold tabular-nums text-[#12100D]">
              {stitchingCount}
            </p>
          </div>
          <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#C89B3C]/25">
            <p className="text-xs uppercase tracking-wider text-[#6E6251]">Shipped / Delivered</p>
            <p className="mt-1 font-royal text-3xl font-semibold tabular-nums text-[#12100D]">
              {shippedCount}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-[#C89B3C]/25">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`min-h-[44px] px-4 py-2.5 rounded-t-xl text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              activeTab === 'orders'
                ? 'bg-[#12100D] text-[#FAF6EE]'
                : 'text-[#5E5445] hover:text-[#12100D] hover:bg-[#F2E9D8]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Orders ({orders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('designs')}
            className={`min-h-[44px] px-4 py-2.5 rounded-t-xl text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              activeTab === 'designs'
                ? 'bg-[#12100D] text-[#FAF6EE]'
                : 'text-[#5E5445] hover:text-[#12100D] hover:bg-[#F2E9D8]'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Designs & Prices ({designs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`min-h-[44px] px-4 py-2.5 rounded-t-xl text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              activeTab === 'media'
                ? 'bg-[#12100D] text-[#FAF6EE]'
                : 'text-[#5E5445] hover:text-[#12100D] hover:bg-[#F2E9D8]'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Photos, Videos & Settings</span>
          </button>
        </div>

        {feedback && (
          <div
            role="status"
            className={`p-3.5 rounded-xl border text-sm font-medium ${
              feedback.type === 'success'
                ? 'bg-[#ECFDF5] border-[#10B981]/30 text-[#065F46]'
                : 'bg-[#FEF2F2] border-[#EF4444]/30 text-[#991B1B]'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* TAB 1: ORDERS */}
        {activeTab === 'orders' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {(['All', ...ORDER_STATUSES] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    statusFilter === status
                      ? 'bg-[#12100D] text-[#FAF6EE]'
                      : 'bg-white border border-[#C89B3C]/25 text-[#4A4236] hover:bg-[#F2E9D8]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {loadingData ? (
              <p className="text-sm text-[#6E6251] py-8">Loading orders...</p>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white border border-[#C89B3C]/25 text-center space-y-1">
                <p className="font-royal text-2xl font-semibold text-[#12100D]">No orders found</p>
                <p className="text-sm text-[#6E6251]">
                  New customer orders placed on the storefront will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredOrders.map((order) => (
                  <article
                    key={order.id}
                    className="p-5 rounded-2xl bg-white border border-[#C89B3C]/25 space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#C89B3C]/15">
                      <div>
                        <p className="text-xs text-[#6E6251] tabular-nums">
                          {order.orderCode} ·{' '}
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                        <h3 className="font-royal text-2xl font-semibold text-[#12100D] mt-0.5">
                          {order.customerName}
                        </h3>
                      </div>

                      <select
                        aria-label={`Update status for ${order.orderCode}`}
                        value={order.status}
                        onChange={(e) => handleOrderStatusChange(order.id, e.target.value as OrderStatus)}
                        className="min-h-[40px] px-3 py-2 rounded-lg bg-[#FAF6EE] border border-[#C89B3C]/40 text-xs font-semibold text-[#12100D] focus:outline-none focus:border-[#8A641E] cursor-pointer"
                      >
                        {ORDER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-[#6E6251] block">
                          Design & Size
                        </span>
                        <span className="font-semibold text-[#12100D]">
                          {order.designName} · {order.size}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div>
                          <span className="text-xs uppercase tracking-wider text-[#6E6251] block">
                            Phone Number
                          </span>
                          <a
                            href={`tel:${order.phone}`}
                            className="font-medium text-[#8A641E] hover:underline tabular-nums inline-flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>{order.phone}</span>
                          </a>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs uppercase tracking-wider text-[#6E6251] block">
                          Delivery Address
                        </span>
                        <span className="text-[#362F26]">{order.address}</span>
                      </div>

                      {order.customInstructions && (
                        <div className="p-3 rounded-xl bg-[#FAF6EE] border border-[#C89B3C]/20">
                          <span className="text-xs uppercase tracking-wider text-[#8A641E] block mb-0.5">
                            Custom Stitching Notes
                          </span>
                          <p className="text-xs text-[#362F26] leading-relaxed">
                            {order.customInstructions}
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: DESIGNS & PRICING */}
        {activeTab === 'designs' && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Add Design Form */}
            <form
              onSubmit={handleAddDesign}
              className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-white border border-[#C89B3C]/25 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#8A641E]" />
                <h2 className="font-royal text-2xl font-semibold text-[#12100D]">
                  Add New Design
                </h2>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4236] mb-1">
                  Design Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Padmavati Zari Bridal Blouse"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF6EE] border border-[#12100D]/15 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4236] mb-1">
                    Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as DesignCategory)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#FAF6EE] border border-[#12100D]/15 text-sm"
                  >
                    {DESIGN_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4236] mb-1">
                    Price in ₹ (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="Leave blank if on request"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF6EE] border border-[#12100D]/15 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4236] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Fabric, embroidery technique, sleeve & neckline details..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6EE] border border-[#12100D]/15 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4236] mb-1">
                  Design Photo (JPG, PNG, WebP) *
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={(e) => setNewPhoto(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#4A4236] file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#12100D] file:text-[#FAF6EE] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4236] mb-1">
                  Design Video Reel (Optional MP4/WebM)
                </label>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => setNewVideo(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#4A4236] file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#F2E9D8] file:text-[#12100D] cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={savingDesign}
                className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#12100D] hover:bg-[#26211A] text-[#FAF6EE] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                {savingDesign ? 'Publishing...' : 'Publish Design to Gallery'}
              </button>
            </form>

            {/* Existing Designs List */}
            <div className="lg:col-span-7 space-y-3">
              {designs.map((design) => {
                const isEditing = editingId === design.id;
                return (
                  <div
                    key={design.id}
                    className="p-4 rounded-2xl bg-white border border-[#C89B3C]/25 flex flex-col sm:flex-row gap-4"
                  >
                    <SafeImage
                      src={design.imageUrl}
                      alt={design.name}
                      className="w-full sm:w-24 h-40 sm:h-28 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      {isEditing ? (
                        <div className="space-y-2.5">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-[#12100D]/20 text-sm"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value as DesignCategory)}
                              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#12100D]/20 text-xs"
                            >
                              {DESIGN_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="0"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              placeholder="Price (optional)"
                              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#12100D]/20 text-xs tabular-nums"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveDesignEdit(design.id)}
                              className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[#12100D] text-[#FAF6EE] text-xs font-semibold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="min-h-[36px] px-3.5 py-1.5 rounded-lg border border-[#12100D]/20 text-xs font-medium cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs text-[#8A641E] font-medium">
                                {design.category}
                                {design.videoUrl ? ' · Includes Video' : ''}
                              </p>
                              <h3 className="font-royal text-xl font-semibold text-[#12100D] truncate">
                                {design.name}
                              </h3>
                              <p className="text-sm font-semibold text-[#4A4236] tabular-nums mt-0.5">
                                {design.price !== null
                                  ? `₹${design.price.toLocaleString('en-IN')}`
                                  : 'Price on Request'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                aria-label={`Edit ${design.name}`}
                                onClick={() => {
                                  setEditingId(design.id);
                                  setEditName(design.name);
                                  setEditCategory(design.category);
                                  setEditPrice(design.price !== null ? String(design.price) : '');
                                }}
                                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-[#12100D]/15 text-[#4A4236] hover:bg-[#F2E9D8] cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete ${design.name}`}
                                onClick={() => handleDeleteDesign(design.id, design.name)}
                                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-[#991B1B]/20 text-[#991B1B] hover:bg-[#FEF2F2] cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-[#6E6251] line-clamp-2">{design.description}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 3: MEDIA UPLOAD & SETTINGS */}
        {activeTab === 'media' && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 space-y-6">
              {/* Upload Photo or Video */}
              <form
                onSubmit={handleUploadMedia}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-[#C89B3C]/25 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#8A641E]" />
                  <h2 className="font-royal text-2xl font-semibold text-[#12100D]">
                    Upload Boutique Photo or Video
                  </h2>
                </div>
                <p className="text-xs text-[#6E6251]">
                  Showcase behind-the-scenes embroidery videos, fabric swatches, or new bridal looks on the storefront.
                </p>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4236] mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={mediaTitle}
                    onChange={(e) => setMediaTitle(e.target.value)}
                    placeholder="e.g. Zardozi Handwork Close-up Reel"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF6EE] border border-[#12100D]/15 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4236] mb-1">
                    Category
                  </label>
                  <select
                    value={mediaCategory}
                    onChange={(e) => setMediaCategory(e.target.value as DesignCategory)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#FAF6EE] border border-[#12100D]/15 text-sm"
                  >
                    {DESIGN_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4236] mb-1">
                    Select Photo or Video File *
                  </label>
                  <input
                    type="file"
                    required
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                    onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-[#4A4236] file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#12100D] file:text-[#FAF6EE] cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploadingMedia}
                  className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#12100D] hover:bg-[#26211A] text-[#FAF6EE] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                >
                  {uploadingMedia ? 'Uploading...' : 'Upload to Lookbook'}
                </button>
              </form>

              {/* Boutique WhatsApp Setting */}
              <form
                onSubmit={handleSaveWhatsapp}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-[#C89B3C]/25 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#8A641E]" />
                  <h2 className="font-royal text-2xl font-semibold text-[#12100D]">
                    WhatsApp Order Number
                  </h2>
                </div>
                <p className="text-xs text-[#6E6251]">
                  Include country code without + (e.g. 919876543210 for India). All customer WhatsApp order buttons link directly here.
                </p>
                <input
                  type="tel"
                  required
                  value={waInput}
                  onChange={(e) => setWaInput(e.target.value)}
                  placeholder="919876543210"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF6EE] border border-[#12100D]/15 text-sm tabular-nums"
                />
                <button
                  type="submit"
                  disabled={savingWa}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C6973F] text-[#0D0C0A] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                >
                  {savingWa ? 'Saving...' : 'Save WhatsApp Number'}
                </button>
              </form>
            </div>

            {/* Uploaded Media Grid */}
            <div className="lg:col-span-7">
              {mediaItems.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-[#C89B3C]/25 text-center space-y-1">
                  <p className="font-royal text-2xl font-semibold text-[#12100D]">
                    No lookbook uploads yet
                  </p>
                  <p className="text-sm text-[#6E6251]">
                    Upload bespoke embroidery photos or reels using the form to feature them on the customer gallery.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {mediaItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl overflow-hidden bg-white border border-[#C89B3C]/25"
                    >
                      <div className="aspect-[4/3] bg-[#0D0C0A]">
                        {item.mediaType === 'video' ? (
                          <video
                            src={item.url}
                            controls
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <SafeImage
                            src={item.url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="p-3.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-[#8A641E]">
                            {item.category} · {item.mediaType === 'video' ? 'Video' : 'Photo'}
                          </p>
                          <p className="font-medium text-sm text-[#12100D] truncate">{item.title}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(item.id)}
                          aria-label={`Delete ${item.title}`}
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#991B1B] hover:bg-[#FEF2F2] cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

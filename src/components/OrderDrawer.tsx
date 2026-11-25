import { useEffect, useState } from 'react';
import { Check, Copy, MessageCircle, Truck, X } from 'lucide-react';
import { SIZE_OPTIONS, type DesignItem, type OrderReceipt } from '../types';
import { SafeImage } from './SafeImage';

interface OrderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDesign: DesignItem | null;
  allDesigns: DesignItem[];
  whatsappNumber: string;
}

export function OrderDrawer({
  isOpen,
  onClose,
  selectedDesign,
  allDesigns,
  whatsappNumber,
}: OrderDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [designId, setDesignId] = useState<string>('');
  const [designName, setDesignName] = useState('');
  const [size, setSize] = useState<string>('M (36)');
  const [customInstructions, setCustomInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setReceipt(null);
      if (selectedDesign) {
        setDesignId(selectedDesign.id);
        setDesignName(selectedDesign.name);
      } else if (allDesigns.length > 0 && !designName) {
        setDesignId(allDesigns[0].id);
        setDesignName(allDesigns[0].name);
      } else if (!designName) {
        setDesignId('');
        setDesignName('Custom Couture Stitching');
      }
    }
  }, [isOpen, selectedDesign, allDesigns]);

  if (!isOpen) return null;

  const activeDesignObj = allDesigns.find((d) => d.id === designId) || selectedDesign;

  const buildWhatsAppHref = (confirmedCode?: string) => {
    const cleanNumber = whatsappNumber.replace(/\D/g, '') || '919876543210';
    const lines = [
      'Namaste *REHAN BOUTIQUE COLLECTION*,',
      confirmedCode ? `Order Reference: *${confirmedCode}*` : 'I would like to place a boutique order:',
      `• Design: ${designName || 'Custom Stitching'}`,
      activeDesignObj?.price ? `• Listed Price: ₹${activeDesignObj.price.toLocaleString('en-IN')}` : '',
      `• Size: ${size}`,
      customerName ? `• Name: ${customerName}` : '',
      phone ? `• Mobile: ${phone}` : '',
      address ? `• Delivery Address: ${address}` : '',
      customInstructions ? `• Custom Instructions: ${customInstructions}` : '',
      'Please confirm availability & delivery timeline (All India Courier).',
    ].filter(Boolean);
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          phone,
          address,
          designId: designId || null,
          designName,
          size,
          customInstructions,
        }),
      });
      const data = (await res.json()) as { receipt?: OrderReceipt; error?: string };
      if (!res.ok || !data.receipt) {
        throw new Error(data.error || 'Could not place your order. Please check your details.');
      }
      setReceipt(data.receipt);
      setCustomerName('');
      setPhone('');
      setAddress('');
      setCustomInstructions('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[#0D0C0A]/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-drawer-title"
    >
      <div className="relative w-full md:max-w-2xl max-h-[92vh] overflow-y-auto bg-[#FAF6EE] text-[#161310] rounded-t-3xl md:rounded-2xl border border-[#C89B3C]/35 shadow-2xl">
        {/* Mobile grab handle */}
        <div className="md:hidden w-12 h-1.5 bg-[#C89B3C]/40 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-7 py-4 bg-[#FAF6EE]/95 backdrop-blur-md border-b border-[#C89B3C]/20">
          <div>
            <p className="text-xs tracking-[0.16em] uppercase text-[#8A641E] font-medium">
              Custom Boutique Order
            </p>
            <h2 id="order-drawer-title" className="font-royal text-2xl sm:text-3xl font-semibold text-[#12100D]">
              {receipt ? 'Order Confirmed' : 'Place Your Order'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order form"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-[#12100D]/15 text-[#12100D] hover:bg-[#12100D] hover:text-[#FAF6EE] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-7">
          {receipt ? (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-[#12100D] text-[#FAF6EE] border border-[#C89B3C]/40">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs tracking-widest uppercase text-[#D4AF37]">
                      Order Reference ID
                    </p>
                    <p className="mt-1 font-royal text-3xl font-semibold tracking-wide tabular-nums text-[#FAF6EE]">
                      {receipt.orderCode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(receipt.orderCode)}
                    className="min-h-[44px] px-3.5 py-2 rounded-lg border border-[#C89B3C]/40 text-xs font-medium text-[#E6C77D] hover:bg-[#C89B3C] hover:text-[#0D0C0A] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied' : 'Copy ID'}</span>
                  </button>
                </div>

                <div className="mt-5 pt-4 border-t border-[#C89B3C]/20 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-[#C7BEA9]">Customer</p>
                    <p className="font-medium mt-0.5">{receipt.customerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#C7BEA9]">Status</p>
                    <p className="font-medium mt-0.5 text-[#E6C77D]">{receipt.status}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-[#C7BEA9]">Selected Design & Size</p>
                    <p className="font-medium mt-0.5">
                      {receipt.designName} · {receipt.size}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-[#4A4236] leading-relaxed">
                Save your Order ID (<span className="font-semibold text-[#12100D] tabular-nums">{receipt.orderCode}</span>) to track stitching and courier status anytime. Our atelier team will also reach out on your mobile number to confirm measurements.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={buildWhatsAppHref(receipt.orderCode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-[#12100D] text-[#FAF6EE] hover:bg-[#231F19] font-medium text-sm inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-[#D4AF37]" />
                  <span>Share Confirmation on WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[48px] px-5 py-3 rounded-xl border border-[#12100D]/20 text-sm font-medium text-[#12100D] hover:bg-[#F2E9D8] transition-colors cursor-pointer"
                >
                  Back to Gallery
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Selected Design Preview */}
              {activeDesignObj && (
                <div className="flex items-center gap-4 p-3.5 rounded-xl bg-[#F2E9D8]/70 border border-[#C89B3C]/25">
                  <SafeImage
                    src={activeDesignObj.imageUrl}
                    alt={activeDesignObj.name}
                    className="w-16 h-20 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#8A641E] font-medium">
                      {activeDesignObj.category}
                    </p>
                    <p className="font-royal text-lg font-semibold text-[#12100D] truncate">
                      {activeDesignObj.name}
                    </p>
                    <p className="text-sm font-medium text-[#4A4236] tabular-nums mt-0.5">
                      {activeDesignObj.price !== null
                        ? `₹${activeDesignObj.price.toLocaleString('en-IN')}`
                        : 'Price on Request'}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-[#7F1D1D]/10 border border-[#7F1D1D]/30 text-sm text-[#7F1D1D] font-medium"
                >
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="order-name" className="block text-xs font-semibold uppercase tracking-wider text-[#4A4236] mb-1.5">
                    Your Full Name *
                  </label>
                  <input
                    id="order-name"
                    type="text"
                    required
                    maxLength={80}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ananya Sharma"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white border border-[#12100D]/20 text-sm text-[#12100D] placeholder:text-[#8E8372] focus:outline-none focus:border-[#B8872E] focus:ring-2 focus:ring-[#B8872E]/20"
                  />
                </div>

                <div>
                  <label htmlFor="order-phone" className="block text-xs font-semibold uppercase tracking-wider text-[#4A4236] mb-1.5">
                    Mobile Number (WhatsApp) *
                  </label>
                  <input
                    id="order-phone"
                    type="tel"
                    required
                    maxLength={20}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white border border-[#12100D]/20 text-sm text-[#12100D] tabular-nums placeholder:text-[#8E8372] focus:outline-none focus:border-[#B8872E] focus:ring-2 focus:ring-[#B8872E]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="order-design-select" className="block text-xs font-semibold uppercase tracking-wider text-[#4A4236] mb-1.5">
                    Design Name *
                  </label>
                  <select
                    id="order-design-select"
                    value={designId || '__custom__'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        setDesignId('');
                        setDesignName('');
                      } else {
                        const found = allDesigns.find((d) => d.id === val);
                        setDesignId(val);
                        if (found) setDesignName(found.name);
                      }
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white border border-[#12100D]/20 text-sm text-[#12100D] focus:outline-none focus:border-[#B8872E] focus:ring-2 focus:ring-[#B8872E]/20"
                  >
                    {allDesigns.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                    <option value="__custom__">Custom Stitching / Other Design</option>
                  </select>
                  {(!designId || designId === '__custom__') && (
                    <input
                      type="text"
                      required
                      maxLength={140}
                      value={designName}
                      onChange={(e) => setDesignName(e.target.value)}
                      placeholder="Describe custom design name"
                      className="mt-2 w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white border border-[#12100D]/20 text-sm text-[#12100D] focus:outline-none focus:border-[#B8872E]"
                    />
                  )}
                </div>

                <div>
                  <label htmlFor="order-size" className="block text-xs font-semibold uppercase tracking-wider text-[#4A4236] mb-1.5">
                    Size / Fit *
                  </label>
                  <select
                    id="order-size"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white border border-[#12100D]/20 text-sm text-[#12100D] focus:outline-none focus:border-[#B8872E] focus:ring-2 focus:ring-[#B8872E]/20"
                  >
                    {SIZE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="order-address" className="block text-xs font-semibold uppercase tracking-wider text-[#4A4236] mb-1.5">
                  Full Delivery Address & PIN Code *
                </label>
                <textarea
                  id="order-address"
                  required
                  rows={2}
                  maxLength={400}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House/Flat No., Street, Landmark, City, State, PIN Code"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#12100D]/20 text-sm text-[#12100D] placeholder:text-[#8E8372] focus:outline-none focus:border-[#B8872E] focus:ring-2 focus:ring-[#B8872E]/20"
                />
              </div>

              <div>
                <label htmlFor="order-notes" className="block text-xs font-semibold uppercase tracking-wider text-[#4A4236] mb-1.5">
                  Custom Stitching & Embroidery Instructions
                </label>
                <textarea
                  id="order-notes"
                  rows={3}
                  maxLength={600}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Neck depth, sleeve length, fabric color preference, blouse padding, or custom bust/waist measurements..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#12100D]/20 text-sm text-[#12100D] placeholder:text-[#8E8372] focus:outline-none focus:border-[#B8872E] focus:ring-2 focus:ring-[#B8872E]/20"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-[#5E5445] pt-1">
                <Truck className="w-4 h-4 text-[#8A641E] shrink-0" />
                <span>All India Courier Available · Securely saved for boutique tracking</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 min-h-[48px] px-6 py-3 rounded-xl bg-[#12100D] text-[#FAF6EE] hover:bg-[#26211A] disabled:opacity-60 font-semibold text-sm transition-colors cursor-pointer"
                >
                  {submitting ? 'Submitting Order...' : 'Confirm & Place Order'}
                </button>
                <a
                  href={buildWhatsAppHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[48px] px-5 py-3 rounded-xl border border-[#8A641E]/45 bg-[#F2E9D8]/60 hover:bg-[#F2E9D8] text-[#12100D] font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 text-[#8A641E]" />
                  <span>WhatsApp Order</span>
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

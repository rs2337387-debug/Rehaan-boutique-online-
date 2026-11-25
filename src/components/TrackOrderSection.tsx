import { useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import { ORDER_STATUSES, type OrderReceipt } from '../types';

export function TrackOrderSection() {
  const [orderCode, setOrderCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderReceipt | null>(null);

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderCode: orderCode.trim().toUpperCase(), phone: phone.trim() }),
      });
      const data = (await res.json()) as { order?: OrderReceipt; error?: string };
      if (!res.ok || !data.order) {
        throw new Error(data.error || 'Order not found.');
      }
      setResult(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to check status right now.');
    } finally {
      setLoading(false);
    }
  }

  const activeIndex = result ? ORDER_STATUSES.indexOf(result.status) : -1;

  return (
    <section id="track-order" className="py-14 sm:py-20 bg-[#12100D] text-[#FAF6EE] border-t border-[#C89B3C]/20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-5 space-y-3">
            <p className="text-xs tracking-[0.2em] uppercase text-[#D4AF37]">
              Private Order Tracking
            </p>
            <h2 className="font-royal text-3xl sm:text-4xl font-semibold text-[#FAF6EE] [text-wrap:balance]">
              Check Your Stitching & Courier Progress
            </h2>
            <p className="text-sm text-[#C7BEA9] leading-relaxed">
              Enter your private Order ID and registered mobile number to verify your bespoke order stage—from confirmation and hand-embroidery to All India courier dispatch.
            </p>
          </div>

          <div className="lg:col-span-7">
            <form
              onSubmit={handleTrack}
              className="p-5 sm:p-7 rounded-2xl bg-[#1A1612] border border-[#C89B3C]/25 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="track-code" className="block text-xs font-medium uppercase tracking-wider text-[#C7BEA9] mb-1.5">
                    Order ID
                  </label>
                  <input
                    id="track-code"
                    type="text"
                    required
                    value={orderCode}
                    onChange={(e) => setOrderCode(e.target.value)}
                    placeholder="RBC-123456"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0D0C0A] border border-[#C89B3C]/30 text-sm text-[#FAF6EE] tabular-nums uppercase placeholder:text-[#7A7162] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label htmlFor="track-phone" className="block text-xs font-medium uppercase tracking-wider text-[#C7BEA9] mb-1.5">
                    Mobile Number
                  </label>
                  <input
                    id="track-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0D0C0A] border border-[#C89B3C]/30 text-sm text-[#FAF6EE] tabular-nums placeholder:text-[#7A7162] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm text-[#FCA5A5]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C6973F] text-[#0D0C0A] font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                <Search className="w-4 h-4" />
                <span>{loading ? 'Checking...' : 'Track Order'}</span>
              </button>

              {result && (
                <div className="mt-5 pt-5 border-t border-[#C89B3C]/20 space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="text-xs text-[#C7BEA9]">
                        {result.orderCode} · {result.customerName}
                      </p>
                      <p className="font-royal text-xl font-semibold text-[#FAF6EE] mt-0.5">
                        {result.designName} ({result.size})
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#E6C77D]">
                      {result.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                    {ORDER_STATUSES.map((step, idx) => {
                      const done = idx <= activeIndex;
                      return (
                        <div
                          key={step}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${
                            done
                              ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#FAF6EE]'
                              : 'border-white/10 bg-white/[0.02] text-[#7A7162]'
                          }`}
                        >
                          <CheckCircle2
                            className={`w-3.5 h-3.5 shrink-0 ${
                              done ? 'text-[#D4AF37]' : 'text-[#5A5247]'
                            }`}
                          />
                          <span className="truncate">{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Compass,
  Film,
  MessageCircle,
  PackageSearch,
  Play,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from 'lucide-react';
import { AdminPanel } from './components/AdminPanel';
import { OrderDrawer } from './components/OrderDrawer';
import { SafeImage } from './components/SafeImage';
import { TrackOrderSection } from './components/TrackOrderSection';
import { DESIGN_CATEGORIES, type DesignCategory, type DesignItem, type MediaItem } from './types';

type ActiveCategory = 'All' | DesignCategory;

export default function App() {
  const [view, setView] = useState<'store' | 'admin'>(() =>
    window.location.hash === '#admin' ? 'admin' : 'store',
  );
  const [designs, setDesigns] = useState<DesignItem[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState('919876543210');
  const [selectedCategory, setSelectedCategory] = useState<ActiveCategory>('All');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<DesignItem | null>(null);
  const [playingVideoIds, setPlayingVideoIds] = useState<Record<string, boolean>>({});

  const fetchCatalog = useCallback(async () => {
    try {
      setLoadError(null);
      const [designsRes, mediaRes, settingsRes] = await Promise.all([
        fetch('/api/designs'),
        fetch('/api/media'),
        fetch('/api/settings/public'),
      ]);
      if (!designsRes.ok) {
        throw new Error('Could not load boutique catalog.');
      }
      const designsJson = (await designsRes.json()) as { designs?: DesignItem[] };
      const mediaJson = (await mediaRes.json()) as { media?: MediaItem[] };
      const settingsJson = (await settingsRes.json()) as { whatsappNumber?: string };

      setDesigns(designsJson.designs || []);
      setMediaItems(mediaJson.media || []);
      if (settingsJson.whatsappNumber) {
        setWhatsappNumber(settingsJson.whatsappNumber);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load designs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const filteredDesigns = useMemo(() => {
    if (selectedCategory === 'All') return designs;
    return designs.filter((d) => d.category === selectedCategory);
  }, [designs, selectedCategory]);

  const openOrderForDesign = (design: DesignItem | null) => {
    setSelectedDesign(design);
    setOrderDrawerOpen(true);
  };

  const buildDirectWhatsAppUrl = (design?: DesignItem) => {
    const clean = whatsappNumber.replace(/\D/g, '') || '919876543210';
    const message = design
      ? `Namaste REHAN BOUTIQUE COLLECTION, I would like to inquire and order "${design.name}" (${design.category})${
          design.price !== null ? ` priced at ₹${design.price.toLocaleString('en-IN')}` : ''
        }.`
      : `Namaste REHAN BOUTIQUE COLLECTION, I would like to inquire about a custom bridal/designer outfit order.`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  };

  const switchToAdmin = () => {
    setView('admin');
    window.history.replaceState(null, '', '#admin');
    window.scrollTo({ top: 0 });
  };

  const switchToStore = () => {
    setView('store');
    window.history.replaceState(null, '', '#top');
    window.scrollTo({ top: 0 });
  };

  if (view === 'admin') {
    return (
      <AdminPanel
        onBackToStore={switchToStore}
        onCatalogUpdated={fetchCatalog}
        whatsappNumber={whatsappNumber}
      />
    );
  }

  return (
    <div id="top" className="min-h-screen bg-[#FAF6EE] text-[#161310] pb-20 md:pb-0">
      {/* Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-40 bg-[#0D0C0A]/95 backdrop-blur-md border-b border-[#C89B3C]/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-4 md:gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#top"
            className="font-royal text-base sm:text-xl font-semibold tracking-[0.08em] text-[#FAF6EE] whitespace-nowrap shrink-0 truncate"
          >
            REHAN BOUTIQUE COLLECTION
          </a>

          {/* Zone 2: Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#D7CEBC]">
            <a
              href="#collections"
              className="hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0"
            >
              Collections
            </a>
            <a
              href="#custom-craft"
              className="hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0"
            >
              Custom Stitching
            </a>
            <a
              href="#track-order"
              className="hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0"
            >
              Track Order
            </a>
            <button
              type="button"
              onClick={switchToAdmin}
              className="hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Admin
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => openOrderForDesign(null)}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#C6973F] text-[#0D0C0A] text-xs font-semibold tracking-wide whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              Order Now
            </button>
          </div>
        </div>
      </header>

      {/* Hero Showcase */}
      <section className="bg-[#0D0C0A] text-[#FAF6EE] border-b border-[#C89B3C]/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <div className="space-y-3">
                <p className="text-xs tracking-[0.22em] uppercase text-[#D4AF37] font-medium">
                  Bespoke Indian Couture Atelier
                </p>
                <h1 className="font-royal text-4xl sm:text-5xl lg:text-[3.6rem] leading-[1.06] font-semibold text-[#FAF6EE] [text-wrap:balance]">
                  REHAN BOUTIQUE COLLECTION
                </h1>
              </div>

              <p className="text-sm sm:text-base text-[#D7CEBC] leading-relaxed max-w-xl">
                Heirloom handmade zardozi embroidery, royal bridal blouses, designer suits, and statement lehengas—tailored to your exact measurements with All India courier delivery.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href="#collections"
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C6973F] text-[#0D0C0A] text-sm font-semibold inline-flex items-center justify-center transition-colors whitespace-nowrap"
                >
                  Explore Designs
                </a>
                <a
                  href={buildDirectWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[48px] px-5 py-3 rounded-xl border border-[#C89B3C]/45 text-[#FAF6EE] hover:bg-white/10 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 text-[#D4AF37]" />
                  <span>WhatsApp Order</span>
                </a>
              </div>

              <div className="pt-4 border-t border-[#C89B3C]/20 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#C7BEA9]">
                <span>Handcrafted Zardozi & Aari</span>
                <span aria-hidden="true" className="text-[#D4AF37]">·</span>
                <span>Custom Tailored Fit</span>
                <span aria-hidden="true" className="text-[#D4AF37]">·</span>
                <span>All India Courier Available</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[280px] sm:min-h-[380px] lg:min-h-[460px] rounded-2xl overflow-hidden border border-[#C89B3C]/35 bg-[#171410]">
                <SafeImage
                  src="/src/assets/images/hero_royal_boutique_1795632424197.jpg"
                  alt="Royal black velvet and antique gold zardozi bridal blouse crafted at Rehan Boutique Collection"
                  fallbackTitle="Rehan Boutique Atelier"
                  className="w-full h-full lg:h-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D0C0A]/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-[#FAF6EE]/90">
                  <span>Zarina Black Velvet Bridal Collection</span>
                  <span className="text-[#E6C77D]">Made to Order</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Design Gallery */}
      <section id="collections" className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#C89B3C]/25 pb-6">
            <div className="space-y-1.5">
              <p className="text-xs tracking-[0.2em] uppercase text-[#8A641E] font-medium">
                Curated Design Gallery
              </p>
              <h2 className="font-royal text-3xl sm:text-4xl font-semibold text-[#12100D] [text-wrap:balance]">
                Signature Bridal, Suit & Embroidery Creations
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#5E5445] tabular-nums">
              {filteredDesigns.length} {filteredDesigns.length === 1 ? 'Design' : 'Designs'} Available
            </p>
          </div>

          {/* Category Filter Buttons */}
          <div
            className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
            role="tablist"
            aria-label="Design categories"
          >
            {(['All', ...DESIGN_CATEGORIES] as const).map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#12100D] text-[#FAF6EE] shadow-sm'
                      : 'bg-[#F2E9D8]/80 text-[#362F26] hover:bg-[#E7DAC1] border border-[#C89B3C]/20'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Gallery States */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="rounded-2xl bg-[#F2E9D8]/60 border border-[#C89B3C]/15 h-[480px] animate-pulse"
                />
              ))}
            </div>
          ) : loadError ? (
            <div className="p-8 rounded-2xl bg-white border border-[#C89B3C]/25 text-center space-y-3">
              <p className="font-royal text-2xl font-semibold text-[#12100D]">Unable to load designs</p>
              <p className="text-sm text-[#5E5445]">{loadError}</p>
              <button
                type="button"
                onClick={fetchCatalog}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#12100D] text-[#FAF6EE] text-sm font-medium cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : filteredDesigns.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white border border-[#C89B3C]/25 text-center space-y-2">
              <p className="font-royal text-2xl font-semibold text-[#12100D]">
                No designs in {selectedCategory} yet
              </p>
              <p className="text-sm text-[#5E5445]">
                Explore other categories or message us on WhatsApp for bespoke custom designs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {filteredDesigns.map((design) => {
                const isVideoPlaying = Boolean(playingVideoIds[design.id] && design.videoUrl);
                return (
                  <article
                    key={design.id}
                    className="group rounded-2xl bg-[#FFFDF9] border border-[#C89B3C]/25 overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    {/* 3:4 Media Container */}
                    <div className="relative aspect-[3/4] bg-[#161310] overflow-hidden">
                      {isVideoPlaying && design.videoUrl ? (
                        <video
                          src={design.videoUrl}
                          controls
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <SafeImage
                          src={design.imageUrl}
                          alt={design.name}
                          fallbackTitle={design.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      )}

                      {design.videoUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setPlayingVideoIds((prev) => ({
                              ...prev,
                              [design.id]: !prev[design.id],
                            }))
                          }
                          className="absolute bottom-3 right-3 min-h-[40px] px-3 py-1.5 rounded-lg bg-[#0D0C0A]/85 backdrop-blur-sm border border-[#D4AF37]/50 text-[#FAF6EE] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#0D0C0A]"
                        >
                          <Play className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>{isVideoPlaying ? 'View Photo' : 'Watch Video'}</span>
                        </button>
                      )}
                    </div>

                    {/* Card Details */}
                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div className="space-y-1.5">
                        <p className="text-xs uppercase tracking-[0.14em] text-[#8A641E] font-medium">
                          {design.category}
                        </p>
                        <h3 className="font-royal text-2xl font-semibold text-[#12100D] leading-snug">
                          {design.name}
                        </h3>
                        <p className="text-base font-semibold text-[#12100D] tabular-nums">
                          {design.price !== null
                            ? `₹${design.price.toLocaleString('en-IN')}`
                            : 'Price on Request'}
                        </p>
                        <p className="text-sm text-[#5E5445] leading-relaxed line-clamp-2 pt-0.5">
                          {design.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => openOrderForDesign(design)}
                          className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#12100D] hover:bg-[#26211A] text-[#FAF6EE] text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Order Now
                        </button>
                        <a
                          href={buildDirectWhatsAppUrl(design)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Order ${design.name} on WhatsApp`}
                          className="min-h-[44px] min-w-[44px] px-3.5 py-2.5 rounded-xl border border-[#8A641E]/40 bg-[#F2E9D8]/60 hover:bg-[#F2E9D8] text-[#12100D] inline-flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors whitespace-nowrap"
                        >
                          <MessageCircle className="w-4 h-4 text-[#8A641E]" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Atelier Craftsmanship & Uploaded Showcase Media */}
      <section id="custom-craft" className="py-12 sm:py-16 bg-[#F2E9D8]/75 border-t border-[#C89B3C]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#FFFDF9] border border-[#C89B3C]/25 space-y-2">
              <Sparkles className="w-5 h-5 text-[#8A641E]" strokeWidth={1.6} />
              <h3 className="font-royal text-2xl font-semibold text-[#12100D]">
                Handmade Zardozi & Aari
              </h3>
              <p className="text-sm text-[#5E5445] leading-relaxed">
                Every bridal blouse, lehenga border, and festive suit is hand-embroidered by master karigars using antique zari, pearls, and dabka.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FFFDF9] border border-[#C89B3C]/25 space-y-2">
              <Truck className="w-5 h-5 text-[#8A641E]" strokeWidth={1.6} />
              <h3 className="font-royal text-2xl font-semibold text-[#12100D]">
                All India Courier Delivery
              </h3>
              <p className="text-sm text-[#5E5445] leading-relaxed">
                Safe, tracked doorstep dispatch across every state in India—carefully packed in protective couture garment boxes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FFFDF9] border border-[#C89B3C]/25 space-y-2">
              <ShieldCheck className="w-5 h-5 text-[#8A641E]" strokeWidth={1.6} />
              <h3 className="font-royal text-2xl font-semibold text-[#12100D]">
                Custom Tailored Stitching
              </h3>
              <p className="text-sm text-[#5E5445] leading-relaxed">
                Share standard sizes or exact custom measurements with neck, sleeve, and padding instructions directly in your order form.
              </p>
            </div>
          </div>

          {mediaItems.length > 0 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs tracking-[0.2em] uppercase text-[#8A641E] font-medium">
                    Atelier Showcase
                  </p>
                  <h3 className="font-royal text-3xl font-semibold text-[#12100D]">
                    Embroidery Reels & Boutique Lookbook
                  </h3>
                </div>
                <Film className="w-5 h-5 text-[#8A641E]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {mediaItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl overflow-hidden bg-[#FFFDF9] border border-[#C89B3C]/25"
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
                    <div className="p-4">
                      <p className="text-xs text-[#8A641E]">{item.category}</p>
                      <p className="font-royal text-xl font-semibold text-[#12100D]">{item.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Private Order Tracking */}
      <TrackOrderSection />

      {/* Quiet Editorial Footer */}
      <footer className="bg-[#0D0C0A] text-[#C7BEA9] border-t border-[#C89B3C]/20 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <p className="font-royal text-lg text-[#FAF6EE] tracking-wider">
              REHAN BOUTIQUE COLLECTION
            </p>
            <p>Handmade Embroidery · Bridal Blouses · Suits · Lehenga · Custom Stitching · All India Courier</p>
          </div>
          <div className="flex items-center gap-5">
            <a
              href={buildDirectWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#D4AF37] transition-colors"
            >
              WhatsApp Support
            </a>
            <button
              type="button"
              onClick={switchToAdmin}
              className="hover:text-[#D4AF37] transition-colors cursor-pointer"
            >
              Boutique Owner Login
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Thumb-Zone Bottom Bar (<= 15% viewport height combined with top bar) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0D0C0A]/95 backdrop-blur-md border-t border-[#C89B3C]/30 grid grid-cols-4 items-center px-1"
      >
        <a
          href="#collections"
          className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[#D7CEBC] hover:text-[#D4AF37]"
        >
          <Compass className="w-5 h-5" />
          <span className="text-[11px] font-medium">Gallery</span>
        </a>
        <button
          type="button"
          onClick={() => openOrderForDesign(null)}
          className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[#D4AF37] cursor-pointer"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[11px] font-semibold">Order</span>
        </button>
        <a
          href="#track-order"
          className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[#D7CEBC] hover:text-[#D4AF37]"
        >
          <PackageSearch className="w-5 h-5" />
          <span className="text-[11px] font-medium">Track</span>
        </a>
        <button
          type="button"
          onClick={switchToAdmin}
          className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[#D7CEBC] hover:text-[#D4AF37] cursor-pointer"
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[11px] font-medium">Admin</span>
        </button>
      </nav>

      {/* Customer Order Drawer */}
      <OrderDrawer
        isOpen={orderDrawerOpen}
        onClose={() => setOrderDrawerOpen(false)}
        selectedDesign={selectedDesign}
        allDesigns={designs}
        whatsappNumber={whatsappNumber}
      />
    </div>
  );
}

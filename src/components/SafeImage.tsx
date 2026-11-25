import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function SafeImage({ src, alt, className = '', fallbackTitle }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1C1813] via-[#12100D] to-[#261E14] text-[#E6C77D] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Sparkles className="w-6 h-6 mb-2 opacity-75" strokeWidth={1.5} />
        <span className="font-royal text-base tracking-wide text-[#FAF6EE]">
          {fallbackTitle || 'Rehan Boutique Collection'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

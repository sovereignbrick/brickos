"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";

interface ScreenshotLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ScreenshotLightbox({ src, alt, onClose }: ScreenshotLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white/80 transition-colors hover:text-white"
        aria-label="Close"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          width={1920}
          height={1080}
          className="h-auto max-h-[90vh] w-auto rounded-lg object-contain"
          priority
          onError={(e) => {
            const img = e.currentTarget;
            const enFallback = img.src.replace(/-[A-Z]{2}\.png/, "-EN.png");
            if (img.src !== enFallback) img.src = enFallback;
          }}
        />
      </div>
    </div>
  );
}

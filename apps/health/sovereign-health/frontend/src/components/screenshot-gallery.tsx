'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ScreenshotLightbox } from './screenshot-lightbox'

export interface Screenshot {
  src: string
  alt: string
  caption?: string
}

interface ScreenshotGalleryProps {
  screenshots: Screenshot[]
  columns?: 2 | 3 | 4
}

export function ScreenshotGallery({ screenshots, columns = 3 }: ScreenshotGalleryProps) {
  const [lightbox, setLightbox] = useState<Screenshot | null>(null)

  const gridCols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <>
      <div className={`grid gap-4 ${gridCols[columns]}`}>
        {screenshots.map((shot, i) => (
          <button
            key={i}
            onClick={() => setLightbox(shot)}
            className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 transition-transform hover:scale-[1.02] text-left"
          >
            <div className="relative">
              <Image
                src={shot.src}
                alt={shot.alt}
                width={640}
                height={400}
                className="aspect-[8/5] w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                <svg
                  className="h-10 w-10 text-white opacity-0 transition-opacity group-hover:opacity-80"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
              </div>
            </div>
            {shot.caption && (
              <p className="px-4 py-3 text-sm text-muted-foreground">{shot.caption}</p>
            )}
          </button>
        ))}
      </div>

      {lightbox && (
        <ScreenshotLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  )
}

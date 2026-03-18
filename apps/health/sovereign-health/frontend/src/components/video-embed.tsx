'use client'

import { useState } from 'react'

interface VideoEmbedProps {
  src: string
  title: string
  poster?: string
  aspectRatio?: '16/9' | '4/3'
}

export function VideoEmbed({ src, title, poster, aspectRatio = '16/9' }: VideoEmbedProps) {
  const [loaded, setLoaded] = useState(false)

  // Support YouTube, Vimeo, and direct video URLs
  const isYouTube = src.includes('youtube.com') || src.includes('youtu.be')
  const isVimeo = src.includes('vimeo.com')
  const isEmbed = isYouTube || isVimeo

  const embedUrl = isYouTube
    ? src.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')
    : isVimeo
      ? src.replace('vimeo.com/', 'player.vimeo.com/video/')
      : src

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
      style={{ aspectRatio }}
    >
      {isEmbed ? (
        <>
          {!loaded && poster && (
            <button
              onClick={() => setLoaded(true)}
              className="absolute inset-0 z-10 flex items-center justify-center bg-cover bg-center group"
              style={{ backgroundImage: `url(${poster})` }}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/90 transition-transform group-hover:scale-110">
                <svg className="ml-1 h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </button>
          )}
          {(loaded || !poster) && (
            <iframe
              src={`${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=${poster ? '1' : '0'}&rel=0`}
              title={title}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </>
      ) : (
        <video
          src={src}
          poster={poster}
          controls
          preload="metadata"
          className="h-full w-full object-contain"
          title={title}
        >
          <track kind="captions" />
        </video>
      )}
    </div>
  )
}

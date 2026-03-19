'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useDemoHref } from '@/lib/use-demo-href'
import { useTranslations } from 'next-intl'

export interface CarouselCard {
  icon: string
  title: string
  description: string
  link: string
}

interface InfoCarouselProps {
  cards: CarouselCard[]
  autoRotateMs?: number
}

export function InfoCarousel({ cards, autoRotateMs = 8000 }: InfoCarouselProps) {
  const t = useTranslations('common')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const demoHref = useDemoHref()

  const cardCount = cards.length

  const scrollToIndex = useCallback((index: number) => {
    const container = scrollRef.current
    if (!container) return
    const card = container.children[index] as HTMLElement | undefined
    if (!card) return
    const scrollLeft = card.offsetLeft - container.offsetLeft - (container.clientWidth - card.clientWidth) / 2
    container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
  }, [])

  // Auto-rotate
  useEffect(() => {
    if (isPaused || cardCount <= 1) return

    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % cardCount
        scrollToIndex(next)
        return next
      })
    }, autoRotateMs)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPaused, cardCount, autoRotateMs, scrollToIndex])

  // Track scroll position to update active index
  const handleScroll = useCallback(() => {
    const container = scrollRef.current
    if (!container) return
    const center = container.scrollLeft + container.clientWidth / 2
    let closest = 0
    let closestDist = Infinity
    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i] as HTMLElement
      const childCenter = child.offsetLeft - container.offsetLeft + child.clientWidth / 2
      const dist = Math.abs(center - childCenter)
      if (dist < closestDist) {
        closestDist = dist
        closest = i
      }
    }
    setActiveIndex(closest)
  }, [])

  const goTo = (index: number) => {
    setActiveIndex(index)
    scrollToIndex(index)
  }

  const goPrev = () => goTo((activeIndex - 1 + cardCount) % cardCount)
  const goNext = () => goTo((activeIndex + 1) % cardCount)

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 scroll-hide"
      >
        {/* Left padding spacer for mobile centering */}
        <div className="shrink-0 w-[calc((100%-85vw)/2)] sm:w-0" />
        {cards.map((card, i) => (
          <Link
            key={i}
            href={demoHref(card.link)}
            className="shrink-0 snap-center group block rounded-xl border border-border bg-card/50 p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 hover:border-border/80 hover:bg-card w-[85vw] sm:w-[280px]"
          >
            <span className="text-2xl block mb-2">{card.icon}</span>
            <h3 className="text-base font-bold text-foreground mb-1">{card.title}</h3>
            <p className="text-sm text-muted-foreground leading-snug line-clamp-2">{card.description}</p>
          </Link>
        ))}
        {/* Right padding spacer for mobile centering */}
        <div className="shrink-0 w-[calc((100%-85vw)/2)] sm:w-0" />
      </div>

      {/* Arrow buttons (desktop only) */}
      <button
        onClick={goPrev}
        className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-8 h-8 rounded-full bg-muted hover:bg-accent items-center justify-center text-muted-foreground hover:text-foreground transition-all"
        aria-label={t('previousSlide')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <button
        onClick={goNext}
        className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-8 h-8 rounded-full bg-muted hover:bg-accent items-center justify-center text-muted-foreground hover:text-foreground transition-all"
        aria-label={t('nextSlide')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
              i === activeIndex ? 'bg-foreground/60 w-3' : 'bg-foreground/20 hover:bg-foreground/30'
            }`}
            aria-label={`Go to card ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

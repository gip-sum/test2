'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { SearchPanel } from '@/components/search/SearchPanel'
import { SearchIcon } from '@/components/ui/icons'
import { LAUNCH_CITY } from '@/lib/brand'

const slides = [
  { title: 'Find a place to call home', body: 'Explore homes for sale across Kolkata', href: `/buy/${LAUNCH_CITY.slug}`, action: 'Explore homes' },
  { title: 'Your next move starts here', body: 'Discover rentals in the neighbourhoods you love', href: `/rent/${LAUNCH_CITY.slug}`, action: 'Find a rental' },
  { title: 'A home that fits your plans', body: 'Work out your budget before you begin', href: '/calculators/budget', action: 'Plan your budget' },
]

/** Manual carousel: no timer, no moving target or reduced-motion exception. */
export function HomeHero() {
  const [index, setIndex] = useState(0)
  const slide = slides[index]!
  return <section className="reference-banner" aria-label="Explore homes" aria-roledescription="carousel">
    <div className="reference-banner-copy" aria-live="polite">
      <p>KOLKATA · WEST BENGAL</p>
      <h1 id="home-title">{slide.title}</h1>
      <span>{slide.body}</span>
      <Link href={slide.href}>{slide.action} <span aria-hidden>→</span></Link>
    </div>
    <div className="banner-dots" aria-label="Choose banner">
      {slides.map((item, i) => <button key={item.href} type="button" aria-label={`Banner ${i + 1}: ${item.title}`} aria-pressed={index === i} onClick={() => setIndex(i)}><span /></button>)}
    </div>
  </section>
}

export function HomeSearch() {
  const [open, setOpen] = useState(false)
  const [stuck, setStuck] = useState(false)
  const marker = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 64)
    }, { rootMargin: '-64px 0px 0px 0px' })
    if (marker.current) observer.observe(marker.current)
    return () => observer.disconnect()
  }, [])
  return <><span ref={marker} className="search-marker" aria-hidden="true" /><div className="reference-search" data-stuck={stuck || undefined}>
    <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="reference-search-trigger"><SearchIcon className="size-6" /><span>Search a locality in Kolkata</span></button>
    <Sheet open={open} onOpenChange={setOpen} size="search" title="Find your home" description="Choose buy or rent, a locality and your filters.">
      <div className="p-4"><SearchPanel /></div>
    </Sheet>
  </div></>
}

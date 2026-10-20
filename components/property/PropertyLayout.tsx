import type { ReactNode } from 'react'
import { Gallery } from './Gallery'
import { cn } from '@/lib/cn'
import type { PropertyMedia } from '@/lib/property/types'

/**
 * The property page's frame (UI-16), shared by a demo fixture's page
 * (`/property/…`) and a real published listing's (`/listing/…`), so the two
 * cannot drift into two designs:
 *
 *  - a mint band in the 1400px frame holding what the page passes (the
 *    sample-data notice, the trail) and the photos — the mosaic from five
 *    photos, otherwise one photo the width of the content column, so the
 *    card beside the summary lines up either way;
 *  - the summary and sections in the left column, the aside (the contact
 *    card, or an owner's panel) sticky in the right from 1024px;
 *  - below 1024px, the fixed contact bar the page passes, the strip it
 *    covers reserved, and the server-rendered form in <noscript> where the
 *    bar's sheet would be — a phone can enquire without JavaScript (UI-12).
 *
 * The page decides what goes in each slot from what its listing holds;
 * nothing here invents a section.
 */
export function PropertyLayout({
  band,
  photos,
  title,
  saveAction,
  overview,
  children,
  aside,
  asideLabelledBy,
  asideOnPhone = false,
  after,
  phoneContact,
}: {
  /** Above the photos, inside the band: the sample notice, the trail. */
  band?: ReactNode
  photos: PropertyMedia[]
  /** The gallery's and viewer's name for the photos. */
  title: string
  /** Laid over the lead photo: the save heart, where the visitor may save. */
  saveAction?: ReactNode
  overview: ReactNode
  /** The sections, in reading order. */
  children: ReactNode
  aside?: ReactNode
  asideLabelledBy?: string
  /** An aside that is not the contact card (an owner's panel) shows on phones too. */
  asideOnPhone?: boolean
  /** Full width under the page: similar properties. */
  after?: ReactNode
  /** The phone's contact bar and the form it opens, for <noscript>. */
  phoneContact?: { bar: ReactNode; noScriptCard: ReactNode }
}) {
  const wide = photos.filter((m) => m.url).length >= 5
  return (
    <>
      <article>
        {/* The band: the results page's mint, holding where you are and the
            photos — the listing is framed the way its search was. */}
        <div className="property-band">
          <div className="home-container pt-3 sm:pb-6 lg:pb-8">
            {band}
            <div className={cn(band ? 'mt-3' : 'sm:pt-3', !wide && 'lg:max-w-[calc(100%-26.5rem)] xl:max-w-[calc(100%-28rem)]')}>
              <Gallery photos={photos} title={title} layout="wide" overlay={saveAction} />
            </div>
          </div>
        </div>

        <div className="home-container pb-10 pt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-x-10 lg:pb-14 lg:pt-7 xl:grid-cols-[minmax(0,1fr)_25.5rem]">
          <div className="min-w-0">
            {overview}
            {children}
          </div>
          {aside && (
            <aside aria-labelledby={asideLabelledBy} className={cn('lg:sticky lg:top-24 lg:block', asideOnPhone ? 'mt-10 lg:mt-0' : 'hidden')}>
              {aside}
            </aside>
          )}
        </div>

        {after && (
          <div className="border-t border-border-subtle bg-surface-100">
            <div className="home-container pb-12 pt-10 lg:pb-16 lg:pt-12">{after}</div>
          </div>
        )}
      </article>

      {phoneContact && (
        <>
          {/* Reserves the strip the fixed bar occupies, so the disclaimer and
              the footer are never trapped underneath it. */}
          <div className="h-20 lg:hidden" aria-hidden />
          {/* Below 1024px the form lives in a sheet, which needs JavaScript;
              without it the same server-action form is here (UI-12).
              <noscript> content is inert while scripts run. */}
          <noscript><div className="mx-auto max-w-xl px-4 pb-28 pt-2 lg:hidden">{phoneContact.noScriptCard}</div></noscript>
          {phoneContact.bar}
        </>
      )}
    </>
  )
}

/**
 * One content section: a rule above, the heading in the display face and
 * the content under it. Rules rather than a card per section: the page
 * reads as one document, and the contact card stays the one raised surface
 * on it.
 */
export function Section({ id, title, className, children }: { id: string; title: string; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className={cn('mt-10 border-t border-border-subtle pt-8', className)}>
      <h2 id={`${id}-heading`} className="font-display text-heading-2 text-ink-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** The area panel's sub-heading inside "Property details". */
export function AreaHeading() {
  return <h3 id="area-heading" className="mt-7 text-body-lg font-semibold text-ink-900">Area breakdown</h3>
}

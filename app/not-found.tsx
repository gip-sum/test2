import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { LostScene } from '@/components/not-found/LostScene'
import { buttonClassName } from '@/components/ui/Button'
import { HomeIcon, SearchIcon } from '@/components/ui/icons'
import { BRAND, LAUNCH_CITY } from '@/lib/brand'

export const metadata: Metadata = { title: 'Page not found' }

/**
 * The 404.
 *
 * Reached by an unmatched path, by `notFound()`, and by the proxy, which
 * rewrites an unknown city or property handle here so the status code is a
 * real 404 rather than a 200 carrying an apology.
 *
 * Two ways out, in priority order: home, then the search itself — someone
 * who followed a dead listing link still wants to look at property. Both
 * are links, not buttons: they navigate.
 *
 * The bottom nav is forced on. Its own rules hide it under /property,
 * where a contact bar replaces it; a 404 there has no contact bar, and a
 * phone visitor would otherwise land on a page with one exit.
 */
export default function NotFound() {
  return (
    <PageShell alwaysShowBottomNav>
      <div className="nf-stage">
        <section aria-labelledby="nf-title" className="nf-card glass-panel">
          <div className="nf-art">
            <p className="nf-code" aria-hidden="true">
              <span>4</span>
              <svg className="nf-zero" viewBox="0 0 64 84" focusable="false">
                <path d="M32 78 C32 78 7 50 7 31 A25 25 0 1 1 57 31 C57 50 32 78 32 78 Z" />
                <circle cx="32" cy="31" r="8" />
              </svg>
              <span>4</span>
            </p>
            <LostScene className="nf-scene-size" />
          </div>

          <div className="nf-copy">
            <p className="nf-eyebrow">Error 404 · Page not found</p>
            <h1 id="nf-title" className="nf-title">This address doesn’t feel like home.</h1>
            <p className="nf-lede">
              The link may be out of date, or the listing may have been taken down. Let’s get you back to familiar
              streets — {BRAND.name} currently covers {LAUNCH_CITY.name}.
            </p>
            <div className="nf-actions">
              <Link href="/" className={buttonClassName({ variant: 'primary', size: 'lg', className: 'nf-action' })}>
                <HomeIcon className="size-5" />
                Go to homepage
              </Link>
              <Link href={`/buy/${LAUNCH_CITY.slug}`} className={buttonClassName({ variant: 'secondary', size: 'lg', className: 'nf-action nf-secondary' })}>
                <SearchIcon className="size-5" />
                Browse properties
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  )
}

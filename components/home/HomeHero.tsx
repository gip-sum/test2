import Image from 'next/image'
import Link from 'next/link'
import { SearchPanel } from '@/components/search/SearchPanel'
import { MapPinIcon, SearchIcon } from '@/components/ui/icons'
import { LAUNCH_CITY } from '@/lib/brand'

export type HeroLink = { label: string; count: number; href: string; context: string }

/**
 * The homepage hero (UI-14): the city at dusk under a forest shade, one
 * plain promise, and the search — the strongest thing on the page — in a
 * white card lifted off the photograph.
 *
 * The search is the real SearchPanel, inline: Buy/Rent, the accessible
 * locality combobox and More filters (UI-13), building the canonical
 * results URL. It used to sit behind a launcher that opened it in a sheet;
 * on a phone that was one more tap before anyone could type a place.
 * Without JavaScript the panel cannot work (its tabs and picker are
 * scripts), so the noscript rule swaps it for links to the results pages,
 * where search works without JavaScript (UI-06).
 *
 * Under the card, shortcuts to real places with their real counts from the
 * catalogue — never a demand figure or a "most searched" claim.
 *
 * A server component: only the panel inside it is client code. The photo
 * is a priority image, so it is the page's preloaded first paint, sized per
 * screen, instead of a CSS background the browser finds late.
 */
export function HomeHero({ links }: { links: HeroLink[] }) {
  return (
    <section aria-labelledby="home-title" className="home-hero">
      <Image
        src="/brand/kolkata-hero-v2.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-[72%_40%] lg:object-[center_45%]"
      />
      <div className="home-hero-shade" aria-hidden />

      <div className="home-container home-hero-inner">
        <p className="home-hero-eyebrow text-overline uppercase">
          <MapPinIcon className="size-4" />
          {LAUNCH_CITY.name} · West Bengal
        </p>
        <h1 id="home-title" className="max-w-3xl font-display sm:mt-4 text-heading-1 sm:text-display-1 lg:mt-6 lg:text-display-xl">
          Find your next home <span className="home-hero-accent">in {LAUNCH_CITY.name}</span>
        </h1>
        {/* A phone gets the short line: the search must reach the first screen. */}
        <p className="mt-2 max-w-xl text-body text-on-forest/80 sm:mt-3 lg:mt-5 lg:text-body-lg">
          <span className="sm:hidden">Flats, houses and villas to buy or rent across {LAUNCH_CITY.name}.</span>
          <span className="max-sm:hidden">Flats, houses and villas to buy or rent — with carpet area shown on its own and the owner, agent or builder named on every listing.</span>
        </p>

        <div className="home-search-card">
          <SearchPanel />
          <noscript>
            <style>{'.home-search-card form{display:none!important}'}</style>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={`/buy/${LAUNCH_CITY.slug}`} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-brand-600 px-6 text-label text-on-brand">
                <SearchIcon className="size-5" />Search homes for sale in {LAUNCH_CITY.name}
              </Link>
              <Link href={`/rent/${LAUNCH_CITY.slug}`} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-border-strong px-6 text-label text-ink-900">
                Homes to rent in {LAUNCH_CITY.name}
              </Link>
            </div>
          </noscript>
        </div>

        {links.length > 0 && (
          <nav aria-label={`Browse ${LAUNCH_CITY.name}`} className="mt-4 lg:mt-6">
            <ul className="home-hero-links">
              {links.map((l) => (
                <li key={l.href} className="flex-none">
                  <Link href={l.href} className="home-hero-link text-body-sm lg:text-body">
                    <span className="font-semibold">{l.label}</span>
                    <span className="tabular text-mint">{l.count}</span>
                    <span className="sr-only"> {l.context}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </section>
  )
}

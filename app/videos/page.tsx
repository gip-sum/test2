import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { KeyIcon, HomeIcon, PlusIcon, VideoIcon } from '@/components/ui/icons'
import { BRAND, LAUNCH_CITY } from '@/lib/brand'
import { buildLandingUrl } from '@/lib/search/query'

// Nothing here to index until listings carry videos; the links are still worth following.
export const metadata: Metadata = {
  title: 'Property videos',
  description: `Short videos of homes listed on ${BRAND.name} will appear here.`,
  robots: { index: false, follow: true },
}

/**
 * The Videos tab (Phase D): an honest placeholder, not a feature.
 *
 * The client wants Videos in the phone bar now, ahead of any video
 * feature. No listing has a video, and there is no upload, storage or
 * player, so this page says exactly that and offers the real next steps —
 * rather than a grid of empty frames, stock footage, or a "coming soon"
 * banner over nothing, any of which would imply more than exists. When
 * the video phase ships (docs/ROADMAP.md: it needs one in Phases.txt),
 * this route becomes the feed and the bar item does not move.
 */
export default function VideosPage() {
  const city = LAUNCH_CITY.slug
  const next = [
    { href: buildLandingUrl({ intent: 'buy', city }), label: 'Homes for sale', hint: `Browse listings in ${LAUNCH_CITY.name}`, Icon: HomeIcon },
    { href: buildLandingUrl({ intent: 'rent', city }), label: 'Homes to rent', hint: `Browse listings in ${LAUNCH_CITY.name}`, Icon: KeyIcon },
    { href: '/post', label: 'Post a property', hint: 'List a home for sale or to rent', Icon: PlusIcon, supply: true },
  ]

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-700" aria-hidden="true">
          <VideoIcon className="size-7" />
        </span>
        <p className="mt-5 text-overline uppercase tracking-widest text-brand-700">Videos</p>
        <h1 className="mt-2 font-display text-heading-1 text-ink-900">Property videos aren’t here yet</h1>
        <p className="mt-3 text-body text-ink-700">
          This is where short videos of homes listed on {BRAND.name} will play — a walk through the rooms before you visit.
          No listing has a video yet, so rather than fill this space with something else, we have left it empty.
        </p>

        <section aria-labelledby="videos-meanwhile" className="mt-8">
          <h2 id="videos-meanwhile" className="font-display text-heading-3 text-ink-900">In the meantime</h2>
          <ul className="mt-3 grid gap-2">
            {next.map(({ href, label, hint, Icon, supply }) => (
              <li key={href}>
                <Link href={href} className="flex min-h-14 items-center gap-3 rounded-md border border-border-subtle bg-surface-000 px-3 py-2 hover:border-border-strong">
                  <span className={supply ? 'hub-icon hub-icon-supply' : 'hub-icon'} aria-hidden="true"><Icon className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink-900">{label}</span>
                    <span className="block text-body-sm text-ink-500">{hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageShell>
  )
}

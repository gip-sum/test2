import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { LAUNCH_CITY } from '@/lib/brand'

export const metadata = { title: 'Page not found' }

/**
 * The 404.
 *
 * Reached both by an unmatched path and by middleware, which rewrites an
 * unknown city or intent here so the status code is a real 404 rather than
 * a 200 carrying an apology.
 *
 * It offers the two searches that actually exist rather than a bare "go
 * home": someone who mistyped a city still wants to look at property.
 */
export default function NotFound() {
  return (
    <PageShell>
      <div className="mx-auto max-w-xl px-4 py-16 text-center lg:px-8">
        <p className="text-overline uppercase text-ink-500">Error 404</p>
        <h1 className="mt-2 font-display text-heading-1 text-ink-900">
          We could not find that page
        </h1>
        <p className="mx-auto mt-3 max-w-md text-body text-ink-700">
          The link may be out of date, or the listing may have been taken down. We currently cover{' '}
          {LAUNCH_CITY.name} only.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={`/buy/${LAUNCH_CITY.slug}`}>
            <Button variant="primary">Property for sale</Button>
          </Link>
          <Link href={`/rent/${LAUNCH_CITY.slug}`}>
            <Button variant="secondary">Property for rent</Button>
          </Link>
        </div>
      </div>
    </PageShell>
  )
}

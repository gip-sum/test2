import Link from 'next/link'
import { Wordmark } from './Wordmark'
import { Button } from '@/components/ui/Button'
import { LAUNCH_CITY } from '@/lib/brand'
import { AccountLink } from './AccountLink'

/**
 * Persistent top bar.
 *
 * Two deliberate choices:
 *  • Logo left, because people expect "home" there and breaking that
 *    convention measurably costs task success.
 *  • Post Property uses the SUPPLY accent, never the brand colour. In a
 *    two-sided marketplace the supply-side call to action must not be
 *    mistakable for the buyer's primary action.
 *
 * On phones the navigation itself lives in the bottom bar; the header
 * keeps only identity and account.
 */
export function AppHeader() {
  return (
    <header
      className="glass-nav sticky z-50 border-b border-border-subtle"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex h-20 max-w-[1320px] items-center gap-5 px-4 lg:px-8">
        <Wordmark />

        <Link href="/" className="inline-flex min-h-11 items-center rounded-md px-2 text-label text-brand-600 hover:bg-brand-100 lg:hidden">Home</Link>
        <nav aria-label="Primary" className="hidden flex-1 items-center gap-2 lg:flex">
          <HeaderLink href="/">Home</HeaderLink>
          <HeaderLink href={`/buy/${LAUNCH_CITY.slug}`}>Buy</HeaderLink>
          <HeaderLink href={`/rent/${LAUNCH_CITY.slug}`}>Rent</HeaderLink>
          <HeaderLink href={`/in/${LAUNCH_CITY.slug}`}>Localities</HeaderLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/post" className="hidden sm:block">
            <Button variant="supply" size="sm">
              Post property
            </Button>
          </Link>
          <AccountLink />
        </div>
      </div>
    </header>
  )
}

function HeaderLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-label text-ink-700 hover:bg-brand-100 hover:text-brand-600"
    >
      {children}
    </Link>
  )
}

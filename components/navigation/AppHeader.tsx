import Link from 'next/link'
import { Wordmark } from './Wordmark'
import { buttonClassName } from '@/components/ui/Button'
import { getMarketplaceNav } from '@/lib/navigation/marketplace'
import { AccountLink } from './AccountLink'
import { HeaderNav } from './HeaderNav'
import { MarketplaceMenu } from './MarketplaceMenu'

/**
 * Persistent top bar: the marketplace's front door (Phase A).
 *
 *  • Phones (< 768px): logo, account, menu. The bottom bar is the phone's
 *    navigation; a row of text links here would only crowd it. The old
 *    "Home" link went — the logo and the bottom bar both go home — and the
 *    menu button now reaches every destination, including on the pages
 *    that hide the bottom bar (posting, sign-in, a property).
 *  • Tablets (768–1023px): a condensed Buy · Rent · Localities nav, then
 *    account and menu.
 *  • Desktop (≥ 1024px): each section with a panel of real destinations,
 *    Post property, account. No menu button — everything is on the bar.
 *
 * Logo left, because people expect "home" there and breaking that
 * convention measurably costs task success.
 *
 * Post property uses the SUPPLY accent, never the brand colour: in a
 * two-sided marketplace the seller's action must not be mistakable for the
 * buyer's. It appears once per screen — here only from 1024px, because
 * below that the bottom bar's centre action is the same button.
 */
export function AppHeader() {
  // Built on the server from the data seams; the client components below
  // receive plain data, never the corpus.
  const nav = getMarketplaceNav()
  return (
    <header
      className="app-bar app-bar-top sticky z-50 border-b border-border-subtle"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="relative mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 md:gap-5 lg:h-20 lg:px-8">
        <Wordmark />
        <HeaderNav nav={nav} />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* max-lg:hidden, not hidden + lg:inline-flex: cn() does not merge
              classes, and the button's own inline-flex would beat a plain
              `hidden`. A button nested in the link, as this once was, is
              invalid — two focus stops for one action. */}
          <Link href="/post" className={buttonClassName({ variant: 'supply', size: 'md', className: 'whitespace-nowrap max-lg:hidden' })}>
            Post property
          </Link>
          <AccountLink />
          <MarketplaceMenu nav={nav} trigger="icon" className="lg:hidden" />
        </div>
      </div>
    </header>
  )
}

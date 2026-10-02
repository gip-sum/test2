import Link from 'next/link'
import { Wordmark } from './Wordmark'
import { buttonClassName } from '@/components/ui/Button'
import { getMarketplaceNav } from '@/lib/navigation/marketplace'
import { AccountLink } from './AccountLink'
import { HeaderNav } from './HeaderNav'
import { MarketplaceMenu } from './MarketplaceMenu'

/** Shared header: compact brand/post action on phones, full navigation on desktop. */
export function AppHeader({ bottomNavForced = false }: { bottomNavForced?: boolean }) {
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
          <Link href="/post" className={buttonClassName({ variant: 'supply', size: 'md', className: 'header-post whitespace-nowrap' })}>
            Post property
          </Link>
          <div className="max-lg:hidden"><AccountLink /></div>
          <MarketplaceMenu nav={nav} trigger="icon" barForced={bottomNavForced} className="lg:hidden" />
        </div>
      </div>
    </header>
  )
}

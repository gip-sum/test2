import type { ReactNode } from 'react'
import { AppHeader } from '@/components/navigation/AppHeader'
import { BottomNav } from '@/components/navigation/BottomNav'
import { SavedProvider } from '@/components/property/SavedProvider'
import { getMarketplaceNav } from '@/lib/navigation/marketplace'

/**
 * Standard page frame: header, main, optional footer, bottom navigation.
 *
 * The footer is a sibling of `main`, not a child — a `contentinfo`
 * landmark nested inside `main` is announced wrongly by screen readers.
 *
 * Bottom padding on phones clears the fixed bottom bar so the last
 * element of a page is never trapped underneath it — including the
 * safe-area inset under the bar on phones with a home indicator, which a
 * fixed 80px spacer did not (Phase D).
 */
export function PageShell({ children, footer, alwaysShowBottomNav = false }: {
  children: ReactNode
  footer?: ReactNode
  /** Overrides the bottom nav's own path rules; see BottomNav. */
  alwaysShowBottomNav?: boolean
}) {
  return (
    // data-app-root: what an open sheet makes inert (components/ui/Sheet).
    <SavedProvider><div data-app-root className="marketplace-shell flex min-h-dvh flex-col bg-surface-100">
      <AppHeader bottomNavForced={alwaysShowBottomNav} />
      <main className="flex-1">{children}</main>
      {footer}
      <div className="bar-spacer" aria-hidden />
      <BottomNav nav={getMarketplaceNav()} alwaysShow={alwaysShowBottomNav} />
    </div></SavedProvider>
  )
}

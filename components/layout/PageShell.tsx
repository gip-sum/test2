import type { ReactNode } from 'react'
import { AppHeader } from '@/components/navigation/AppHeader'
import { BottomNav } from '@/components/navigation/BottomNav'
import { SavedProvider } from '@/components/property/SavedProvider'

/**
 * Standard page frame: header, main, optional footer, bottom navigation.
 *
 * The footer is a sibling of `main`, not a child — a `contentinfo`
 * landmark nested inside `main` is announced wrongly by screen readers.
 *
 * Bottom padding on phones clears the fixed bottom bar so the last
 * element of a page is never trapped underneath it.
 */
export function PageShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <SavedProvider><div className="marketplace-shell flex min-h-dvh flex-col bg-surface-100">
      <AppHeader />
      <main className="flex-1">{children}</main>
      {footer}
      <div className="pb-20 lg:pb-0" aria-hidden />
      <BottomNav />
    </div></SavedProvider>
  )
}

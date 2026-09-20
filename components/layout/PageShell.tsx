import type { ReactNode } from 'react'
import { AppHeader } from '@/components/navigation/AppHeader'
import { BottomNav } from '@/components/navigation/BottomNav'

/**
 * Standard page frame: header, content, bottom navigation.
 *
 * The bottom padding on phones clears the fixed bottom bar so the last
 * element of a page is never trapped underneath it.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-100">
      <AppHeader />
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      <BottomNav />
    </div>
  )
}

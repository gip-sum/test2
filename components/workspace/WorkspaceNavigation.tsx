'use client'

import type { FocusEvent, ReactNode } from 'react'

/** Browsers can leave a partially visible tab stop clipped in a scrolling rail. */
export function WorkspaceNavigation({ label, children }: { label: string; children: ReactNode }) {
  function revealFocusedLink(event: FocusEvent<HTMLElement>) {
    const navigation = event.currentTarget
    const link = event.target.closest('a')
    if (!link || navigation.scrollWidth <= navigation.clientWidth) return
    const bounds = navigation.getBoundingClientRect()
    const target = link.getBoundingClientRect()
    const inset = 16
    if (target.right > bounds.right - inset) navigation.scrollLeft += target.right - bounds.right + inset
    else if (target.left < bounds.left + inset) navigation.scrollLeft -= bounds.left + inset - target.left
  }

  return <nav aria-label={label} className="workspace-navigation" onFocusCapture={revealFocusedLink}>{children}</nav>
}

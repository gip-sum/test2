'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { cn } from '@/lib/cn'

// Nested location/filter sheets must not release the parent sheet's inert lock.
const openSheets = new Set<symbol>()

/**
 * Full-screen sheet for focused mobile tasks.
 *
 * Built on Radix Dialog rather than hand-rolled: focus trapping, scroll
 * locking, Escape handling, `aria-modal` and focus restoration are the
 * things that quietly break when written by hand, and getting them wrong
 * strands keyboard and screen-reader users inside the sheet.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'default',
  returnFocusRef,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  /** 'wide' for a sheet whose content is laid out in columns from 768px (the marketplace menu). */
  size?: 'default' | 'wide' | 'marketplace' | 'search'
  /** Controlled openers can lose activeElement while nested focus effects mount. */
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
  // Radix hands focus back only to its own Dialog.Trigger, and every sheet
  // here is opened by an ordinary button beside it (a controlled `open`).
  // Without this, closing a sheet dropped focus on <body> and a keyboard
  // user started again from the top of the page. So: remember what had
  // focus as the sheet opened, and return there as it closes.
  const returnTo = useRef<HTMLElement | null>(null)
  const content = useRef<HTMLDivElement | null>(null)
  const lock = useRef(Symbol('sheet'))

  // Radix hides the rest of the page from assistive technology with
  // aria-hidden, but it deliberately never hides an aria-live region — or
  // any ancestor of one. The page shell holds several (a calculator's
  // result, the search count), so behind an open sheet the whole page
  // stayed readable by a screen reader's virtual cursor. `inert` on the
  // shell closes that: no focus, no pointer, no accessibility tree, while
  // the sheet (portalled outside it) stays live. Lifted before focus is
  // handed back, since an inert element cannot take focus.
  const appRoot = () => document.querySelector<HTMLElement>('[data-app-root]')
  useLayoutEffect(() => {
    const id = lock.current
    // Capture before making the page inert: inert can move focus to body.
    // Keep the first capture during Strict Mode's effect replay.
    if (open && document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      returnTo.current = document.activeElement
    }
    if (open) openSheets.add(id)
    else openSheets.delete(id)
    const root = appRoot()
    if (root) root.inert = openSheets.size > 0
    return () => { openSheets.delete(id); const root = appRoot(); if (root) root.inert = openSheets.size > 0 }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const top = [...document.querySelectorAll('[data-sheet][data-state="open"]')].at(-1)
      if (top !== content.current || !(event.target instanceof Node)) return
      // A removed child can briefly leave focus on body before its parent's
      // autofocus runs. Escape should still close the current sheet then.
      // Likewise a child that is playing its exit animation still holds
      // focus until it unmounts (UI-04); Escape pressed in that window
      // belongs to this sheet, not to the layer that is already leaving.
      const leaving = event.target instanceof Element && event.target.closest('[data-sheet][data-state="closed"]')
      if (event.target !== document.body && !leaving && !content.current?.contains(event.target)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      onOpenChange(false)
    }
    document.addEventListener('keydown', handleEscape, true)
    return () => document.removeEventListener('keydown', handleEscape, true)
  }, [open, onOpenChange])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Enter and exit animations are CSS (the motion layer in globals.css,
            UI-04): Radix keeps a closing layer mounted until its
            data-state="closed" animation ends, then unmounts it and runs the
            focus return below, so animating adds no JavaScript and changes
            nothing about focus, Escape or the inert lock. A Motion version
            measured +16.6 KB gzip on every route, because Sheet is in the
            header menu. */}
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          ref={content}
          data-sheet=""
          aria-modal="true"
          // Radix updates its document Escape listener in an effect. A fast
          // keypress after opening a child can still reach the parent's old
          // listener. Disable that default; the layout-effect listener above
          // reads the current DOM layer before handling each keypress.
          onEscapeKeyDown={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            const target = returnFocusRef?.current ?? returnTo.current
            if (target?.isConnected) {
              event.preventDefault()
              // Radix resumes the parent focus scope after this callback.
              // Restore on the next frame so its cleanup cannot steal focus.
              requestAnimationFrame(() => {
                if (target.isConnected && !target.closest('[inert]')) target.focus({ preventScroll: true })
              })
            }
          }}
          // From 640px the sheet is a centred dialog sized by its content.
          // sm:bottom-auto matters: with the phone's bottom-0 still applied,
          // top 50% and bottom 0 fixed the dialog at half the viewport and
          // hid whatever did not fit behind an inner scroll.
          className={cn(
            'fixed inset-x-0 bottom-0 top-0 z-50 flex flex-col bg-surface-000',
            size === 'marketplace' && 'marketplace-dialog',
            size === 'search' && 'search-dialog',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[85vh]',
            size !== 'default' ? 'sm:w-[min(52rem,calc(100vw-2rem))]' : 'sm:w-[min(32rem,calc(100vw-2rem))]',
            'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:shadow-e3',
          )}
        >
          <header
            className="flex items-center gap-3 border-b border-border-subtle px-4 py-3"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
          >
            <Dialog.Title className="flex-1 font-display text-heading-3 text-ink-900">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="grid size-11 shrink-0 place-items-center rounded-md text-ink-700 hover:bg-surface-200"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </Dialog.Close>
          </header>

          {description ? (
            <Dialog.Description className="sr-only">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}

          <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

          {footer && (
            <footer
              className="border-t border-border-subtle bg-surface-000 px-4 py-3"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
            >
              {footer}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

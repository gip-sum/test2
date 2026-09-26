'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  // Radix hands focus back only to its own Dialog.Trigger, and every sheet
  // here is opened by an ordinary button beside it (a controlled `open`).
  // Without this, closing a sheet dropped focus on <body> and a keyboard
  // user started again from the top of the page. So: remember what had
  // focus as the sheet opened, and return there as it closes.
  const returnTo = useRef<HTMLElement | null>(null)

  // Radix hides the rest of the page from assistive technology with
  // aria-hidden, but it deliberately never hides an aria-live region — or
  // any ancestor of one. The page shell holds several (a calculator's
  // result, the search count), so behind an open sheet the whole page
  // stayed readable by a screen reader's virtual cursor. `inert` on the
  // shell closes that: no focus, no pointer, no accessibility tree, while
  // the sheet (portalled outside it) stays live. Lifted before focus is
  // handed back, since an inert element cannot take focus.
  const appRoot = () => document.querySelector<HTMLElement>('[data-app-root]')
  useEffect(() => () => { const root = appRoot(); if (root) root.inert = false }, [])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          onOpenAutoFocus={() => {
            returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
            const root = appRoot()
            if (root) root.inert = true
          }}
          onCloseAutoFocus={(event) => {
            const root = appRoot()
            if (root) root.inert = false
            const target = returnTo.current
            if (target?.isConnected) {
              event.preventDefault()
              target.focus()
            }
          }}
          // From 640px the sheet is a centred dialog sized by its content.
          // sm:bottom-auto matters: with the phone's bottom-0 still applied,
          // top 50% and bottom 0 fixed the dialog at half the viewport and
          // hid whatever did not fit behind an inner scroll.
          className={cn(
            'fixed inset-x-0 bottom-0 top-0 z-50 flex flex-col bg-surface-000',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[85vh] sm:w-[min(32rem,calc(100vw-2rem))]',
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

'use client'

import { useEffect } from 'react'

/**
 * Focus and an announcement that survive `router.refresh()` (UI-09).
 *
 * A seller action ends by refreshing the server-rendered page, and the
 * control that was pressed is often gone afterwards: Withdraw leaves an
 * active card, Submit leaves a draft's actions, the confirmation that
 * replaced a button is replaced in turn. Without this, focus fell to <body>
 * and a screen-reader user heard nothing of the result.
 *
 * The action calls `afterRefresh` with element ids to try in order — the
 * thing acted on first, then the closest surviving landmark — and a
 * sentence to announce. `<RestoreFocus token>` (components/a11y), rendered
 * by the server page with a token unique to each render, picks it up once
 * content from a NEWER render is on screen. Without the token it could act
 * on the old page an instant before the refresh removed the target again.
 *
 * Module state, not React state: the component that started the action is
 * frequently the one the refresh removes.
 */
let pending: { targets: string[]; message?: string; at: number; token: string | null } | null = null
/** The token of the server render currently on screen. */
let shown: string | null = null

export function afterRefresh(targets: string[], message?: string) {
  pending = { targets, message, at: Date.now(), token: shown }
}

/** Says `message` through a polite live region outside React's tree. */
export function announce(message: string) {
  let region = document.getElementById('a11y-announcer')
  if (!region) {
    region = document.createElement('p')
    region.id = 'a11y-announcer'
    region.setAttribute('role', 'status')
    region.className = 'sr-only'
    document.body.append(region)
  }
  // Cleared first, so the same sentence twice is announced twice.
  region.textContent = ''
  window.setTimeout(() => { region.textContent = message }, 50)
}

/**
 * Runs after every render of the calling component, and acts only when an
 * action is waiting, the page shows a newer server render than the one the
 * action started on, and one of its targets exists. A request older than a
 * minute is dropped rather than moving focus long after the person has
 * moved on.
 */
export function useRestoreFocus(token: string) {
  useEffect(() => {
    shown = token
    if (!pending || pending.token === token) return
    if (Date.now() - pending.at > 60_000) { pending = null; return }
    const target = pending.targets.map((id) => document.getElementById(id)).find(Boolean)
    if (!target) return
    const { message } = pending
    pending = null
    target.focus()
    if (message) announce(message)
  })
}

'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * False during the server render and hydration, true afterwards — and true
 * from the first render of a component mounted later on the client.
 *
 * Lets markup opt in to behaviour that must not apply to server HTML, such
 * as entrance animations: content the server rendered is already on screen
 * and must not animate in again, while content that arrives after a click
 * may. `useSyncExternalStore` rather than state set in an effect, for the
 * same reasons as useMediaQuery.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false)
}

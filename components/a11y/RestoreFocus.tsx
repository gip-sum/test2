'use client'

import { useRestoreFocus } from '@/lib/a11y/after-refresh'

/**
 * Put once in a server page whose actions refresh it (lib/a11y/after-refresh).
 * `token` must differ on every server render — the page passes a fresh
 * random id — so focus moves only once the refreshed content is shown.
 */
export function RestoreFocus({ token }: { token: string }) {
  useRestoreFocus(token)
  return null
}

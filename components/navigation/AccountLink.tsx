'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

/** The header stays cacheable; identity is checked independently on mount. */
export function AccountLink() {
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/auth/state', { cache: 'no-store', signal: controller.signal })
      .then((r) => r.ok ? r.json() : { authenticated: false })
      .then((state: { authenticated?: boolean }) => setSignedIn(state.authenticated === true))
      .catch(() => {})
    return () => controller.abort()
  }, [])
  return <Link href={signedIn ? '/account' : '/login'}
    className="inline-flex h-11 items-center justify-center rounded-md border border-border-strong px-3 text-label font-semibold text-ink-900 hover:border-ink-500 focus-visible:outline-2 focus-visible:outline-focus-ring">
    {signedIn ? 'Account' : 'Log in'}
  </Link>
}

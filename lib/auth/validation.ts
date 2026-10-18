export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

/**
 * Six digits. Spaces and hyphens are dropped first: a code copied out of an
 * email often brings a space with it, and some people type "123 456". The
 * rule itself — exactly six digits — is unchanged.
 */
export function normalizeCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const code = value.replace(/[\s-]/g, '')
  return /^\d{6}$/.test(code) ? code : null
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/account'
  try {
    const url = new URL(value, 'https://example.invalid')
    // The pathname is checked after the URL parser has normalised it:
    // "/.//evil.example" and "/a/..//evil.example" pass every check on the
    // raw string and come out as "//evil.example", which a redirect reads as
    // another host (UI-07 security fix).
    if (url.origin !== 'https://example.invalid' || !url.pathname.startsWith('/') || url.pathname.startsWith('//') ||
      url.pathname.startsWith('/login') || url.pathname.startsWith('/api/auth') ||
      /[\u0000-\u001f\u007f]/.test(value)) return '/account'
    return url.pathname + url.search
  } catch {
    return '/account'
  }
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

export function normalizeCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const code = value.trim()
  return /^\d{6}$/.test(code) ? code : null
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/account'
  try {
    const url = new URL(value, 'https://example.invalid')
    if (url.origin !== 'https://example.invalid' || !url.pathname.startsWith('/') ||
      url.pathname.startsWith('/login') || url.pathname.startsWith('/api/auth') ||
      /[\u0000-\u001f\u007f]/.test(value)) return '/account'
    return url.pathname + url.search
  } catch {
    return '/account'
  }
}

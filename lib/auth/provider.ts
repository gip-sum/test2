/** Server-only adapter for the Supabase Auth HTTP API. Never expose tokens to client components. */
import 'server-only'

export type AuthUser = {
  id: string
  email: string
  email_confirmed_at?: string | null
  created_at?: string | null
  last_sign_in_at?: string | null
}
export type AuthSession = { access_token: string; refresh_token: string; expires_in: number; user?: AuthUser }

export function authConfig() {
  const raw = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!raw || !key) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) return null
    if (url.username || url.password || url.search || url.hash) return null
    return { base: url.origin + url.pathname.replace(/\/$/, '') + '/auth/v1', key }
  } catch { return null }
}

export type ProviderResult<T> = { ok: true; data: T } | { ok: false; status: number }

export async function authRequest<T>(path: string, method: 'GET' | 'POST', body?: object, token?: string): Promise<ProviderResult<T>> {
  const config = authConfig()
  if (!config) return { ok: false, status: 503 }
  try {
    const response = await fetch(config.base + path, {
      method,
      headers: {
        apikey: config.key,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? config.key}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return { ok: false, status: response.status }
    if (response.status === 204) return { ok: true, data: undefined as T }
    return { ok: true, data: await response.json() as T }
  } catch { return { ok: false, status: 503 } }
}

export function validSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || !value) return false
  const s = value as Partial<AuthSession>
  return typeof s.access_token === 'string' && s.access_token.length > 20 &&
    typeof s.refresh_token === 'string' && s.refresh_token.length > 10 &&
    typeof s.expires_in === 'number' && s.expires_in > 0
}

export function validUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || !value) return false
  const u = value as Partial<AuthUser>
  return typeof u.id === 'string' && /^[0-9a-f-]{36}$/i.test(u.id) &&
    typeof u.email === 'string' && u.email.length > 0
}

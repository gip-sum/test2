import 'server-only'
import { authConfig } from '@/lib/auth/provider'
import type { Check } from './model'

/**
 * What the app can say about its own setup: whether each server setting is
 * present (never its value), and whether the sign-in provider answers.
 */
export function configurationChecks(): Check[] {
  const present = (name: string) => Boolean(process.env[name]?.trim())
  const auth = authConfig()
  return [
    auth
      ? { key: 'auth-config', label: 'Sign-in settings', state: 'ok', detail: 'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are set.' }
      : { key: 'auth-config', label: 'Sign-in settings', state: 'problem', detail: 'SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is missing or invalid. Sign-in and every account feature are unavailable.' },
    present('SUPABASE_SERVICE_ROLE_KEY')
      ? { key: 'service-key', label: 'Server key', state: 'ok', detail: 'SUPABASE_SERVICE_ROLE_KEY is set.' }
      : { key: 'service-key', label: 'Server key', state: 'problem', detail: 'SUPABASE_SERVICE_ROLE_KEY is missing. Submitting and withdrawing listings, and counting views, are unavailable.' },
    present('AUTH_SITE_URL')
      ? { key: 'site-url', label: 'Site address', state: 'ok', detail: 'AUTH_SITE_URL is set.' }
      : { key: 'site-url', label: 'Site address', state: 'warning', detail: 'AUTH_SITE_URL is missing. Continue with Google is unavailable.' },
  ]
}

/** Times the sign-in provider's health endpoint. */
export async function providerCheck(): Promise<Check> {
  const config = authConfig()
  if (!config) return { key: 'provider', label: 'Sign-in provider', state: 'unknown', detail: 'Not checked: sign-in settings are missing.' }
  const started = Date.now()
  try {
    const response = await fetch(`${config.base}/health`, { headers: { apikey: config.key }, cache: 'no-store', signal: AbortSignal.timeout(5000) })
    const ms = Date.now() - started
    if (!response.ok) return { key: 'provider', label: 'Sign-in provider', state: 'problem', detail: `Answered with status ${response.status}.` }
    return ms > 1500
      ? { key: 'provider', label: 'Sign-in provider', state: 'warning', detail: `Reachable but slow (${ms} ms).` }
      : { key: 'provider', label: 'Sign-in provider', state: 'ok', detail: `Reachable (${ms} ms).` }
  } catch {
    return { key: 'provider', label: 'Sign-in provider', state: 'problem', detail: 'Did not answer within 5 seconds.' }
  }
}

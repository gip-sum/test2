import { afterEach, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const m = vi.hoisted(() => ({ config: { base: 'https://test.invalid/auth/v1', key: 'public-key' } as null | { base: string; key: string } }))
vi.mock('@/lib/auth/provider', () => ({ authConfig: () => m.config }))
import { configurationChecks, providerCheck } from './system'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); m.config = { base: 'https://test.invalid/auth/v1', key: 'public-key' } })

it('reports settings as present or missing, never their values', () => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_value_that_must_not_appear')
  vi.stubEnv('AUTH_SITE_URL', '')
  const checks = configurationChecks()
  expect(checks.map((c) => [c.key, c.state])).toEqual([['auth-config', 'ok'], ['service-key', 'ok'], ['site-url', 'warning']])
  expect(JSON.stringify(checks)).not.toContain('sb_secret_value_that_must_not_appear')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
  m.config = null
  expect(configurationChecks().filter((c) => c.state === 'problem').map((c) => c.key)).toEqual(['auth-config', 'service-key'])
})

it('times the sign-in provider and reports failures as problems', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))
  expect(await providerCheck()).toMatchObject({ state: 'ok' })
  expect(String(vi.mocked(fetch).mock.calls[0]![0])).toBe('https://test.invalid/auth/v1/health')
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })))
  expect(await providerCheck()).toMatchObject({ state: 'problem', detail: 'Answered with status 500.' })
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('timeout') }))
  expect(await providerCheck()).toMatchObject({ state: 'problem' })
  m.config = null
  expect(await providerCheck()).toMatchObject({ state: 'unknown' })
})

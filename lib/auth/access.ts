import { authConfig } from './provider'

/** A live check independent of JWT age; unknown access fails closed. */
export async function marketplaceAccess(token: string): Promise<'active' | 'suspended' | 'unavailable'> {
  const config = authConfig()
  if (!config) return 'unavailable'
  try {
    const response = await fetch(config.base.replace(/\/auth\/v1$/, '/rest/v1/rpc/my_account_access'), {
      method: 'POST', headers: { apikey: config.key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}', cache: 'no-store', signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return 'unavailable'
    const value: unknown = await response.json()
    return value === true ? 'active' : value === false ? 'suspended' : 'unavailable'
  } catch { return 'unavailable' }
}

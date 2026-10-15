import { NextResponse, type NextRequest } from 'next/server'
import { MAX_ACCOUNT_BYTES, accountInput } from '@/lib/users/model'
import { AccountError, accountAdmin, manageAccount } from '@/lib/users/queries'
export const runtime = 'nodejs'
const headers = { 'Cache-Control': 'private, no-store' }
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('origin') !== request.nextUrl.origin) throw new AccountError('Refresh the account before trying again.', 403)
    await accountAdmin()
    const reader = request.body?.getReader()
    if (!reader) throw new AccountError('Invalid account change.', 400)
    const chunks: Uint8Array[] = []; let size = 0
    for (;;) {
      const part = await reader.read(); if (part.done) break
      size += part.value.length
      if (size > MAX_ACCOUNT_BYTES) { await reader.cancel(); throw new AccountError('Account change is too large.', 413) }
      chunks.push(part.value)
    }
    let body: unknown
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new AccountError('Invalid account change.', 400) }
    const input = accountInput(body)
    if (!input) throw new AccountError('Check the status, role, reason and confirmation.', 400)
    await manageAccount(input)
    return NextResponse.json({ saved: true }, { headers })
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof AccountError ? cause.message : 'Account management is temporarily unavailable.' }, { status: cause instanceof AccountError ? cause.status : 503, headers })
  }
}

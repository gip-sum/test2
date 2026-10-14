import { NextResponse, type NextRequest } from 'next/server'
import { decisionInput, MAX_DECISION_BYTES } from '@/lib/moderation/model'
import { decideListing, ModerationError, reviewerUser } from '@/lib/moderation/queries'
export const runtime = 'nodejs'
const headers = { 'Cache-Control': 'private, no-store' }

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('origin') !== request.nextUrl.origin) throw new ModerationError('Refresh the page before trying again.', 403)
    await reviewerUser()
    const reader = request.body?.getReader()
    if (!reader) throw new ModerationError('Invalid decision.', 400)
    const chunks: Uint8Array[] = []; let size = 0
    for (;;) {
      const part = await reader.read(); if (part.done) break
      size += part.value.length
      if (size > MAX_DECISION_BYTES) { await reader.cancel(); throw new ModerationError('Decision is too large.', 413) }
      chunks.push(part.value)
    }
    let body: unknown
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new ModerationError('Invalid decision.', 400) }
    const input = decisionInput(body)
    if (!input) throw new ModerationError('Check the reason, validity and confirmation before trying again.', 400)
    await decideListing(input)
    return NextResponse.json({ saved: true }, { headers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof ModerationError ? error.message : 'Moderation is temporarily unavailable.' }, { status: error instanceof ModerationError ? error.status : 503, headers })
  }
}

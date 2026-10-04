import { NextResponse, type NextRequest } from 'next/server'
import { createDraft, draftUser, DraftError, getDraft, listDrafts, saveDraft } from '@/lib/drafts/queries'
import { parseSnapshot } from '@/lib/drafts/types'
import { UUID } from '@/lib/media/types'
const headers = { 'Cache-Control': 'private, no-store' }
function failure(error: unknown) { return NextResponse.json({ error: error instanceof DraftError ? error.message : 'Draft storage is unavailable.' }, { status: error instanceof DraftError ? error.status : 503, headers }) }
export async function GET(request: NextRequest) {
  try {
    const user = await draftUser(), id = request.nextUrl.searchParams.get('id')
    if (id && !UUID.test(id)) throw new DraftError('Invalid draft.', 400)
    return NextResponse.json(id ? { draft: await getDraft(user, id) } : { drafts: await listDrafts(user) }, { headers })
  } catch (e) { return failure(e) }
}
async function mutate(request: NextRequest) {
  try {
    if (request.headers.get('origin') !== request.nextUrl.origin) throw new DraftError('Refresh this page before trying again.', 403)
    const user = await draftUser()
    const reader = request.body?.getReader()
    if (!reader) throw new DraftError('Empty request.', 400)
    const chunks: Uint8Array[] = []; let size = 0
    for (;;) {
      const { done, value } = await reader.read(); if (done) break
      size += value.length
      if (size > 16384) { await reader.cancel(); throw new DraftError('Draft request is too large.', 413) }
      chunks.push(value)
    }
    let body
    try { body = JSON.parse(Buffer.concat(chunks).toString()) } catch { throw new DraftError('Invalid request.', 400) }
    const snapshot = parseSnapshot(body?.snapshot)
    if (!snapshot || typeof body?.id !== 'string' || !UUID.test(body.id)) throw new DraftError('Invalid draft.', 400)
    if (request.method === 'POST') {
      if (typeof body.collection !== 'string' || !UUID.test(body.collection)) throw new DraftError('Invalid photo collection.', 400)
      return NextResponse.json({ draft: await createDraft(user, body.id, body.collection, snapshot) }, { headers })
    }
    if (!Number.isSafeInteger(body.revision) || body.revision < 1) throw new DraftError('Invalid draft revision.', 400)
    return NextResponse.json({ draft: await saveDraft(user, body.id, body.revision, snapshot) }, { headers })
  } catch (e) { return failure(e) }
}
export const POST = mutate
export const PATCH = mutate

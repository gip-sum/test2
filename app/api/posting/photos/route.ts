import { NextResponse, type NextRequest } from 'next/server'
import { getVerifiedUser } from '@/lib/auth/session'
import { listPhotos, uploadPhoto, removePhoto, reorderPhotos, MediaError } from '@/lib/media/queries'
import { UUID, UPLOAD_LIMIT, validOrder } from '@/lib/media/types'

export const runtime = 'nodejs'
const headers = { 'Cache-Control': 'private, no-store' }
async function boundedBody(request: NextRequest, limit: number) {
  if (Number(request.headers.get('content-length')) > limit) throw new MediaError('File is too large.', 413)
  const reader = request.body?.getReader()
  if (!reader) throw new MediaError('Empty request.', 400)
  const chunks: Uint8Array[] = []; let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > limit) { await reader.cancel(); throw new MediaError('File is too large.', 413) }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}
function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof MediaError ? error.message : 'Photo storage is temporarily unavailable.' }, { status: error instanceof MediaError ? error.status : 503, headers })
}
export async function GET(request: NextRequest) {
  try {
    const user = await getVerifiedUser()
    if (!user) throw new MediaError('Sign in to manage photos.', 401)
    const collection = request.nextUrl.searchParams.get('collection') ?? ''
    if (!UUID.test(collection)) throw new MediaError('Invalid photo collection.', 400)
    return NextResponse.json({ photos: await listPhotos(user, collection) }, { headers })
  } catch (error) { return failure(error) }
}
async function mutate(request: NextRequest) {
  try {
    if (request.headers.get('origin') !== request.nextUrl.origin) throw new MediaError('Refresh this page before trying again.', 403)
    const user = await getVerifiedUser()
    if (!user) throw new MediaError('Sign in again to manage photos.', 401)
    if (request.method === 'POST') {
      const id = request.nextUrl.searchParams.get('id') ?? ''
      const collection = request.nextUrl.searchParams.get('collection') ?? ''
      if (!UUID.test(id) || !UUID.test(collection)) throw new MediaError('Invalid photo collection.', 400)
      if (request.headers.get('content-type') !== 'image/jpeg') throw new MediaError('Photo must be prepared as JPEG before upload.', 415)
      let name = 'Property photo'
      try { name = decodeURIComponent(request.headers.get('x-photo-name') ?? name) } catch { throw new MediaError('Invalid photo name.', 400) }
      const photo = await uploadPhoto(user, id, collection, name, await boundedBody(request, UPLOAD_LIMIT))
      return NextResponse.json({ photo }, { headers })
    }
    let body: { id?: unknown; collection?: unknown; ids?: unknown }
    try { body = JSON.parse((await boundedBody(request, 4096)).toString()) } catch { throw new MediaError('Invalid request.', 400) }
    if (!body || typeof body !== 'object') throw new MediaError('Invalid request.', 400)
    if (request.method === 'DELETE') {
      if (typeof body.id !== 'string' || !UUID.test(body.id)) throw new MediaError('Invalid photo.', 400)
      await removePhoto(user, body.id)
    } else {
      if (typeof body.collection !== 'string' || !UUID.test(body.collection) || !validOrder(body.ids)) throw new MediaError('Invalid photo order.', 400)
      await reorderPhotos(body.collection, body.ids)
    }
    return NextResponse.json({ ok: true }, { headers })
  } catch (error) { return failure(error) }
}
export const POST = mutate
export const PATCH = mutate
export const DELETE = mutate

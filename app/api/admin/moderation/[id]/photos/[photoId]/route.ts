import { NextResponse, type NextRequest } from 'next/server'
import { ModerationError, reviewerUser, reviewPhoto } from '@/lib/moderation/queries'
import { resizeListingPhoto } from '@/lib/listings/image'
import { listingPhotoWidth } from '@/lib/listings/photo-widths'
export const runtime = 'nodejs'
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  try {
    await reviewerUser()
    const { id, photoId } = await params
    // `?w=` resizes after the staff check and the size bound, still no-store
    // (UI-22): the review gallery's thumbnails no longer load originals.
    const width = listingPhotoWidth(request.nextUrl.searchParams.get('w'))
    if (width === undefined) throw new ModerationError('Photo not found.', 404)
    const response = await reviewPhoto(id, request.nextUrl.searchParams.get('submission') ?? '', photoId)
    const reader = response.body?.getReader()
    if (!reader) throw new ModerationError('Submitted photo could not be read.')
    const chunks: Uint8Array[] = []; let size = 0
    for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 2097152) { await reader.cancel(); throw new ModerationError('Submitted photo is too large.') } chunks.push(part.value) }
    const photo = Buffer.concat(chunks)
    return new NextResponse(width ? Buffer.from(await resizeListingPhoto(photo, width)) : photo, { headers: { ...headers, 'Content-Type': 'image/jpeg' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof ModerationError ? error.message : 'Photo unavailable.' }, { status: error instanceof ModerationError ? error.status : 503, headers })
  }
}

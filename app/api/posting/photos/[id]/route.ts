import { getVerifiedUser } from '@/lib/auth/session'
import { readPhoto, MediaError } from '@/lib/media/queries'
import { UUID } from '@/lib/media/types'
import { resizeListingPhoto } from '@/lib/listings/image'
import { listingPhotoWidth } from '@/lib/listings/photo-widths'
export const runtime = 'nodejs'
// `?w=` resizes here, after the owner check and still no-store (UI-22): the
// photo manager and the dashboard ask for a tile's width, never the original.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
  try {
    const user = await getVerifiedUser(); const { id } = await params
    if (!user) return new Response(null, { status: 401, headers })
    const width = listingPhotoWidth(new URL(request.url).searchParams.get('w'))
    if (!UUID.test(id) || width === undefined) return new Response(null, { status: 404, headers })
    const photo = await readPhoto(user, id)
    const body = width ? await resizeListingPhoto(new Uint8Array(await photo.arrayBuffer()), width) : photo.body
    return new Response(body as BodyInit, { headers: { ...headers, 'Content-Type': 'image/jpeg', 'Content-Disposition': 'inline; filename="property-photo.jpg"' } })
  } catch (error) { return new Response(null, { status: error instanceof MediaError ? error.status : 503, headers }) }
}

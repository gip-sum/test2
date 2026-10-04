import { getVerifiedUser } from '@/lib/auth/session'
import { readPhoto, MediaError } from '@/lib/media/queries'
import { UUID } from '@/lib/media/types'
export const runtime = 'nodejs'
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
  try {
    const user = await getVerifiedUser(); const { id } = await params
    if (!user) return new Response(null, { status: 401, headers })
    if (!UUID.test(id)) return new Response(null, { status: 404, headers })
    const photo = await readPhoto(user, id)
    return new Response(photo.body, { headers: { ...headers, 'Content-Type': 'image/jpeg', 'Content-Disposition': 'inline; filename="property-photo.jpg"' } })
  } catch (error) { return new Response(null, { status: error instanceof MediaError ? error.status : 503, headers }) }
}

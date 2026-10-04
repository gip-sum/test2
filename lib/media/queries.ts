import 'server-only'
import { cookies } from 'next/headers'
import { createHash } from 'node:crypto'
import { ACCESS_COOKIE } from '@/lib/auth/session'
import { authConfig, type AuthUser } from '@/lib/auth/provider'
import type { Photo } from './types'
import { prepareImage } from './image'

export class MediaError extends Error { constructor(message: string, public status = 503) { super(message) } }
async function request(path: string, method = 'GET', body?: BodyInit, contentType = 'application/json') {
  const config = authConfig(); const token = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!config || !token) throw new MediaError('Sign in to manage photos.', 401)
  try {
    return await fetch(config.base.replace(/\/auth\/v1$/, '') + path, { method, body, headers: { apikey: config.key, Authorization: `Bearer ${token}`, 'Content-Type': contentType, Prefer: 'return=representation', 'x-upsert': 'true' }, cache: 'no-store', signal: AbortSignal.timeout(25_000) })
  } catch { throw new MediaError('Photo storage could not be reached. Please retry.') }
}
const selection = 'id,collection_id,original_name,status,position,width,height,bytes,sha256'
const owner = (user: AuthUser) => `owner_id=eq.${encodeURIComponent(user.id)}`
export async function listPhotos(user: AuthUser, collection: string): Promise<Photo[]> {
  const response = await request(`/rest/v1/media_assets?${owner(user)}&collection_id=eq.${collection}&select=${selection}&order=position,created_at`)
  if (!response.ok) throw new MediaError('Photo storage is temporarily unavailable. Your listing has not been published.')
  return await response.json() as Photo[]
}
async function findPhoto(user: AuthUser, id: string): Promise<(Photo & { sha256: string }) | null> {
  const response = await request(`/rest/v1/media_assets?${owner(user)}&id=eq.${id}&select=${selection}`)
  if (!response.ok) throw new MediaError('Photo storage is temporarily unavailable.')
  return (await response.json() as (Photo & { sha256: string })[])[0] ?? null
}
const pathFor = (user: AuthUser, photo: Pick<Photo, 'id' | 'collection_id'>) => `${user.id}/${photo.collection_id}/${photo.id}.jpg`
export async function uploadPhoto(user: AuthUser, id: string, collection: string, name: string, bytes: Uint8Array): Promise<Photo> {
  let photo = await findPhoto(user, id)
  if (photo && photo.collection_id !== collection) throw new MediaError('Photo belongs to a different collection.', 409)
  if (photo?.status === 'ready') return photo // Lost response after success: retry is safe.
  let image: Awaited<ReturnType<typeof prepareImage>>
  try { image = await prepareImage(bytes) } catch (error) { throw new MediaError(error instanceof Error ? error.message : 'Invalid photo.', 400) }
  const checksum = createHash('sha256').update(image.data).digest('hex')
  if (photo && photo.sha256 !== checksum) throw new MediaError('Retry with the same photo, or remove this entry first.', 409)
  if (!photo) {
    const rows = await listPhotos(user, collection)
    const record = { id, owner_id: user.id, collection_id: collection, original_name: name.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180) || 'Property photo', sha256: checksum, status: 'pending', position: Math.min(19, rows.reduce((last, row) => Math.max(last, row.position + 1), 0)), width: image.width, height: image.height, bytes: image.bytes }
    const response = await request('/rest/v1/media_assets', 'POST', JSON.stringify(record))
    if (!response.ok) throw new MediaError(response.status === 409 ? 'This photo has already been added.' : 'Could not reserve this photo. Check the photo limit or retry later.', response.status === 409 ? 409 : 503)
    photo = (await response.json() as (Photo & { sha256: string })[])[0] ?? null
    if (!photo) throw new MediaError('Could not reserve this photo.')
  }
  const stored = await request(`/storage/v1/object/property-photos/${pathFor(user, photo)}`, 'POST', new Uint8Array(image.data), 'image/jpeg')
  if (!stored.ok) throw new MediaError('The photo was not uploaded. Retry or remove it.')
  const finished = await request(`/rest/v1/media_assets?${owner(user)}&id=eq.${id}`, 'PATCH', JSON.stringify({ status: 'ready', width: image.width, height: image.height, bytes: image.bytes }))
  if (!finished.ok) throw new MediaError('Photo transfer finished but confirmation failed. Retry to confirm it.')
  return { ...photo, status: 'ready', width: image.width, height: image.height, bytes: image.bytes }
}
export async function removePhoto(user: AuthUser, id: string) {
  const photo = await findPhoto(user, id)
  if (!photo) return
  const removed = await request('/storage/v1/object/property-photos', 'DELETE', JSON.stringify({ prefixes: [pathFor(user, photo)] }))
  if (!removed.ok) throw new MediaError('Could not remove the photo. Please retry.')
  const response = await request(`/rest/v1/media_assets?${owner(user)}&id=eq.${id}`, 'DELETE')
  if (!response.ok) throw new MediaError('Photo removed; could not clear its record. Please retry.')
}
export async function reorderPhotos(collection: string, ids: string[]) {
  const response = await request('/rest/v1/rpc/reorder_media_photos', 'POST', JSON.stringify({ collection, photo_ids: ids }))
  if (!response.ok) throw new MediaError('Photos changed or order could not be saved. Reload the photos and retry.', 409)
}
export async function readPhoto(user: AuthUser, id: string) {
  const photo = await findPhoto(user, id)
  if (!photo || photo.status !== 'ready') throw new MediaError('Photo not found.', 404)
  const response = await request(`/storage/v1/object/authenticated/property-photos/${pathFor(user, photo)}`)
  if (!response.ok) throw new MediaError('Photo could not be loaded.', 404)
  return response
}

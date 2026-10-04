export const PHOTO_LIMIT = 20
export const ORIGINAL_LIMIT = 20 * 1024 * 1024
export const UPLOAD_LIMIT = 2 * 1024 * 1024
export const PIXEL_LIMIT = 40_000_000
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export type Photo = { id: string; collection_id: string; original_name: string; status: 'pending' | 'ready'; position: number; width: number; height: number; bytes: number }
export function fileError(file: { size: number; type: string }): string | null {
  if (!PHOTO_TYPES.includes(file.type as typeof PHOTO_TYPES[number])) return 'Choose a JPEG, PNG or WebP photo.'
  if (!file.size) return 'This file is empty.'
  if (file.size > ORIGINAL_LIMIT) return 'Each original photo must be 20 MB or smaller.'
  return null
}
export function validOrder(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= PHOTO_LIMIT && value.every(id => typeof id === 'string' && UUID.test(id)) && new Set(value).size === value.length
}

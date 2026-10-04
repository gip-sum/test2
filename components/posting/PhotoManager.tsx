'use client'

import { useEffect, useRef, useState } from 'react'
import { compressPhoto } from '@/lib/media/compress'
import { fileError, PHOTO_LIMIT, type Photo } from '@/lib/media/types'

type Item = { id: string; name: string; url?: string; file?: File; photo?: Photo; phase: 'preparing' | 'uploading' | 'processing' | 'ready' | 'error'; progress: number; attempted?: boolean; error?: string }
const button = 'inline-flex min-h-11 items-center justify-center rounded-md border border-border-strong px-3 text-body-sm font-semibold text-brand-700 disabled:opacity-40'
async function jsonRequest(method: string, body?: object) {
  const response = await fetch('/api/posting/photos', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Could not save your change. Please retry.')
  return data
}
export function PhotoManager({ collection }: { collection: string }) {
  const [items, setItems] = useState<Item[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [loadError, setLoadError] = useState(false)
  const resources = useRef(new Set<string>())
  const active = useRef<XMLHttpRequest | null>(null)
  const mounted = useRef(true)
  const lock = useRef(false)
  const patch = (id: string, change: Partial<Item>) => { if (mounted.current) setItems(previous => previous.map(item => item.id === id ? { ...item, ...change } : item)) }
  useEffect(() => {
    mounted.current = true
    const urls = resources.current
    return () => { mounted.current = false; active.current?.abort(); for (const url of urls) URL.revokeObjectURL(url); urls.clear() }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/posting/photos?collection=${collection}`, { signal: controller.signal }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setItems((data.photos as Photo[]).map(photo => ({ id: photo.id, name: photo.original_name, photo, phase: photo.status === 'ready' ? 'ready' : 'error', progress: 100, url: photo.status === 'ready' ? `/api/posting/photos/${photo.id}` : undefined, error: photo.status === 'pending' ? 'Upload was interrupted. Remove this entry and select the photo again.' : undefined })))
    }).catch(error => { if (!controller.signal.aborted) { setLoadError(true); setNotice(error.message ?? 'Could not load photos.') } }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [collection])

  async function upload(item: Item) {
    if (!item.file) return
    try {
      patch(item.id, { phase: 'preparing', error: undefined, progress: 0 })
      const blob = await compressPhoto(item.file)
      if (!mounted.current) return
      patch(item.id, { phase: 'uploading', attempted: true })
      const photo = await new Promise<Photo>((resolve, reject) => {
        const xhr = new XMLHttpRequest(); active.current = xhr
        xhr.open('POST', `/api/posting/photos?collection=${collection}&id=${item.id}`)
        xhr.setRequestHeader('Content-Type', 'image/jpeg'); xhr.setRequestHeader('X-Photo-Name', encodeURIComponent(Array.from(item.name).slice(0, 120).join('')))
        xhr.timeout = 90_000
        xhr.upload.onprogress = event => { if (event.lengthComputable) patch(item.id, { progress: Math.round(event.loaded / event.total * 100), phase: event.loaded === event.total ? 'processing' : 'uploading' }) }
        xhr.onload = () => { try { const data = JSON.parse(xhr.responseText); if (xhr.status >= 200 && xhr.status < 300) resolve(data.photo); else reject(new Error(data.error ?? 'Upload failed. Please retry.')) } catch { reject(new Error('Upload confirmation could not be read. Please retry.')) } }
        xhr.onerror = () => reject(new Error('Connection lost. Your other photos are safe. Retry this photo.'))
        xhr.ontimeout = () => reject(new Error('Upload timed out. Retry to check whether it finished.'))
        xhr.onabort = () => reject(new Error('Upload interrupted.'))
        xhr.send(blob)
      })
      patch(item.id, { photo, phase: 'ready', progress: 100, file: undefined })
    } catch (error) { patch(item.id, { phase: 'error', error: error instanceof Error ? error.message : 'Upload failed. Retry this photo.' }) }
    finally { active.current = null }
  }
  async function add(files: File[]) {
    if (lock.current || loading || loadError) return
    lock.current = true; setBusy(true)
    const accepted: Item[] = []; const errors: string[] = []
    for (const file of files) {
      if (items.length + accepted.length >= PHOTO_LIMIT) { errors.push(`You can add up to ${PHOTO_LIMIT} photos.`); break }
      const error = fileError(file)
      if (error) { errors.push(`${file.name}: ${error}`); continue }
      const url = URL.createObjectURL(file); resources.current.add(url)
      accepted.push({ id: crypto.randomUUID(), name: file.name, url, file, phase: 'preparing', progress: 0 })
    }
    setItems(previous => [...previous, ...accepted]); setNotice(errors.join(' '))
    for (const item of accepted) { if (!mounted.current) break; await upload(item) }
    if (mounted.current) { setBusy(false); setNotice(previous => `${previous} Photo processing finished. Check each photo for its result.`.trim()) }
    lock.current = false
  }
  async function retry(item: Item) {
    if (lock.current) return
    lock.current = true; setBusy(true); await upload(item); lock.current = false
    if (mounted.current) setBusy(false)
  }
  async function remove(item: Item) {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try {
      // Even a failed transfer may have reserved a row or finished remotely.
      if (item.attempted || item.photo) await jsonRequest('DELETE', { id: item.id })
      if (item.url?.startsWith('blob:')) { URL.revokeObjectURL(item.url); resources.current.delete(item.url) }
      setItems(previous => previous.filter(photo => photo.id !== item.id)); setNotice(`${item.name} removed.`)
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not remove photo.') }
    finally { lock.current = false; setBusy(false) }
  }
  async function move(index: number, target: number) {
    if (lock.current || items.some(item => item.phase !== 'ready')) return
    const ordered = [...items]; const [item] = ordered.splice(index, 1)
    if (!item) return
    ordered.splice(target, 0, item); lock.current = true; setBusy(true)
    try { await jsonRequest('PATCH', { collection, ids: ordered.map(photo => photo.id) }); setItems(ordered); setNotice(`${item.name} moved to position ${target + 1}.`) }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save photo order.') }
    finally { lock.current = false; setBusy(false) }
  }
  const canOrder = !busy && items.every(item => item.phase === 'ready')
  return <div className="mt-6">
    <div className="rounded-lg border border-dashed border-brand-600 bg-brand-100/40 p-5">
      <label htmlFor="property-photos" className="block font-semibold text-ink-900">Add property photos</label>
      <p id="photo-guidance" className="mt-2 text-body-sm text-ink-700">JPEG, PNG or WebP · Up to 20 MB each · {PHOTO_LIMIT} photos maximum. At least 320 pixels on each side. Photos are compressed before upload.</p>
      <input id="property-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || loading || loadError || items.length >= PHOTO_LIMIT} aria-describedby="photo-guidance" className="mt-4 block min-h-11 w-full min-w-0 text-body-sm file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-brand-600 file:px-4 file:font-semibold file:text-on-brand" onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void add(files) }} />
    </div>
    <p role="status" aria-live="polite" className="mt-4 break-words [overflow-wrap:anywhere] text-body-sm text-ink-700">{loading ? 'Loading your photos…' : notice || `${items.filter(item => item.phase === 'ready').length} photos uploaded. The first photo is your cover.`}</p>
    {loadError && <button type="button" className={`${button} mt-3`} onClick={() => window.location.reload()}>Reload photos</button>}
    <ol aria-label="Property photos" className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => <li key={item.id} className="min-w-0 rounded-lg border border-border-subtle bg-surface-000 p-3">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-surface-200">
          {/* Local blobs and authenticated private image endpoints cannot use the public image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {item.url && <img src={item.url} alt={`Preview of ${item.name}`} className="h-full w-full object-cover" onError={() => patch(item.id, { error: 'Preview unavailable. Reload photos to try again.' })} />}
          {index === 0 && item.phase === 'ready' && <span className="absolute left-2 top-2 rounded-full bg-brand-600 px-3 py-1 text-caption font-semibold text-on-brand">Cover photo</span>}
        </div>
        <p className="mt-3 break-all text-body-sm font-semibold text-ink-900">{index + 1}. {item.name}</p>
        <p className="mt-1 text-caption text-ink-700">{item.phase === 'ready' ? `Uploaded · ${Math.ceil((item.photo?.bytes ?? 0) / 1024)} KB` : item.phase === 'preparing' ? 'Preparing photo…' : item.phase === 'processing' ? 'Checking and storing photo…' : item.phase === 'uploading' ? `Uploading ${item.progress}%` : 'Upload needs attention'}</p>
        {item.phase === 'uploading' && <progress aria-label={`Upload progress for ${item.name}`} value={item.progress} max={100} className="mt-2 w-full accent-brand-600" />}
        {item.error && <p className="mt-2 break-words text-caption text-danger-600">{item.error}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={button} disabled={!canOrder || index === 0} aria-label={`Move ${item.name} earlier`} onClick={() => void move(index, index - 1)}>← Earlier</button>
          <button type="button" className={button} disabled={!canOrder || index === items.length - 1} aria-label={`Move ${item.name} later`} onClick={() => void move(index, index + 1)}>Later →</button>
          {index > 0 && <button type="button" className={button} disabled={!canOrder} aria-label={`Make ${item.name} cover`} onClick={() => void move(index, 0)}>Make cover</button>}
          {item.phase === 'error' && item.file && <button type="button" className={button} disabled={busy} onClick={() => void retry(item)}>Retry upload</button>}
          <button type="button" className={button} disabled={busy} aria-label={`Remove ${item.name}`} onClick={() => void remove(item)}>Remove</button>
        </div>
      </li>)}
    </ol>
    {!loading && !items.length && !loadError && <p className="mt-6 text-body text-ink-500">No photos yet. Start with a clear view of the home, then add rooms and amenities.</p>}
    <div className="mt-7 rounded-lg bg-brand-100 p-5 text-body-sm text-ink-700"><strong className="text-ink-900">Your photos stay private.</strong> Uploaded photos are stored in this collection. Keep this page link to return to them. Property details are not yet saved as a draft, and nothing is published.</div>
    <noscript><p className="mt-4 text-danger-600">Enable JavaScript to prepare, upload and arrange photos.</p></noscript>
  </div>
}

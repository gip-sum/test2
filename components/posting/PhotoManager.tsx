'use client'

import { useEffect, useLayoutEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import * as m from 'motion/react-m'
import { useDragControls, type PanInfo } from 'motion/react'
import { compressPhoto } from '@/lib/media/compress'
import { fileError, PHOTO_LIMIT, type Photo } from '@/lib/media/types'
import { MotionFeatures } from '@/components/motion/MotionFeatures'
import { TRANSITION } from '@/lib/motion/tokens'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { PhotoFallback } from '@/components/property/PhotoFallback'

/*
 * The seller's photo manager (UI-08, redrawn in UI-17).
 *
 * Reordering: drag a photo by its handle, or press Earlier, Later or Make
 * cover. Every change of order — drag, button, a rollback after a failed
 * save — travels by Motion's layout animation, loaded only here
 * (<MotionFeatures max>: drag and layout, a lazy chunk on the photo step).
 * It replaced UI-08's FLIP because a drag needs the photo under the
 * pointer while the others make room, which FLIP cannot do mid-gesture.
 * Reduced motion: MotionProvider's reducedMotion="user" makes layout
 * changes instant; dragging still follows the pointer, as it must.
 *
 * Upload zone: adapted from Kokonut UI's File Upload — github.com/
 * kokonut-labs/kokonutui at bb9120f8, components/kokonutui/file-upload.tsx
 * v2.0.0 by @dorianbaffier, MIT License. Kept: drop or paste onto a zone
 * that also opens the file chooser, armed while a file is dragged over the
 * window, ready while it is over the zone. Changed: the native labelled
 * file input stays the control (keyboard and screen readers use it as
 * before); no simulated progress (ours is the real XHR upload's); our
 * tokens; no animated icon; validation and compression stay ours.
 */

type Item = { id: string; name: string; url?: string; file?: File; photo?: Photo; phase: 'preparing' | 'uploading' | 'processing' | 'ready' | 'error'; progress: number; attempted?: boolean; error?: string; previewFailed?: boolean }
// aria-disabled, not disabled (UI-08, the UI-07 Button rule): a control
// disabled while it has focus sends focus to <body>, and every move used to
// do exactly that to the button just pressed. Each handler already refuses
// while busy or at the end of the list; the shared Button (secondaryBrand,
// UI-09) also refuses the press and draws the unavailable state.
const tool = 'rounded-full px-3 text-body-sm'
const icon = 'size-11 shrink-0 rounded-full p-0'
function Arrow({ back = false }: { back?: boolean }) {
  return <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={back ? 'M19 12H5M11 6l-6 6 6 6' : 'M5 12h14M13 6l6 6-6 6'} /></svg>
}
type Control = 'earlier' | 'later' | 'remove'
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
  const list = useRef<HTMLOListElement>(null)
  // Where focus goes once React has drawn a move or removal. The movement
  // itself is Motion's layout animation (UI-17; it was UI-08's FLIP), so a
  // drag, a button and a rollback all travel the same way.
  const after = useRef<{ focus?: { id: string; control: Control } | 'input' } | null>(null)
  // The latest order, for a drag's end handler (which closes over an
  // older render); kept in step after each commit.
  const itemsRef = useRef<Item[]>([])
  useLayoutEffect(() => { itemsRef.current = items }, [items])
  // The order when a drag began, to save or roll back to when it ends.
  const dragFrom = useRef<Item[] | null>(null)
  const lastSwap = useRef<{ id: string; at: number } | null>(null)
  // A file dragged anywhere over the window arms the drop zone; over the
  // zone itself it is ready to take it (Kokonut File Upload's states).
  const [armed, setArmed] = useState(false)
  const [over, setOver] = useState(false)
  const patch = (id: string, change: Partial<Item>) => { if (mounted.current) setItems(previous => previous.map(item => item.id === id ? { ...item, ...change } : item)) }
  useEffect(() => {
    mounted.current = true
    const urls = resources.current
    return () => { mounted.current = false; active.current?.abort(); for (const url of urls) URL.revokeObjectURL(url); urls.clear() }
  }, [])
  useLayoutEffect(() => {
    const pending = after.current
    if (!pending) return
    after.current = null
    const target = pending.focus
    if (target === 'input') document.getElementById('property-photos')?.focus()
    else if (target) list.current?.querySelector<HTMLElement>(`[data-flip-key="${target.id}"] [data-control="${target.control}"]`)?.focus()
  }, [items])
  useEffect(() => {
    let depth = 0
    const files = (e: globalThis.DragEvent) => Boolean(e.dataTransfer?.types.includes('Files'))
    const enter = (e: globalThis.DragEvent) => { if (files(e)) { depth++; setArmed(true) } }
    const leave = (e: globalThis.DragEvent) => { if (files(e) && --depth <= 0) { depth = 0; setArmed(false); setOver(false) } }
    const drop = () => { depth = 0; setArmed(false); setOver(false) }
    window.addEventListener('dragenter', enter); window.addEventListener('dragleave', leave); window.addEventListener('drop', drop)
    return () => { window.removeEventListener('dragenter', enter); window.removeEventListener('dragleave', leave); window.removeEventListener('drop', drop) }
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
      // The photos after it slide up into the gap, and focus moves to the
      // photo that took its place (or the one before, or the picker) instead
      // of falling to the top of the page with the removed button.
      const index = items.findIndex(photo => photo.id === item.id)
      const neighbour = items[index + 1] ?? items[index - 1]
      after.current = { focus: neighbour ? { id: neighbour.id, control: 'remove' } : 'input' }
      setItems(previous => previous.filter(photo => photo.id !== item.id)); setNotice(`${item.name} removed.`)
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not remove photo.') }
    finally { lock.current = false; setBusy(false) }
  }
  async function move(index: number, target: number, control: Control) {
    if (lock.current || items.some(item => item.phase !== 'ready') || target < 0 || target >= items.length) return
    const previous = items
    const ordered = [...items]; const [item] = ordered.splice(index, 1)
    if (!item) return
    ordered.splice(target, 0, item); lock.current = true; setBusy(true)
    // The photo moves at once and travels from its old place to its new one,
    // so the eye follows it across the grid; the order is saved behind it.
    // If saving fails it travels back and the notice says why. Focus stays
    // on the control pressed — or, once the photo reaches an end, on the one
    // that still has somewhere to go ("Make cover" leaves the first photo).
    const edge = control === 'earlier' && target === 0 ? 'later' : control === 'later' && target === items.length - 1 ? 'earlier' : control
    after.current = { focus: { id: item.id, control: edge } }
    setItems(ordered)
    try { await jsonRequest('PATCH', { collection, ids: ordered.map(photo => photo.id) }); if (mounted.current) setNotice(`${item.name} moved to position ${target + 1}.`) }
    catch (error) {
      if (mounted.current) {
        // Back where it was, so the control pressed makes sense again.
        after.current = { focus: { id: item.id, control } }
        setItems(previous)
        setNotice(error instanceof Error ? `${error.message} The photo is back in position ${index + 1}.` : `Could not save photo order. The photo is back in position ${index + 1}.`)
      }
    }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  const canOrder = !busy && items.every(item => item.phase === 'ready')

  // Drag to reorder (UI-17): the photo follows the pointer from its handle,
  // the others make room as it passes over them, and the order is saved
  // when it is let go — or put back if saving fails, as a button move is.
  function dragStart() { if (canOrder) { dragFrom.current = itemsRef.current; lastSwap.current = null } }
  function dragOver(id: string, info: PanInfo, time: number) {
    if (!dragFrom.current) return
    // No edge auto-scroll: Motion re-runs a drag on scroll, so scrolling
    // from here fed itself and ran the page away (UI-17, measured). A photo
    // beyond the screen moves with Earlier, Later or Make cover.
    // The photo under the dragged one's centre, not under the pointer: the
    // handle sits in a corner, and the slot that opens should be the one
    // the photo is seen to cover.
    const self = list.current?.querySelector<HTMLElement>(`[data-flip-key="${id}"]`)
    const box = self?.getBoundingClientRect()
    const x = box ? box.left + box.width / 2 : info.point.x - window.scrollX, y = box ? box.top + box.height / 2 : info.point.y - window.scrollY
    // Clamped to the screen: part of a tall photo can hang off its edge, and
    // nothing is found at a point outside the viewport.
    const at = document.elementsFromPoint(Math.min(Math.max(x, 1), window.innerWidth - 1), Math.min(Math.max(y, 1), window.innerHeight - 1))
      .map(el => (el as HTMLElement).closest<HTMLElement>('[data-flip-key]')).find(el => el && el.dataset.flipKey !== id)
    const target = at?.dataset.flipKey
    if (!target) return
    // The photo just swapped out is still sliding away under this one for
    // the layout animation's length; swapping with it again would bounce.
    if (lastSwap.current && lastSwap.current.id === target && time - lastSwap.current.at < 450) return
    lastSwap.current = { id: target, at: time }
    setItems(previous => {
      const from = previous.findIndex(i => i.id === id), to = previous.findIndex(i => i.id === target)
      if (from < 0 || to < 0 || from === to) return previous
      const next = [...previous]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved!); return next
    })
  }
  async function dragEnd(id: string) {
    const start = dragFrom.current
    dragFrom.current = null
    if (!start) return
    const now = itemsRef.current
    if (now.every((item, i) => item.id === start[i]?.id)) return
    const item = now.find(i => i.id === id)!, index = now.indexOf(item)
    lock.current = true; setBusy(true)
    try { await jsonRequest('PATCH', { collection, ids: now.map(photo => photo.id) }); if (mounted.current) setNotice(`${item.name} moved to position ${index + 1}.`) }
    catch (error) {
      if (mounted.current) {
        setItems(start)
        setNotice(error instanceof Error ? `${error.message} The photos are back in their previous order.` : 'Could not save photo order. The photos are back in their previous order.')
      }
    }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  const full = items.length >= PHOTO_LIMIT
  const inputOff = busy || loading || loadError || full
  const zoneDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault(); setOver(false); setArmed(false)
    if (!inputOff) void add(Array.from(event.dataTransfer.files))
  }

  return <MotionFeatures max><div className="mt-7">
    {/* The upload zone: the labelled file input, drawn as a drop target —
        drop or paste photos on it, or press it to choose. Kokonut UI's File
        Upload drop-zone technique (see the file header), around the native
        input, which keeps keyboard, screen-reader and no-drag use. */}
    <label
      htmlFor="property-photos"
      onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = inputOff ? 'none' : 'copy'; setOver(true) } }}
      onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) setOver(false) }}
      onDrop={zoneDrop}
      onPaste={(event) => { if (event.clipboardData.files.length && !inputOff) { event.preventDefault(); void add(Array.from(event.clipboardData.files)) } }}
      data-armed={armed || undefined}
      data-over={over || undefined}
      aria-disabled={inputOff || undefined}
      className="photo-zone flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-brand-200 bg-brand-50 px-5 py-8 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-600 sm:flex-row sm:text-left"
    >
      <span aria-hidden className="photo-zone-icon grid size-14 shrink-0 place-items-center rounded-full bg-surface-000 text-brand-700 shadow-e1">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-lg font-semibold text-ink-900">{over ? 'Drop to add these photos' : full ? `You have added ${PHOTO_LIMIT} photos` : 'Add property photos'}</span>
        <span id="photo-guidance" className="mt-1 block text-body-sm text-ink-700">Drag photos here, paste them, or choose files. JPEG, PNG or WebP · Up to 20 MB each · {PHOTO_LIMIT} photos maximum · At least 320 pixels on each side. Photos are compressed before upload.</span>
      </span>
      <span className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-brand-600 px-5 text-label text-on-brand">Choose photos</span>
      <input id="property-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={inputOff} aria-describedby="photo-guidance" className="sr-only" onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void add(files) }} />
    </label>

    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <p role="status" aria-live="polite" className="break-words [overflow-wrap:anywhere] text-body-sm text-ink-700">{loading ? 'Loading your photos…' : notice || `${items.filter(item => item.phase === 'ready').length} photos uploaded. The first photo is your cover.`}</p>
      {items.length > 1 && canOrder && <p className="text-caption text-ink-500">Drag a photo by its handle, or use Earlier and Later.</p>}
    </div>
    {loadError && <Button type="button" variant="secondaryBrand" className={`${tool} mt-3`} onClick={() => window.location.reload()}>Reload photos</Button>}

    <ol ref={list} aria-label="Property photos" className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <PhotoTile
          key={item.id}
          item={item}
          index={index}
          count={items.length}
          canOrder={canOrder}
          busy={busy}
          onDragStart={dragStart}
          onDrag={(info, time) => dragOver(item.id, info, time)}
          onDragEnd={() => void dragEnd(item.id)}
          onEarlier={() => { if (canOrder) void move(index, index - 1, 'earlier') }}
          onLater={() => { if (canOrder) void move(index, index + 1, 'later') }}
          onCover={() => { if (canOrder) void move(index, 0, 'later') }}
          onRetry={() => { if (!busy) void retry(item) }}
          onRemove={() => { if (!busy) void remove(item) }}
          onPreviewFail={() => patch(item.id, { previewFailed: true, error: 'Preview unavailable. Reload photos to try again.' })}
        />
      ))}
    </ol>
    {!loading && !items.length && !loadError && (
      <div className="mt-2 rounded-lg border border-border-subtle bg-surface-000 p-6 text-center sm:p-8">
        <span aria-hidden className="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.75" /><path d="M20.5 16l-5-5-8 8" /></svg>
        </span>
        <p className="mt-3 font-display text-body-lg font-semibold text-ink-900">No photos yet</p>
        <p className="mx-auto mt-1 max-w-md text-body-sm text-ink-700">Start with a clear view of the home, then add rooms and amenities. The first photo becomes the cover.</p>
      </div>
    )}
    <div className="mt-6 flex gap-3 rounded-lg bg-surface-200 p-4 text-body-sm text-ink-700">
      <svg viewBox="0 0 24 24" className="mt-0.5 size-5 shrink-0 text-brand-700" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>
      <p><strong className="text-ink-900">Your photos stay private.</strong> Uploaded photos are stored in this collection. Save as draft to keep this collection with your property answers, or return through My drafts if already saved. Nothing is published.</p>
    </div>
    <noscript><p className="mt-4 text-danger-600">Enable JavaScript to prepare, upload and arrange photos.</p></noscript>
  </div></MotionFeatures>
}

/**
 * One photo (UI-17): the image at 4:3 with its place and the cover marked
 * on it, a drag handle for pointers, the upload's progress or its problem
 * over the image, and the keyboard tools under it. The tools are the way
 * to reorder without dragging, and each keeps focus through its own move
 * (UI-08).
 */
function PhotoTile({ item, index, count, canOrder, busy, onDragStart, onDrag, onDragEnd, onEarlier, onLater, onCover, onRetry, onRemove, onPreviewFail }: {
  item: Item; index: number; count: number; canOrder: boolean; busy: boolean
  onDragStart: () => void; onDrag: (info: PanInfo, time: number) => void; onDragEnd: () => void
  onEarlier: () => void; onLater: () => void; onCover: () => void; onRetry: () => void; onRemove: () => void; onPreviewFail: () => void
}) {
  const controls = useDragControls()
  const [dragging, setDragging] = useState(false)
  const working = item.phase === 'preparing' || item.phase === 'uploading' || item.phase === 'processing'
  const cover = index === 0 && item.phase === 'ready'
  const status = item.phase === 'ready' ? `Uploaded · ${Math.ceil((item.photo?.bytes ?? 0) / 1024)} KB` : item.phase === 'preparing' ? 'Preparing photo…' : item.phase === 'processing' ? 'Checking and storing photo…' : item.phase === 'uploading' ? `Uploading ${item.progress}%` : 'Upload needs attention'
  return (
    <m.li
      layout
      transition={TRANSITION.layout}
      // A photo just added arrives; photos that load with the page are
      // simply there (a confirmation never plays on load).
      initial={item.file ? { opacity: 0, scale: 0.96 } : false}
      animate={{ opacity: 1, scale: 1 }}
      drag={canOrder && count > 1}
      dragControls={controls}
      dragListener={false}
      dragSnapToOrigin
      dragMomentum={false}
      onDragStart={() => { setDragging(true); onDragStart() }}
      onDrag={(event, info) => onDrag(info, event.timeStamp)}
      onDragEnd={() => { setDragging(false); onDragEnd() }}
      data-flip-key={item.id}
      data-dragging={dragging || undefined}
      // A row on a phone (photo beside its tools), a card from 640px.
      className="photo-tile relative grid min-w-0 grid-cols-[8rem_minmax(0,1fr)] overflow-hidden rounded-lg border border-border-subtle bg-surface-000 shadow-e1 sm:block"
    >
      <div className="relative h-full min-h-40 overflow-hidden bg-surface-200 sm:aspect-[4/3] sm:h-auto sm:min-h-0">
        {/* Local blobs and authenticated private image endpoints cannot use the public image optimizer. */}
        {/* A preview that fails is the shared PhotoFallback (UI-16), not the browser's broken icon. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {item.url && !item.previewFailed && <img src={item.url} alt={`Preview of ${item.name}`} draggable={false} className="h-full w-full object-cover" onError={onPreviewFail} />}
        {item.url && item.previewFailed && <PhotoFallback alt={`Preview of ${item.name}`} size="compact" />}
        <span aria-hidden className="absolute left-2 top-2 grid size-8 place-items-center rounded-full bg-surface-000/95 text-label font-bold text-ink-900 shadow-e1 tabular">{index + 1}</span>
        {cover && <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1 text-caption font-semibold text-on-brand shadow-e1">
          <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z" /></svg>
          <span>Cover<span className="hidden sm:inline"> photo</span></span>
        </span>}
        {canOrder && count > 1 && (
          // Pointer-only: the tools below reorder from the keyboard.
          <span
            aria-hidden
            title="Drag to reorder"
            onPointerDown={(event: ReactPointerEvent) => { event.preventDefault(); controls.start(event) }}
            className="photo-handle absolute right-2 top-2 grid size-11 cursor-grab touch-none place-items-center rounded-full bg-surface-000/95 text-ink-700 shadow-e1 active:cursor-grabbing"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="currentColor"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
          </span>
        )}
        {working && (
          <div className="absolute inset-0 flex flex-col justify-end bg-ink-900/45 p-3">
            <p className="text-caption font-semibold text-ink-inverse">{status}</p>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-ink-inverse/30">
              <span className="block h-full rounded-full bg-ink-inverse transition-[width] duration-(--duration-base)" style={{ width: `${item.phase === 'uploading' ? item.progress : item.phase === 'processing' ? 100 : 8}%` }} />
            </span>
          </div>
        )}
        {item.phase === 'error' && !item.previewFailed && <span className="absolute bottom-2 left-2 rounded-full bg-danger-600 px-3 py-1 text-caption font-semibold text-on-danger">Upload needs attention</span>}
      </div>
      <div className="min-w-0 p-3">
        <p className="break-all text-body-sm font-semibold text-ink-900"><span className="sr-only">{index + 1}. </span>{item.name}</p>
        <p className={cn('mt-0.5 text-caption', item.phase === 'error' ? 'text-danger-600' : 'text-ink-500')}>{status}</p>
        {item.phase === 'uploading' && <progress aria-label={`Upload progress for ${item.name}`} value={item.progress} max={100} className="sr-only" />}
        {item.error && <p className="mt-2 break-words text-caption text-danger-600">{item.error}</p>}
        {/* One row: the arrows and Make cover reorder without dragging;
            Remove sits apart at the end. Icon buttons keep their full
            names ("Move kitchen.jpg earlier") for assistive technology. */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondaryBrand" data-control="earlier" className={icon} title="Earlier" aria-disabled={!canOrder || index === 0 || undefined} aria-label={`Move ${item.name} earlier`} onClick={onEarlier}><Arrow back /></Button>
          <Button type="button" variant="secondaryBrand" data-control="later" className={icon} title="Later" aria-disabled={!canOrder || index === count - 1 || undefined} aria-label={`Move ${item.name} later`} onClick={onLater}><Arrow /></Button>
          {index > 0 && <Button type="button" variant="secondaryBrand" className={tool} aria-disabled={!canOrder || undefined} aria-label={`Make ${item.name} cover`} onClick={onCover}>Make cover</Button>}
          {item.phase === 'error' && item.file && <Button type="button" variant="secondaryBrand" className={tool} aria-disabled={busy || undefined} onClick={onRetry}>Retry upload</Button>}
          <Button type="button" variant="tertiary" data-control="remove" className={cn(icon, 'ml-auto text-danger-600 hover:bg-danger-100')} title="Remove" aria-disabled={busy || undefined} aria-label={`Remove ${item.name}`} onClick={onRemove}>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5" /></svg>
          </Button>
        </div>
      </div>
    </m.li>
  )
}

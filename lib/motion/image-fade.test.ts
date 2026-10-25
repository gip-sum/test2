import { describe, expect, it, vi } from 'vitest'
import { photoRef } from './image-fade'

/** Enough of an <img> for the ref: what it reads, and a src that must never be written. */
function img(state: { complete: boolean; naturalWidth: number; currentSrc?: string }) {
  const listeners = new Map<string, () => void>()
  let writes = 0
  const el = {
    ...state, currentSrc: state.currentSrc ?? '/api/listings/l/photos/p?w=320', dataset: {} as Record<string, string>,
    addEventListener: vi.fn((type: string, fn: () => void) => listeners.set(type, fn)),
    removeEventListener: vi.fn((type: string) => listeners.delete(type)),
    get src() { return this.currentSrc }, set src(_v: string) { writes++ },
  }
  return { el: el as unknown as HTMLImageElement, fire: (type: string) => listeners.get(type)?.(), writes: () => writes, listening: () => listeners.size }
}

describe('photoRef (UI-22)', () => {
  it('reports a photo that failed before React attached, without re-requesting it', () => {
    const onFail = vi.fn(), i = img({ complete: true, naturalWidth: 0 })
    photoRef(onFail)(i.el)
    expect(onFail).toHaveBeenCalledOnce(); expect(i.writes()).toBe(0)
  })
  it('reports a later failure, and stops listening on cleanup', () => {
    const onFail = vi.fn(), i = img({ complete: false, naturalWidth: 0 })
    const cleanup = photoRef(onFail)(i.el)
    expect(i.el.dataset.fade).toBe('pending')
    i.fire('error'); expect(onFail).toHaveBeenCalledOnce()
    ;(cleanup as () => void)(); expect(i.listening()).toBe(0)
    expect(i.writes()).toBe(0)
  })
  it('leaves a photo that loaded alone: no failure, no fade mark', () => {
    const onFail = vi.fn(), i = img({ complete: true, naturalWidth: 640 })
    photoRef(onFail)(i.el)
    expect(onFail).not.toHaveBeenCalled(); expect(i.el.dataset.fade).toBeUndefined(); expect(i.writes()).toBe(0)
  })
})

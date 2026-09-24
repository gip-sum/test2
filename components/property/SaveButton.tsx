'use client'

import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/cn'
import { useSaved } from './SavedProvider'

export function SaveButton({ publicId, title, className }: { publicId: string; title: string; className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const { state, ids, busy, toggle, retry } = useSaved()
  const saved = ids.has(publicId)
  const pending = busy.has(publicId)

  async function click(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (state === 'signed-out') {
      router.push(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }
    if (state === 'error') { retry(); return }
    if (state !== 'ready' || pending) return
    const result = await toggle(publicId, !saved)
    if (result === 'signed-out') router.push(`/login?next=${encodeURIComponent(pathname)}`)
    if (result === 'ok' && pathname === '/account/saved') router.refresh()
  }

  return (
    <button
      type="button"
      aria-pressed={state === 'ready' ? saved : undefined}
      aria-busy={pending}
      aria-label={state === 'loading' ? 'Checking saved status' : state === 'error' ? 'Retry loading saved properties' : saved ? `Remove ${title} from saved` : `Save ${title}`}
      disabled={state === 'loading' || pending}
      onClick={click}
      className={cn(
        'relative z-10 grid size-11 place-items-center rounded-full border border-border-subtle bg-surface-000/95 focus-visible:outline-2 focus-visible:outline-focus-ring disabled:opacity-60',
        saved ? 'text-danger-600' : 'text-ink-700 hover:text-danger-600',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" aria-hidden>
        <path d="M12 20s-7-4.4-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.6-7 9-7 9z" />
      </svg>
    </button>
  )
}

import { cn } from '@/lib/cn'

/**
 * Skeletons, never spinners, for content areas.
 *
 * A skeleton's dimensions must match the real element exactly — that is
 * most of how CLS stays under 0.05. The shimmer is suppressed under
 * prefers-reduced-motion by the global rule in globals.css.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn('block animate-pulse rounded-sm bg-surface-200', className)} />
}

import { cn } from '@/lib/cn'

/**
 * Skeletons, never spinners, for content areas.
 *
 * A skeleton's dimensions must match the real element exactly — that is
 * most of how CLS stays under 0.05. The shimmer (.skeleton in the motion
 * layer of globals.css) is a transformed pseudo-element inside the box, so it
 * never changes the box; the global reduced-motion rule stops it, leaving
 * the plain block.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn('skeleton block rounded-sm bg-surface-200', className)} />
}

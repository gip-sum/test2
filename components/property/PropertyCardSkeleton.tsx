import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'

/**
 * Loading state for a result list.
 *
 * Dimensions match PropertyCard exactly — a skeleton of the wrong height
 * causes the layout shift it exists to prevent.
 */
export function PropertyCardSkeleton({ layout = 'vertical' }: { layout?: 'vertical' | 'responsive' }) {
  const responsive = layout === 'responsive'
  return (
    <div
      aria-hidden
      className={cn(
        'overflow-hidden rounded-lg border border-border-subtle bg-surface-000 shadow-e1',
        responsive ? 'flex md:flex-col' : 'flex flex-col',
      )}
    >
      <Skeleton
        className={cn(
          'rounded-none',
          responsive ? 'aspect-[4/3] w-[38%] max-w-[190px] shrink-0 md:aspect-[1.55] md:w-full md:max-w-none' : 'aspect-[1.55] w-full',
        )}
      />
      <div className={cn('flex flex-1 flex-col gap-2', responsive ? 'p-3 md:p-5' : 'p-5')}>
        <Skeleton className="h-6 w-2/5" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-auto h-3.5 w-2/5" />
      </div>
    </div>
  )
}

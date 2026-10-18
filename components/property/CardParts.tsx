import Link from 'next/link'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import type { ListingBadge } from '@/lib/property/badges'
import { cn } from '@/lib/cn'

/**
 * Pieces every listing card shares (UI-06), so the two public cards —
 * PropertyCard for comparing, CompactPropertyCard for browsing rails —
 * differ only where their jobs differ.
 */

/**
 * The card's one link: the title, stretched over the whole card by its
 * ::after, so the card is a single tab stop and the save heart stays a
 * separate control above it rather than a nested one.
 */
export function CardTitleLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="outline-none after:absolute after:inset-0">
      {children}
    </Link>
  )
}

/**
 * The card draws its focus ring when its link is focused — and only then.
 * `focus-within` also lit the whole card when the heart had focus, which
 * did not say which of the two was focused; the heart has its own ring.
 */
export const CARD_FOCUS = 'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus-ring'

/** Badges over the photo's top-left corner. */
export function CardBadges({ badges, className }: { badges: ListingBadge[]; className?: string }) {
  if (!badges.length) return null
  return (
    <div className={cn('absolute left-2 top-2 flex flex-wrap gap-1', className)}>
      {badges.map((b) => <Badge key={b.label} tone={b.tone}>{b.label}</Badge>)}
    </div>
  )
}

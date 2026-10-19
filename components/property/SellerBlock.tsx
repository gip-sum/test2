import { SELLER_LABEL, type PropertyDetail } from '@/lib/property/types'
import { formatPostedAt } from '@/lib/format/date'
import { cn } from '@/lib/cn'

type Seller = Pick<PropertyDetail, 'sellerType' | 'sellerName'> & { postedAt?: string }

/**
 * Who is advertising this property.
 *
 * §5 calls for "verification information" here. There is none to show:
 * the platform verifies nothing in this release, and Phase 65 is where
 * verification becomes a defined, earned claim. So this block states what
 * is actually known — the category of seller, their name where given, and
 * how long the listing has been up — and says plainly that the category is
 * self-declared. No rating, response time or deal count: the platform has
 * measured none of them.
 *
 * NO PHONE NUMBER APPEARS HERE, masked or otherwise. Phase 10 owns
 * controlled phone access with OTP and an audit trail; a masked number
 * shipped now would have to be unshipped then.
 */
export function SellerBlock({ property }: { property: Seller }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-000 p-4">
      <SellerIdentity property={property} />
      <SellerNote className="mt-3 border-t border-border-subtle pt-3" />
    </div>
  )
}

/**
 * The seller's name and category (UI-16), shared by this block and the
 * contact card. The monogram is the seller's own initials — a name the
 * listing holds — and an outline figure when the listing gives none.
 */
export function SellerIdentity({ property }: { property: Seller }) {
  const name = property.sellerName ?? SELLER_LABEL[property.sellerType]
  const initials = property.sellerName
    ? property.sellerName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
    : null
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-100 font-display text-body-lg font-bold text-brand-700">
        {initials ?? (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M4.5 20a7.5 7.5 0 0115 0" />
          </svg>
        )}
      </span>
      <div className="min-w-0">
        <p className="break-words text-body font-semibold text-ink-900">{name}</p>
        <p className="mt-0.5 text-body-sm text-ink-500">
          {/* formatPostedAt already reads "Posted last week" — prefixing
              it with "Listed" produced "Listed posted last week". */}
          {SELLER_LABEL[property.sellerType]} · {property.postedAt ? formatPostedAt(property.postedAt) : 'Not published'}
        </p>
      </div>
    </div>
  )
}

export function SellerNote({ className }: { className?: string }) {
  return (
    <p className={cn('text-caption text-ink-500', className)}>
      Owner, agent and builder are self-declared by whoever posted the listing. We have not
      verified this seller&rsquo;s identity or their right to sell this property.
    </p>
  )
}

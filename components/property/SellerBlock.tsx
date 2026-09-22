import { SELLER_LABEL, type PropertyDetail } from '@/lib/property/types'
import { formatPostedAt } from '@/lib/format/date'

/**
 * Who is advertising this property.
 *
 * §5 calls for "verification information" here. There is none to show:
 * the platform verifies nothing in this release, and Phase 65 is where
 * verification becomes a defined, earned claim. So this block states what
 * is actually known — the category of seller, their name where given, and
 * how long the listing has been up — and says plainly that the category is
 * self-declared.
 *
 * NO PHONE NUMBER APPEARS HERE, masked or otherwise. Phase 10 owns
 * controlled phone access with OTP and an audit trail; a masked number
 * shipped now would have to be unshipped then.
 */
export function SellerBlock({ property }: { property: PropertyDetail }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-000 p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M4.5 20a7.5 7.5 0 0115 0" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-body font-semibold text-ink-900">
            {property.sellerName ?? SELLER_LABEL[property.sellerType]}
          </p>
          <p className="mt-0.5 text-body-sm text-ink-500">
            {/* formatPostedAt already reads "Posted last week" — prefixing
                it with "Listed" produced "Listed posted last week". */}
            {SELLER_LABEL[property.sellerType]} · {formatPostedAt(property.postedAt)}
          </p>
        </div>
      </div>
      <p className="mt-3 border-t border-border-subtle pt-3 text-caption text-ink-500">
        Owner, agent and builder are self-declared by whoever posted the listing. We have not
        verified this seller&rsquo;s identity or their right to sell this property.
      </p>
    </div>
  )
}

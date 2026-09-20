import Link from 'next/link'

/**
 * Supply-side call to action.
 *
 * Supply is the scarce side of a two-sided marketplace, which is why this
 * band exists and why it uses the supply accent rather than the brand
 * colour — a seller must never confuse it with the buyer's action.
 *
 * Phase 5 suppresses it for accounts that already have active listings.
 */
export function SupplyCta() {
  return (
    <section
      aria-labelledby="post-cta"
      className="rounded-lg border border-supply-600/20 bg-supply-100 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h2 id="post-cta" className="font-display text-heading-3 text-ink-900">
            Have a property to sell or rent out?
          </h2>
          <p className="mt-2 text-body-sm text-ink-700">
            Post it yourself in a few minutes. Add photos, set your price, and reach buyers and
            tenants searching in your locality. Enquiries come straight to you.
          </p>
        </div>
        <Link
          href="/post"
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-md bg-supply-600 px-6 text-label text-on-supply hover:brightness-95"
        >
          Post your property
        </Link>
      </div>
    </section>
  )
}

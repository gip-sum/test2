import Link from 'next/link'

export function SupplyCta() {
  return (
    <section aria-labelledby="post-cta" className="seller-invitation">
      <div className="seller-orbit" aria-hidden="true"><span>⌂</span></div>
      <div className="relative max-w-xl">
        <p className="text-overline uppercase tracking-[0.18em]">FOR OWNERS, AGENTS & BUILDERS</p>
        <h2 id="post-cta" className="mt-3 sm:mt-4">Every home has a story.<br /><em>Start its next chapter.</em></h2>
        <p className="mt-3 max-w-md text-body sm:mt-5 sm:text-body-lg">Have a place to sell or rent? Explore how to bring your property to GharBazaar.</p>
        <Link href="/post" className="seller-link mt-5 inline-flex sm:mt-7 min-h-12 items-center gap-8 rounded-full px-6 text-label">Post your property <span aria-hidden>↗</span></Link>
      </div>
    </section>
  )
}

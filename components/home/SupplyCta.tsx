import Link from 'next/link'
import { ArrowRightIcon, CheckIcon } from '@/components/ui/icons'
import { BRAND } from '@/lib/brand'

/**
 * The seller invitation (UI-14): a forest band inside the page, saying
 * what posting involves — the real steps of the posting flow, in its
 * order — and where it leads. No promised response times, buyer numbers
 * or "free forever": nothing the product has not measured or decided.
 */
const STEPS = [
  { title: 'Describe the property', body: 'Type, size with carpet area, location and price.' },
  { title: 'Review it as buyers will see it', body: 'Check every detail before it goes anywhere.' },
  { title: 'Add photos and submit', body: `Your listing is checked by the ${BRAND.shortName} team before it is published.` },
]

export function SupplyCta() {
  return (
    <section aria-labelledby="post-cta" className="pb-10 pt-10 md:pb-16 md:pt-16 xl:pt-20">
      <div className="home-container">
        <div className="home-seller grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:gap-14 lg:p-14">
          <div>
            <p className="flex items-center gap-2 text-overline uppercase text-mint">
              <span aria-hidden className="h-0.5 w-6 rounded-full bg-mint" />For owners, agents and builders
            </p>
            <h2 id="post-cta" className="mt-3 font-display text-heading-1 lg:text-display-1">
              Selling or renting out? <span className="text-mint">List it on {BRAND.shortName}.</span>
            </h2>
            <p className="mt-4 max-w-lg text-body text-on-forest/80 lg:text-body-lg">
              Your listing appears in search by neighbourhood, budget and size, and every enquiry arrives in your own enquiry list.
            </p>
            <Link href="/post" className="home-arrow-card mt-6 inline-flex min-h-12 items-center gap-3 rounded-full bg-supply-600 px-6 text-label text-on-supply shadow-e2 lg:mt-8">
              Post your property <ArrowRightIcon className="home-arrow size-4" />
            </Link>
          </div>
          <ol className="grid gap-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4 rounded-md bg-on-forest/[0.07] p-4 ring-1 ring-forest-line lg:p-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint font-display text-label text-forest" aria-hidden>{index + 1}</span>
                <span className="min-w-0">
                  <span className="block text-body font-semibold">{step.title}</span>
                  <span className="mt-0.5 block text-body-sm text-on-forest/75">{step.body}</span>
                </span>
              </li>
            ))}
            <li className="flex items-center gap-2 px-1 text-body-sm text-on-forest/75">
              <CheckIcon className="size-4 text-mint" />You can save a draft and come back to it.
            </li>
          </ol>
        </div>
      </div>
    </section>
  )
}

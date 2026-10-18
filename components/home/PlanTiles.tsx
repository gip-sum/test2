import Link from 'next/link'
import { SectionHeading } from './SectionHeading'
import { CALCULATORS } from '@/components/calculators/catalogue'
import { ArrowRightIcon } from '@/components/ui/icons'

/**
 * Plan your purchase (UI-14): the two calculators as wide cards, each a
 * single link, with what it works out in a sentence. No figures here: the
 * answers live on the calculator pages, from the visitor's own numbers.
 */
export function PlanTiles() {
  return (
    <section aria-labelledby="plan-purchase" className="home-band">
      <div className="home-container">
        <SectionHeading
          id="plan-purchase"
          eyebrow="Plan your purchase"
          title="Know your budget before you visit"
          description="Two calculators that work from your own numbers. The budget calculator links to the homes that fit."
          action={{ href: '/calculators', label: 'All tools', context: 'calculators' }}
        />
        <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:mt-8 lg:gap-5">
          {CALCULATORS.map(({ href, body, Icon }, index) => (
            <li key={href}>
              <Link href={href} className="home-card home-arrow-card group flex h-full items-start gap-4 rounded-lg border border-border-subtle bg-surface-000 p-5 shadow-e1 lg:gap-5 lg:p-6">
                <span className={index === 0 ? 'grid size-14 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700' : 'grid size-14 shrink-0 place-items-center rounded-md bg-supply-100 text-supply-700'} aria-hidden>
                  <Icon className="size-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-heading-3 text-ink-900">{href.endsWith('/budget') ? 'Budget calculator' : 'Home loan EMI calculator'}</span>
                  <span className="mt-1.5 block text-body text-ink-700">{body}</span>
                  <span className="mt-3 inline-flex items-center gap-2 text-label text-brand-700">
                    Open calculator <ArrowRightIcon className="home-arrow size-4" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

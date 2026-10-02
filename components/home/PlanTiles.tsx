import Link from 'next/link'
import { SectionHeading } from './SectionHeading'
import { CALCULATORS } from '@/components/calculators/catalogue'
import { ChevronRightIcon } from '@/components/ui/icons'

/**
 * The two questions before the search: what can I afford, and what will it
 * cost each month. Both are working calculators (Phase 40A); the budget
 * one ends in a search capped at the answer.
 */
export function PlanTiles() {
  return (
    <section aria-labelledby="plan-purchase" className="home-section reference-tools">
      <SectionHeading
        id="plan-purchase"
        eyebrow="Plan your purchase"
        title="Use popular tools"
        description="Go from browsing to buying"
        action={{ href: '/calculators', label: 'View all' }}
      />
      <ul className="calc-index mt-4">
        {CALCULATORS.map(({ href, body, Icon }) => (
          <li key={href}>
            <Link href={href} className="calc-index-card">
              <span className="calc-index-icon" aria-hidden="true"><Icon className="size-6" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-ink-900">{href.endsWith('/budget') ? 'Budget Calculator' : 'EMI Calculator'}</span>
                <span className="mt-0.5 block text-body-sm text-ink-700">{body}</span>
              </span>
              <ChevronRightIcon className="size-5 shrink-0 text-brand-600" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { Footer } from '@/components/navigation/Footer'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { ChevronRightIcon } from '@/components/ui/icons'
import { CALCULATORS } from '@/components/calculators/catalogue'

export const metadata: Metadata = {
  title: 'Home loan calculators',
  description: 'Work out your home budget and the monthly EMI on a home loan.',
}


/** The calculators' index: /calculators exists so a trimmed URL never 404s. */
export default function CalculatorsPage() {
  return (
    <PageShell footer={<Footer />}>
      <div className="mx-auto max-w-[1180px] px-4 pb-10 pt-4 lg:px-8 lg:pt-6">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Calculators' }]} />
        <h1 className="mt-3 font-display text-heading-1 text-ink-900">Home loan calculators</h1>
        <p className="mt-2 max-w-2xl text-body text-ink-700">Two questions every buyer asks before choosing a home.</p>
        <ul className="calc-index mt-6">
          {CALCULATORS.map(({ href, title, body, Icon }) => (
            <li key={href}>
              <Link href={href} className="calc-index-card">
                <span className="calc-index-icon" aria-hidden="true"><Icon className="size-6" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body-lg font-semibold text-ink-900">{title}</span>
                  <span className="mt-1 block text-body-sm text-ink-700">{body}</span>
                </span>
                <ChevronRightIcon className="size-5 shrink-0 text-brand-600" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  )
}

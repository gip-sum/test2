import Link from 'next/link'
import type { ReactNode } from 'react'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { ChevronRightIcon } from '@/components/ui/icons'

/**
 * The shared frame of a calculator page: where it sits, what it answers,
 * the calculator, and the way to its companion. Each calculator answers
 * half of one question — what can I afford, and what will it cost me each
 * month — so each ends by pointing at the other.
 */
export function CalculatorFrame({
  title,
  intro,
  crumb,
  sibling,
  children,
}: {
  title: string
  intro: string
  crumb: string
  sibling: { href: string; label: string; hint: string }
  children: ReactNode
}) {
  return (
    <div className="calc-frame mx-auto max-w-[1180px] px-4 pb-10 pt-4 lg:px-8 lg:pt-6">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Calculators', href: '/calculators' }, { label: crumb }]} />
      <h1 className="mt-3 font-display text-heading-1 text-ink-900 lg:text-display-1">{title}</h1>
      <p className="mt-2 max-w-2xl text-body text-ink-700">{intro}</p>
      <div className="mt-6">{children}</div>
      <Link href={sibling.href} className="calc-sibling">
        <span className="min-w-0">
          <span className="block text-body font-semibold text-ink-900">{sibling.label}</span>
          <span className="block text-body-sm text-ink-700">{sibling.hint}</span>
        </span>
        <ChevronRightIcon className="size-5 shrink-0 text-brand-600" />
      </Link>
    </div>
  )
}

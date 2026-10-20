import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * One answer to a first-steps question (UI-17): an icon, the answer and one
 * line on what it means. A plain link — each answer is its own URL, so the
 * steps work without JavaScript and Back returns to the question. Lifts
 * only under a pointer that hovers (.post-choice, app/globals.css).
 */
export function ChoiceCard({ href, icon, title, description }: { href: string; icon: ReactNode; title: string; description: string }) {
  return (
    <li className="flex">
      <Link href={href} className="post-choice group flex w-full items-center gap-4 rounded-lg border border-border-subtle bg-surface-000 p-4 shadow-e1 hover:border-brand-600 sm:p-5">
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 [&>svg]:size-6">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-body-lg font-semibold text-ink-900">{title}</span>
          <span className="mt-0.5 block text-body-sm text-ink-700">{description}</span>
        </span>
        <svg viewBox="0 0 24 24" className="post-choice-arrow size-5 shrink-0 text-brand-700" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      </Link>
    </li>
  )
}

import Link from 'next/link'

export function ChoiceCard({ href, number, title, description }: { href: string; number: string; title: string; description: string }) {
  return (
    <li>
      <Link href={href} className="post-choice group flex min-h-[116px] items-start gap-4 rounded-lg border border-border-subtle bg-surface-000 p-5 shadow-e1 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-e2 sm:p-6">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-display text-label text-brand-700">{number}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-body-lg font-semibold text-ink-900">{title}</span>
          <span className="mt-1.5 block text-body-sm text-ink-700">{description}</span>
        </span>
        <span aria-hidden="true" className="text-xl text-brand-700 transition-transform group-hover:translate-x-1">↗</span>
      </Link>
    </li>
  )
}

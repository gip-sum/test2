import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { BRAND } from '@/lib/brand'
import { PROPERTY_TYPE_LABEL, PROPERTY_TYPE_ORDER, SELLER_LABEL, type Intent, type PropertyTypeCode, type SellerType } from '@/lib/property/types'
import { isCanonicalEntryInput, parsePostingEntry, postingUrl, type EntryInput, type PostingEntry } from '@/lib/posting/entry'

export const metadata: Metadata = {
  title: 'Post a property',
  description: 'Begin listing a home in Kolkata. Choose who is posting, sale or rent, and the kind of property.',
  robots: { index: false, follow: false },
}

const STAGES = [
  { id: 'role', label: 'About you' },
  { id: 'intent', label: 'Your plan' },
  { id: 'type', label: 'The property' },
  { id: 'review', label: 'Review' },
] as const

const ROLES: { value: SellerType; title: string; description: string; number: string }[] = [
  { value: 'OWNER', title: 'I own the property', description: 'You are listing a property you own.', number: '01' },
  { value: 'AGENT', title: 'I am an agent', description: 'You are helping a client find a buyer or tenant.', number: '02' },
  { value: 'BUILDER', title: 'I am a builder', description: 'You are listing a property on behalf of a developer.', number: '03' },
]

const INTENTS: { value: Intent; title: string; description: string; number: string }[] = [
  { value: 'buy', title: 'Sell a property', description: 'Find someone looking for a place to buy.', number: '01' },
  { value: 'rent', title: 'Rent out a property', description: 'Find someone looking for a place to rent.', number: '02' },
]

const TYPES: Record<PropertyTypeCode, string> = {
  APARTMENT: 'An apartment or flat in a residential building.',
  INDEPENDENT_HOUSE: 'A standalone home or house.',
  BUILDER_FLOOR: 'A floor within a low-rise residential building.',
  VILLA: 'A standalone villa.',
  STUDIO: 'A compact, open-plan apartment.',
}

function previousUrl(entry: PostingEntry): string | null {
  if (entry.stage === 'role') return null
  if (entry.stage === 'intent') return '/post'
  if (entry.stage === 'type') return postingUrl({ role: entry.role })
  return postingUrl({ role: entry.role, intent: entry.intent })
}

function progressUrl(index: number, entry: PostingEntry): string {
  if (index === 0) return '/post'
  if (index === 1) return postingUrl({ role: entry.role })
  return postingUrl({ role: entry.role, intent: entry.intent })
}

function Progress({ entry }: { entry: PostingEntry }) {
  const active = STAGES.findIndex((stage) => stage.id === entry.stage)
  return (
    <nav aria-label="Posting progress" className="mt-7 sm:mt-9">
      <p className="text-overline font-semibold uppercase tracking-[0.18em] text-brand-700">Step {active + 1} of {STAGES.length}</p>
      <ol className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-3">
        {STAGES.map((stage, index) => (
          <li key={stage.id} aria-current={index === active ? 'step' : undefined}>
            {index < active ? (
              <Link href={progressUrl(index, entry)} className="post-progress-link group block rounded-sm" aria-label={`Return to ${stage.label}`}>
                <span className="block h-1.5 rounded-full bg-brand-600 transition-colors group-hover:bg-brand-700" />
                <span className="mt-2 block text-[11px] font-semibold text-brand-700 sm:text-caption">{stage.label}</span>
              </Link>
            ) : (
              <span className="block">
                <span className={`block h-1.5 rounded-full ${index === active ? 'bg-brand-600' : 'bg-surface-200'}`} />
                <span className={`mt-2 block text-[11px] font-semibold sm:text-caption ${index === active ? 'text-ink-900' : 'text-ink-500'}`}>{stage.label}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function Choice({ href, number, title, description }: { href: string; number: string; title: string; description: string }) {
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

function RoleStep() {
  return <>
    <h1 id="post-heading" className="font-display text-heading-1 text-ink-900 sm:text-[40px] sm:leading-tight">First, tell us about you.</h1>
    <p className="mt-3 max-w-xl text-body-lg text-ink-700">Who will be listing this property?</p>
    <ul className="mt-7 grid gap-3">{ROLES.map((role) => (
      <Choice key={role.value} href={postingUrl({ role: role.value })} number={role.number} title={role.title} description={role.description} />
    ))}</ul>
  </>
}

function IntentStep({ role }: { role: SellerType }) {
  return <>
    <h1 id="post-heading" className="font-display text-heading-1 text-ink-900 sm:text-[40px] sm:leading-tight">What would you like to do?</h1>
    <p className="mt-3 text-body-lg text-ink-700">You can list a home for sale or for rent.</p>
    <ul className="mt-7 grid gap-3">{INTENTS.map((intent) => (
      <Choice key={intent.value} href={postingUrl({ role, intent: intent.value })} number={intent.number} title={intent.title} description={intent.description} />
    ))}</ul>
  </>
}

function TypeStep({ role, intent }: { role: SellerType; intent: Intent }) {
  return <>
    <h1 id="post-heading" className="font-display text-heading-1 text-ink-900 sm:text-[40px] sm:leading-tight">What kind of place is it?</h1>
    <p className="mt-3 text-body-lg text-ink-700">Choose the best match. You can change it before you continue.</p>
    <ul className="mt-7 grid gap-3 sm:grid-cols-2">{PROPERTY_TYPE_ORDER.map((type, index) => (
      <Choice key={type} href={postingUrl({ role, intent, type })} number={String(index + 1).padStart(2, '0')} title={PROPERTY_TYPE_LABEL[type]} description={TYPES[type]} />
    ))}</ul>
  </>
}

function Review({ entry }: { entry: Required<Pick<PostingEntry, 'role' | 'intent' | 'type'>> }) {
  const items = [
    { label: 'You are posting as', value: SELLER_LABEL[entry.role], edit: '/post' },
    { label: 'You want to', value: entry.intent === 'buy' ? 'Sell a property' : 'Rent out a property', edit: postingUrl({ role: entry.role }) },
    { label: 'Property type', value: PROPERTY_TYPE_LABEL[entry.type], edit: postingUrl({ role: entry.role, intent: entry.intent }) },
  ]
  return <>
    <h1 id="post-heading" className="font-display text-heading-1 text-ink-900 sm:text-[40px] sm:leading-tight">Your starting point is set.</h1>
    <p className="mt-3 max-w-xl text-body-lg text-ink-700">Take a moment to check the basics before adding details about the property.</p>
    <dl className="mt-7 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-subtle bg-surface-000 px-5 shadow-e1 sm:px-7">
      {items.map((item) => (
        <div key={item.label} className="flex min-h-20 items-center justify-between gap-4 py-4">
          <div><dt className="text-caption text-ink-500">{item.label}</dt><dd className="mt-1 font-display text-body-lg font-semibold text-ink-900">{item.value}</dd></div>
          <Link href={item.edit} className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 text-label text-brand-700 underline-offset-4 hover:underline" aria-label={`Change ${item.label}`}>Change</Link>
        </div>
      ))}
    </dl>
    <div className="mt-6 rounded-lg border border-brand-600/20 bg-brand-100/65 p-5 sm:p-6">
      <h2 className="font-display text-heading-3 text-ink-900">What happens next?</h2>
      <p className="mt-2 text-body text-ink-700">The detailed property form is being prepared. Your choices are in this page link, but they have not been saved to an account and no property has been posted.</p>
      <Link href={postingUrl({ role: entry.role, intent: entry.intent })} className="mt-5 inline-flex min-h-11 items-center rounded-full border border-brand-600 bg-surface-000 px-5 text-label text-brand-700 hover:bg-brand-100">Change property type</Link>
    </div>
  </>
}

export default async function PostPropertyPage({ searchParams }: { searchParams: Promise<EntryInput> }) {
  const input = await searchParams
  const entry = parsePostingEntry(input)
  if (!isCanonicalEntryInput(input, entry)) redirect(postingUrl(entry))
  const back = previousUrl(entry)

  return <PageShell>
    <div className="post-stage mx-auto max-w-[1320px] px-4 pb-20 pt-8 sm:pt-12 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="text-overline font-semibold uppercase tracking-[0.16em] text-brand-700">{BRAND.name} / Post a property</div>
        {back && <Link href={back} className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-label text-ink-700 hover:bg-brand-100 hover:text-brand-700"><span aria-hidden="true">←</span> Back</Link>}
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start xl:gap-14">
        <section aria-labelledby="post-heading" className="post-main glass-panel rounded-[24px] border border-border-subtle bg-surface-000 p-5 shadow-e2 sm:p-9 lg:p-11">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-600/15 bg-brand-100 px-4 py-2 text-overline font-semibold uppercase tracking-[0.1em] text-brand-700"><span aria-hidden="true">✦</span> Begin your listing</div>
          <Progress entry={entry} />
          <div className="mt-9">
            {entry.stage === 'role' && <RoleStep />}
            {entry.stage === 'intent' && entry.role && <IntentStep role={entry.role} />}
            {entry.stage === 'type' && entry.role && entry.intent && <TypeStep role={entry.role} intent={entry.intent} />}
            {entry.stage === 'review' && entry.role && entry.intent && entry.type && <Review entry={{ role: entry.role, intent: entry.intent, type: entry.type }} />}
          </div>
        </section>
        <aside className="post-guide rounded-[24px] border border-border-subtle bg-surface-000 p-6 shadow-e1 lg:sticky lg:top-28">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-100 text-2xl text-brand-700" aria-hidden="true">⌂</span>
          <h2 className="mt-5 font-display text-heading-3 text-ink-900">A home starts with the details.</h2>
          <p className="mt-3 text-body text-ink-700">Begin with a few simple choices. Later steps will gather the property facts, location, price and photos.</p>
          <div className="mt-6 border-t border-border-subtle pt-5 text-body-sm text-ink-500">You can revisit earlier choices at any time.</div>
        </aside>
      </div>
    </div>
  </PageShell>
}

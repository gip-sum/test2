import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { ChoiceCard as Choice } from '@/components/posting/ChoiceCard'
import { DetailsForm } from '@/components/posting/DetailsForm'
import { DetailsReview } from '@/components/posting/DetailsReview'
import { PostingProgress, stageUrl } from '@/components/posting/PostingProgress'
import { BRAND } from '@/lib/brand'
import { PROPERTY_TYPE_LABEL, PROPERTY_TYPE_ORDER, type Intent, type PropertyTypeCode, type SellerType } from '@/lib/property/types'
import { isCanonicalInput, postingUrl, type EntryInput } from '@/lib/posting/entry'
import { kolkataToday, type DetailInput } from '@/lib/posting/details'
import { resolvePosting, type PostingView } from '@/lib/posting/flow'

export const metadata: Metadata = {
  title: 'Post a property',
  description: 'List a home in Kolkata: who is posting, sale or rent, the kind of property and its details.',
  robots: { index: false, follow: false },
}

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

function RoleStep({ carried }: { carried: DetailInput }) {
  return <>
    <h1 id="post-heading" className="font-display text-heading-1 text-ink-900 sm:text-[40px] sm:leading-tight">First, tell us about you.</h1>
    <p className="mt-3 max-w-xl text-body-lg text-ink-700">Who will be listing this property?</p>
    <ul className="mt-7 grid gap-3">{ROLES.map((role) => (
      <Choice key={role.value} href={postingUrl({ role: role.value }, { details: carried })} number={role.number} title={role.title} description={role.description} />
    ))}</ul>
  </>
}

function IntentStep({ role, carried }: { role: SellerType; carried: DetailInput }) {
  return <>
    <h1 id="post-heading" className="font-display text-heading-1 text-ink-900 sm:text-[40px] sm:leading-tight">What would you like to do?</h1>
    <p className="mt-3 text-body-lg text-ink-700">You can list a home for sale or for rent.</p>
    <ul className="mt-7 grid gap-3">{INTENTS.map((intent) => (
      <Choice key={intent.value} href={postingUrl({ role, intent: intent.value }, { details: carried })} number={intent.number} title={intent.title} description={intent.description} />
    ))}</ul>
  </>
}

function TypeStep({ role, intent, carried }: { role: SellerType; intent: Intent; carried: DetailInput }) {
  return <>
    <h1 id="post-heading" className="font-display text-heading-1 text-ink-900 sm:text-[40px] sm:leading-tight">What kind of place is it?</h1>
    <p className="mt-3 text-body-lg text-ink-700">Choose the best match. {Object.keys(carried).length > 0 ? 'Details you have already entered come with you; you can check them on the next screen.' : 'You can change it later.'}</p>
    <ul className="mt-7 grid gap-3 sm:grid-cols-2">{PROPERTY_TYPE_ORDER.map((type, index) => (
      <Choice key={type} href={postingUrl({ role, intent, type }, { details: carried, edit: true })} number={String(index + 1).padStart(2, '0')} title={PROPERTY_TYPE_LABEL[type]} description={TYPES[type]} />
    ))}</ul>
  </>
}

function backUrl(view: PostingView): string | null {
  const index = ['role', 'intent', 'type', 'details', 'review'].indexOf(view.stage)
  return index === 0 ? null : stageUrl(index - 1, view)
}

const GUIDE: Record<PostingView['stage'], { title: string; body: string }> = {
  role: { title: 'A home starts with the details.', body: 'Begin with a few simple choices. Later steps gather the property facts, location, price and photos.' },
  intent: { title: 'A home starts with the details.', body: 'Begin with a few simple choices. Later steps gather the property facts, location, price and photos.' },
  type: { title: 'A home starts with the details.', body: 'Begin with a few simple choices. Later steps gather the property facts, location, price and photos.' },
  details: { title: 'Three areas, three meanings.', body: 'Carpet, built-up and super built-up are different measurements. Buyers compare prices on carpet area, so it is the one we ask for first — and we never merge them.' },
  review: { title: 'Nothing is posted yet.', body: 'This review is only in your page link. Location, price and photos come next, and nothing is saved until drafts arrive.' },
}

export default async function PostPropertyPage({ searchParams }: { searchParams: Promise<EntryInput> }) {
  const input = await searchParams
  const today = kolkataToday()
  const { view, canonicalUrl } = resolvePosting(input, today)
  if (!isCanonicalInput(input, canonicalUrl)) redirect(canonicalUrl)
  const back = backUrl(view)
  const guide = GUIDE[view.stage]

  return <PageShell>
    <div className="post-stage mx-auto max-w-[1320px] px-4 pb-20 pt-8 sm:pt-12 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="text-overline font-semibold uppercase tracking-[0.16em] text-brand-700">{BRAND.name} / Post a property</div>
        {back && <Link href={back} className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-label text-ink-700 hover:bg-brand-100 hover:text-brand-700"><span aria-hidden="true">←</span> Back</Link>}
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start xl:gap-14">
        <section aria-labelledby="post-heading" className="post-main glass-panel min-w-0 rounded-[24px] border border-border-subtle bg-surface-000 p-5 shadow-e2 sm:p-9 lg:p-11">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-600/15 bg-brand-100 px-4 py-2 text-overline font-semibold uppercase tracking-[0.1em] text-brand-700"><span aria-hidden="true">✦</span> Begin your listing</div>
          <PostingProgress view={view} />
          <div className="mt-9">
            {view.stage === 'role' && <RoleStep carried={view.carried} />}
            {view.stage === 'intent' && view.entry.role && <IntentStep role={view.entry.role} carried={view.carried} />}
            {view.stage === 'type' && view.entry.role && view.entry.intent && <TypeStep role={view.entry.role} intent={view.entry.intent} carried={view.carried} />}
            {/* Keyed by the link so a client-side navigation between two
                states of the form remounts it: the inputs are uncontrolled,
                and a reused node would keep the previous state's values. */}
            {view.stage === 'details' && <DetailsForm key={canonicalUrl} entry={view.entry} values={view.values} errors={view.errors} today={today} />}
            {view.stage === 'review' && <DetailsReview entry={view.entry} facts={view.facts} carried={view.carried} />}
          </div>
        </section>
        <aside className="post-guide rounded-[24px] border border-border-subtle bg-surface-000 p-6 shadow-e1 lg:sticky lg:top-28">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-100 text-2xl text-brand-700" aria-hidden="true">⌂</span>
          <h2 className="mt-5 font-display text-heading-3 text-ink-900">{guide.title}</h2>
          <p className="mt-3 text-body text-ink-700">{guide.body}</p>
          <div className="mt-6 border-t border-border-subtle pt-5 text-body-sm text-ink-500">You can revisit earlier choices at any time.</div>
        </aside>
      </div>
    </div>
  </PageShell>
}

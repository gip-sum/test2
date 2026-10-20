import type { PricingInput } from '@/lib/posting/pricing'
import { PricingForm } from '@/components/posting/PricingForm'
import { PricingReview } from '@/components/posting/PricingReview'
import { redirect } from 'next/navigation'
import { Fragment } from 'react'
import { StartDraft } from '@/components/drafts/StartDraft'
import { PageShell } from '@/components/layout/PageShell'
import { ChoiceCard as Choice } from '@/components/posting/ChoiceCard'
import { DetailsForm } from '@/components/posting/DetailsForm'
import { getPostingLocations } from '@/lib/location/queries'
import type { LocationInput } from '@/lib/posting/location'
import { LocationForm } from '@/components/posting/LocationForm'
import { LocationReview } from '@/components/posting/LocationReview'
import { DetailsReview } from '@/components/posting/DetailsReview'
import { stageUrl } from '@/components/posting/PostingProgress'
import { PostingWorkspace, StepHeading } from '@/components/posting/PostingWorkspace'
import { BuildingIcon, CraneIcon, DoorIcon, HouseIcon, KeyIcon, LayersIcon, SignpostIcon, StudioIcon, UserIcon, VillaIcon } from '@/components/ui/icons'
import { PROPERTY_TYPE_LABEL, PROPERTY_TYPE_ORDER, type Intent, type PropertyTypeCode, type SellerType } from '@/lib/property/types'
import { isCanonicalInput, postingUrl, type EntryInput } from '@/lib/posting/entry'
import { kolkataToday, type DetailInput } from '@/lib/posting/details'
import { resolvePosting, type PostingView } from '@/lib/posting/flow'

const ROLES: { value: SellerType; title: string; description: string; icon: React.ReactNode }[] = [
  { value: 'OWNER', title: 'I own the property', description: 'You are listing a property you own.', icon: <KeyIcon /> },
  { value: 'AGENT', title: 'I am an agent', description: 'You are helping a client find a buyer or tenant.', icon: <UserIcon /> },
  { value: 'BUILDER', title: 'I am a builder', description: 'You are listing a property on behalf of a developer.', icon: <CraneIcon /> },
]

const INTENTS: { value: Intent; title: string; description: string; icon: React.ReactNode }[] = [
  { value: 'buy', title: 'Sell a property', description: 'Find someone looking for a place to buy.', icon: <SignpostIcon /> },
  { value: 'rent', title: 'Rent out a property', description: 'Find someone looking for a place to rent.', icon: <DoorIcon /> },
]

const TYPES: Record<PropertyTypeCode, { description: string; icon: React.ReactNode }> = {
  APARTMENT: { description: 'An apartment or flat in a residential building.', icon: <BuildingIcon /> },
  INDEPENDENT_HOUSE: { description: 'A standalone home or house.', icon: <HouseIcon /> },
  BUILDER_FLOOR: { description: 'A floor within a low-rise residential building.', icon: <LayersIcon /> },
  VILLA: { description: 'A standalone villa.', icon: <VillaIcon /> },
  STUDIO: { description: 'A compact, open-plan apartment.', icon: <StudioIcon /> },
}

function RoleStep({ carried, location, pricing }: { carried: DetailInput; location: LocationInput; pricing: PricingInput }) {
  return <>
    <StepHeading title="First, tell us about you." lede="Who will be listing this property?" />
    <ul className="mt-7 grid gap-3 xl:grid-cols-3">{ROLES.map((role) => (
      <Choice key={role.value} href={postingUrl({ role: role.value }, { details: carried, location, pricing })} icon={role.icon} title={role.title} description={role.description} />
    ))}</ul>
  </>
}

function IntentStep({ role, carried, location, pricing }: { role: SellerType; carried: DetailInput; location: LocationInput; pricing: PricingInput }) {
  return <>
    <StepHeading title="What would you like to do?" lede="You can list a home for sale or for rent." />
    <ul className="mt-7 grid gap-3 md:grid-cols-2">{INTENTS.map((intent) => (
      <Choice key={intent.value} href={postingUrl({ role, intent: intent.value }, { details: carried, location, pricing })} icon={intent.icon} title={intent.title} description={intent.description} />
    ))}</ul>
  </>
}

function TypeStep({ role, intent, carried, location, pricing }: { role: SellerType; intent: Intent; carried: DetailInput; location: LocationInput; pricing: PricingInput }) {
  return <>
    <StepHeading title="What kind of place is it?" lede={`Choose the best match. ${Object.keys(carried).length > 0 ? 'Details you have already entered come with you; you can check them on the next screen.' : 'You can change it later.'}`} />
    <ul className="mt-7 grid gap-3 md:grid-cols-2">{PROPERTY_TYPE_ORDER.map((type) => (
      <Choice key={type} href={postingUrl({ role, intent, type }, { details: carried, edit: true, location, pricing })} icon={TYPES[type].icon} title={PROPERTY_TYPE_LABEL[type]} description={TYPES[type].description} />
    ))}</ul>
  </>
}

function backUrl(view: PostingView): string | null {
  if (view.stage === 'location') return postingUrl(view.entry, { details: view.carried, pricing: view.pricingCarried, location: view.locationCarried })
  if (view.stage === 'location-review') return postingUrl(view.entry, { details: view.carried, pricing: view.pricingCarried, location: view.locationCarried, step: 'location' })
  if (view.stage === 'pricing') return postingUrl(view.entry, { details: view.carried, location: view.locationCarried, pricing: view.pricingCarried, step: 'location-review' })
  if (view.stage === 'pricing-review') return stageUrl(5, view)
  const index = ['role', 'intent', 'type', 'details', 'review'].indexOf(view.stage)
  return index === 0 ? null : stageUrl(index - 1, view)
}

const GUIDE: Record<PostingView['stage'], { title: string; body: string }> = {
  role: { title: 'Three quick choices first.', body: 'Who is posting, sale or rent, and the kind of property. Then the property facts, location, price and photos.' },
  intent: { title: 'Three quick choices first.', body: 'Who is posting, sale or rent, and the kind of property. Then the property facts, location, price and photos.' },
  type: { title: 'Three quick choices first.', body: 'Who is posting, sale or rent, and the kind of property. Then the property facts, location, price and photos.' },
  details: { title: 'Three areas, three meanings.', body: 'Carpet, built-up and super built-up are different measurements. Buyers compare prices on carpet area, so it is the one we ask for first — and we never merge them.' },
  location: { title: 'A clear address helps people find you.', body: 'Choose the correct locality and give the building or street address. Coordinates are optional and seller-provided; no map position is invented.' },
  'location-review': { title: 'Check before you continue.', body: 'Every answer has its own Change link. Pricing comes next.' },
  pricing: { title: 'Clear amounts, clear expectations.', body: 'Separate monthly charges from the total deposit. The rate is based on carpet area, and unknown maintenance stays distinct from no charge.' },
  'pricing-review': { title: 'Check before you continue.', body: 'Check the property facts, location and pricing. Photos come next.' },
  review: { title: 'Check before you continue.', body: 'Every answer has its own Change link. Location, price and photos come next.' },
}

export async function PostingPage({ input, draft = false }: { input: EntryInput; draft?: boolean }) {
  const today = kolkataToday()
  const places = getPostingLocations()
  const { view, canonicalUrl } = resolvePosting(input, today, places)
  if (!draft && !isCanonicalInput(input, canonicalUrl)) redirect(canonicalUrl)
  const back = backUrl(view)
  const guide = GUIDE[view.stage]

  const Shell = draft ? Fragment : PageShell
  return <Shell>
    {!draft && <StartDraft />}
    <PostingWorkspace view={view} back={back} guide={guide}>
      <div className="post-stage">
        {view.stage === 'role' && <RoleStep carried={view.carried} location={view.locationCarried} pricing={view.pricingCarried} />}
        {view.stage === 'intent' && view.entry.role && <IntentStep role={view.entry.role} carried={view.carried} location={view.locationCarried} pricing={view.pricingCarried} />}
        {view.stage === 'type' && view.entry.role && view.entry.intent && <TypeStep role={view.entry.role} intent={view.entry.intent} carried={view.carried} location={view.locationCarried} pricing={view.pricingCarried} />}
        {/* Keyed by the link so a client-side navigation between two
            states of the form remounts it: the inputs are uncontrolled,
            and a reused node would keep the previous state's values. */}
        {view.stage === 'details' && <DetailsForm key={canonicalUrl} entry={view.entry} values={view.values} errors={view.errors} today={today} location={view.locationCarried} pricing={view.pricingCarried} />}
        {view.stage === 'location' && <LocationForm key={canonicalUrl} entry={view.entry} carried={view.carried} values={view.values} errors={view.errors} places={places} pricing={view.pricingCarried} />}
        {view.stage === 'location-review' && <>
          <DetailsReview entry={view.entry} facts={view.facts} carried={view.carried} location={view.locationCarried} pricing={view.pricingCarried} finalReview />
          <LocationReview entry={view.entry} carried={view.carried} values={view.locationCarried} location={view.location} places={places} pricing={view.pricingCarried} />
        </>}
        {view.stage === 'pricing' && <PricingForm key={canonicalUrl} entry={view.entry} carried={view.carried} location={view.locationCarried} values={view.values} errors={view.errors} />}
        {view.stage === 'pricing-review' && <>
          <DetailsReview entry={view.entry} facts={view.facts} carried={view.carried} location={view.locationCarried} pricing={view.pricingCarried} finalReview heading="Check the property and pricing." />
          <LocationReview entry={view.entry} carried={view.carried} values={view.locationCarried} location={view.location} places={places} pricing={view.pricingCarried} finalReview />
          <PricingReview entry={view.entry} carried={view.carried} facts={view.facts} location={view.locationCarried} values={view.pricingCarried} pricing={view.pricing} />
        </>}
        {view.stage === 'review' && <DetailsReview entry={view.entry} facts={view.facts} carried={view.carried} location={view.locationCarried} pricing={view.pricingCarried} />}
      </div>
    </PostingWorkspace>
  </Shell>
}

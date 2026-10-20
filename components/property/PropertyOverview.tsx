import Link from 'next/link'
import { PriceDisplay } from './PriceDisplay'
import { AreaDisplay } from './AreaDisplay'
import { CopyLink } from '@/components/dashboard/CopyLink'
import { Badge } from '@/components/ui/Badge'
import { AreaIcon, BathIcon, BedIcon, CalculatorIcon, MapPinIcon } from '@/components/ui/icons'
import { emiCalculatorHref } from '@/lib/finance/params'
import { formatPostedAt } from '@/lib/format/date'
import type { OverviewData } from '@/lib/property/overview'
import { CONSTRUCTION_LABEL, PROPERTY_TYPE_LABEL } from '@/lib/property/types'

/**
 * The top of the property page (UI-16): what a buyer asks first, in the
 * order they ask it — how much (price, then the rate per carpet sqft and
 * what else is payable), what it is (the name), where (society, locality,
 * city), what you get (bedrooms, bathrooms, carpet area), its kind and
 * state (type, construction), then furnishing, availability and floor.
 *
 * The results card's hierarchy at page scale, so a listing reads the same
 * on its card and its page. Every line is a field the listing holds; one
 * the seller left blank is left out, never filled with a dash.
 *
 * One component for both property pages — a demo fixture and a real
 * published listing — from the OverviewData their adapters build
 * (lib/property/overview.ts, lib/listings/overview.ts).
 *
 * A server component: the only client parts are Copy link and the save
 * heart (on the gallery), each its own small leaf.
 */
export function PropertyOverview({ data, nameLevel = 1 }: {
  data: OverviewData
  /** The seller's preview names the page itself (h1) and the listing under it. */
  nameLevel?: 1 | 2
}) {
  const p = data
  const Name = nameLevel === 1 ? 'h1' : 'h2'
  const studio = p.propertyType === 'STUDIO'

  return (
    <header>
      {/* The price leads; New / Price reduced ride beside it rather than
          taking a line of their own above it. */}
      <div className="flex items-start justify-between gap-3">
        <PriceDisplay amount={p.price} intent={p.intent} size="hero" areaForRate={p.rateArea} />
        {p.badges.length > 0 && (
          <div className="mt-1.5 flex flex-wrap justify-end gap-1.5 lg:mt-2.5">
            {p.badges.map((b) => <Badge key={b.label} tone={b.tone}>{b.label}</Badge>)}
          </div>
        )}
      </div>
      {p.extras.length > 0 && (
        <p className="mt-1 flex flex-wrap gap-x-2 text-body-sm text-ink-700 tabular">
          {p.extras.map((e, i) => <span key={e}>{i > 0 && <span aria-hidden className="mr-2 text-ink-500">·</span>}{e}</span>)}
        </p>
      )}

      <Name className="mt-3 break-words font-display text-heading-2 text-ink-900 lg:mt-4 lg:text-heading-1">{p.name}</Name>
      <p className="mt-1.5 flex items-start gap-1.5 text-body text-ink-700">
        <MapPinIcon className="mt-0.5 size-4.5 shrink-0 text-brand-700" />
        <span className="min-w-0 break-words">{p.place}</span>
      </p>

      {/* What you get, as one specification panel: the results card's mint
          fact row at page scale. A definition list, so each figure is read
          with its label (a list: a <dl> cannot hold the icons). */}
      <ul aria-label="Key facts" className="mt-5 grid grid-cols-3 divide-x divide-brand-200 rounded-lg bg-surface-200 py-3.5">
        <Spec icon={<BedIcon className="size-5" />} label={studio ? 'Layout' : 'Bedrooms'}>
          {studio || p.bedrooms == null ? 'Studio' : `${p.bedrooms} BHK`}
        </Spec>
        <Spec icon={<BathIcon className="size-5" />} label="Bathrooms">{p.bathrooms}</Spec>
        <Spec icon={<AreaIcon className="size-5" />} label="Carpet area">
          {/* Wraps before "(carpet)" at 320px rather than widen the page. */}
          <AreaDisplay value={p.carpetArea} unit={p.areaUnit} basis="carpet" variant="compact" />
        </Spec>
      </ul>

      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Type and status">
        <li className="inline-flex min-h-8 items-center rounded-full border border-border-subtle bg-surface-000 px-3 text-body-sm font-semibold text-ink-900">{PROPERTY_TYPE_LABEL[p.propertyType]}</li>
        <li className="inline-flex min-h-8 items-center rounded-full border border-brand-200 bg-brand-50 px-3 text-body-sm font-semibold text-brand-700">{CONSTRUCTION_LABEL[p.constructionStatus]}</li>
      </ul>
      {p.attributes.length > 0 && (
        <p className="mt-3 text-body text-ink-700">{p.attributes.join(' · ')}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle pt-4">
        {p.sharePath && <CopyLink path={p.sharePath} title={p.name} variant="pill" />}
        {/* A link to the calculator, not an EMI figure: a figure here
            would need a rate, and no rate on this page would be the
            buyer's own. */}
        {p.intent === 'buy' && p.price > 0 && (
          <Link href={emiCalculatorHref(p.price)} className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-label text-brand-700 hover:underline">
            <CalculatorIcon className="size-4.5" />
            Estimate the monthly EMI
          </Link>
        )}
        {p.postedAt && <span className="text-caption text-ink-500 sm:ml-auto">{formatPostedAt(p.postedAt)}</span>}
      </div>
    </header>
  )
}

function Spec({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <li className="flex min-w-0 flex-col items-center gap-1 px-2 text-center sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:text-left">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-000 text-brand-700 sm:size-10">{icon}</span>
      <span className="flex min-w-0 flex-col">
        <span className="text-caption text-ink-500">{label}</span>
        <span className="text-body font-semibold text-ink-900 tabular sm:text-body-lg">{children}</span>
      </span>
    </li>
  )
}

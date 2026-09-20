import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusPill } from '@/components/ui/StatusPill'
import { Skeleton } from '@/components/ui/Skeleton'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { AreaDisplay } from '@/components/property/AreaDisplay'
import { formatConfiguration } from '@/lib/format/area'
import { BRAND, LAUNCH_CITY } from '@/lib/brand'

/**
 * PHASE 1 SCAFFOLD — replaced by the real homepage in Phase 2.
 *
 * This page exists to verify the shell: that tokens drive every colour,
 * that both typefaces load, that ₹ renders in the display face, and that
 * the header and bottom navigation behave at 390 / 412 / 768 / 1280.
 */
export default function Page() {
  return (
    <PageShell>
      <div className="mx-auto max-w-[1320px] px-4 py-8 lg:px-8">
        <p className="text-overline uppercase text-ink-500">Phase 1 · application shell</p>
        <h1 className="mt-2 font-display text-heading-1 text-ink-900">
          {BRAND.tagline}
        </h1>
        <p className="mt-2 max-w-[65ch] text-body text-ink-700">
          Scaffold only. The homepage arrives in Phase 2 — search-first discovery for{' '}
          {LAUNCH_CITY.name}, {LAUNCH_CITY.state}. Everything below verifies that the token
          layer, both typefaces and the responsive shell are working.
        </p>

        <Section title="Prices — display face, tabular figures">
          <div className="flex flex-wrap gap-6">
            <PriceDisplay amount={6250000} intent="buy" areaForRate={1240} />
            <PriceDisplay amount={12500000} intent="buy" areaForRate={1860} />
            <PriceDisplay amount={22000} intent="rent" />
            <PriceDisplay amount={0} intent="buy" />
          </div>
          <p className="mt-3 text-caption text-ink-500">
            If the ₹ sign renders in a different face from the digits, the Archivo
            latin-ext subset failed to load.
          </p>
        </Section>

        <Section title="Configuration and area — basis is never omitted">
          <p className="text-body text-ink-700">
            {formatConfiguration(3, 3)} ·{' '}
            <AreaDisplay value={1240} basis="carpet" /> ·{' '}
            <AreaDisplay value={1580} basis="super" />
          </p>
        </Section>

        <Section title="Actions — one filled primary per surface">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Enquire</Button>
            <Button variant="supply">Post property</Button>
            <Button variant="secondary">View phone</Button>
            <Button variant="tertiary">Skip</Button>
            <Button variant="danger">Report</Button>
            <Button loading>Publishing</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Listing lifecycle — plain language, not database values">
          <div className="flex flex-wrap gap-2">
            <StatusPill status="DRAFT" />
            <StatusPill status="UNDER_REVIEW" />
            <StatusPill status="ACTIVE" />
            <StatusPill status="REJECTED" />
            <StatusPill status="EXPIRED" />
            <StatusPill status="SOLD_OR_RENTED" />
          </div>
        </Section>

        <Section title="Badges — no Verified claim in V0">
          <div className="flex flex-wrap gap-2">
            <Badge>Owner</Badge>
            <Badge>Agent · Basu Properties</Badge>
            <Badge tone="brand">New</Badge>
            <Badge tone="supply">Price reduced</Badge>
          </div>
        </Section>

        <Section title="Loading — skeletons match final dimensions">
          <div className="flex max-w-md gap-3 rounded-lg border border-border-subtle bg-surface-000 p-3">
            <Skeleton className="aspect-[4/3] w-2/5 rounded-md" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-2/5" />
              <Skeleton className="h-3.5 w-3/5" />
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="mt-auto h-9 w-full rounded-md" />
            </div>
          </div>
        </Section>
      </div>
    </PageShell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border-t border-border-subtle pt-6">
      <h2 className="mb-4 font-display text-heading-3 text-ink-900">{title}</h2>
      {children}
    </section>
  )
}

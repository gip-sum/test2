import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { ResultCard } from '@/components/search/ResultCard'
import { SaveButton } from '@/components/property/SaveButton'
import { getVerifiedUser } from '@/lib/auth/session'
import { getPublishedCards } from '@/lib/listings/queries'
import { cardOfListing } from '@/lib/listings/overview'
import { listSaved, listSavedListings } from '@/lib/saved/queries'
import { getPropertySummary } from '@/lib/property/queries'
import { ErrorState } from '@/components/ui/ErrorState'
import { buttonClassName } from '@/components/ui/Button'
import { HeartIcon, ImageOffIcon, SearchIcon } from '@/components/ui/icons'
import { RestoreFocus } from '@/components/a11y/RestoreFocus'
import { SavedGrid } from '@/components/account/SavedGrid'

export const metadata: Metadata = { title: 'Saved properties', robots: { index: false, follow: false } }

/**
 * The shortlist (Phase 20; redesigned in UI-19): the homes a buyer cares
 * about, as the same results cards they saved them from (UI-15), so a home
 * looks the same in Search, Similar and here — photo, price, place, facts,
 * the filled heart. A real listing's card is built from its public
 * submission (getPublishedCards, three batched reads for the whole list);
 * a demo one from its summary.
 *
 * Removing is the heart, at once, with no confirmation: it is undone by
 * saving again, and a dialog would put a step between the buyer and their
 * own list. The server confirms first, then SaveButton hands focus on and
 * announces it, and SavedGrid slides the remaining cards into place (UI-12).
 */
export default async function SavedPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/login?next=%2Faccount%2Fsaved')
  const [result, listingResult] = await Promise.all([listSaved(user), listSavedListings(user)])
  // Saved real listings (Phase 20). Before the migration none can exist, so a
  // missing table reads as none; any other failure is reported as a failure.
  const savedListings = listingResult.ok ? listingResult.rows : listingResult.missing ? [] : null
  let cards: Awaited<ReturnType<typeof getPublishedCards>> | null = new Map()
  if (savedListings?.length) { try { cards = await getPublishedCards(savedListings.map((row) => row.listing_id)) } catch { cards = null } }
  const total = result.ok && savedListings ? result.rows.length + savedListings.length : null

  return <PageShell>
    <RestoreFocus token={crypto.randomUUID()} />
    {/* The mint band says where you are (UI-15's search band); the list
        itself sits on white, in the 1400px frame of the header. */}
    <header className="search-band">
      <div className="home-container flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6 pt-7 lg:pb-8 lg:pt-10">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-overline uppercase text-brand-600">
            <span aria-hidden className="h-0.5 w-6 shrink-0 rounded-full bg-brand-500" />
            <Link href="/account" className="-my-3 inline-flex min-h-11 items-center hover:underline">Your account</Link>
          </p>
          <h1 className="mt-2 font-display text-heading-2 text-ink-900 lg:text-display-1">Saved properties</h1>
          {/* The count and each heart are focus targets after a removal refreshes this page (UI-12). */}
          {total !== null && total > 0
            ? <p id="saved-count" tabIndex={-1} className="mt-1.5 text-body text-ink-700 outline-none lg:text-body-lg"><span className="font-semibold text-ink-900 tabular">{total}</span> saved {total === 1 ? 'property' : 'properties'}</p>
            : <p className="mt-1.5 text-body text-ink-700 lg:text-body-lg">Homes you want to look at again, all in one place.</p>}
        </div>
        {total !== null && total > 0 && <Link href="/buy/kolkata" className={buttonClassName({ variant: 'secondary' })}><SearchIcon className="size-4" />Find more homes</Link>}
      </div>
    </header>

    <div className="home-container py-6 lg:py-9">
      {!result.ok || savedListings === null ? <ErrorState surface="card" title="Your saved properties are temporarily unavailable">
        Please try refreshing this page in a moment.
      </ErrorState> : total === 0 ? <EmptyShortlist /> :
        <SavedGrid className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {savedListings.map((row) => {
            const card = cards?.get(row.listing_id)
            return <div key={row.listing_id} data-flip-key={row.listing_id} className="min-w-0">
              {card ? <ResultCard heading="h2" property={cardOfListing(row.listing_id, card.submission, card.photos, card.activatedAt)} />
                : <Unavailable id={row.listing_id} title={cards ? 'Listing no longer available' : 'Listing details unavailable'}
                  body={cards ? 'This listing is not public right now. You can remove it from your shortlist.' : 'Its details could not be loaded. Please refresh this page.'}
                  name={cards ? 'unavailable listing' : 'saved listing'} />}
            </div>
          })}
          {result.rows.map((row) => {
            const property = getPropertySummary(row.property_public_id)
            return <div key={row.property_public_id} data-flip-key={row.property_public_id} className="min-w-0">
              {property ? <ResultCard heading="h2" property={property} />
                : <Unavailable id={row.property_public_id} title="Listing unavailable" body="This property is no longer in the current listings. You can remove it from your shortlist." name="unavailable listing" />}
            </div>
          })}
        </SavedGrid>}
    </div>
  </PageShell>
}

/**
 * A saved home that cannot be shown: it keeps a card's place and shape in
 * the grid, says why, and keeps its heart so it can be removed. No photo
 * or price is guessed for it.
 */
function Unavailable({ id, title, body, name }: { id: string; title: string; body: string; name: string }) {
  return <article className="relative flex h-full flex-col rounded-lg border border-border-subtle bg-surface-000 shadow-e1">
    <div className="m-2 mb-0 grid aspect-[16/10] place-items-center rounded-md bg-surface-200 text-ink-500 md:aspect-[3/2]"><ImageOffIcon className="size-8" /></div>
    <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
      <h2 className="text-body-lg font-semibold text-ink-900">{title}</h2>
      <p className="mt-1 text-body-sm text-ink-700">{body}</p>
    </div>
    <div className="absolute right-4 top-4 z-10"><SaveButton id={id} title={name} visualClassName="bg-surface-000 shadow-e2" /></div>
  </article>
}

/**
 * Nothing saved yet: what the shortlist is for and where the hearts are,
 * with the two real ways in — homes for sale and homes to rent. No
 * suggested homes: the platform knows nothing yet about what this buyer
 * wants, and a guessed list would read as a recommendation.
 */
function EmptyShortlist() {
  return <div id="saved-empty" tabIndex={-1} className="mx-auto max-w-2xl rounded-lg border border-border-subtle bg-surface-000 px-6 py-10 text-center shadow-e1 outline-none sm:px-10 sm:py-14">
    <span aria-hidden className="mx-auto grid size-16 place-items-center rounded-full bg-brand-50 text-brand-700"><HeartIcon className="size-8" /></span>
    <h2 className="mt-5 font-display text-heading-2 text-ink-900">Your shortlist is empty</h2>
    <p className="mx-auto mt-2 max-w-md text-body text-ink-700">Tap the heart on a property — in search results or on its page — to keep it here. Your shortlist is saved to your account, so it is waiting wherever you sign in.</p>
    <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
      <Link href="/buy/kolkata" className={buttonClassName({ variant: 'primary' })}>Browse homes for sale</Link>
      <Link href="/rent/kolkata" className={buttonClassName({ variant: 'secondary' })}>Browse homes to rent</Link>
    </div>
  </div>
}

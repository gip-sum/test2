import { StartDraft } from '@/components/drafts/StartDraft'
import type { Metadata } from 'next'
import Link from 'next/link'
import { randomUUID } from 'node:crypto'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { PhotoManager } from '@/components/posting/PhotoManager'
import { PHOTO_GUIDE, PostingWorkspace, StepHeading } from '@/components/posting/PostingWorkspace'
import { getVerifiedUser } from '@/lib/auth/session'
import { resolvePosting } from '@/lib/posting/flow'
import { kolkataToday } from '@/lib/posting/details'
import { type EntryInput } from '@/lib/posting/entry'
import { UUID } from '@/lib/media/types'

export const metadata: Metadata = { title: 'Property photos', robots: { index: false, follow: false } }
export default async function PhotosPage({ searchParams }: { searchParams: Promise<EntryInput> }) {
  const input = await searchParams
  const resolved = resolvePosting({ ...input, step: 'pricing-review' }, kolkataToday())
  if (resolved.view.stage !== 'pricing-review') redirect(resolved.canonicalUrl)
  const user = await getVerifiedUser()
  const collection = typeof input.collection === 'string' && UUID.test(input.collection) ? input.collection : null
  const photoUrl = resolved.canonicalUrl.replace('/post?', '/post/photos?') + (collection ? `&collection=${collection}` : '')
  if (user && !collection) redirect(photoUrl + `&collection=${randomUUID()}`)
  return <PageShell>
    <StartDraft />
    <PostingWorkspace view={resolved.view} photos back={resolved.canonicalUrl} backLabel="Pricing review" guide={PHOTO_GUIDE}>
      <StepHeading title="Show your property at its best." lede="Add clear photos, choose the cover and arrange the order buyers will see." />
      {user && collection ? <PhotoManager key={collection} collection={collection} /> : <div className="mt-7 rounded-lg border border-border-subtle bg-surface-100 p-6">
        <h2 className="font-display text-heading-3 text-ink-900">Sign in to upload photos</h2>
        <p className="mt-2 text-body text-ink-700">Your photos will be stored privately in your account. Your property answers remain in this page link.</p>
        <Link href={`/login?next=${encodeURIComponent(photoUrl)}`} className="mt-5 inline-flex min-h-11 items-center rounded-md bg-brand-600 px-5 font-semibold text-on-brand">Login/Register</Link>
      </div>}
    </PostingWorkspace>
  </PageShell>
}

import { ReloadDraft } from '@/components/drafts/ReloadDraft'
import { ErrorState } from '@/components/ui/ErrorState'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { DraftEditor } from '@/components/drafts/DraftEditor'
import { PostingPage } from '@/components/posting/PostingPage'
import { PhotoManager } from '@/components/posting/PhotoManager'
import { PHOTO_GUIDE, PostingWorkspace, StepHeading } from '@/components/posting/PostingWorkspace'
import { getVerifiedUser } from '@/lib/auth/session'
import { DraftError, getDraft } from '@/lib/drafts/queries'
import { snapshotOf } from '@/lib/drafts/types'
import { UUID } from '@/lib/media/types'
import { resolvePosting } from '@/lib/posting/flow'
import { kolkataToday } from '@/lib/posting/details'
export const metadata: Metadata = { title: 'Edit private draft', robots: { index: false, follow: false } }
export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const user = await getVerifiedUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/post/drafts/${id}`)}`)
  let draft
  try { draft = await getDraft(user, id) } catch (e) {
    if (e instanceof DraftError && e.status === 404) notFound()
    return <PageShell><div className="mx-auto max-w-3xl p-6"><h1 className="text-heading-2">Draft unavailable</h1><ErrorState surface="inline" className="mt-4" action={<ReloadDraft />}>Your draft could not be loaded. It has not been replaced or cleared.</ErrorState></div></PageShell>
  }
  const snapshot = snapshotOf(draft), resolved = resolvePosting(snapshot.input, kolkataToday())
  const photos = snapshot.path === '/post/photos' && resolved.view.stage === 'pricing-review'
  return <PageShell><DraftEditor key={`${draft.id}:${draft.revision}`} initial={draft}>
    {photos ? <PostingWorkspace view={resolved.view} photos back={resolved.canonicalUrl} backLabel="Pricing review" guide={PHOTO_GUIDE}>
      <StepHeading title="Show your property at its best." lede="Your draft keeps these private photos with your property answers." />
      <PhotoManager collection={draft.collection_id} />
    </PostingWorkspace> : <PostingPage input={snapshot.input} draft />}
  </DraftEditor></PageShell>
}

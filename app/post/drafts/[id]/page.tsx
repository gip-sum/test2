import { ReloadDraft } from '@/components/drafts/ReloadDraft'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { DraftEditor } from '@/components/drafts/DraftEditor'
import { PostingPage } from '@/components/posting/PostingPage'
import { PhotoManager } from '@/components/posting/PhotoManager'
import { PostingProgress } from '@/components/posting/PostingProgress'
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
    return <PageShell><div className="mx-auto max-w-3xl p-6"><h1 className="text-heading-2">Draft unavailable</h1><p role="alert" className="mt-4">Your draft could not be loaded. It has not been replaced or cleared.</p><ReloadDraft /></div></PageShell>
  }
  const snapshot = snapshotOf(draft), resolved = resolvePosting(snapshot.input, kolkataToday())
  const photos = snapshot.path === '/post/photos' && resolved.view.stage === 'pricing-review'
  return <PageShell><DraftEditor key={`${draft.id}:${draft.revision}`} initial={draft}>
    {photos ? <section className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-8">
      <Link href={resolved.canonicalUrl} className="inline-flex min-h-11 items-center text-brand-700">← Back to pricing review</Link>
      <PostingProgress view={resolved.view} photos />
      <h1 className="mt-8 text-heading-1 font-display text-ink-900">Show your property at its best.</h1>
      <p className="mt-3 text-body-lg text-ink-700">Your draft keeps these private photos with your property answers.</p>
      <PhotoManager collection={draft.collection_id} />
    </section> : <PostingPage input={snapshot.input} draft />}
  </DraftEditor></PageShell>
}

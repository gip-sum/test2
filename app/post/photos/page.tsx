import { StartDraft } from '@/components/drafts/StartDraft'
import type { Metadata } from 'next'
import Link from 'next/link'
import { randomUUID } from 'node:crypto'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { PhotoManager } from '@/components/posting/PhotoManager'
import { PostingProgress } from '@/components/posting/PostingProgress'
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
    <section className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-8" aria-labelledby="photo-heading">
      <Link href={resolved.canonicalUrl} className="inline-flex min-h-11 items-center text-label text-brand-700">← Back to pricing review</Link>
      <PostingProgress view={resolved.view} photos />
      <h1 id="photo-heading" className="mt-8 font-display text-heading-1 text-ink-900">Show your property at its best.</h1>
      <p className="mt-3 text-body-lg text-ink-700">Add clear photos, choose the cover and arrange the order buyers will see.</p>
      {user && collection ? <PhotoManager key={collection} collection={collection} /> : <div className="mt-7 rounded-lg border border-border-subtle bg-surface-000 p-6">
        <h2 className="font-display text-heading-3 text-ink-900">Sign in to upload photos</h2>
        <p className="mt-2 text-body text-ink-700">Your photos will be stored privately in your account. Your property answers remain in this page link.</p>
        <Link href={`/login?next=${encodeURIComponent(photoUrl)}`} className="mt-5 inline-flex min-h-11 items-center rounded-md bg-brand-600 px-5 font-semibold text-on-brand">Login/Register</Link>
      </div>}
    </section>
  </PageShell>
}

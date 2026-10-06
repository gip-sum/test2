import { ReloadDraft } from '@/components/drafts/ReloadDraft'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { getVerifiedUser } from '@/lib/auth/session'
import { listDrafts } from '@/lib/drafts/queries'
import { draftTitle, type Draft } from '@/lib/drafts/types'
export const metadata: Metadata = { title: 'My property drafts', robots: { index: false, follow: false } }
export default async function DraftsPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/login?next=%2Fpost%2Fdrafts')
  let drafts: Draft[] | null = null
  try { drafts = await listDrafts(user) } catch {}
  return <PageShell><section className="mx-auto w-full max-w-5xl px-4 pb-28 pt-8 sm:px-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-heading-1 font-display text-ink-900">My drafts</h1><Link href="/post" className="inline-flex min-h-11 items-center rounded-md bg-brand-600 px-4 font-semibold text-on-brand">New property</Link></div>
    <p className="mt-3 text-body text-ink-700">Private, unfinished listings. Resume on any device after signing in. Nothing here is published.</p>
    {drafts === null ? <div role="alert" className="mt-8 rounded-lg border border-border-strong p-5"><p>Your drafts could not be loaded.</p><ReloadDraft /></div> : drafts.length === 0 ? <p className="mt-8 rounded-lg bg-brand-100 p-6">No drafts yet. Start a property and choose Save as draft.</p> : <ul className="mt-8 grid gap-4 sm:grid-cols-2">{drafts.map(draft => <li key={draft.id} className="min-w-0 rounded-lg border border-border-subtle bg-surface-000 p-5 shadow-e1">
      <h2 className="break-words text-heading-3 font-display text-ink-900">{draftTitle(draft)}</h2>
      <p className="mt-2 text-body-sm text-ink-500">Saved {new Date(draft.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST</p>
      <Link href={`/post/drafts/${draft.id}`} className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-700">Resume draft →<span className="sr-only"> {draftTitle(draft)}</span></Link>
      <Link href={`/post/drafts/${draft.id}/preview`} className="ml-4 inline-flex min-h-11 items-center font-semibold text-brand-700">Preview<span className="sr-only"> {draftTitle(draft)}</span></Link>
    </li>)}</ul>}
  </section></PageShell>
}

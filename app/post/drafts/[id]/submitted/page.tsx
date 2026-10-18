import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound,redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { PublishedProperty } from '@/components/listings/PublishedProperty'
import { getSubmittedCopy } from '@/lib/listings/queries'
import { getVerifiedUser } from '@/lib/auth/session'
import { DraftError } from '@/lib/drafts/queries'
import { effectiveStatus } from '@/lib/listings/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { UUID } from '@/lib/media/types'
export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Submitted property copy',robots:{index:false,follow:false},referrer:'no-referrer'}
export default async function SubmittedPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!UUID.test(id))notFound()
 const user=await getVerifiedUser();if(!user)redirect(`/login?next=${encodeURIComponent(`/post/drafts/${id}/submitted`)}`)
 let result
 try{result=await getSubmittedCopy(user,id)}catch(e){if(e instanceof DraftError&&e.status===404)notFound();throw e}
 const status=effectiveStatus(result.listing)
 return <PageShell><div className="mx-auto mt-6 max-w-[1256px] rounded-lg bg-brand-100 p-4"><p className="flex flex-wrap items-center gap-2 font-semibold text-brand-700">Submitted copy <StatusBadge status={status}/></p><p className="mt-1 text-body-sm text-ink-700">These are the facts and photos submitted for review. Working draft edits do not change this copy.</p><Link href={`/post/drafts/${id}/lifecycle`} className="mt-2 inline-flex min-h-11 items-center text-brand-700 underline">Back to publishing status</Link></div><PublishedProperty model={result.model} postedAt={status==='ACTIVE'?result.listing.activated_at??undefined:undefined}/></PageShell>
}

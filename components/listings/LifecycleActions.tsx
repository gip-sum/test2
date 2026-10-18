'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { canSubmit,canWithdraw,type ListingStatus } from '@/lib/listings/types'
import { Button } from '@/components/ui/Button'
import { afterRefresh } from '@/lib/a11y/after-refresh'
/*
 * Submit, withdraw and delete change what the public can see and pass
 * through review or are permanent, so none is optimistic: the page changes
 * when the server has done it (UI-09 evaluated each). The pressed button
 * stays focused while busy (Button loading), and after the refresh — which
 * remounts this section with different actions — focus moves to the
 * listing status, a live region that reads the new state.
 */
export function LifecycleActions({id,version,status,signature,confirmed,configured}:{id:string;version:number;status:ListingStatus;signature:string;confirmed:boolean;configured:boolean}){
 const router=useRouter(),[accepted,setAccepted]=useState(false),[remove,setRemove]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState('')
 async function act(action:'submit'|'withdraw'|'delete'){
  if(busy)return
  setBusy(action);setError('')
  try{
   const r=await fetch('/api/posting/lifecycle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,version,action,signature,accepted:action==='delete'?remove:accepted}),signal:AbortSignal.timeout(290000)})
   const b=await r.json();if(!r.ok)throw Error(b.error||'Action could not be saved. Retry.')
   afterRefresh(['listing-status'])
   router.refresh()
  }catch(e){setError(e instanceof Error?e.message:'Action failed. Please retry.')}finally{setBusy('')}
 }
 return <section aria-labelledby="actions-heading" className="rounded-lg border border-border-subtle p-5">
  <h2 id="actions-heading" className="text-heading-3 font-display text-ink-900">Listing actions</h2>
  {!configured&&<p role="status" className="mt-3 text-ink-700">Publishing is temporarily unavailable. Your draft and review are saved.</p>}
  {canSubmit(status)&&<div className="mt-3">
   <p className="text-body-sm text-ink-700">Submit your confirmed preview for review. It becomes public only after approval.</p>
   {!confirmed&&<p className="mt-2 text-body-sm font-semibold text-ink-900">Confirm the current preview before submitting.</p>}
   <label className="mt-3 flex min-h-11 items-center gap-3 text-body-sm"><input type="checkbox" checked={accepted} disabled={!confirmed||!configured||Boolean(busy)} onChange={e=>setAccepted(e.target.checked)} className="size-5 accent-brand-600"/>I want to submit this property for review.</label>
   <Button type="button" disabled={!accepted||!confirmed||!configured} loading={busy==='submit'} aria-disabled={busy&&busy!=='submit'?true:undefined} onClick={()=>act('submit')} className="mt-2 px-5">{busy==='submit'?'Validating photos and submitting…':status==='DRAFT'?'Submit for review':'Re-submit for review'}</Button>
  </div>}
  {canWithdraw(status)&&<div className="mt-5"><p className="text-body-sm text-ink-700">Withdraw to edit. This removes any public listing immediately. A new submission needs review again.</p><Button type="button" variant="secondaryBrand" onClick={()=>act('withdraw')} disabled={!configured} loading={busy==='withdraw'} aria-disabled={busy&&busy!=='withdraw'?true:undefined} className="mt-2">{busy==='withdraw'?'Withdrawing…':'Withdraw to draft'}</Button></div>}
  {status!=='DELETED'&&version>0&&<div id="remove-listing" className="mt-6 scroll-mt-24 border-t border-border-subtle pt-4"><label className="flex min-h-11 items-center gap-3 text-body-sm"><input type="checkbox" checked={remove} disabled={!configured||Boolean(busy)} onChange={e=>setRemove(e.target.checked)} className="size-5 accent-brand-600"/>I understand this listing will be permanently removed. My working draft stays saved.</label><button type="button" disabled={!remove||!configured} aria-disabled={busy?true:undefined} aria-busy={busy==='delete'||undefined} onClick={()=>act('delete')} className="mt-2 min-h-11 rounded-md border border-danger-600 px-4 font-semibold text-danger-600 disabled:opacity-50 aria-disabled:opacity-50">{busy==='delete'?'Removing…':'Delete listing'}</button></div>}
  {busy&&<p role="status" className="mt-3 text-body-sm">Please wait. Large photo collections can take a few minutes.</p>}
  {error&&<div role="alert" className="mt-3 text-danger-600"><p>{error}</p><button type="button" onClick={()=>window.location.reload()} className="min-h-11 underline">Reload status</button></div>}
 </section>
}

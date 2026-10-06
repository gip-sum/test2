'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
export function ConfirmPreview({id,signature,canConfirm,confirmed}:{id:string;signature:string;canConfirm:boolean;confirmed:boolean}) {
  const router=useRouter(),[accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(confirmed)
  async function confirm() {
    setBusy(true);setError('')
    try {
      const r=await fetch('/api/posting/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,signature,accepted}),signal:AbortSignal.timeout(30000)})
      const body=await r.json();if(!r.ok)throw Error(body.error||'Could not confirm this review.')
      setDone(true);router.refresh()
    }catch(e){setError(e instanceof Error?e.message:'Could not confirm. Retry.')}finally{setBusy(false)}
  }
  return <section aria-labelledby="confirmation-heading" className="rounded-lg border border-border-subtle bg-brand-100 p-5">
    <h2 id="confirmation-heading" className="font-display text-heading-3 text-ink-900">Final review</h2>
    <p className="mt-2 text-body-sm text-ink-700">Check the information and photos as a buyer would see them. Confirming this review does not publish your property.</p>
    {done ? <p role="status" className="mt-4 font-semibold text-brand-700">Review confirmed. Your property is still private and unpublished.</p> : <>
      <label className="mt-4 flex min-h-11 items-start gap-3 text-body-sm text-ink-900"><input type="checkbox" checked={accepted} disabled={!canConfirm||busy} onChange={e=>setAccepted(e.target.checked)} className="mt-1 size-5 shrink-0 accent-brand-600"/>I have checked the property details, pricing, seller name and photos.</label>
      <button type="button" disabled={!canConfirm||!accepted||busy} onClick={confirm} className="mt-4 min-h-11 w-full rounded-md bg-brand-600 px-4 font-semibold text-on-brand disabled:opacity-50">{busy?'Confirming…':'Confirm review'}</button>
      {!canConfirm&&<p className="mt-3 text-body-sm text-ink-700">Resolve the warnings before confirming.</p>}
    </>}
    <p className="mt-3 text-caption text-ink-500">Changes to saved details, photos or your display name require a new review. Publishing is not available in this step.</p>
    {error&&<div role="alert" className="mt-3 text-body-sm text-danger-600"><p>{error}</p><button type="button" onClick={()=>window.location.reload()} className="min-h-11 underline">Reload preview</button></div>}
  </section>
}

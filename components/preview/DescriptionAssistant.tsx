'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DESCRIPTION_LIMIT, validDescription, type DescriptionJob } from '@/lib/descriptions/types'
import { Button } from '@/components/ui/Button'
export function DescriptionAssistant({id,revision,signature,description,available,complete,initialJob,initialError}:{id:string;revision:number;signature:string;description:string|null;available:boolean;complete:boolean;initialJob:DescriptionJob|null;initialError?:string}) {
  const router=useRouter(),[text,setText]=useState(description??''),[job,setJob]=useState(initialJob),[busy,setBusy]=useState<false|'save'|'generate'>(false),[error,setError]=useState(initialError??''),[notice,setNotice]=useState('')
  const working=job?.status==='QUEUED'||job?.status==='RUNNING',stale=!!job&&job.draft_revision!==revision
  const jobId=job?.id
  const pendingDelivery=job?.status==='QUEUED'&&!job.dispatched&&!stale
  useEffect(()=>{
    if (!working||!jobId) return
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>,polls=0
    async function poll() {
      try {
        const r=await fetch(`/api/posting/description/jobs/${jobId}`,{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])}),body=await r.json()
        if (!r.ok) throw Error(body.error??'Job status is unavailable.')
        if (controller.signal.aborted) return
        setJob(body.job)
        if (['QUEUED','RUNNING'].includes(body.job.status)&&++polls<100) timer=setTimeout(poll,3000)
        else if (polls>=100) setError('Processing is taking longer. Reload this preview to check the saved job.')
      }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Job status is unavailable.')}
    }
    timer=setTimeout(poll,2000)
    return ()=>{controller.abort();clearTimeout(timer)}
  },[working,jobId]) // Keep a bounded poll loop for each job, without resetting it on every status response.
  async function act(action:'save'|'generate') {
    if (busy) return
    setBusy(action);setError('');setNotice('')
    try {
      const r=await fetch('/api/posting/description',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id,revision,signature,description:text})}),body=await r.json()
      if (!r.ok) throw Error(body.error??'The request could not be completed.')
      if (action==='generate') {setJob(body.job);setNotice('Job saved. You can leave this page and return later.')}
      else {setNotice('Description saved. Review and confirm the updated preview.');router.refresh()}
    }catch(e){setError(e instanceof Error?e.message:'The request could not be completed.')}
    finally {setBusy(false)}
  }
  return <section className="mt-8 rounded-lg border border-border-subtle p-4 sm:p-5" aria-labelledby="description-heading">
    <h2 id="description-heading" className="font-display text-heading-3">About this property</h2>
    <p id="description-help" className="mt-2 text-body-sm text-ink-700">Write one paragraph, or ask AI to draft it from your saved facts. Review every claim before saving.</p>
    <label htmlFor="property-description" className="mt-4 block font-semibold">Property description</label>
    <textarea id="property-description" aria-describedby="description-help description-count" rows={5} value={text} onChange={e=>setText(e.target.value)} className="mt-2 w-full min-w-0 rounded-md border border-border-strong bg-surface-000 p-3 text-ink-900"/>
    <p id="description-count" className="mt-1 text-caption text-ink-500">{[...text].length.toLocaleString('en-IN')} / {DESCRIPTION_LIMIT.toLocaleString('en-IN')} characters · no line breaks</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <Button type="button" variant="outline" onClick={()=>act('save')} loading={busy==='save'} aria-disabled={busy==='generate'||undefined} disabled={!validDescription(text)||text.trim()===(description??'')}>Save description</Button>
      <Button type="button" variant="outline" onClick={()=>act('generate')} loading={busy==='generate'} aria-disabled={busy==='save'||undefined} disabled={(working&&!pendingDelivery)||!available||!complete}>{pendingDelivery?'Retry background delivery':'Generate with AI'}</Button>
    </div>
    <p className="mt-3 text-caption text-ink-500">Generation sends property type, coarse location, price and property facts to our configured AI provider. Your name, contact details, street address and photos are excluded.</p>
    {!available&&<p className="mt-2 text-body-sm text-ink-700">AI generation is not enabled yet. You can write and save your own description.</p>}
    {available&&!complete&&<p className="mt-2 text-body-sm text-ink-700">Complete and save the missing property information first.</p>}
    <div role="status" aria-live="polite" className="mt-3 text-body-sm text-ink-700">
      {busy&&<p>Saving your request…</p>}{notice&&<p>{notice}</p>}
      {working&&<p>{pendingDelivery?'Background delivery is not confirmed. Retry delivery to send the same job.':job?.status==='QUEUED'?'Waiting for the background worker…':'The background worker is drafting your description…'}</p>}
      {job?.status==='FAILED'&&<p>Generation did not finish. {job.error_code==='EXPIRED'?'This job has expired.':'The provider or worker could not complete this request.'} You can write your description manually.</p>}
      {job?.status==='SUCCEEDED'&&<p>AI suggestion ready. Review it before using it.</p>}
      {stale&&<p>The property changed since this suggestion was requested. Review the latest facts before using it.</p>}
    </div>
    {job?.status==='SUCCEEDED'&&job.result&&<div className="mt-3 rounded-md bg-brand-100 p-3"><h3 className="font-semibold">AI suggestion · not saved</h3><p className="mt-2 break-words">{job.result}</p><Button type="button" variant="outline" className="mt-3" disabled={stale} aria-disabled={Boolean(busy)||undefined} onClick={()=>{setText(job.result!);setNotice('Suggestion placed in the editor. Edit it and choose Save description.')}}>Use suggestion in editor</Button></div>}
    {error&&<p role="alert" className="mt-3 text-body-sm text-ink-700">{error}</p>}
  </section>
}

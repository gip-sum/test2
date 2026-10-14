import 'server-only'
import { cookies } from 'next/headers'
import { send } from '@vercel/queue'
import { ACCESS_COOKIE } from '@/lib/auth/session'
import { authConfig, type AuthUser } from '@/lib/auth/provider'
import { DraftError, getDraft } from '@/lib/drafts/queries'
import { getPreview } from '@/lib/preview/queries'
import { descriptionFacts, validDescription, visibleJob, type DescriptionJob } from './types'
const fields='id,draft_id,draft_revision,status,dispatched,attempts,result,error_code,created_at,updated_at'
export function descriptionAIAvailable() {
  return process.env.AI_DESCRIPTION_ENABLED==='true' && /^[a-z0-9_-]+\/[a-zA-Z0-9._:-]+$/.test(process.env.AI_GATEWAY_MODEL??'') && (process.env.AI_GATEWAY_MODEL?.length??0)<=120 && !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!(process.env.VERCEL_OIDC_TOKEN||process.env.AI_GATEWAY_API_KEY)
}
async function request(path:string,method='GET',body?:object,privileged=false) {
  const config=authConfig(),token=(await cookies()).get(ACCESS_COOKIE)?.value,key=privileged?process.env.SUPABASE_SERVICE_ROLE_KEY:config?.key
  if (!config || !key || (!privileged&&!token)) throw new DraftError('Sign in again to edit this description.',401)
  try {
    return await fetch(config.base.replace(/\/auth\/v1$/,'')+'/rest/v1/'+path,{method,body:body?JSON.stringify(body):undefined,headers:{apikey:key,...(privileged?(key.startsWith('sb_')?{}:{Authorization:`Bearer ${key}`}):{Authorization:`Bearer ${token}`}), 'Content-Type':'application/json',Prefer:'return=representation'},cache:'no-store',signal:AbortSignal.timeout(15000)})
  } catch {throw new DraftError('Description storage is unavailable. Please retry.')}
}
export async function saveDescription(user:AuthUser,id:string,revision:number,value:string) {
  if (!validDescription(value)) throw new DraftError('Use plain text, up to 2,000 characters, on one line.',422)
  const description=value.trim()||null
  const r=await request(`property_drafts?id=eq.${id}&owner_id=eq.${user.id}&revision=eq.${revision}`,'PATCH',{description})
  if (!r.ok) throw new DraftError('The description could not be saved. Please retry.')
  const row=(await r.json())[0]
  if (row) return {revision:row.revision}
  const current=await getDraft(user,id)
  if ((current.description??null)===description) return {revision:current.revision}
  throw new DraftError('This draft changed. Reload the preview before saving.',409)
}
export async function latestDescriptionJob(user:AuthUser,draft:string):Promise<DescriptionJob|null> {
  const r=await request(`property_description_jobs?owner_id=eq.${user.id}&draft_id=eq.${draft}&select=${fields}&order=created_at.desc&limit=1`)
  if (!r.ok) throw new DraftError('Background job status could not be loaded. Please retry.')
  const row=(await r.json() as DescriptionJob[])[0]
  return row?visibleJob(Object.fromEntries(fields.split(',').map(k=>[k,row[k as keyof DescriptionJob]])) as DescriptionJob):null
}
export async function getDescriptionJob(user:AuthUser,id:string):Promise<DescriptionJob> {
  const r=await request(`property_description_jobs?owner_id=eq.${user.id}&id=eq.${id}&select=${fields}`)
  if (!r.ok) throw new DraftError('Background job status could not be loaded. Please retry.')
  const row=(await r.json() as DescriptionJob[])[0]
  if (!row) throw new DraftError('Job not found.',404)
  return visibleJob(Object.fromEntries(fields.split(',').map(k=>[k,row[k as keyof DescriptionJob]])) as DescriptionJob)
}
export async function generateDescription(user:AuthUser,id:string,revision:number,signature:string) {
  const preview=await getPreview(user,id)
  if (preview.draft.revision!==revision||preview.signature!==signature) throw new DraftError('This draft changed. Reload the preview before generating.',409)
  if (!preview.model.canConfirm) throw new DraftError('Complete your saved property information before generating.',422)
  if (!descriptionAIAvailable()) throw new DraftError('AI descriptions are not enabled yet. You can write and save your own description.',503)
  const r=await request('rpc/create_property_description_job','POST',{p_owner:user.id,p_draft:id,p_revision:revision,p_hash:signature,p_model:process.env.AI_GATEWAY_MODEL,p_facts:descriptionFacts(preview.model)},true)
  if (!r.ok) {
    const code=await r.json().catch(()=>({}))
    if (code.message==='DAILY_LIMIT') throw new DraftError('The daily generation limit has been reached. Please write a description or try tomorrow.',429)
    if (code.message==='STALE_DRAFT') throw new DraftError('This draft changed. Reload the preview.',409)
    throw new DraftError('The background job could not be created. Please retry.')
  }
  const job=(await r.json() as DescriptionJob[])[0]
  if (!job) throw new DraftError('The background job was not confirmed. Please retry.')
  if (visibleJob(job).status==='QUEUED'&&!job.dispatched) {
    try {
      await send('property-descriptions',{jobId:job.id},{region:'iad1',idempotencyKey:job.id,retentionSeconds:3600})
      const acknowledged=await request('rpc/dispatch_property_description_job','POST',{p_id:job.id},true)
      if (!acknowledged.ok) throw Error('Dispatch acknowledgement unavailable')
    }
    catch {throw new DraftError('The job is saved but delivery was not confirmed. Retry Generate to send the same job.',503)}
  }
  // The privileged row includes input facts and lease fields. Never return them.
  return getDescriptionJob(user,job.id)
}

import type { PreviewModel } from '@/lib/preview/model'
export const DESCRIPTION_LIMIT = 2000
export function validDescription(value: unknown): value is string {
  return typeof value === 'string' && [...value].length <= DESCRIPTION_LIMIT && !/[\u0000-\u001f\u007f-\u009f]/.test(value) && [...value].every(c=>c.length===2||!/[\ud800-\udfff]/.test(c))
}
export type DescriptionJob = {id:string;draft_id:string;draft_revision:number;status:'QUEUED'|'RUNNING'|'SUCCEEDED'|'FAILED';dispatched:boolean;attempts:number;result:string|null;error_code:string|null;created_at:string;updated_at:string}
export function visibleJob(job: DescriptionJob, now=Date.now()): DescriptionJob {
  return ['QUEUED','RUNNING'].includes(job.status) && now-Date.parse(job.created_at)>3600000 ? {...job,status:'FAILED',error_code:'EXPIRED'} : job
}
/** A strict projection: private identity, address, photos and prose never reach the provider. */
export function descriptionFacts(m: PreviewModel) {
  if (!m.facts || !m.pricing || !m.location || !m.city || !m.locality || !m.entry.type) throw Error('Complete the saved property facts first.')
  const f=m.facts,p=m.pricing
  return {intent:p.intent,property_type:m.entry.type,city:m.city,locality:m.locality,bedrooms:f.bedrooms??null,bathrooms:f.bathrooms,carpet_area:f.carpetArea,area_unit:f.areaUnit,furnishing:f.furnishing,floor:f.floor??null,total_floors:f.totalFloors,construction_status:f.constructionStatus,price_rupees:p.intent==='buy'?p.price:p.monthlyRent}
}

import { describe,it,expect } from 'vitest'
import { effectiveStatus,canSubmit,canWithdraw,publishedModel,submissionOf,type Submission,type ListingPhoto } from './types'
import { buildPreview } from '@/lib/preview/model'
import { getPostingLocations } from '@/lib/location/queries'
import type { Draft } from '@/lib/drafts/types'
const draft:Draft={id:'draft',owner_id:'owner',collection_id:'collection',revision:1,created_at:'2026-10-13',updated_at:'2026-10-13',page_path:'/post',role:'OWNER',intent:'rent',type:'STUDIO',baths:'1',unit:'sqm',carpet:'100',furnishing:'UNFURNISHED',floor:'0',floors:'8',status:'READY',age:'0',city:'kolkata',locality:'new-town',address:'Test building address',rent:'25000',deposit:'0',maintenance:'included',negotiable:'yes',available:'now'}
describe('listing snapshot and lifecycle',()=>{
 it('expiry boundary removes public visibility exactly at expiry',()=>{expect(effectiveStatus({status:'ACTIVE',expires_at:'2026-10-13T12:00:00Z'},Date.parse('2026-10-13T12:00:00Z'))).toBe('EXPIRED');expect(effectiveStatus({status:'ACTIVE',expires_at:'2026-10-13T12:00:00Z'},Date.parse('2026-10-13T11:59:59Z'))).toBe('ACTIVE')})
 it('deleted and review states cannot submit',()=>{for(const status of ['ACTIVE','UNDER_REVIEW','DELETED'] as const)expect(canSubmit(status)).toBe(false);for(const status of ['DRAFT','REJECTED','EXPIRED'] as const)expect(canSubmit(status)).toBe(true)})
 it('draft and deleted cannot be withdrawn',()=>{expect(canWithdraw('DELETED')).toBe(false);expect(canWithdraw('DRAFT')).toBe(false);expect(canWithdraw('ACTIVE')).toBe(true)})
 it('pins validated fields and preserves zero, unknown units and studio',()=>{
  const m=buildPreview(draft,[{id:'photo',status:'ready',collection_id:'collection',original_name:'name',position:0,width:640,height:480,bytes:1000}],'Seller',getPostingLocations(),'2026-10-13')
  const s=submissionOf(m,1,'a'.repeat(64));expect(s.deposit).toBe(0);expect(s.bedrooms).toBeNull();expect(s.floor).toBe(0);expect(s.area_unit).toBe('sqm');expect(s.maintenance_status).toBe('included')
  const p=publishedModel({...s,id:'submitted',listing_id:'listing',created_at:'2026-10-13'} as Submission,[{id:'photo',position:0} as ListingPhoto],'listing')
  expect(p.media[0]?.url).toBe('/api/listings/listing/photos/photo');expect(p.media[0]?.url).not.toContain('/posting/');expect(p.facts?.carpetArea).toBe(100);expect(p.carpetSqft).toBeCloseTo(1076.39);expect(p.pricing).toMatchObject({intent:'rent',deposit:0,maintenance:{status:'included'}})
 })
 it('incomplete content cannot create submission facts',()=>{expect(()=>submissionOf(buildPreview({...draft,rent:''},[],'Seller',getPostingLocations(),'2026-10-13'),1,'a'.repeat(64))).toThrow()})
})

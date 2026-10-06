import { describe,it,expect } from 'vitest'
import { buildPreview } from './model'
import type { Draft } from '@/lib/drafts/types'
import { getPostingLocations } from '@/lib/location/queries'
const base:Draft={id:'draft',owner_id:'owner',collection_id:'collection',revision:1,created_at:'2026-10-06',updated_at:'2026-10-06',page_path:'/post',role:'OWNER',intent:'buy',type:'APARTMENT',bhk:'2',baths:'2',unit:'sqft',carpet:'1000',furnishing:'UNFURNISHED',floor:'3',floors:'8',status:'READY',age:'4',city:'kolkata',locality:'new-town',address:'Test building address',saleprice:'6000000',maintenance:'none',negotiable:'yes'}
const photo={id:'photo',collection_id:'collection',original_name:'private.jpg',status:'ready' as const,position:0,width:640,height:480,bytes:1000}
const make=(changes:Partial<Draft>={},photos=[photo],name:string|null='Seller')=>buildPreview({...base,...changes},photos,name,getPostingLocations(),'2026-10-06')
describe('private preview model',()=>{
 it('valid sale is confirmable and uses private photo URLs',()=>{const p=make();expect(p.canConfirm).toBe(true);expect(p.media[0]?.authenticated).toBe(true);expect(p.media[0]?.url).toBe('/api/posting/photos/photo');expect(p.title).toContain('2 BHK');expect(p.pricing?.intent).toBe('buy')})
 it('partial data warns rather than inventing a price or facts',()=>{const p=make({carpet:'',saleprice:''});expect(p.canConfirm).toBe(false);expect(p.facts).toBeNull();expect(p.pricing).toBeNull();expect(p.warnings.some(w=>w.section==='details')).toBe(true)})
 it('preserves zero deposit and included maintenance for rent',()=>{const p=make({intent:'rent',rent:'25000',deposit:'0',maintenance:'included',available:'now'});expect(p.pricing).toMatchObject({intent:'rent',deposit:0,maintenance:{status:'included'}});expect(p.canConfirm).toBe(true)})
 it('converts sqm only for the displayed sqft price rate',()=>{const p=make({unit:'sqm',carpet:'100'});expect(p.carpetSqft).toBeCloseTo(1076.39);expect(p.facts?.carpetArea).toBe(100)})
 it('studio is not advertised as a bedroom count',()=>{const p=make({type:'STUDIO',bhk:'9'});expect(p.title).toContain('Studio');expect(p.title).not.toContain('9 BHK')})
 it('no photos and missing seller prevent confirmation',()=>{const p=make({},[],null);expect(p.warnings.map(w=>w.section)).toEqual(['photos','seller'])})
 it('pending photos are excluded and block confirmation',()=>{const p=buildPreview(base,[photo,{...photo,id:'pending',status:'pending'}],'Seller',getPostingLocations(),'2026-10-06');expect(p.media).toHaveLength(1);expect(p.canConfirm).toBe(false)})
 it('cover order follows stored positions',()=>{const p=make({},[{...photo,id:'last',position:4},{...photo,id:'first',position:0}]);expect(p.media.map(p=>p.id)).toEqual(['first','last'])})
 it('unknown maintenance stays unknown',()=>expect(make({maintenance:'unknown'}).pricing?.maintenance).toEqual({status:'unknown'}))
})

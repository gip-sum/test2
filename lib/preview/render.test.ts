import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe,it,expect} from 'vitest'
import {Gallery} from '@/components/property/Gallery'
import {KeyDetails} from '@/components/property/KeyDetails'
import {AreaBreakdown} from '@/components/property/AreaBreakdown'
import {SellerBlock} from '@/components/property/SellerBlock'
describe('shared buyer preview rendering',()=>{
 it('private gallery uses cookie-authenticated image URL directly',()=>{
  const html=renderToStaticMarkup(createElement(Gallery,{title:'Private home',photos:[{id:'p',url:'/api/posting/photos/p',alt:'Property photo',authenticated:true}]}))
  expect(html).toContain('src="/api/posting/photos/p"');expect(html).not.toContain('/_next/image')
 })
 it('unknown parking and ownership are omitted rather than invented',()=>{
  const html=renderToStaticMarkup(createElement(KeyDetails,{property:{propertyType:'STUDIO',carpetArea:100,areaUnit:'sqm'}}))
  expect(html).not.toContain('undefined');expect(html).not.toContain('Parking');expect(html).not.toContain('Ownership');expect(html).toContain('Studio')
 })
 it('sqm rental rate has a monthly label and correct sqft conversion',()=>{
  const html=renderToStaticMarkup(createElement(AreaBreakdown,{property:{carpetArea:100,areaUnit:'sqm',price:25000,intent:'rent'}}))
  expect(html).toContain('₹23 per sqft');expect(html).toContain('per month')
 })
 it('unpublished seller has no invented posted date',()=>{
  const html=renderToStaticMarkup(createElement(SellerBlock,{property:{sellerType:'OWNER',sellerName:'Seller'}}))
  expect(html).toContain('Not published');expect(html).not.toContain('Invalid Date')
 })
})

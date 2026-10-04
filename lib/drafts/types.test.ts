import { describe, expect, it } from 'vitest'
import { parseSnapshot, sameSnapshot, snapshotFromUrl, snapshotUrl } from './types'
describe('partial draft snapshots', () => {
 it('retains incomplete and blank answers', () => { expect(parseSnapshot({path:'/post',input:{carpet:'1,',address:'',saleprice:'00',edit:'1'}})?.input).toEqual({carpet:'1,',address:'',saleprice:'00',edit:'1'}) })
 it('rejects unknown fields, owner injection, arrays, long strings and control characters', () => {
  for (const input of [{owner_id:'x'}, {address:['a']}, {address:'x'.repeat(241)}, {address:'a\u0000b'}]) expect(parseSnapshot({path:'/post',input})).toBeNull()
  expect(parseSnapshot({path:'https://evil.test',input:{}})).toBeNull()
  expect(parseSnapshot({path:'/post',input:{},revision:4})).toBeNull()
 })
 it('round trips supported query values without exposing collection or auth', () => {
  const s=snapshotFromUrl(new URL('https://site.test/post/photos?role=OWNER&address=A%26B&collection=secret&token=secret'))
  expect(snapshotUrl(s)).toBe('/post/photos?role=OWNER&address=A%26B')
 })
 it('compares snapshots independent of key order but distinguishes clearing', () => {
  expect(sameSnapshot({path:'/post',input:{role:'OWNER',carpet:'1'}},{path:'/post',input:{carpet:'1',role:'OWNER'}})).toBe(true)
  expect(sameSnapshot({path:'/post',input:{}},{path:'/post',input:{carpet:''}})).toBe(false)
 })
})

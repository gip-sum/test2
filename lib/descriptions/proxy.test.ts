import {beforeEach,it,expect,vi} from 'vitest'
import {NextRequest} from 'next/server'
vi.mock('server-only',()=>({}))
const m=vi.hoisted(()=>({request:vi.fn()}))
vi.mock('@/lib/auth/provider',()=>({authConfig:()=>({base:'https://test.invalid',key:'public-key'}),authRequest:m.request,validSession:()=>false}))
import {proxy} from '@/proxy'
beforeEach(()=>{vi.clearAllMocks();m.request.mockResolvedValue({ok:true,data:{id:'owner'}})})
it('new description routes reach their own auth handlers instead of the city parser',async()=>{
 for(const path of ['/api/posting/description','/api/posting/description/jobs/a9140f33-a429-46f3-9514-3e8f32f18189']){
  const response=await proxy(new NextRequest('https://site.test'+path))
  expect(response.headers.get('x-middleware-next')).toBe('1')
  expect(response.headers.has('x-middleware-rewrite')).toBe(false)
 }
})
it('description polling refreshes authentication through the existing guard',async()=>{
 const request=new NextRequest('https://site.test/api/posting/description/jobs/a9140f33-a429-46f3-9514-3e8f32f18189',{headers:{Cookie:'gb-access=owner-token'}})
 const response=await proxy(request)
 expect(response.headers.get('x-middleware-next')).toBe('1')
 expect(m.request).toHaveBeenCalledWith('/user','GET',undefined,'owner-token')
})
it('invalid search cities still return the branded 404 rewrite',async()=>{
 const response=await proxy(new NextRequest('https://site.test/buy/unknown-city'))
 expect(response.headers.get('x-middleware-rewrite')).toContain('/_gharbazaar_not_found')
})

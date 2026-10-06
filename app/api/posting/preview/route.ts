import { NextResponse, type NextRequest } from 'next/server'
import { draftUser, DraftError } from '@/lib/drafts/queries'
import { confirmPreview } from '@/lib/preview/queries'
import { UUID } from '@/lib/media/types'
const headers={'Cache-Control':'private, no-store'}
export async function POST(request:NextRequest) {
  try {
    if(request.headers.get('origin')!==request.nextUrl.origin) throw new DraftError('Refresh this page before trying again.',403)
    const user=await draftUser(),reader=request.body?.getReader()
    if(!reader) throw new DraftError('Invalid confirmation.',400)
    const chunks:Uint8Array[]=[];let size=0
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();throw new DraftError('Confirmation is too large.',413)}chunks.push(value)}
    let body;try{body=JSON.parse(Buffer.concat(chunks).toString())}catch{throw new DraftError('Invalid confirmation.',400)}
    if(typeof body?.id!=='string'||!UUID.test(body.id)||typeof body.signature!=='string'||!/^[a-f0-9]{64}$/.test(body.signature)||body.accepted!==true)throw new DraftError('Confirm that you have checked the property information.',400)
    return NextResponse.json({review:await confirmPreview(user,body.id,body.signature)},{headers})
  }catch(e){return NextResponse.json({error:e instanceof DraftError?e.message:'Review is temporarily unavailable.'},{status:e instanceof DraftError?e.status:503,headers})}
}

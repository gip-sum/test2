import { NextResponse, type NextRequest } from 'next/server'
import { draftUser, DraftError } from '@/lib/drafts/queries'
import { generateDescription, saveDescription } from '@/lib/descriptions/queries'
import { UUID } from '@/lib/media/types'
const headers={'Cache-Control':'private, no-store'}
export async function POST(request:NextRequest) {
  try {
    if (request.headers.get('origin')!==request.nextUrl.origin) throw new DraftError('Refresh this page before trying again.',403)
    const user=await draftUser(),reader=request.body?.getReader()
    if (!reader) throw new DraftError('Invalid description request.',400)
    const chunks:Uint8Array[]=[];let size=0
    for (;;) {const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>12000){await reader.cancel();throw new DraftError('Description request is too large.',413)}chunks.push(value)}
    let body;try {body=JSON.parse(Buffer.concat(chunks).toString())}catch {throw new DraftError('Invalid description request.',400)}
    if (typeof body?.id!=='string'||!UUID.test(body.id)||!Number.isSafeInteger(body.revision)||body.revision<1) throw new DraftError('Invalid draft or revision.',400)
    if (body.action==='save'&&typeof body.description==='string') return NextResponse.json(await saveDescription(user,body.id,body.revision,body.description),{headers})
    if (body.action==='generate'&&typeof body.signature==='string'&&/^[a-f0-9]{64}$/.test(body.signature)) return NextResponse.json({job:await generateDescription(user,body.id,body.revision,body.signature)},{headers,status:202})
    throw new DraftError('Invalid description action.',400)
  }catch(e){return NextResponse.json({error:e instanceof DraftError?e.message:'Descriptions are temporarily unavailable.'},{status:e instanceof DraftError?e.status:503,headers})}
}

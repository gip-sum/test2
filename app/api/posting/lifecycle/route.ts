import { NextResponse,type NextRequest } from 'next/server'
import { draftUser,DraftError } from '@/lib/drafts/queries'
import { submitListing,changeListing } from '@/lib/listings/queries'
import { UUID } from '@/lib/media/types'
export const runtime='nodejs'
export const maxDuration=300
const headers={'Cache-Control':'private, no-store'}
export async function POST(request:NextRequest){
 try{
  if(request.headers.get('origin')!==request.nextUrl.origin)throw new DraftError('Refresh the page before trying again.',403)
  const user=await draftUser(),reader=request.body?.getReader()
  if(!reader)throw new DraftError('Invalid action.',400)
  const chunks:Uint8Array[]=[];let size=0
  for(;;){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>2048){await reader.cancel();throw new DraftError('Action is too large.',413)}chunks.push(p.value)}
  let b;try{b=JSON.parse(Buffer.concat(chunks).toString())}catch{throw new DraftError('Invalid action.',400)}
  if(!b||typeof b.id!=='string'||!UUID.test(b.id)||!Number.isSafeInteger(b.version)||b.version<0||b.version>2147483647||!['submit','withdraw','delete'].includes(b.action)||Object.keys(b).some(k=>!['id','version','action','signature','accepted'].includes(k)))throw new DraftError('Invalid listing action.',400)
  if(b.action==='submit'){
   if(b.accepted!==true||typeof b.signature!=='string'||!/^[a-f0-9]{64}$/.test(b.signature))throw new DraftError('Confirm that you want to submit this reviewed listing.',400)
   return NextResponse.json({listing:await submitListing(user,b.id,b.signature,b.version)},{headers})
  }
  if(b.action==='delete'&&b.accepted!==true)throw new DraftError('Confirm removal before continuing.',400)
  return NextResponse.json({listing:await changeListing(user,b.id,b.action,b.version)},{headers})
 }catch(e){return NextResponse.json({error:e instanceof DraftError?e.message:'Listing action is temporarily unavailable.'},{status:e instanceof DraftError?e.status:503,headers})}
}

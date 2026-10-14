import { NextResponse } from 'next/server'
import { draftUser, DraftError } from '@/lib/drafts/queries'
import { getDescriptionJob } from '@/lib/descriptions/queries'
import { UUID } from '@/lib/media/types'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const user=await draftUser(),{id}=await params
    if (!UUID.test(id)) throw new DraftError('Job not found.',404)
    return NextResponse.json({job:await getDescriptionJob(user,id)},{headers})
  }catch(e){return NextResponse.json({error:e instanceof DraftError?e.message:'Background job status is unavailable.'},{status:e instanceof DraftError?e.status:503,headers})}
}

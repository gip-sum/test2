import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { PublishedProperty } from '@/components/listings/PublishedProperty'
import { getPublishedListing } from '@/lib/listings/queries'
import { UUID } from '@/lib/media/types'
export const dynamic='force-dynamic'
async function resolve(params:Promise<{id:string}>){const {id}=await params;if(!UUID.test(id))notFound();const r=await getPublishedListing(id);if(!r)notFound();return r}
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const r=await resolve(params);return {title:r.model.title,description:`${r.model.title}. Seller-provided property information.`,alternates:{canonical:`/listing/${r.listing.id}`}}}
export default async function ListingPage({params}:{params:Promise<{id:string}>}){const r=await resolve(params);return <PageShell><PublishedProperty model={r.model} postedAt={r.listing.activated_at!}/></PageShell>}

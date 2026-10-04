import type { Metadata } from 'next'
import type { EntryInput } from '@/lib/posting/entry'
import { PostingPage } from '@/components/posting/PostingPage'

export const metadata: Metadata = {
  title: 'Post a property',
  description: 'List a home in Kolkata: who is posting, sale or rent, the kind of property and its details.',
  robots: { index: false, follow: false },
}

export default async function PostPropertyPage({ searchParams }: { searchParams: Promise<EntryInput> }) {
  return <PostingPage input={await searchParams} />
}

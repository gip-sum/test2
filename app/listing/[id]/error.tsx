'use client'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'

export default function ListingError({ reset }: { reset: () => void }) {
  return <section className="mx-auto max-w-3xl px-4 py-8">
    <h1 className="mb-4 text-heading-2">Listing unavailable</h1>
    <ErrorState surface="inline" action={<Button type="button" onClick={reset}>Retry</Button>}>We could not load this listing. Please retry.</ErrorState>
  </section>
}

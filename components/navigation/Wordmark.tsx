import Link from 'next/link'
import { BRAND } from '@/lib/brand'

export function Wordmark() {
  return <Link href="/" className="reference-wordmark" aria-label={`${BRAND.name} — home`}>{BRAND.shortName}</Link>
}

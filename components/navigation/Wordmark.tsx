import Image from 'next/image'
import Link from 'next/link'
import { BRAND } from '@/lib/brand'

const HEIGHT = 42
const WIDTH = Math.round((BRAND.logo.width / BRAND.logo.height) * HEIGHT)

export function Wordmark() {
  return (
    <Link href="/" className="reference-wordmark" aria-label={`${BRAND.name} — home`}>
      {/* The home link supplies the accessible name for both logo variants. */}
      <Image src={BRAND.logo.light} alt="" width={WIDTH} height={HEIGHT} loading="eager" className="h-[42px] w-auto dark:hidden" />
      <Image src={BRAND.logo.dark} alt="" width={WIDTH} height={HEIGHT} loading="eager" className="hidden h-[42px] w-auto dark:block" />
    </Link>
  )
}

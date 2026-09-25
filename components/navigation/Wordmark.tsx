import Image from 'next/image'
import Link from 'next/link'
import { BRAND } from '@/lib/brand'

/**
 * Header identity.
 *
 * Two files rather than one image plus a CSS filter: see lib/brand.ts for
 * why the dark lockup is a real recolour. They swap on the `dark:` variant,
 * which resolves exactly the way the colour tokens do — an explicit
 * data-theme wins, the OS preference applies otherwise.
 *
 * Both are in the DOM, so both are fetched. At this size each is a couple
 * of kilobytes once next/image re-encodes it, which is a fair price for
 * never flashing the wrong lockup.
 *
 * The link carries the accessible name, so both images are decorative and
 * alt is empty — an alt here would have a screen reader read the brand
 * twice.
 */
const HEIGHT = 42
const WIDTH = Math.round((BRAND.logo.width / BRAND.logo.height) * HEIGHT)

export function Wordmark() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center rounded-md"
      aria-label={`${BRAND.name} — home`}
    >
      <Image
        src={BRAND.logo.light}
        alt=""
        width={WIDTH}
        height={HEIGHT}
        loading="eager"
        className="h-[42px] w-auto dark:hidden"
      />
      <Image
        src={BRAND.logo.dark}
        alt=""
        width={WIDTH}
        height={HEIGHT}
        loading="eager"
        className="hidden h-[42px] w-auto dark:block"
      />
    </Link>
  )
}

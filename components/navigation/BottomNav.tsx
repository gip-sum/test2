'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { HomeIcon, SearchIcon, HeartIcon, PlusIcon, MailIcon, UserIcon } from '@/components/ui/icons'
import { LAUNCH_CITY } from '@/lib/brand'

/**
 * Primary navigation on phones, where most of this product's traffic will be.
 *
 * "Post" sits in the centre with the supply accent because supply is the
 * scarce side of the marketplace.
 *
 * Hidden during focused workflows — the posting wizard, auth, and (later)
 * the gallery lightbox — where a persistent nav competes with the one
 * action the screen exists for. On the property page the sticky contact
 * bar takes its place: stacking a five-item nav under a primary call to
 * action on a 390px screen leaves neither of them usable.
 */
const HIDDEN_PREFIXES = ['/post', '/login', '/admin', '/property']

export function BottomNav({ alwaysShow = false }: { alwaysShow?: boolean }) {
  const pathname = usePathname()
  // A page can overrule the path: the 404 for a dead /property link has no
  // contact bar to stand in for the nav, and a dead end with no way out
  // is exactly what a 404 must not be.
  if (!alwaysShow && HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null

  const items = [
    { href: '/', label: 'Home', Icon: HomeIcon, match: ['/'] },
    { href: `/buy/${LAUNCH_CITY.slug}`, label: 'Search', Icon: SearchIcon, match: ['/buy', '/rent', '/search'] },
    { href: '/account/saved', label: 'Saved', Icon: HeartIcon, match: ['/account/saved'] },
    { href: '/post', label: 'Post', Icon: PlusIcon, match: ['/post'], supply: true },
    { href: '/account/enquiries', label: 'Enquiries', Icon: MailIcon, match: ['/account/enquiries'] },
    { href: '/account', label: 'Account', Icon: UserIcon, match: ['/account'] },
  ]

  return (
    <nav
      aria-label="Primary"
      className="app-bar app-bar-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="flex">
        {items.map(({ href, label, Icon, match, supply }) => {
          const active = href === '/' ? pathname === '/' : href === '/account' ? pathname === '/account' : match.some((m) => pathname.startsWith(m))
          return (
            <li key={label} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                // 44px minimum target, comfortably exceeded at 56px.
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold',
                  supply ? 'text-supply-700' : active ? 'text-brand-600' : 'text-ink-500',
                )}
              >
                {supply ? (
                  <span className="-mt-3 grid size-9 place-items-center rounded-full bg-supply-600 text-on-supply shadow-e2">
                    <Icon className="size-5" />
                  </span>
                ) : (
                  <Icon className="size-5.5" />
                )}
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

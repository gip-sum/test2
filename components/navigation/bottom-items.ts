import type { ComponentType } from 'react'
import { HeartIcon, HomeIcon, PlusIcon, SearchIcon, VideoIcon } from '@/components/ui/icons'
import { LAUNCH_CITY } from '@/lib/brand'

type Item = { href: string; label: string; Icon: ComponentType<{ className?: string }>; current: (path: string) => boolean }

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`)

// Shared by the page bar and its modal menu footer.
export const BOTTOM_NAV_ITEMS: Item[] = [
  { href: '/', label: 'Home', Icon: HomeIcon, current: (p) => p === '/' },
  { href: `/buy/${LAUNCH_CITY.slug}`, label: 'Search', Icon: SearchIcon, current: (p) => under(p, '/buy') || under(p, '/rent') },
  { href: '/post', label: 'Sell/Rent', Icon: PlusIcon, current: (p) => under(p, '/post') },
  { href: '/videos', label: 'Videos', Icon: VideoIcon, current: (p) => under(p, '/videos') },
  {
    href: '/account/activity',
    label: 'Activity',
    Icon: HeartIcon,
    // Everything the hub leads to is "in" Activity.
    current: (p) => ['/account/activity', '/account/saved', '/account/enquiries', '/dashboard/enquiries'].some((prefix) => under(p, prefix)),
  },
]


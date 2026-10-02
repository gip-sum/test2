import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { BRAND } from '@/lib/brand'
import { UserIcon, HeartIcon, MailIcon, HomeIcon } from '@/components/ui/icons'
import { getHomeCollections } from '@/lib/home/discovery'
import { CompactPropertyCard } from '@/components/property/CompactPropertyCard'
import { DevDataNotice } from './DevDataNotice'

export function GuestActivity() {
  const homes = getHomeCollections()[0]?.listings ?? []
  return <PageShell>
    <div className="guest-activity">
      <header className="activity-welcome"><span><UserIcon className="size-8" /></span><div><h1>Hello</h1><p>Welcome to {BRAND.shortName}!</p></div></header>
      <div className="activity-signin"><Link className="reference-login" href="/login?next=%2Faccount%2Factivity">Login/Register</Link>
        <div className="activity-summary" aria-label="Your activity">
          {[{ label: 'Shortlisted', Icon: HeartIcon, href: '/account/saved' }, { label: 'Enquiries', Icon: MailIcon, href: '/account/enquiries' }, { label: 'Your listings', Icon: HomeIcon, href: '/dashboard/enquiries' }].map(({ label, Icon, href }) => <Link key={href} href={href}><Icon className="size-5" /><strong>{label}</strong><span>Sign in to view</span></Link>)}
        </div>
      </div>
      <section className="activity-homes" aria-labelledby="activity-homes"><h2 id="activity-homes">Explore homes in Kolkata</h2><DevDataNotice />
        {homes.length ? <ul className="listing-rail">{homes.map(home => <li key={home.id} className="listing-rail-item"><CompactPropertyCard property={home} /></li>)}</ul> : <p>No homes listed yet. Check back soon.</p>}
      </section>
    </div>
  </PageShell>
}

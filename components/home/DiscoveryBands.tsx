import Link from 'next/link'
import { PropertyTypeArt } from './PropertyTypeArt'
import { getSizeDiscovery, getSellerDiscovery, getPossessionDiscovery, type BandTile } from '@/lib/home/discovery'
import { HouseIcon, UserIcon, BuildingIcon } from '@/components/ui/icons'

export function DiscoveryBands() {
  const size = getSizeDiscovery().buy
  const sellers = getSellerDiscovery()
  const possession = getPossessionDiscovery()
  return <>
    <Band id="bhk-choice" title="BHK choice in mind?" tiles={size} kind="home" />
    <Band id="posted-by" title="Properties posted by" tiles={sellers} kind="seller" />
    {possession.length > 0 && <section className="home-section possession-section" aria-labelledby="possession-title">
      <h2 id="possession-title">Move in now, or plan ahead</h2>
      <p>Homes based on their construction status</p>
      <ul>{possession.map(t => <li key={t.href}><Link href={t.href}><BuildingIcon className="size-8" /><strong>{t.label}</strong><span>{t.count} properties <span aria-hidden>→</span></span></Link></li>)}</ul>
    </section>}
  </>
}
function Band({ id, title, tiles, kind }: { id: string; title: string; tiles: BandTile[]; kind: 'home' | 'seller' }) {
  if (!tiles.length) return null
  const Icon = kind === 'home' ? HouseIcon : UserIcon
  return <section className="discovery-band" aria-labelledby={id}>
    <div className="discovery-band-title"><PropertyTypeArt type={kind === 'home' ? 'INDEPENDENT_HOUSE' : 'BUILDER_FLOOR'} /><h2 id={id}>{title}</h2></div>
    <ul>{tiles.map(t => <li key={t.href}><Link href={t.href}><Icon className="size-7" /><strong>{t.label}</strong><span>{t.count} Properties</span></Link></li>)}</ul>
  </section>
}

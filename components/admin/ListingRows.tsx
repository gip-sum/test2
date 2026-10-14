import Link from 'next/link'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { formatWait, REVIEW_OVERDUE_MS, type AdminListing } from '@/lib/admin/model'
import { SELLER_LABEL } from '@/lib/property/types'

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' })

/**
 * Listings for staff: a table from 768px, cards on phones. `queue` adds the
 * waiting time a reviewer needs and flags waits over 48 hours in words.
 */
export function ListingRows({ rows, queue = false, now }: { rows: AdminListing[]; queue?: boolean; now: number }) {
  const wait = (r: AdminListing) => {
    const ms = now - Date.parse(r.submitted_at)
    return `${formatWait(ms)}${ms > REVIEW_OVERDUE_MS ? ' — over 2 days' : ''}`
  }
  const title = (r: AdminListing) => r.status === 'ACTIVE' ? <Link href={`/listing/${r.id}`} className="inline-flex min-h-11 items-center break-words font-semibold text-brand-700 underline underline-offset-4">{r.title}</Link> : <span className="break-words font-semibold text-ink-900">{r.title}</span>
  return <>
    <table className="hidden w-full border-collapse text-left text-body-sm md:table">
      <thead><tr className="border-b border-border-strong text-ink-700">
        <th scope="col" className="py-2 pr-3 font-semibold">Listing</th>
        <th scope="col" className="px-3 py-2 font-semibold">Seller</th>
        <th scope="col" className="px-3 py-2 text-right font-semibold">Price</th>
        <th scope="col" className="py-2 pl-3 font-semibold">{queue ? 'Waiting' : 'Dates'}</th>
      </tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id} className="border-b border-border-subtle align-top">
        <th scope="row" className="max-w-xs py-3 pr-3 font-normal"><StatusBadge status={r.status} /><div className="mt-1">{title(r)}</div><div className="text-ink-700">{r.locality_name}, {r.city_name} · {r.intent === 'buy' ? 'For sale' : 'For rent'}</div></th>
        <td className="break-words px-3 py-3 text-ink-900">{r.seller_name}<div className="text-ink-700">{SELLER_LABEL[r.seller_type]}</div></td>
        <td className="px-3 py-3 text-right"><PriceDisplay amount={r.price} intent={r.intent} className="items-end" /></td>
        <td className="py-3 pl-3 text-ink-900">{queue ? wait(r) : <>Submitted {day(r.submitted_at)}{r.expires_at && (r.status === 'ACTIVE' || r.status === 'EXPIRED') ? <div className="text-ink-700">{r.status === 'ACTIVE' ? 'Expires' : 'Expired'} {day(r.expires_at)}</div> : null}</>}</td>
      </tr>)}</tbody>
    </table>
    <ul className="grid gap-3 md:hidden">{rows.map((r) => <li key={r.id} className="min-w-0 rounded-lg border border-border-subtle bg-surface-000 p-4 shadow-e1">
      <StatusBadge status={r.status} />
      <div className="mt-1">{title(r)}</div>
      <p className="break-words text-body-sm text-ink-700">{r.locality_name}, {r.city_name} · {r.seller_name} ({SELLER_LABEL[r.seller_type]})</p>
      <PriceDisplay amount={r.price} intent={r.intent} className="mt-1" />
      <p className="mt-1 text-body-sm text-ink-900">{queue ? `Waiting ${wait(r)}` : `Submitted ${day(r.submitted_at)}`}</p>
    </li>)}</ul>
  </>
}

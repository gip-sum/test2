import Link from 'next/link'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { StatusBadge } from '@/components/ui/StatusBadge'
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
  const title = (r: AdminListing) => <Link href={`/admin/moderation/${r.id}`} className="inline-flex min-h-11 max-w-full items-center break-words font-semibold text-ink-900 hover:text-brand-700 hover:underline underline-offset-4">{r.title}</Link>
  return <>
    <table className="workspace-table hidden w-full table-fixed border-collapse text-left text-body-sm md:table">
      <thead><tr className="border-b border-border-subtle bg-surface-100 text-ink-700">
        <th scope="col" className="w-[28%] px-4 py-3 font-semibold">Property</th>
        <th scope="col" className="w-[14%] px-3 py-3 font-semibold">Seller</th>
        <th scope="col" className="w-[13%] px-3 py-3 text-right font-semibold">Price</th>
        <th scope="col" className="w-[16%] px-3 py-3 font-semibold">Status</th>
        <th scope="col" className="w-[16%] px-4 py-3 font-semibold">{queue ? 'Waiting' : 'Submitted'}</th>
        <th scope="col" className="w-[13%] px-3 py-3 font-semibold"><span className="sr-only">Action</span></th>
      </tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id} className="border-b border-border-subtle align-top last:border-0 hover:bg-surface-100">
        <th scope="row" className="px-4 py-2 font-normal"><div>{title(r)}</div><div className="break-words text-caption text-ink-700">{r.locality_name}, {r.city_name} · {r.intent === 'buy' ? 'For sale' : 'For rent'}</div></th>
        <td className="break-words px-3 py-4 text-ink-900">{r.seller_name}<div className="mt-1 text-caption text-ink-700">{SELLER_LABEL[r.seller_type]}</div></td>
        <td className="break-words px-3 py-4 text-right"><PriceDisplay amount={r.price} intent={r.intent} className="items-end [&_p]:text-body-sm [&_p]:font-semibold" /></td>
        <td className="px-3 py-4"><StatusBadge status={r.status} /></td>
        <td className="break-words px-4 py-4 text-body-sm text-ink-900">{queue ? wait(r) : <>{day(r.submitted_at)}{r.expires_at && (r.status === 'ACTIVE' || r.status === 'EXPIRED') ? <div className="mt-1 text-caption text-ink-700">{r.status === 'ACTIVE' ? 'Expires' : 'Expired'} {day(r.expires_at)}</div> : null}</>}</td>
        <td className="px-3 py-3"><Link href={`/admin/moderation/${r.id}`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand-700 px-3 text-label font-semibold text-brand-700 hover:bg-brand-100">Review<span className="sr-only"> {r.title}</span></Link></td>
      </tr>)}</tbody>
    </table>
    <ul className="divide-y divide-border-subtle md:hidden">{rows.map((r) => <li key={r.id} className="min-w-0 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge status={r.status} /><span className="text-caption text-ink-700">{r.intent === 'buy' ? 'For sale' : 'For rent'}</span></div>
      <div className="mt-1">{title(r)}</div>
      <p className="break-words text-body-sm text-ink-700">{r.locality_name}, {r.city_name}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3"><PriceDisplay amount={r.price} intent={r.intent} /><p className="max-w-full break-words text-right text-caption text-ink-700">{r.seller_name}<br />{SELLER_LABEL[r.seller_type]}</p></div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border-subtle pt-2"><p className="text-caption text-ink-700">{queue ? `Waiting ${wait(r)}` : `Submitted ${day(r.submitted_at)}`}</p><Link href={`/admin/moderation/${r.id}`} className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-brand-700 px-3 text-label font-semibold text-brand-700 hover:bg-brand-100">Review<span className="sr-only"> {r.title}</span></Link></div>
    </li>)}</ul>
  </>
}

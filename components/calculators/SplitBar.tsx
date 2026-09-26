import { formatAmount } from '@/lib/format/price'

/**
 * Principal against interest over the life of the loan: one bar, two
 * parts. A proportion of a whole is exactly what a single stacked bar
 * shows best; a donut would ask the reader to compare angles.
 *
 * Identity is never colour alone: both parts are labelled directly with
 * their name, amount and share, the bar itself carries a text alternative,
 * and the yearly schedule below is the table view. Colours are
 * palette-validated tokens (.split-* in globals.css).
 */
export function SplitBar({ principal, interest }: { principal: number; interest: number }) {
  const total = principal + interest
  if (total <= 0) return null
  const principalShare = Math.round((principal / total) * 100)
  const interestShare = 100 - principalShare
  return (
    <figure className="mt-5">
      <figcaption className="text-label font-semibold text-ink-900">Where the money goes</figcaption>
      <div
        role="img"
        aria-label={`Of ${formatAmount(total)} repaid, ${principalShare}% is principal and ${interestShare}% is interest.`}
        className="split-bar mt-2"
      >
        <span className="split-principal" style={{ flexGrow: principal }} title={`Principal: ${formatAmount(principal)}`} />
        {interest > 0 && <span className="split-interest" style={{ flexGrow: interest }} title={`Interest: ${formatAmount(interest)}`} />}
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-3 text-body-sm">
        <div>
          <dt className="flex items-center gap-1.5 text-ink-700"><span className="split-key split-principal" aria-hidden="true" />Principal</dt>
          <dd className="tabular font-semibold text-ink-900">{formatAmount(principal)} · {principalShare}%</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-ink-700"><span className="split-key split-interest" aria-hidden="true" />Interest</dt>
          <dd className="tabular font-semibold text-ink-900">{formatAmount(interest)} · {interestShare}%</dd>
        </div>
      </dl>
    </figure>
  )
}

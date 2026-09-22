/**
 * What this marketplace does and does not stand behind.
 *
 * Present on every property page, in plain words, because the alternative
 * is a buyer inferring a guarantee from the absence of a warning. It is
 * deliberately specific — naming ownership, documents, measurements and
 * price — rather than a general "information may be inaccurate", which
 * tells nobody anything.
 *
 * The wording changes when it stops being true. Phase 65 introduces real
 * verification, and this block narrows to exactly what was checked.
 */
export function PropertyDisclaimer() {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-100 p-4">
      <h2 className="text-label text-ink-900">Before you act on this listing</h2>
      <ul className="mt-2 flex flex-col gap-1.5 text-body-sm text-ink-700">
        <li>
          This listing was posted by an owner, agent or builder. We review listings against our
          content rules; we do <strong className="font-semibold">not</strong> verify ownership,
          title documents, measurements or the price quoted.
        </li>
        <li>
          Carpet, built-up and super built-up areas are as stated by the seller. Confirm them on
          site before agreeing a price per square foot.
        </li>
        <li>
          Never pay a token, booking amount or deposit before you have visited the property and
          seen the original documents.
        </li>
      </ul>
    </div>
  )
}

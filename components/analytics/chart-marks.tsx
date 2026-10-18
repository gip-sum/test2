/** The series keys: a short line for views, a column for enquiries (dataviz: legends mirror the mark). */
export function Mark({ kind }: { kind: 'line' | 'column' }) {
  return kind === 'line' ? <span className="inline-block h-0.5 w-4 shrink-0 rounded-full bg-chart-1" /> : <span className="inline-block h-3 w-2 shrink-0 rounded-t-sm bg-chart-2" />
}

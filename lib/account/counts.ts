/**
 * What an account count can truthfully say (Phase D; shared with the
 * account page in UI-19, so the hub and the account never word the same
 * figure two ways).
 *
 * listLeads and the notification count stop at 100 rows; a full page is
 * "100 or more", never a precise-looking 100. A count that could not be
 * read is null, and the link that carries it shows none — never a guess.
 */
export const COUNT_LIMIT = 100

export function describeCount(count: number | null, one: string, many: string): string | null {
  if (count === null) return null
  if (count === 0) return 'None yet'
  if (count >= COUNT_LIMIT) return `${COUNT_LIMIT} or more ${many}`
  return `${count} ${count === 1 ? one : many}`
}

/** The seller's unread notifications, as the inbox counts them; nothing unread says nothing. */
export function describeUnread(unread: number | null): string | null {
  return unread ? (unread >= COUNT_LIMIT ? `${COUNT_LIMIT} or more new` : `${unread} new`) : null
}

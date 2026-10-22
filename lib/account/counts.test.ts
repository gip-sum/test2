import { it, expect } from 'vitest'
import { describeCount, describeUnread } from './counts'

// One wording for the account page and the Activity hub (UI-19).
it('says only what a count can truthfully say', () => {
  expect(describeCount(null, 'saved home', 'saved homes')).toBeNull()
  expect(describeCount(0, 'saved home', 'saved homes')).toBe('None yet')
  expect(describeCount(1, 'saved home', 'saved homes')).toBe('1 saved home')
  expect(describeCount(7, 'enquiry', 'enquiries')).toBe('7 enquiries')
  expect(describeCount(100, 'enquiry', 'enquiries')).toBe('100 or more enquiries')
})
it('unread says nothing when nothing is unread or the count failed', () => {
  expect(describeUnread(null)).toBeNull()
  expect(describeUnread(0)).toBeNull()
  expect(describeUnread(3)).toBe('3 new')
  expect(describeUnread(140)).toBe('100 or more new')
})

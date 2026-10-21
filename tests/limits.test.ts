import { describe, expect, test } from 'claude-code/testing'

import {
  filledCells,
  fitsOneRow,
  formatAge,
  formatClockReset,
  formatClockTime,
  formatRelativeReset,
  toReading,
  toneFor,
  viewLimits,
} from '../hooks/limits'
import { HOUR, MINUTE } from '../hooks/time'

const NOW = new Date(2026, 9, 20, 15, 44).getTime()

describe('reset text', () => {
  test('Session limit counts down in hours and minutes', async () => {
    expect(formatRelativeReset(NOW + 3 * HOUR + 16 * MINUTE, NOW)).toBe('in 3 hr 16 min')
    expect(formatRelativeReset(NOW + 2 * HOUR, NOW)).toBe('in 2 hr')
    expect(formatRelativeReset(NOW + 45 * MINUTE + 30_000, NOW)).toBe('in 45 min')
    expect(formatRelativeReset(NOW + 20_000, NOW)).toBe('in <1 min')
  })

  test('Weekly limit shows weekday and clock time', async () => {
    const wednesdayEvening = new Date(2026, 9, 21, 19, 0).getTime()
    expect(formatClockReset(wednesdayEvening, true)).toBe('Wed 7:00 PM')
    expect(formatClockReset(wednesdayEvening, false)).toBe('Wed 19:00')
    expect(formatClockReset(new Date(2026, 9, 22, 0, 5).getTime(), true)).toBe('Thu 12:05 AM')
    expect(formatClockReset(new Date(2026, 9, 22, 9, 5).getTime(), false)).toBe('Thu 09:05')
  })

  test('Session limit also shows the exact reset time', async () => {
    const reading = {
      takenAt: NOW,
      limits: [{ kind: 'five_hour' as const, percentUsed: 4, resetsAt: new Date(2026, 9, 20, 19, 0).toISOString() }],
    }
    expect(viewLimits(reading, { now: NOW, isFresh: true, hour12: true })[0]?.resetText).toBe('in 3 hr 16 min (7:00 PM)')
    expect(viewLimits(reading, { now: NOW, isFresh: true, hour12: false })[0]?.resetText).toBe('in 3 hr 16 min (19:00)')
    expect(formatClockTime(new Date(2026, 9, 20, 12, 0).getTime(), true)).toBe('12:00 PM')
  })
})

describe('colour thresholds', () => {
  test('normal below 75%, amber from 75%, red from 90%', async () => {
    expect(toneFor(74)).toBe('normal')
    expect(toneFor(75)).toBe('warning')
    expect(toneFor(89)).toBe('warning')
    expect(toneFor(90)).toBe('error')
    expect(toneFor(100)).toBe('error')
  })
})

describe('readings', () => {
  test('keeps only the Session and Weekly limits, in that order', async () => {
    const reading = toReading(
      [
        { kind: 'seven_day', percentUsed: 38, resetsAt: '2026-10-21T17:00:00Z' },
        { kind: 'spend_limit', percentUsed: 12 },
        { kind: 'five_hour', percentUsed: 4.4, resetsAt: '2026-10-20T19:00:00Z' },
      ],
      NOW,
    )
    expect(reading?.limits.map(limit => limit.kind)).toEqual(['five_hour', 'seven_day'])
    expect(toReading([], NOW)).toBe(null)
  })

  test('a limit left out of a measurement keeps its previous value', async () => {
    const previous = toReading(
      [
        { kind: 'five_hour', percentUsed: 10 },
        { kind: 'seven_day', percentUsed: 38 },
      ],
      NOW - HOUR,
    )
    const reading = toReading([{ kind: 'five_hour', percentUsed: 12 }], NOW, previous)
    expect(reading?.limits).toEqual([
      { kind: 'five_hour', percentUsed: 12, resetsAt: undefined },
      { kind: 'seven_day', percentUsed: 38, resetsAt: undefined },
    ])
    expect(toReading([{ kind: 'spend_limit', percentUsed: 5 }], NOW, previous)).toBe(null)
  })

  test('a limit whose reset time has passed shows dimmed 0% with no reset text', async () => {
    const reading = {
      takenAt: NOW - 10 * HOUR,
      limits: [
        { kind: 'five_hour' as const, percentUsed: 87, resetsAt: new Date(NOW - HOUR).toISOString() },
        { kind: 'seven_day' as const, percentUsed: 38, resetsAt: new Date(NOW + 30 * HOUR).toISOString() },
      ],
    }
    const [session, weekly] = viewLimits(reading, { now: NOW, isFresh: false, hour12: true })
    expect(session).toEqual({ label: 'Session limit', percent: 0, tone: 'normal', isDim: true })
    expect(weekly?.percent).toBe(38)
    expect(weekly?.isDim).toBe(true)
    expect(weekly?.resetText).toBeDefined()
  })

  test('a fresh reading is not dimmed and rounds its percentage', async () => {
    const reading = {
      takenAt: NOW,
      limits: [{ kind: 'five_hour' as const, percentUsed: 91.6, resetsAt: new Date(NOW + HOUR).toISOString() }],
    }
    const [session] = viewLimits(reading, { now: NOW, isFresh: true, hour12: true })
    expect(session).toEqual({ label: 'Session limit', percent: 92, resetText: `in 1 hr (${formatClockTime(NOW + HOUR, true)})`, tone: 'error', isDim: false })
  })
})

describe('stale reading age', () => {
  test('says how long ago the reading was taken', async () => {
    expect(formatAge(NOW - 20_000, NOW)).toBe('as of just now')
    expect(formatAge(NOW - 14 * MINUTE, NOW)).toBe('as of 14 min ago')
    expect(formatAge(NOW - 3 * HOUR, NOW)).toBe('as of 3 hr ago')
    expect(formatAge(NOW - 26 * HOUR, NOW)).toBe('as of 1 day ago')
    expect(formatAge(NOW - 50 * HOUR, NOW)).toBe('as of 2 days ago')
  })
})

describe('layout', () => {
  test('the bar fills in proportion, showing any use and full only at the limit', async () => {
    expect(filledCells(0)).toBe(0)
    expect(filledCells(1)).toBe(1)
    expect(filledCells(4)).toBe(1)
    expect(filledCells(38)).toBe(4)
    expect(filledCells(99)).toBe(9)
    expect(filledCells(100)).toBe(10)
    expect(filledCells(140)).toBe(10)
  })

  test('falls back to two rows when one row does not fit', async () => {
    const views = [
      { label: 'Session limit', percent: 4, resetText: 'in 3 hr 16 min', tone: 'normal' as const, isDim: false },
      { label: 'Weekly · all models', percent: 38, resetText: 'Wed 7:00 PM', tone: 'normal' as const, isDim: false },
    ]
    expect(fitsOneRow(views, undefined, 120)).toBe(true)
    expect(fitsOneRow(views, undefined, 60)).toBe(false)
  })
})

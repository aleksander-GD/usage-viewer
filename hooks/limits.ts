import type { Limit, LimitKind, Reading } from '../types'

export type Tone = 'normal' | 'warning' | 'error'

/** One limit as the Limit band draws it. */
export type LimitView = {
  label: string
  percent: number
  resetText?: string
  tone: Tone
  isDim: boolean
}

const LABELS: Record<LimitKind, string> = {
  five_hour: 'Session limit',
  seven_day: 'Weekly · all models',
}

const ORDER: LimitKind[] = ['five_hour', 'seven_day']

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const BAR_WIDTH = 10

/**
 * Takes a Reading from a measurement's Session and Weekly limits; null when it
 * has neither. A limit the measurement leaves out keeps its previous value, so
 * a Reading always covers every limit seen so far.
 */
export function toReading(
  rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[],
  takenAt: number,
  previous: Reading | null = null,
): Reading | null {
  const measured = ORDER.flatMap(kind => {
    const found = rateLimits.find(one => one.kind === kind)

    return found ? [{ kind, percentUsed: found.percentUsed, resetsAt: found.resetsAt }] : []
  })
  if (measured.length === 0) return null

  const limits: Limit[] = ORDER.flatMap(kind => {
    const limit = measured.find(one => one.kind === kind) ?? previous?.limits.find(one => one.kind === kind)

    return limit ? [limit] : []
  })

  return { takenAt, limits }
}

export function toneFor(percent: number): Tone {
  if (percent >= 90) return 'error'
  if (percent >= 75) return 'warning'

  return 'normal'
}

/** "in 3 hr 16 min", as the Usage popover words the Session limit's reset. */
export function formatRelativeReset(resetsAt: number, now: number): string {
  const minutes = Math.floor((resetsAt - now) / MINUTE)
  if (minutes < 1) return 'in <1 min'

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `in ${rest} min`
  if (rest === 0) return `in ${hours} hr`

  return `in ${hours} hr ${rest} min`
}

/** "7:00 PM" or "19:00". */
export function formatClockTime(at: number, hour12: boolean): string {
  const date = new Date(at)
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const hours = date.getHours()

  if (!hour12) return `${String(hours).padStart(2, '0')}:${minutes}`

  const suffix = hours < 12 ? 'AM' : 'PM'

  return `${hours % 12 === 0 ? 12 : hours % 12}:${minutes} ${suffix}`
}

/** "Wed 7:00 PM" or "Wed 19:00", as the Usage popover words the Weekly limit's reset. */
export function formatClockReset(resetsAt: number, hour12: boolean): string {
  return `${WEEKDAYS[new Date(resetsAt).getDay()]} ${formatClockTime(resetsAt, hour12)}`
}

/** "as of 14 min ago", for a Stale reading. */
export function formatAge(takenAt: number, now: number): string {
  const elapsed = Math.max(0, now - takenAt)
  if (elapsed < MINUTE) return 'as of just now'
  if (elapsed < HOUR) return `as of ${Math.floor(elapsed / MINUTE)} min ago`
  if (elapsed < DAY) return `as of ${Math.floor(elapsed / HOUR)} hr ago`

  const days = Math.floor(elapsed / DAY)

  return `as of ${days} ${days === 1 ? 'day' : 'days'} ago`
}

/**
 * How many of the bar's cells are filled: at least one for any use, and all
 * of them only once the limit is reached.
 */
export function filledCells(percent: number, width = BAR_WIDTH): number {
  if (percent <= 0) return 0
  if (percent >= 100) return width

  return Math.min(width - 1, Math.max(1, Math.round((percent / 100) * width)))
}

/**
 * Turns a Reading into what the band draws. A limit whose reset time has
 * passed shows dimmed 0% with no reset text; a Stale reading is dimmed.
 */
export function viewLimits(
  reading: Reading,
  { now, isFresh, hour12 }: { now: number; isFresh: boolean; hour12: boolean },
): LimitView[] {
  return reading.limits.map(limit => {
    const label = LABELS[limit.kind]
    const resetsAt = limit.resetsAt === undefined ? undefined : Date.parse(limit.resetsAt)

    if (resetsAt !== undefined && resetsAt <= now) {
      return { label, percent: 0, tone: 'normal', isDim: true }
    }

    const percent = Math.round(limit.percentUsed)
    const resetText =
      resetsAt === undefined
        ? undefined
        : limit.kind === 'five_hour'
          ? `${formatRelativeReset(resetsAt, now)} (${formatClockTime(resetsAt, hour12)})`
          : formatClockReset(resetsAt, hour12)

    return { label, percent, resetText, tone: toneFor(percent), isDim: !isFresh }
  })
}

/** Cells one limit takes: "Session limit ━───────── 4% · in 3 hr 16 min (7:00 PM)". */
export function limitWidth(view: LimitView): number {
  const reset = view.resetText === undefined ? 0 : ` · ${view.resetText}`.length

  return `${view.label} `.length + BAR_WIDTH + ` ${view.percent}%`.length + reset
}

export const SEPARATOR = '  │  '

/** Whether every limit, and the age of a Stale reading, fits on one row. */
export function fitsOneRow(views: LimitView[], ageText: string | undefined, columns: number): boolean {
  const limits = views.reduce((sum, view) => sum + limitWidth(view), 0)
  const separators = Math.max(0, views.length - 1) * SEPARATOR.length
  const age = ageText === undefined ? 0 : SEPARATOR.length + ageText.length

  return limits + separators + age <= columns
}

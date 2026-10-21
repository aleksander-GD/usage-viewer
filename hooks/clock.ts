/** What macOS says about the clock: its forced 12h/24h switches, when set, and the region. */
export type ClockPrefs = {
  force24?: boolean
  force12?: boolean
  locale?: string
}

/** Whether times read "7:00 PM" (true) or "19:00" (false) under the Mac's clock preferences. */
export function usesHour12({ force24, force12, locale }: ClockPrefs): boolean {
  if (force24) return false
  if (force12) return true

  try {
    const tag = locale?.split('@')[0]?.replace('_', '-') || undefined

    return new Intl.DateTimeFormat(tag, { hour: 'numeric' }).resolvedOptions().hour12 ?? true
  } catch {
    return true
  }
}

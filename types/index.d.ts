export type LimitKind = 'five_hour' | 'seven_day'

export type Limit = {
  kind: LimitKind
  percentUsed: number
  resetsAt?: string
}

/** A snapshot of Limit usage for both limits, taken at `takenAt` (epoch ms). */
export type Reading = {
  takenAt: number
  limits: Limit[]
}

declare module 'claude-code' {
  interface PluginState {
    'usage-viewer': {
      reading: Reading | null
      isFresh: boolean
      now: number
    }
  }
}

import { mock } from 'claude-code/testing'
import type { On, RenderElement, RenderSurface, SessionRateLimit, UiPane } from 'claude-code'

import { HOUR } from '../hooks/time'

export const NOW = new Date(2026, 9, 20, 15, 44).getTime()

export const LIMITS: SessionRateLimit[] = [
  { kind: 'five_hour', percentUsed: 4, resetsAt: new Date(NOW + 3 * HOUR).toISOString() },
  { kind: 'seven_day', percentUsed: 92, resetsAt: new Date(NOW + 30 * HOUR).toISOString() },
]

export const CONTEXT = { window: 200_000 }

export const props = (overrides: { hasSurvey?: boolean; bodyColumns?: number } = {}) => ({
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 140,
  scroll: { offset: 0, bodyRows: 9 },
  view: {},
  ...overrides,
})

export const SURFACES = ['terminal', 'desktop'] as const

/** The engine beneath the mod: a clock, a store, the session's usage figures and its surfaces. */
export function engineBeneath(
  on: On,
  {
    saved,
    current = [],
    macDefaults = {},
    surfaces = [],
    settings = {},
    panes = [],
  }: {
    saved?: unknown
    current?: SessionRateLimit[]
    macDefaults?: Record<string, string>
    surfaces?: RenderSurface[]
    settings?: Record<string, unknown>
    panes?: UiPane[]
  } = {},
) {
  const clock = mock.clock(on, { now: NOW })
  const opened: string[] = []
  on('ui.open', ($, e) => {
    opened.push(e.id)

    return { value: { isPlaced: true } }
  })
  on('session.attach', ($, e) => ({ clientId: e.clientId }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('session.surfaces', () => ({ value: surfaces }))
  on('env.get', () => ({ value: undefined }))
  on('settings.read', () => ({ value: settings }))
  on('ui.panes', () => ({ value: panes }))
  // Answers `defaults read -g <key>` from macDefaults; an unset key exits 1, as on a Mac.
  on('process.run', ($, e) => {
    const value = macDefaults[e.argv[3] ?? '']
    const ran = { stderr: '', isStdoutTruncated: false, isStderrTruncated: false }

    return { value: value === undefined ? { ...ran, exitCode: 1, stdout: '' } : { ...ran, exitCode: 0, stdout: `${value}\n` } }
  })
  mock.store(on, saved === undefined ? {} : { lastReading: saved })
  on('session.usage', () => ({ value: { startedAt: NOW, context: CONTEXT, rateLimits: current } }))
  // Stands for what the app draws in the band when the mod steps aside.
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return h(Text, {}, 'engine band') as RenderElement
  })
  on('session.start', () => ({ cwd: '/tmp' }))
  on('session.measure', ($, e) => ({ changed: e.changed }))

  return { clock, opened }
}

export const START = { cwd: '/tmp', surface: 'desktop' as const, isInteractive: true }

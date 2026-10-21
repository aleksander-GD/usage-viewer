import { describe, expect, mock, test } from 'claude-code/testing'
import type { On, RenderElement, SessionRateLimit } from 'claude-code'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const NOW = new Date(2026, 9, 20, 15, 44).getTime()

const LIMITS: SessionRateLimit[] = [
  { kind: 'five_hour', percentUsed: 4, resetsAt: new Date(NOW + 3 * HOUR).toISOString() },
  { kind: 'seven_day', percentUsed: 92, resetsAt: new Date(NOW + 30 * HOUR).toISOString() },
]

const CONTEXT = { window: 200_000 }

const props = (overrides: { hasSurvey?: boolean; bodyColumns?: number } = {}) => ({
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 140,
  scroll: { offset: 0, bodyRows: 9 },
  view: {},
  ...overrides,
})

const SURFACES = ['terminal', 'desktop'] as const

/** The engine beneath the mod: a clock, a store, and the session's usage figures. */
function world(
  on: On,
  {
    saved,
    current = [],
    macDefaults = {},
  }: { saved?: unknown; current?: SessionRateLimit[]; macDefaults?: Record<string, string> } = {},
) {
  const clock = mock.clock(on, { now: NOW })
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

  return clock
}

const START = { cwd: '/tmp', surface: 'desktop' as const, isInteractive: true }

describe('Limit band', () => {
  test('draws both limits once a Reading arrives', async ($, on) => {
    world(on)
    await $.session.start(START)
    await $.session.measure({ context: CONTEXT, rateLimits: LIMITS, changed: ['rateLimits'] })

    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: 'usage-viewer', surface, component: 'AbovePrompt', props: props() })
      expect(await ui.find({ type: 'Text', text: /Session limit/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /Weekly · all models/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /in 3 hr/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /as of/ })).toBeUndefined()
      await ui.unmount()
    }
  })

  test('shows the saved Reading as stale until a fresh one arrives', async ($, on) => {
    const clock = world(on, { saved: { takenAt: NOW - 14 * MINUTE, limits: LIMITS } })
    await $.session.start(START)

    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: 'usage-viewer', surface, component: 'AbovePrompt', props: props() })
      expect(await ui.find({ type: 'Text', text: /as of 14 min ago/ })).toBeDefined()
      await ui.unmount()
    }

    await clock.advance(MINUTE)
    const ui = await $.ui.mount({ plugin: 'usage-viewer', surface: 'desktop', component: 'AbovePrompt', props: props() })
    expect(await ui.find({ type: 'Text', text: /as of 15 min ago/ })).toBeDefined()
    await ui.unmount()
  })

  test('uses two rows when the band is narrow', async ($, on) => {
    world(on, { current: LIMITS })
    await $.session.start(START)

    for (const surface of SURFACES) {
      const ui = await $.ui.mount({
        plugin: 'usage-viewer',
        surface,
        component: 'AbovePrompt',
        props: props({ bodyColumns: 60 }),
      })
      expect(await ui.drawn()).toMatchObject({ type: 'Box' })
      await ui.unmount()
    }
  })

  test('steps aside for a survey', async ($, on) => {
    world(on, { current: LIMITS })
    await $.session.start(START)

    for (const surface of SURFACES) {
      const ui = await $.ui.mount({
        plugin: 'usage-viewer',
        surface,
        component: 'AbovePrompt',
        props: props({ hasSurvey: true }),
      })
      expect(await ui.find({ type: 'Text', text: /Session limit/ })).toBeUndefined()
      expect(await ui.find({ type: 'Text', text: 'engine band' })).toBeDefined()
      await ui.unmount()
    }
  })

  test('draws nothing when there has never been a Reading', async ($, on) => {
    world(on)
    await $.session.start(START)

    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: 'usage-viewer', surface, component: 'AbovePrompt', props: props() })
      expect(await ui.find({ type: 'Text', text: /Session limit/ })).toBeUndefined()
      expect(await ui.find({ type: 'Text', text: 'engine band' })).toBeDefined()
      await ui.unmount()
    }
  })

  test("shows clock times in the Mac's 12h or 24h format", async ($, on) => {
    world(on, { current: LIMITS, macDefaults: { AppleLocale: 'en_DK' } })
    await $.session.start(START)

    const ui = await $.ui.mount({ plugin: 'usage-viewer', surface: 'desktop', component: 'AbovePrompt', props: props() })
    expect(await ui.find({ type: 'Text', text: /\(18:44\)/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Wed 21:44/ })).toBeDefined()
    await ui.unmount()
  })

  test('a forced 12h clock wins over a 24h region', async ($, on) => {
    world(on, { current: LIMITS, macDefaults: { AppleLocale: 'en_DK', AppleICUForce12HourTime: '1' } })
    await $.session.start(START)

    const ui = await $.ui.mount({ plugin: 'usage-viewer', surface: 'desktop', component: 'AbovePrompt', props: props() })
    expect(await ui.find({ type: 'Text', text: /\(6:44 PM\)/ })).toBeDefined()
    await ui.unmount()
  })
})

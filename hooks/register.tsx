import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Reading } from '../types'
import { drawBand } from './band'
import { usesHour12 } from './clock'
import { formatAge, toReading, viewLimits } from './limits'
import { drawSidebar, drawSidebarEmpty } from './sidebar'
import { MINUTE } from './time'

const reading = atom({ plugin: 'usage-viewer', key: 'reading' } as const, null)
const isStale = atom({ plugin: 'usage-viewer', key: 'isStale' } as const, true)
const now = atom({ plugin: 'usage-viewer', key: 'now' } as const, 0)
const hour12 = atom({ plugin: 'usage-viewer', key: 'hour12' } as const, true)
const isSidebarOpen = atom({ plugin: 'usage-viewer', key: 'isSidebarOpen' } as const, false)
// Closed by the person: stays closed until they run the command, never reopened unasked.
const isSidebarDismissed = atom({ plugin: 'usage-viewer', key: 'isSidebarDismissed' } as const, false)

const STORE_KEY = 'lastReading'
const TICK_MS = MINUTE
const SIDEBAR = 'usage'
const SIDEBAR_TITLE = 'Usage'
const COMMAND = 'usage-viewer'

/** One of the Mac's global preferences, or undefined where it is unset or unreadable. */
async function readDefault($: EngineInterface, key: string): Promise<string | undefined> {
  try {
    const { exitCode, stdout } = await $.process.run(['/usr/bin/defaults', 'read', '-g', key])

    return exitCode === 0 ? stdout.trim() : undefined
  } catch {
    return undefined
  }
}

async function readHour12($: EngineInterface): Promise<boolean> {
  const [force24, force12, locale] = await Promise.all([
    readDefault($, 'AppleICUForce24HourTime'),
    readDefault($, 'AppleICUForce12HourTime'),
    readDefault($, 'AppleLocale'),
  ])

  return usesHour12({ force24: force24 === '1', force12: force12 === '1', locale })
}

/** Whether the terminal draws in the fullscreen layout, the one that docks a pane as a sidebar. */
async function isTerminalFullscreen($: EngineInterface): Promise<boolean> {
  const noFlicker = await $.env.get('CLAUDE_CODE_NO_FLICKER')
  if (noFlicker === '1') return true
  if (noFlicker === '0') return false

  return (await $.settings.read({ key: 'tui' })) === 'fullscreen'
}

/** Opens the Usage sidebar unasked, unless the person closed it this Claude Code session. */
async function offerSidebar($: EngineInterface) {
  if (await read($, isSidebarDismissed)) return

  const opened = await $.ui.open({ id: SIDEBAR, title: SIDEBAR_TITLE })
  await update($, isSidebarOpen, () => true)

  return opened
}

/** Registers the command and opens the Usage sidebar where a surface docks it beside the transcript. */
async function setUpSidebar($: EngineInterface) {
  await $.command.register({ name: COMMAND, description: 'Show plan usage limits in a sidebar' })

  const surfaces = await $.session.surfaces()
  const docksHere = surfaces.includes('terminal') ? await isTerminalFullscreen($) : surfaces.length > 0
  if (docksHere) await offerSidebar($)
}

/** Whether the Usage sidebar is drawn and in front, so the band can step aside. */
async function isSidebarShown($: EngineInterface): Promise<boolean> {
  if (!(await read($, isSidebarOpen))) return false

  return (await $.ui.panes()).some(pane => pane.id === SIDEBAR && pane.isPlaced && pane.isShown)
}

async function keep($: EngineInterface, fresh: Reading) {
  await update($, reading, () => fresh)
  await update($, isStale, () => false)
  await $.store.set(STORE_KEY, fresh)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await $.clock.now()
    await update($, now, () => started)

    const isHour12 = await readHour12($)
    await update($, hour12, () => isHour12)

    const saved = ((await $.store.get(STORE_KEY)) as Reading | undefined) ?? null
    const previous = (await read($, reading)) ?? saved
    const current = toReading((await $.session.usage()).rateLimits, started, previous)
    if (current !== null) {
      await keep($, current)
    } else if (previous !== null) {
      await update($, reading, () => previous)
    }

    // A sidebar that cannot be set up must not stop the readings, so its failure is dropped.
    await setUpSidebar($).catch(() => undefined)

    $.clock.every(TICK_MS, async () => {
      const tick = await $.clock.now()
      await update($, now, () => tick)
    })

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      const fresh = toReading(e.rateLimits, await $.clock.now(), await read($, reading))
      // No limits reported any more: what the band shows is now a Stale reading.
      if (fresh === null) await update($, isStale, () => true)
      else await keep($, fresh)
    }

    return next(e)
  })

  on('session.attach', async ($, e, next) => {
    if (e.viewport?.isFullscreen === true) await offerSidebar($)

    return next(e)
  })

  on('command.run', { command: COMMAND }, async $ => {
    await update($, isSidebarDismissed, () => false)
    const opened = await $.ui.open({ id: SIDEBAR, title: SIDEBAR_TITLE })
    await update($, isSidebarOpen, () => true)

    return { text: opened.isPlaced ? 'Usage sidebar opened.' : `Usage sidebar is waiting: ${opened.reason}` }
  }).catch(() => ({ text: 'The Usage sidebar could not be opened.' }))

  on('ui.close', { id: SIDEBAR }, async ($, e, next) => {
    await update($, isSidebarOpen, () => false)
    if (e.origin.kind === 'person') await update($, isSidebarDismissed, () => true)

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: SIDEBAR }, async ($, e) => {
    const shown = await read($, reading)
    const ui = $.ui.resolve(e)
    if (shown === null) return drawSidebarEmpty(ui)

    const isShownStale = await read($, isStale)
    const drawnAt = (await read($, now)) || shown.takenAt
    const views = viewLimits(shown, { now: drawnAt, isStale: isShownStale, hour12: await read($, hour12) })
    const ageText = isShownStale ? formatAge(shown.takenAt, drawnAt) : undefined

    return drawSidebar(ui, { views, ageText, columns: e.props.bodyColumns })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const shown = await read($, reading)
    if (e.props.hasSurvey || shown === null || (await isSidebarShown($))) return next(e)

    const isShownStale = await read($, isStale)
    const drawnAt = (await read($, now)) || shown.takenAt
    const views = viewLimits(shown, { now: drawnAt, isStale: isShownStale, hour12: await read($, hour12) })
    const ageText = isShownStale ? formatAge(shown.takenAt, drawnAt) : undefined

    return drawBand($.ui.resolve(e), { views, ageText, columns: e.props.bodyColumns })
  })
}

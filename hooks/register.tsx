import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Reading } from '../types'
import { drawBand } from './band'
import { usesHour12 } from './clock'
import { formatAge, toReading, viewLimits } from './limits'
import { MINUTE } from './time'

const reading = atom({ plugin: 'usage-viewer', key: 'reading' } as const, null)
const isStale = atom({ plugin: 'usage-viewer', key: 'isStale' } as const, true)
const now = atom({ plugin: 'usage-viewer', key: 'now' } as const, 0)
const hour12 = atom({ plugin: 'usage-viewer', key: 'hour12' } as const, true)

const STORE_KEY = 'lastReading'
const TICK_MS = MINUTE

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

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const shown = await read($, reading)
    if (e.props.hasSurvey || shown === null) return next(e)

    const isShownStale = await read($, isStale)
    const drawnAt = (await read($, now)) || shown.takenAt
    const views = viewLimits(shown, { now: drawnAt, isStale: isShownStale, hour12: await read($, hour12) })
    const ageText = isShownStale ? formatAge(shown.takenAt, drawnAt) : undefined

    return drawBand($.ui.resolve(e), { views, ageText, columns: e.props.bodyColumns })
  })
}

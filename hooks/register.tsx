import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Reading } from '../types'
import { usesHour12 } from './clock'
import {
  BAR_WIDTH,
  SEPARATOR,
  filledCells,
  fitsOneRow,
  formatAge,
  toReading,
  viewLimits,
} from './limits'
import type { LimitView, Tone } from './limits'
import { MINUTE } from './time'

const reading = atom({ plugin: 'usage-viewer', key: 'reading' } as const, null)
const isStale = atom({ plugin: 'usage-viewer', key: 'isStale' } as const, true)
const now = atom({ plugin: 'usage-viewer', key: 'now' } as const, 0)
const hour12 = atom({ plugin: 'usage-viewer', key: 'hour12' } as const, true)

const STORE_KEY = 'lastReading'
const TICK_MS = MINUTE

const TONE_COLORS: Record<Tone, string | undefined> = {
  normal: undefined,
  warning: 'warning',
  error: 'error',
}

/** The bar's and the percentage's colours for one limit: muted when dimmed, toned otherwise. */
function colorsFor(view: LimitView): { bar: string; percent?: string } {
  if (view.isDim) return { bar: 'inactive' }

  const tone = TONE_COLORS[view.tone]

  return { bar: tone ?? 'suggestion', percent: tone }
}

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

    const { Box, Text } = $.ui.resolve(e)

    const limit = (view: LimitView) => {
      const filled = filledCells(view.percent)
      const colors = colorsFor(view)

      return (
        <Text dimColor={view.isDim}>
          {view.label}{' '}
          <Text mono color={colors.bar}>{'━'.repeat(filled)}</Text>
          <Text mono color="subtle">{'─'.repeat(BAR_WIDTH - filled)}</Text>
          <Text tabular color={colors.percent}>
            {' '}
            {view.percent}%
          </Text>
          {view.resetText !== undefined && <Text dimColor> · {view.resetText}</Text>}
        </Text>
      )
    }

    const age = ageText !== undefined && <Text dimColor>{SEPARATOR}{ageText}</Text>

    if (fitsOneRow(views, ageText, e.props.bodyColumns)) {
      return (
        <Text wrap="truncate">
          {views.map((view, index) => (
            <Text>
              {index > 0 && <Text dimColor>{SEPARATOR}</Text>}
              {limit(view)}
            </Text>
          ))}
          {age}
        </Text>
      )
    }

    return (
      <Box flexDirection="column">
        {views.map((view, index) => (
          <Text wrap="truncate">
            {limit(view)}
            {index === views.length - 1 && age}
          </Text>
        ))}
      </Box>
    )
  })
}

import { describe, expect, test } from 'claude-code/testing'

import { MINUTE } from '../hooks/time'
import { LIMITS, NOW, START, SURFACES, engineBeneath, props } from './world'

const band = (bodyColumns?: number) => ({
  plugin: 'usage-viewer',
  component: 'AbovePrompt',
  props: props(bodyColumns === undefined ? {} : { bodyColumns }),
} as const)

type Drawn = { type: string; props?: Record<string, unknown>; children?: unknown[]; part?: { plugin: string } }

/** The part of the drawn band this mod drew; the engine draws its own beside it. */
const ownPart = (tree: unknown) =>
  ((tree as Drawn).children as Drawn[] | undefined)?.find(child => child.part?.plugin === 'usage-viewer')

describe('Slim band', () => {
  test('the full band has a − button that switches to the Slim band', async ($, on) => {
    const { written } = engineBeneath(on, { current: LIMITS })
    await $.session.start(START)

    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ ...band(), surface })
      expect(await ui.find({ type: 'Button', key: 'toggle-slim' })).toMatchObject({ props: { label: '−' } })
      expect(await ui.find({ type: 'Button', key: 'open-sidebar' })).toBeDefined()
      await ui.unmount()
    }

    const ui = await $.ui.mount({ ...band(), surface: 'desktop' })
    await ui.press({ key: 'toggle-slim' })
    await ui.unmount()

    expect(written.isBandSlim).toBe(true)
    for (const surface of SURFACES) {
      const slim = await $.ui.mount({ ...band(), surface })
      expect(await slim.find({ type: 'Text', text: /^Session / })).toBeDefined()
      expect(await slim.find({ type: 'Text', text: /^Weekly / })).toBeDefined()
      expect(await slim.find({ type: 'Text', text: /Session limit|Weekly · all models/ })).toBeUndefined()
      expect(await slim.find({ type: 'Text', text: /in 3 hr|Wed/ })).toBeUndefined()
      expect(await slim.find({ type: 'Button', key: 'open-sidebar' })).toBeUndefined()
      expect(await slim.find({ type: 'Button', key: 'toggle-slim' })).toMatchObject({ props: { label: '+' } })
      await slim.unmount()
    }
  })

  test('the + button switches back to the full band', async ($, on) => {
    const { written } = engineBeneath(on, { current: LIMITS, isBandSlim: true })
    await $.session.start(START)

    const ui = await $.ui.mount({ ...band(), surface: 'desktop' })
    await ui.press({ key: 'toggle-slim' })
    await ui.unmount()

    expect(written.isBandSlim).toBe(false)
    const full = await $.ui.mount({ ...band(), surface: 'desktop' })
    expect(await full.find({ type: 'Text', text: /Session limit/ })).toBeDefined()
    expect(await full.find({ type: 'Button', key: 'toggle-slim' })).toMatchObject({ props: { label: '−' } })
    await full.unmount()
  })

  test('a saved Slim band choice carries over to a new Claude Code session', async ($, on) => {
    engineBeneath(on, { current: LIMITS, isBandSlim: true })
    await $.session.start(START)

    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ ...band(), surface })
      expect(await ui.find({ type: 'Text', text: /Session limit/ })).toBeUndefined()
      expect(await ui.find({ type: 'Text', text: /^Session / })).toBeDefined()
      await ui.unmount()
    }
  })

  test('leaves out the age of a Stale reading', async ($, on) => {
    engineBeneath(on, { saved: { takenAt: NOW - 14 * MINUTE, limits: LIMITS }, isBandSlim: true })
    await $.session.start(START)

    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ ...band(), surface })
      expect(await ui.find({ type: 'Text', text: /^Session / })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /as of/ })).toBeUndefined()
      await ui.unmount()
    }
  })

  test('fits on one row where the full band needs two', async ($, on) => {
    engineBeneath(on, { current: LIMITS, isBandSlim: true })
    await $.session.start(START)

    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ ...band(60), surface })
      expect(ownPart(await ui.drawn())).toMatchObject({ type: 'Box', props: { flexDirection: 'row' } })
      await ui.unmount()
    }
  })

  test('uses two rows when even the Slim band is too narrow', async ($, on) => {
    engineBeneath(on, { current: LIMITS, isBandSlim: true })
    await $.session.start(START)

    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ ...band(40), surface })
      const own = ownPart(await ui.drawn())
      expect(own).toMatchObject({ type: 'Box', props: { flexDirection: 'column' } })
      expect(own?.children).toHaveLength(2)
      await ui.unmount()
    }
  })
})

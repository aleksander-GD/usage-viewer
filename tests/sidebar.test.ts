import { describe, expect, test } from 'claude-code/testing'

import { CONTEXT, LIMITS, NOW, START, SURFACES, engineBeneath, props } from './world'

const COMMAND = { command: 'usage-viewer', args: '', origin: { kind: 'composer' as const } }
const presentation = (isFullscreen: boolean) => ({ isFullscreen, columns: 160 })

const paneProps = (bodyColumns = 40) => ({
  title: 'Usage',
  isFocused: false,
  bodyColumns,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
})

const SHOWN = [{ id: 'usage', title: 'Usage', isShown: true, isFocused: false, isPlaced: true }]

describe('Usage sidebar', () => {
  test('opens by itself on a fullscreen terminal', async ($, on) => {
    const { opened } = engineBeneath(on, { surfaces: ['terminal'], settings: { tui: 'fullscreen' } })
    await $.session.start(START)

    expect(opened).toEqual(['usage'])
  })

  test('stays closed on a terminal outside fullscreen, where the band shows instead', async ($, on) => {
    const { opened } = engineBeneath(on, { surfaces: ['terminal'] })
    await $.session.start(START)

    expect(opened).toEqual([])
  })

  test('opens when a surface that docks panes attaches, not one that does not', async ($, on) => {
    const { opened } = engineBeneath(on)
    await $.session.start(START)
    await $.session.attach({ surface: 'mobile', clientId: 'phone', viewport: { columns: 40, rows: 80, isFullscreen: false } })
    expect(opened).toEqual([])

    await $.session.attach({ surface: 'desktop', clientId: 'app', viewport: { columns: 160, rows: 50, isFullscreen: true } })
    expect(opened).toEqual(['usage'])
  })

  test('the command opens it on any surface, and says so', async ($, on) => {
    const { opened } = engineBeneath(on, { surfaces: ['terminal'] })
    await $.session.start(START)
    expect(opened).toEqual([])

    const ran = await $.command.run({ ...COMMAND, presentation: presentation(false) })
    expect(ran.text).toBe('Usage sidebar opened.')
    expect(opened).toEqual(['usage'])
  })

  test('draws each limit like the usage popover', async ($, on) => {
    engineBeneath(on, { current: LIMITS, macDefaults: { AppleLocale: 'en_DK' } })
    await $.session.start(START)

    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: 'usage-viewer', surface, component: 'Pane', requestId: 'usage', props: paneProps(60) })
      expect(await ui.find({ type: 'Text', text: 'Usage' })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /Session limit/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /Resets in 3 hr \(18:44\)/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /Resets Wed 21:44/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /92%/ })).toBeDefined()
      await ui.unmount()
    }
  })

  test('moves the reset text under the bar when the sidebar is narrow', async ($, on) => {
    engineBeneath(on, { current: LIMITS, macDefaults: { AppleLocale: 'en_DK' } })
    await $.session.start(START)

    const ui = await $.ui.mount({ plugin: 'usage-viewer', surface: 'desktop', component: 'Pane', requestId: 'usage', props: paneProps(28) })
    const resets = await ui.findAll({ type: 'Text', text: /^Resets / })
    expect(resets.map(found => found.text)).toEqual(['Resets in 3 hr (18:44)', 'Resets Wed 21:44'])
    await ui.unmount()
  })

  test('says when there is no reading yet', async ($, on) => {
    engineBeneath(on)
    await $.session.start(START)

    const ui = await $.ui.mount({ plugin: 'usage-viewer', surface: 'desktop', component: 'Pane', requestId: 'usage', props: paneProps() })
    expect(await ui.find({ type: 'Text', text: /No usage reading yet/ })).toBeDefined()
    await ui.unmount()
  })

  test('the band steps aside while the sidebar is shown', async ($, on) => {
    engineBeneath(on, { current: LIMITS, surfaces: ['terminal'], settings: { tui: 'fullscreen' }, panes: SHOWN })
    await $.session.start(START)
    await $.session.measure({ context: CONTEXT, rateLimits: LIMITS, changed: ['rateLimits'] })

    const ui = await $.ui.mount({ plugin: 'usage-viewer', surface: 'terminal', component: 'AbovePrompt', props: props() })
    expect(await ui.find({ type: 'Text', text: 'engine band' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Session limit/ })).toBeUndefined()
    await ui.unmount()
  })

  test("the band's button brings the sidebar back", async ($, on) => {
    const { opened } = engineBeneath(on, { current: LIMITS, surfaces: ['terminal'] })
    await $.session.start(START)
    expect(opened).toEqual([])

    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: 'usage-viewer', surface, component: 'AbovePrompt', props: props() })
      expect(await ui.find({ type: 'Button', key: 'open-sidebar' })).toBeDefined()
      await ui.unmount()
    }

    const ui = await $.ui.mount({ plugin: 'usage-viewer', surface: 'desktop', component: 'AbovePrompt', props: props() })
    await ui.press({ key: 'open-sidebar' })
    expect(opened).toEqual(['usage'])
    await ui.unmount()
  })
})

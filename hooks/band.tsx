import type { ElementTable, RenderSurface } from 'claude-code'

import { colorsFor } from './colors'
import { BAR_WIDTH, SEPARATOR, SLIM_SEPARATOR, filledCells, fitsOneRow, fitsSlimRow } from './limits'
import type { LimitView } from './limits'

const OPEN_SIDEBAR_LABEL = 'Open sidebar'
const SLIM_LABEL = '−'
const FULL_LABEL = '+'
type BandButton = { key: string; label: string; onPress: () => void; isPlain?: boolean }

// The terminal draws a Button as "[ label ]", four cells around its label; a plain one as the label alone.
const buttonColumns = (button: BandButton) => button.label.length + (button.isPlain ? 0 : 4)
// One cell between the buttons, two more keep them clear of the limits.
const BUTTON_GAP = 1
const BUTTONS_MARGIN = 2

/**
 * The Limit band: one row with every limit, or one row per limit when that
 * does not fit. The Slim band shortens the labels and leaves out the reset
 * text and the age of a Stale reading. With `toggleSlim`, a button at the end
 * switches between the two; with `openSidebar`, the full band also has a
 * button that brings the Usage sidebar back.
 */
export function drawBand<P extends RenderSurface>(
  { Box, Button, Text }: Pick<ElementTable<P>, 'Box' | 'Button' | 'Text'>,
  {
    views,
    ageText,
    columns,
    isSlim = false,
    openSidebar,
    toggleSlim,
  }: {
    views: LimitView[]
    ageText?: string
    columns: number
    isSlim?: boolean
    openSidebar?: () => void
    toggleSlim?: () => void
  },
) {
  const limit = (view: LimitView) => {
    const filled = filledCells(view.percent)
    const colors = colorsFor(view)

    return (
      <Text dimColor={view.isDim}>
        {isSlim ? view.shortLabel : view.label}{' '}
        <Text mono color={colors.bar}>{'━'.repeat(filled)}</Text>
        <Text mono color="subtle">{'─'.repeat(BAR_WIDTH - filled)}</Text>
        <Text tabular color={colors.percent}>
          {' '}
          {view.percent}%
        </Text>
        {!isSlim && view.resetText !== undefined && <Text dimColor> · {view.resetText}</Text>}
      </Text>
    )
  }

  const shownAge = isSlim ? undefined : ageText
  const age = shownAge !== undefined && <Text dimColor>{SEPARATOR}{shownAge}</Text>
  const separator = isSlim ? SLIM_SEPARATOR : SEPARATOR

  const buttons: BandButton[] = []
  if (!isSlim && openSidebar !== undefined) {
    buttons.push({ key: 'open-sidebar', label: OPEN_SIDEBAR_LABEL, onPress: openSidebar })
  }
  if (toggleSlim !== undefined) {
    // On the Slim band a plain, dim glyph keeps the band as low as a line of text.
    buttons.push({ key: 'toggle-slim', label: isSlim ? FULL_LABEL : SLIM_LABEL, onPress: toggleSlim, isPlain: isSlim })
  }

  const buttonsWidth =
    buttons.length === 0
      ? 0
      : buttons.reduce((sum, button) => sum + buttonColumns(button), 0) +
        (buttons.length - 1) * BUTTON_GAP +
        BUTTONS_MARGIN
  const room = columns - buttonsWidth

  // The buttons sit at the right end of the band's first row.
  const withButtons = (row: ReturnType<typeof limit>) =>
    buttons.length === 0 ? (
      row
    ) : (
      <Box flexDirection="row" justifyContent="space-between">
        {row}
        <Box flexDirection="row" gap={BUTTON_GAP}>
          {buttons.map(button => (
            button.isPlain === true ? (
              <Button key={button.key} label={button.label} onPress={button.onPress} plain dimColor />
            ) : (
              <Button key={button.key} label={button.label} onPress={button.onPress} />
            )
          ))}
        </Box>
      </Box>
    )

  const fits = isSlim ? fitsSlimRow(views, room) : fitsOneRow(views, ageText, room)

  if (fits) {
    return withButtons(
      <Text wrap="truncate">
        {views.map((view, index) => (
          <Text>
            {index > 0 && <Text dimColor>{separator}</Text>}
            {limit(view)}
          </Text>
        ))}
        {age}
      </Text>,
    )
  }

  return (
    <Box flexDirection="column">
      {views.map((view, index) => {
        const row = (
          <Text wrap="truncate">
            {limit(view)}
            {index === views.length - 1 && age}
          </Text>
        )

        return index === 0 ? withButtons(row) : row
      })}
    </Box>
  )
}

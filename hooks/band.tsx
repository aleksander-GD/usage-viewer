import type { ElementTable, RenderSurface } from 'claude-code'

import { colorsFor } from './colors'
import { BAR_WIDTH, SEPARATOR, filledCells, fitsOneRow } from './limits'
import type { LimitView } from './limits'

const OPEN_SIDEBAR_LABEL = 'Open sidebar'
// The terminal draws it as "[ Open sidebar ]"; two more cells keep it clear of the limits.
const OPEN_SIDEBAR_COLUMNS = OPEN_SIDEBAR_LABEL.length + 4 + 2

/**
 * The Limit band: one row with every limit, or one row per limit when that
 * does not fit. With `openSidebar`, a button at the end brings the Usage
 * sidebar back.
 */
export function drawBand<P extends RenderSurface>(
  { Box, Button, Text }: Pick<ElementTable<P>, 'Box' | 'Button' | 'Text'>,
  {
    views,
    ageText,
    columns,
    openSidebar,
  }: { views: LimitView[]; ageText?: string; columns: number; openSidebar?: () => void },
) {
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
  const button = openSidebar !== undefined && (
    <Button key="open-sidebar" label={OPEN_SIDEBAR_LABEL} onPress={openSidebar} />
  )
  const room = openSidebar === undefined ? columns : columns - OPEN_SIDEBAR_COLUMNS

  // The button sits at the right end of the band's first row.
  const withButton = (row: ReturnType<typeof limit>) =>
    button === false ? (
      row
    ) : (
      <Box flexDirection="row" justifyContent="space-between">
        {row}
        {button}
      </Box>
    )

  if (fitsOneRow(views, ageText, room)) {
    return withButton(
      <Text wrap="truncate">
        {views.map((view, index) => (
          <Text>
            {index > 0 && <Text dimColor>{SEPARATOR}</Text>}
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

        return index === 0 ? withButton(row) : row
      })}
    </Box>
  )
}

import type { ElementTable, RenderSurface } from 'claude-code'

import { colorsFor } from './colors'
import { BAR_WIDTH, SEPARATOR, filledCells, fitsOneRow } from './limits'
import type { LimitView } from './limits'

/** The Limit band: one row with every limit, or one row per limit when that does not fit. */
export function drawBand<P extends RenderSurface>(
  { Box, Text }: Pick<ElementTable<P>, 'Box' | 'Text'>,
  { views, ageText, columns }: { views: LimitView[]; ageText?: string; columns: number },
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

  if (fitsOneRow(views, ageText, columns)) {
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
}

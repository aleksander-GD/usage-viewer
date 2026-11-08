import type { ElementTable, RenderSurface } from 'claude-code'

import { colorsFor } from './colors'
import { filledCells, fitsSidebarHeading, sidebarResetText } from './limits'
import type { LimitView } from './limits'

/**
 * The Usage sidebar, laid out like the Usage popover: per limit a heading line
 * (label, reset text, percentage) over a bar the sidebar's full width. Where
 * the heading does not fit, the reset text moves under the bar.
 */
export function drawSidebar<P extends RenderSurface>(
  { Box, Text }: Pick<ElementTable<P>, 'Box' | 'Text'>,
  { views, ageText, columns }: { views: LimitView[]; ageText?: string; columns: number },
) {
  const limit = (view: LimitView) => {
    const filled = filledCells(view.percent, columns)
    const colors = colorsFor(view)
    const reset = sidebarResetText(view)
    const isOneLine = fitsSidebarHeading(view, columns)

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text dimColor={view.isDim} wrap="truncate">
            {view.label}
          </Text>
          <Text>
            {isOneLine && reset !== undefined && <Text dimColor>{reset}  </Text>}
            <Text tabular dimColor={view.isDim} color={colors.percent}>
              {view.percent}%
            </Text>
          </Text>
        </Box>
        <Text wrap="truncate">
          <Text mono color={colors.bar}>{'━'.repeat(filled)}</Text>
          <Text mono color="subtle">{'─'.repeat(columns - filled)}</Text>
        </Text>
        {!isOneLine && reset !== undefined && (
          <Text dimColor wrap="truncate">
            {reset}
          </Text>
        )}
      </Box>
    )
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text weight="semibold">Usage</Text>
      {views.map(limit)}
      {ageText !== undefined && <Text dimColor>{ageText}</Text>}
    </Box>
  )
}

/** What the Usage sidebar shows before any Reading exists. */
export function drawSidebarEmpty<P extends RenderSurface>({ Box, Text }: Pick<ElementTable<P>, 'Box' | 'Text'>) {
  return (
    <Box flexDirection="column" gap={1}>
      <Text weight="semibold">Usage</Text>
      <Text dimColor>No usage reading yet. It arrives with this session's first reply.</Text>
    </Box>
  )
}

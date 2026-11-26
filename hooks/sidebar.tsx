import type { ElementTable, RenderSurface } from 'claude-code'

import { colorsFor } from './colors'
import { filledCells, fitsSidebarHeading, sidebarResetText } from './limits'
import type { LimitView } from './limits'

const CLOSE_KEY = 'close-sidebar'
const CLOSE_LABEL = 'Close'

/**
 * The Usage sidebar, laid out like the Usage popover: per limit a heading line
 * (label, reset text, percentage) over a bar the sidebar's full width. Where
 * the heading does not fit, the reset text moves under the bar.
 */
export function drawSidebar<P extends RenderSurface>(
  ui: Pick<ElementTable<P>, 'Box' | 'Button' | 'Text'>,
  { views, ageText, columns, close }: { views: LimitView[]; ageText?: string; columns: number; close?: () => void },
) {
  const { Box, Text } = ui

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
      {drawHeading(ui, close)}
      {views.map(limit)}
      {ageText !== undefined && <Text dimColor>{ageText}</Text>}
    </Box>
  )
}

/** What the Usage sidebar shows before any Reading exists. */
export function drawSidebarEmpty<P extends RenderSurface>(
  ui: Pick<ElementTable<P>, 'Box' | 'Button' | 'Text'>,
  { close }: { close?: () => void } = {},
) {
  const { Box, Text } = ui

  return (
    <Box flexDirection="column" gap={1}>
      {drawHeading(ui, close)}
      <Text dimColor>No usage reading yet. It arrives with this session's first reply.</Text>
    </Box>
  )
}

/**
 * The sidebar's heading, with a Close button at its right end. The desktop
 * app's own close mark does not reach the mod, so this is the way back to the
 * Limit band there.
 */
function drawHeading<P extends RenderSurface>(
  { Box, Button, Text }: Pick<ElementTable<P>, 'Box' | 'Button' | 'Text'>,
  close?: () => void,
) {
  if (close === undefined) return <Text weight="semibold">Usage</Text>

  return (
    <Box flexDirection="row" justifyContent="space-between">
      <Text weight="semibold">Usage</Text>
      <Button key={CLOSE_KEY} label={CLOSE_LABEL} onPress={close} plain dimColor />
    </Box>
  )
}

import type { LimitView, Tone } from './limits'

const TONE_COLORS: Record<Tone, string | undefined> = {
  normal: undefined,
  warning: 'warning',
  error: 'error',
}

/** The bar's and the percentage's colours for one limit: muted when dimmed, toned otherwise. */
export function colorsFor(view: LimitView): { bar: string; percent?: string } {
  if (view.isDim) return { bar: 'inactive' }

  const tone = TONE_COLORS[view.tone]

  return { bar: tone ?? 'suggestion', percent: tone }
}

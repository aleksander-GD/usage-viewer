# usage-viewer — spec

A personal Claude Code mod for the desktop Code tab that keeps **Limit usage** visible in a **Limit band** above the input field, so the **Usage popover** never needs opening. Terms are defined in [GLOSSARY.md](GLOSSARY.md).

Audience: just the author, on their own Mac. Not distributed as a plugin.

## What it shows

Two limits, matching the Usage popover:

| Label | Source window | Reset text |
|---|---|---|
| Session limit | 5-hour | Relative plus exact time: `in 3 hr 16 min (7:00 PM)` |
| Weekly · all models | 7-day | Weekday + clock: `Wed 7:00 PM` |

Each limit shows a bar, its percentage and its reset text. Clock format follows the system setting (12h/24h).

Model-specific weekly limits are **out of scope** for v1.

## Layout

- One row, both limits side by side:
  `Session limit ━───────── 4% · in 3 hr 16 min (7:00 PM) │ Weekly · all models ━━━━────── 38% · Wed 7:00 PM`
- Each bar is a line 10 cells long, like the Usage popover's: a heavy `━` for the used part and a thin `─` for the rest, so it reads without colour. Any use fills at least one cell; all ten fill only at 100%.
- Falls back to two rows (one per limit) when the band is too narrow for one.

## Colour thresholds

Applied per limit, to its bar and percentage:

| Limit usage | Colour |
|---|---|
| < 75% | normal |
| ≥ 75% | amber |
| ≥ 90% | red |

No notifications.

## Data

- Source: only the Readings Claude Code gives mods (rate limits `five_hour` and `seven_day`). They update after each turn and whenever a limit moves a whole point.
- The internal usage endpoint behind the Usage popover is **not** used.
- Every fresh Reading is saved so later Claude Code sessions can start from it.

## States

| Situation | Display |
|---|---|
| Fresh Reading in this Claude Code session | Normal |
| No fresh Reading yet, a saved one exists | Stale reading: dimmed, with `as of 14 min ago` |
| A limit's reset time has passed with no fresher Reading | That limit shows dimmed 0% with no reset text |
| No Reading has ever been saved (e.g. not on a subscription) | Band shows nothing |
| A survey is showing | Band steps aside, then returns when the survey is dismissed |

The band is visible while Claude is working.

## Timing

Reset text redraws every 60 s with no network call. It costs no tokens: what the band draws is never sent to Claude.

## Not in v1

- A toggle command. To turn the band off, remove the mod.
- Model-specific weekly limits.
- A status line for the terminal CLI.

## Tests

Unit tests run with `claude plugin test` and cover:

- relative (with exact time) and weekday/clock reset text
- colour thresholds at 75% and 90%
- the reset-passed rule
- the Stale reading age text

The drawn band is checked by eye in the desktop app.

## Build and install

1. The source lives in this folder (`usage-viewer-mod`). The mod is named `usage-viewer`.
2. While iterating, it is loaded via the Claude Code session's hot-reload folder. The user answers the one-time "Enable hot reloading" prompt.
3. Once it works, `CLAUDE_CODE_PLUGIN_DIRS` pointing at this folder is added to the `env` block of `~/.claude/settings.json`. This only happens after the user explicitly approves the exact line.

# usage-viewer — spec

A personal Claude Code mod that keeps **Limit usage** visible, in a **Usage sidebar** beside the transcript where the surface can dock one and in a **Limit band** above the input field everywhere else, so the **Usage popover** never needs opening. Terms are defined in [GLOSSARY.md](GLOSSARY.md).

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

## Usage sidebar

Laid out like the Usage popover:

```
Usage

Session limit      Resets in 3 hr 16 min (19:00)  4%
━─────────────────────────────────────────────────────

Weekly · all models            Resets Wed 19:00  38%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━──────────────────

as of 14 min ago   (only for a Stale reading)
```

- Each bar spans the sidebar's width, with the band's rules: heavy `━` used, thin `─` the rest, at least one cell for any use, full only at 100%.
- Where label, reset text and percentage don't fit on one line, the reset text moves under the bar.
- Before any Reading exists it says so instead of showing empty bars.

Where it appears:

| Surface | Usage sidebar | Limit band |
|---|---|---|
| Terminal in fullscreen (`tui: "fullscreen"`), 110+ columns | Docked beside the transcript; opens by itself from 144 columns | Hidden while the sidebar shows |
| Terminal on the main screen, or too narrow | Only through `/usage-viewer`, inline above the prompt | Shown when the sidebar isn't |
| Desktop app, VS Code, other attached clients | Opens by itself when the client says it docks panes | Shown when the sidebar isn't |

- The Limit band and the Usage sidebar never show at the same time.
- `/usage-viewer` opens the sidebar on any surface, and so does the band's **Open sidebar** button at the right end of its first row. A mod cannot add an icon to the desktop app's own toolbar, so the button is the one-click way back.
- Closing the sidebar keeps it closed for that Claude Code session until `/usage-viewer` is run again.

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

- A way to hide the Limit band itself. To turn it off, remove the mod.
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

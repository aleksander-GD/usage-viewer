# usage-viewer — spec

A personal Claude Code mod that keeps **Limit usage** visible, in a **Usage sidebar** beside the transcript where the surface can dock one and in a **Limit band** above the input field everywhere else, so the **Usage popover** never needs opening. Terms are defined in [GLOSSARY.md](GLOSSARY.md).

Audience: mainly the author, on their own Mac. Others can install it from this repository's marketplace.

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

## Slim band

A shorter look for the Limit band, for when the full one takes too much room:

`Session ━───────── 4% │ Weekly ━━━━────── 38%`

- Short labels (`Session`, `Weekly`), the same 10-cell bars and percentages, no reset text.
- Keeps the colour thresholds, and still dims a Stale reading or a limit whose reset time has passed, but leaves out the `as of 14 min ago` text.
- Falls back to two rows, one per limit, when even this doesn't fit on one (about 45 columns plus the button).
- A button at the right end of the band's first row switches between the two looks: `[ − ]` on the full band, and on the Slim band a plain, dim `+` with no frame, so the band stays as low as a line of text. The full band shows it after **Open sidebar**: `[ Open sidebar ] [ − ]`. The Slim band leaves out **Open sidebar**, so you open the sidebar there with `/usage-viewer` or by switching back to the full band first.
- The band starts full. The choice is saved, so later Claude Code sessions start with the look you chose last.
- The Usage sidebar is unchanged.

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
- `/usage-viewer` opens the sidebar on any surface, and so does the full band's **Open sidebar** button at the right end of its first row, just before `[ − ]` (the Slim band leaves it out). A mod cannot add an icon to the desktop app's own toolbar, so the button is the one-click way back.
- A plain, dim **Close** button at the right end of the sidebar's `Usage` heading closes it, and the Limit band returns. The desktop app's own close mark on the pane's tab does not reach a mod, so this button is the way back to the band there. A minimized pane (a widget on the desktop app) has no button, as clicks may not reach it.
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
| Slim band chosen | Short labels, bars and percentages only; a Stale reading is dimmed without its age |

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
- the Slim band: switching both ways, the saved choice, the dropped age text and its one- and two-row layouts

The drawn band is checked by eye in the desktop app.

## Build and install

1. The source lives in this folder (`usage-viewer-mod`). The mod is named `usage-viewer`.
2. While iterating, it is loaded via the Claude Code session's hot-reload folder. The user answers the one-time "Enable hot reloading" prompt.
3. Once it works, `CLAUDE_CODE_PLUGIN_DIRS` pointing at this folder is added to the `env` block of `~/.claude/settings.json`. This only happens after the user explicitly approves the exact line.
4. Releases are tagged on `main` and published under GitHub Releases. `.claude-plugin/marketplace.json` makes the repository a marketplace, so the released mod installs with `/plugin install usage-viewer --marketplace aleksander-GD/usage-viewer`. A working copy is run with `--plugin-dir` or `CLAUDE_CODE_PLUGIN_DIRS` instead, never together with the installed one.

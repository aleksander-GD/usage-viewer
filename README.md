# usage-viewer

A Claude Code mod that keeps your plan limits visible in a band above the prompt, so you don't have to open the usage popover:

```
Session limit ━───────── 4% · in 3 hr 16 min (7:00 PM)  │  Weekly · all models ━━━━────── 38% · Wed 7:00 PM
```

- Bars and percentages turn amber at 75% and red at 90%.
- A new Claude Code session shows the last saved reading, dimmed with its age ("as of 14 min ago"), until its first request brings fresh numbers.
- A limit whose reset time has passed shows dimmed 0% until fresh numbers arrive.
- The band steps aside while a survey is showing.

See [SPEC.md](SPEC.md) for the full behaviour and [GLOSSARY.md](GLOSSARY.md) for the terms.

## Install (every desktop session)

Add this folder to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json`, then start a new session:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "/path/to/usage-viewer"
  }
}
```

For one terminal session only: `claude --plugin-dir /path/to/usage-viewer`.

## Develop

```bash
claude plugin validate .
```

```bash
claude plugin test .
```

The pure formatting logic is in `hooks/limits.ts`, and the band and event wiring is in `hooks/register.tsx`.

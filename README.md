# usage-viewer

A Claude Code mod that keeps your plan limits visible, in a sidebar beside the transcript where it fits and in a band above the prompt elsewhere, so you don't have to open the usage popover:

```
Session limit ━───────── 4% · in 3 hr 16 min (7:00 PM)  │  Weekly · all models ━━━━────── 38% · Wed 7:00 PM
```

- Bars and percentages turn amber at 75% and red at 90%.
- A new Claude Code session shows the last saved reading, dimmed with its age ("as of 14 min ago"), until its first request brings fresh numbers.
- A limit whose reset time has passed shows dimmed 0% until fresh numbers arrive.
- The band steps aside while a survey is showing.
- Press **−** at the end of the band for the **Slim band**, `Session ━───────── 4% │ Weekly ━━━━────── 38%`, and **+** to switch back. Your choice is kept for new Claude Code sessions.

### Usage sidebar

Where the surface can dock a pane beside the transcript (the terminal in fullscreen mode, `"tui": "fullscreen"`, or a client that docks panes), a **Usage sidebar** opens by itself, laid out like the usage popover, and the band hides. Press **Close** at the top of the sidebar to go back to the band. Run `/usage-viewer`, or press **Open sidebar** at the end of the full band, to open it anywhere or bring it back after closing it.

See [SPEC.md](SPEC.md) for the full behaviour and [GLOSSARY.md](GLOSSARY.md) for the terms.

## Install

The mod installs from this repository's marketplace, which follows `main`, the released version.

At the prompt of a terminal Claude Code session:

```text
/plugin install usage-viewer --marketplace aleksander-GD/usage-viewer
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```bash
claude plugin install usage-viewer --marketplace aleksander-GD/usage-viewer
```

In the desktop app, where `/plugin` doesn't run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `aleksander-GD/usage-viewer`, then **Add plugin**.

To get a new release: `claude plugin update usage-viewer`, then `/reload-plugins`.

## Develop

Run the mod from your working copy instead of the installed release, so edits hot-reload. For one terminal Claude Code session:

```bash
claude --plugin-dir /path/to/usage-viewer
```

For every Claude Code session, including the desktop app's, add the folder to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json`, then start a new Claude Code session:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "/path/to/usage-viewer"
  }
}
```

That runs whatever branch is checked out. Use either this or the marketplace install, not both, so only one copy of the mod loads.


```bash
claude plugin validate .
```

```bash
claude plugin test .
```

The pure formatting logic is in `hooks/limits.ts`, and the band and event wiring is in `hooks/register.tsx`.

## Commit messages

Commits and PR titles use [gitmoji](https://gitmoji.dev): one official gitmoji, a space, then an imperative subject starting with a capital letter, at most 72 characters (`🐛 Keep both limits in every Reading`). PRs are merged with a merge commit named after the PR title. The `Gitmoji` check on each PR enforces this.

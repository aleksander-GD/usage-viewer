# Usage Viewer

A personal Claude Code mod that keeps plan usage limits visible at all times, so they can be read without opening the usage popover.

## Language

**Limit usage**:
How much of a plan usage limit has been consumed, as a percentage, together with when that limit resets.
_Avoid_: Usage (on its own), quota, tokens, cost

**Session limit**:
The rolling 5-hour plan limit, as labelled in the usage popover.
_Avoid_: 5h limit, session (on its own)

**Weekly limit**:
The 7-day plan limit across all models, labelled "Weekly · all models" in the usage popover.
_Avoid_: 7d limit, week

**Reset time**:
The moment a limit's percentage returns to zero.
_Avoid_: Renewal, refresh

**Reading**:
A snapshot of Limit usage for both limits, taken at a known moment.
_Avoid_: Sample, poll, data

**Stale reading**:
The last saved Reading, shown until a fresh one arrives in the current Claude Code session.
_Avoid_: Cached data, old value

**Limit band**:
The strip above the input field where this mod shows Limit usage.
_Avoid_: Status bar, banner, widget

**Usage popover**:
The built-in panel opened by clicking the small circle icon, which this mod exists to make unnecessary.
_Avoid_: Circle, usage menu

**Claude Code session**:
One conversation in the Code tab. Unrelated to the Session limit, which spans all sessions.
_Avoid_: Session (on its own)

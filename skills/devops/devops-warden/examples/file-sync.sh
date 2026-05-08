#!/usr/bin/env bash
# Mutagen file sync operations through Warden.
# Run these on the host (not inside warden shell).
# Warden manages mutagen sessions automatically; these commands let you
# inspect and recover them when the sync stalls.

# ── Status ────────────────────────────────────────────────────────────────────

# Show all active sync sessions and their current state
# Look for "Watching for changes" — anything else indicates a problem.
warden sync list

# Stream live sync events until Ctrl-C.
# Use this first when edits on the host are not appearing inside the container.
warden sync monitor

# ── Lifecycle ─────────────────────────────────────────────────────────────────

# Start the sync session (also runs automatically with `warden env start`)
warden sync start

# Stop the sync session without destroying its state
warden sync stop

# Temporarily halt sync — useful during large file operations (e.g. composer install)
# that would otherwise trigger thousands of sync events and slow down the host.
warden sync pause

# Resume a paused session
warden sync resume

# ── Recovery ──────────────────────────────────────────────────────────────────

# Restart all sync sessions — first choice when edits are not reaching the container.
# Stops and recreates every session; faster than a full reset.
warden sync restart

# Full reset — nukes sync state and forces a complete re-scan of all files.
# Use only when `warden sync restart` does not clear the conflict or stall.
# Expect a longer initial sync (seconds to minutes depending on project size).
warden sync reset

# ── Debugging ─────────────────────────────────────────────────────────────────

# If warden sync commands hang or error, check Docker and mutagen daemon state:
warden doctor

# Verbose output — also prints environment variables that affect sync behaviour
warden doctor -v

# Inspect the raw mutagen daemon log for protocol-level errors
# (mutagen must be installed on the host for this to work)
mutagen daemon stop && mutagen daemon start
warden sync start

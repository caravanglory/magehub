#!/usr/bin/env bash
# Stream a gzipped SQL dump into the db container.
# Nothing is written to disk inside the container; pv shows progress.

pv /path/to/dump.sql.gz | gunzip -c | warden db import

# If pv is not available, cat works as a drop-in replacement
# (you lose the progress indicator but the import still streams):
cat /path/to/dump.sql.gz | gunzip -c | warden db import

# Uncompressed dump:
pv /path/to/dump.sql | warden db import

# Watch what the DB is doing during a long import or upgrade:
watch -n 3 "warden db connect -A -e 'show processlist'"

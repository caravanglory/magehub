#!/usr/bin/env bash
set -euo pipefail

target_version="${1:?Usage: uct-analysis.sh <target-version> [magento-root]}"
magento_root="${2:-$(pwd)}"
uct_dir="${UCT_DIR:-$magento_root/var/uct}"
report_dir="$magento_root/var/upgrade-reports/$target_version"

mkdir -p "$report_dir"

if [ ! -x "$uct_dir/bin/uct" ]; then
  composer create-project magento/upgrade-compatibility-tool "$uct_dir" \
    --repository https://repo.magento.com
  chmod +x "$uct_dir/bin/uct"
fi

"$uct_dir/bin/uct" upgrade:check "$magento_root" \
  -c "$target_version" \
  --ignore-current-version-compatibility-issues \
  --min-issue-level WARNING \
  > "$report_dir/uct-upgrade-check.txt"

"$uct_dir/bin/uct" list > "$report_dir/uct-commands.txt"

printf 'UCT reports written to %s\n' "$report_dir"

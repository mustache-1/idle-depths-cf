#!/usr/bin/env bash
# Wipe player data from the Idle Depths KV namespace before opening Season 1.
#
# Dry run (lists what would go, deletes nothing):
#   ./wipe.sh
# For real:
#   ./wipe.sh --yes
#
# Keep the crews and only reset progress and the board:
#   PREFIXES="save: board:" ./wipe.sh --yes
#
# Needs wrangler (logged in) and jq. On wrangler older than 3.60 the subcommands are
# colon-style: `wrangler kv:key list`, `wrangler kv:bulk delete`.

set -euo pipefail

NS="47d5c35a55934250bca5a29068c25a21"   # SAVES, from wrangler.toml
PREFIXES="${PREFIXES:-save: board: crew: crewmem: crewof:}"
SINGLES="${SINGLES:-feed cache:board cache:crews cache:feedseed}"
LIVE=0
[ "${1:-}" = "--yes" ] && LIVE=1

command -v wrangler >/dev/null || { echo "wrangler not found"; exit 1; }
command -v jq >/dev/null || { echo "jq not found"; exit 1; }

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
: > "$tmp/keys.txt"

for p in $PREFIXES; do
  echo "listing $p*"
  wrangler kv key list --namespace-id="$NS" --prefix="$p" \
    | jq -r '.[].name' >> "$tmp/keys.txt"
done

# the singles are fixed names, not prefixes, so only delete the ones that exist
for k in $SINGLES; do
  if wrangler kv key get "$k" --namespace-id="$NS" >/dev/null 2>&1; then
    echo "$k" >> "$tmp/keys.txt"
  fi
done

sort -u "$tmp/keys.txt" -o "$tmp/keys.txt"
total=$(wc -l < "$tmp/keys.txt" | tr -d ' ')
echo
echo "$total keys matched:"
for p in $PREFIXES; do printf '  %-10s %s\n' "$p" "$(grep -c "^$p" "$tmp/keys.txt" || true)"; done

if [ "$LIVE" != "1" ]; then
  echo
  echo "DRY RUN — nothing deleted. Re-run with --yes to delete these $total keys."
  head -20 "$tmp/keys.txt"
  exit 0
fi

echo
read -r -p "Delete all $total keys? This cannot be undone. Type WIPE to confirm: " ok
[ "$ok" = "WIPE" ] || { echo "aborted"; exit 1; }

# wrangler wants a JSON array of key names. Split into chunks of 1000 with plain
# coreutils rather than a jq internal, so this works on any jq build.
split -l 1000 "$tmp/keys.txt" "$tmp/chunk."
n=0
for f in "$tmp"/chunk.*; do
  n=$((n+1))
  jq -R -s 'split("\n") | map(select(length > 0))' "$f" > "$f.json"
  echo "deleting batch $n ($(wc -l < "$f" | tr -d ' ') keys)"
  wrangler kv bulk delete "$f.json" --namespace-id="$NS" --force
done

echo "done — $total keys deleted"

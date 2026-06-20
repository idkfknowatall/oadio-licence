#!/usr/bin/env bash
# Deploy oadio.com to Cloudflare Pages (direct upload).  Run: ./deploy.sh
#
# Pages uploads everything in this directory as public static assets and honors no
# ignore file for `pages deploy`. This script moves local-only files (.dev.vars*)
# out of the upload directory for the duration of the deploy and restores them
# afterward (trap on EXIT), so they are never published.
set -euo pipefail
cd "$(dirname "$0")"

STASH="$(mktemp -d)"
SECRETS=(.dev.vars .dev.vars.example)

restore() {
  for f in "${SECRETS[@]}"; do
    [ -e "$STASH/$f" ] && mv "$STASH/$f" "./$f"
  done
  rmdir "$STASH" 2>/dev/null || true
}
trap restore EXIT

for f in "${SECRETS[@]}"; do
  [ -e "./$f" ] && mv "./$f" "$STASH/$f"
done

# dir + project name + KV binding come from wrangler.toml (pages_build_output_dir).
npx wrangler pages deploy --branch main --commit-dirty=true

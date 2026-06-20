#!/usr/bin/env bash
# Deploy oadio.com to Cloudflare Pages (direct upload).
#
# Pages has no .pagesignore/.assetsignore for `pages deploy`, so it would upload
# .dev.vars (local secrets) as a PUBLIC static asset. A prior deploy did exactly
# that and leaked RESEND_API_KEY. This script stashes the dev-secret files out of
# the upload directory for the duration of the deploy, then restores them — even
# if the deploy fails.
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

npx wrangler pages deploy . --project-name oadio --branch main --commit-dirty=true

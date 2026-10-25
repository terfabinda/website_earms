#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REMOTE="${EARMSHUB_REMOTE:-afdic}"
BRANCH="${EARMSHUB_BRANCH:-main}"
WORKTREE="$ROOT/.earmshub-publish"

npm run build
cp -f public/.htaccess dist/.htaccess
rm -f dist/.cpanel.yml dist/.nojekyll

while IFS= read -r file; do
  [ -z "$file" ] && continue
  rm -f "dist/${file#public/}"
done < <(git ls-files --others --exclude-standard -- public)

git fetch "$REMOTE" --prune
git worktree prune

rm -rf "$WORKTREE"
git worktree add --detach "$WORKTREE" "$REMOTE/$BRANCH"

cleanup() {
  cd "$ROOT"
  git worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  rm -rf "$WORKTREE"
}
trap cleanup EXIT

cd "$WORKTREE"
git rm -r -q .
cp -R "$ROOT/dist/." .
git add -A

if git diff --cached --quiet; then
  echo "No changes to publish."
  exit 0
fi

git commit -q -m "deploy: $(git -C "$ROOT" rev-parse --short HEAD)"
git push "$REMOTE" "HEAD:$BRANCH"

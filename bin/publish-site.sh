#!/usr/bin/env bash
# Builds the website (website/build.mjs) and publishes website/dist to the gh-pages branch,
# served by GitHub Pages.
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="expenity/expenity"
node website/build.mjs
work="$(mktemp -d)"
if git ls-remote --exit-code --heads "https://github.com/$REPO.git" gh-pages >/dev/null 2>&1; then
	git clone --quiet --branch gh-pages "https://github.com/$REPO.git" "$work"
else
	git -C "$work" init --quiet --initial-branch=gh-pages
	git -C "$work" remote add origin "https://github.com/$REPO.git"
fi
rsync -a --delete --exclude .git website/dist/ "$work"/
git -C "$work" add -A
if git -C "$work" diff --cached --quiet; then
	echo "Website: nothing changed."
else
	git -C "$work" commit --quiet -m "Website"
	git -C "$work" push --quiet -u origin gh-pages
	echo "Website: pushed."
fi
rm -rf "$work"
gh api "repos/$REPO/pages" >/dev/null 2>&1 || gh api -X POST "repos/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null
echo "https://expenity.github.io/expenity/"

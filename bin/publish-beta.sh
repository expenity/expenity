#!/usr/bin/env bash
# Publishes the CURRENT working tree of the app as a private-ish beta at https://expenity.github.io/expenity-beta/app/
# (repo expenity/expenity-beta, gh-pages). It uses the same origin as the real site, so passkeys made here keep working
# on the final site, and it talks to the live API. The public site, docs and blog are not touched. Marked noindex.
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="expenity/expenity-beta"
work="$(mktemp -d)"
clone_reference=()
if [ -n "${EXPENITY_DEPLOY_REFERENCE:-}" ]; then clone_reference=(--reference-if-able "$EXPENITY_DEPLOY_REFERENCE"); fi
git clone ${clone_reference[@]+"${clone_reference[@]}"} --quiet --depth 1 --single-branch --branch gh-pages "https://github.com/$REPO.git" "$work"
mkdir -p "$work/app"
for f in index.html nozoom.js splash.js icons.js ui.js views.js forms.js advanced-money.js smart.js recurrence.js editor-layout.js sound-effects.js catalog.js scan-shortcut.js photos.js avatar.js walletcolor.js features.js rowmenu.js contextmenu.js tutorials.js fresh.js contact.js help.js demo.js usage.js reports.js plan.js insights.js safe-spend.js extras.js drafts.js receipts.js share.js push.js flow.js installation.js themes.js ambient.js sharelove.js enhancements.js dashboard.js productivity.js releases.json app.js core.js sync.js i18n.js theme.js style.css themes.css favicon.svg manifest.webmanifest sw.js icon-192.png icon-512.png; do cp "$f" "$work/app/$f"; done
mkdir -p "$work/app/installation"
cp installation/*.mp4 installation/*.png "$work/app/installation/"
mkdir -p "$work/app/assets"
cp -R assets/themes "$work/app/assets/"
mkdir -p "$work/app/vendor"
cp -R vendor/ocr "$work/app/vendor/"
# Use one build identifier for both HTML asset URLs and service-worker installation.
node --input-type=module - "$work/app" <<'JS'
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const dir=process.argv[2], build=Date.now().toString(36);
const html=join(dir,'index.html'), sw=join(dir,'sw.js');
writeFileSync(html,readFileSync(html,'utf8').replace(/((?:src|href)="[^"?]+\.(?:js|css))"/g,'$1?v='+build+'"'));
writeFileSync(sw,readFileSync(sw,'utf8').replace(/(const FILES = \[[^;]+\]);/, '$1.map( f => /\\.(js|css)$/.test(f) ? f + "?v='+build+'" : f );'));
JS
# Mark it as a beta: not indexed, and a clear name.
sed -i.bak -e 's#<title>Expenity: #<title>[Beta] Expenity: #' -e 's#<meta name="theme-color"#<meta name="robots" content="noindex, nofollow">\n<meta name="theme-color"#' "$work/app/index.html" && rm "$work/app/index.html.bak"
sed -i.bak -e 's#"name": "Expenity"#"name": "Expenity (beta)"#' -e 's#"short_name": "Expenity"#"short_name": "Expenity β"#' "$work/app/manifest.webmanifest" && rm "$work/app/manifest.webmanifest.bak"
sed -i.bak -E "s#expenity-v([0-9]+)#expenity-beta-v\1-$(date +%s)#" "$work/app/sw.js" && rm "$work/app/sw.js.bak"
sed -i.bak "s#document.title = t( 'title' );#document.title = '[Beta] ' + t( 'title' );#" "$work/app/app.js" && rm "$work/app/app.js.bak"
cat > "$work/index.html" <<'HTML'
<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Expenity beta</title><meta name="robots" content="noindex, nofollow"><meta http-equiv="refresh" content="0; url=app/"></head><body style="font-family:system-ui,sans-serif;margin:3rem auto;max-width:30rem;padding:0 1rem"><h1>Expenity beta</h1><p>A test copy of the next version. <a href="app/">Open the app</a>.</p></body></html>
HTML
# strip-localhost-csp: local development addresses are only for the dev server, never in a published build
sed -i.bak "s# http://localhost:\* http://127.0.0.1:\*##" "$work/app/index.html" && rm "$work/app/index.html.bak"
touch "$work/.nojekyll"
git -C "$work" add -A
git -C "$work" -c user.name="George" -c user.email="george@wp-media.me" commit -q -m "Beta build $(date +%Y-%m-%d)"
if ! gh repo view "$REPO" >/dev/null 2>&1; then
	gh repo create "$REPO" --public --description "Test copy of the next Expenity version. Not the real site: https://github.com/expenity/expenity" >/dev/null
fi
git -C "$work" push -q origin gh-pages
gh api "repos/$REPO/pages" >/dev/null 2>&1 || gh api -X POST "repos/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null
rm -rf "$work"
echo "https://expenity.github.io/expenity-beta/app/"

#!/usr/bin/env bash
# Publish only /app on Pages. Keep the landing site, documentation and blog untouched.
set -euo pipefail
cd "$(dirname "$0")/.."
work="$(mktemp -d)"
clone_reference=()
if [ -n "${EXPENITY_DEPLOY_REFERENCE:-}" ]; then clone_reference=(--reference-if-able "$EXPENITY_DEPLOY_REFERENCE"); fi
git clone ${clone_reference[@]+"${clone_reference[@]}"} --quiet --depth 1 --single-branch --branch gh-pages https://github.com/expenity/expenity.git "$work"
mkdir -p "$work/app"
for f in index.html nozoom.js icons.js ui.js views.js forms.js recurrence.js editor-layout.js sound-effects.js catalog.js scan-shortcut.js photos.js avatar.js walletcolor.js features.js rowmenu.js tutorials.js fresh.js contact.js help.js demo.js usage.js reports.js plan.js insights.js safe-spend.js extras.js drafts.js receipts.js share.js push.js flow.js installation.js themes.js enhancements.js dashboard.js productivity.js releases.json app.js core.js sync.js i18n.js theme.js style.css themes.css favicon.svg manifest.webmanifest sw.js icon-192.png icon-512.png; do cp "$f" "$work/app/$f"; done
mkdir -p "$work/app/installation"
cp installation/*.mp4 installation/*.png "$work/app/installation/"
mkdir -p "$work/app/assets"
cp -R assets/themes "$work/app/assets/"
mkdir -p "$work/app/vendor"
cp -R vendor/ocr "$work/app/vendor/"
node --input-type=module - "$work/app" <<'JS'
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const dir=process.argv[2], build=Date.now().toString(36);
const html=join(dir,'index.html'), sw=join(dir,'sw.js');
// Published builds do not allow local development addresses in the content security policy.
writeFileSync(html,readFileSync(html,'utf8').replace(/((?:src|href)="[^"?]+\.(?:js|css))"/g,'$1?v='+build+'"').replace(' http://localhost:* http://127.0.0.1:*',''));
writeFileSync(sw,readFileSync(sw,'utf8').replace(/(const FILES = \[[^;]+\]);/, '$1.map( f => /\\.(js|css)$/.test(f) ? f + "?v='+build+'" : f );'));
JS
git -C "$work" add app
git -C "$work" commit --quiet -m "Update app build"
git -C "$work" push --quiet origin gh-pages
# Keep existing beta installations on the same release as the main app.
bash bin/publish-beta.sh
printf 'App pushed: https://expenity.github.io/expenity/app/\n'
# Keep the temporary checkout available if a push fails; remove on success.

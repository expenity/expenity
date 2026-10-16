#!/usr/bin/env bash
# Publish only /app on Pages. Keep the landing site, documentation and blog untouched.
set -euo pipefail
cd "$(dirname "$0")/.."
work="$(mktemp -d)"
git clone --quiet --single-branch --branch gh-pages https://github.com/expenity/expenity.git "$work"
mkdir -p "$work/app"
for f in index.html icons.js ui.js views.js forms.js photos.js reports.js plan.js insights.js share.js push.js flow.js themes.js enhancements.js releases.json app.js core.js sync.js i18n.js theme.js style.css themes.css favicon.svg manifest.webmanifest sw.js icon-192.png icon-512.png; do cp "$f" "$work/app/$f"; done
node --input-type=module - "$work/app" <<'JS'
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const dir=process.argv[2], build=Date.now().toString(36);
const html=join(dir,'index.html'), sw=join(dir,'sw.js');
writeFileSync(html,readFileSync(html,'utf8').replace(/((?:src|href)="[^"?]+\.(?:js|css))"/g,'$1?v='+build+'"'));
writeFileSync(sw,readFileSync(sw,'utf8').replace(/(const FILES = \[[^;]+\]);/, '$1.map( f => /\\.(js|css)$/.test(f) ? f + "?v='+build+'" : f );'));
JS
git -C "$work" add app
git -C "$work" commit --quiet -m "Update app build"
git -C "$work" push --quiet origin gh-pages
printf 'App pushed: https://expenity.github.io/expenity/app/\n'
# Keep the temporary checkout available if a push fails; remove on success.

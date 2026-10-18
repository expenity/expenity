/**
 * Basic, Pro and Advanced are plan names and are never translated (George, 2026-10-19).
 * Fails when the Greek texts use the old Greek names. Run before publishing: node dev/check-plan-names.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
const files = [ 'i18n.js', 'releases.json', 'website/tutorials.json', 'website/build.mjs', 'website/src/home-el.html', ...readdirSync( 'docs/el' ).filter( ( f ) => f.endsWith( '.md' ) ).map( ( f ) => 'docs/el/' + f ) ];
const old = /(Βασικ(ό|ού|ά)|Προχωρημέν(ο|ου|α))\b/g;
let bad = 0;
for ( const f of files ) { const s = readFileSync( f, 'utf8' ); for ( const m of s.matchAll( old ) ) { bad++; console.log( 'FAIL', f, '…' + s.slice( Math.max( 0, m.index - 30 ), m.index + 30 ).replace( /\n/g, ' ' ) + '…' ); } }
console.log( bad ? `${ bad } use(s) of a translated plan name` : 'ok: plan names are not translated' );
process.exit( bad ? 1 : 0 );

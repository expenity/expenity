/**
 * Greek font guard. Run before publishing: node dev/check-greek-fonts.mjs
 * Rule: every font stack the app can apply (theme variables and the custom theme font choices) must start with a font we bundle
 * with a Greek subset, so Greek never falls back letter by letter to whatever the phone has (Android's own monospace has no Greek).
 * Also checks that each bundled family ships Greek files, declares them in themes.css and precaches them in sw.js.
 */
import { readFileSync, existsSync } from 'node:fs';
const css = readFileSync( 'themes.css', 'utf8' ), js = readFileSync( 'themes.js', 'utf8' ), sw = readFileSync( 'sw.js', 'utf8' ), base = readFileSync( 'style.css', 'utf8' );
const bundled = new Map();
for ( const m of css.matchAll( /font-family: '([^']+)';[^}]*?src: url\(([^)]+greek[^)]*)\)/g ) ) { const f = bundled.get( m[ 1 ] ) || new Set(); f.add( m[ 2 ] ); bundled.set( m[ 1 ], f ); }
let bad = 0; const fail = ( s ) => { console.log( 'FAIL', s ); bad++; };
for ( const [ fam, files ] of bundled ) for ( const f of files ) { if ( ! existsSync( f ) ) fail( `${ fam }: ${ f } is missing` ); if ( ! sw.includes( f ) ) fail( `${ fam }: ${ f } is not precached in sw.js` ); }
const first = ( stack ) => ( stack.split( ',' )[ 0 ] || '' ).trim().replace( /^["']|["']$/g, '' );
const stacks = [];
for ( const m of css.matchAll( /--(mono|serif|hand|round|font|font-head):\s*([^;}]+)[;}]/g ) ) stacks.push( [ m[ 1 ], m[ 2 ] ] );
for ( const m of base.matchAll( /--font:\s*([^;]+);/g ) ) stacks.push( [ 'style.css --font', m[ 1 ] ] );
const fam = js.match( /FONT_FAMILIES\s*=\s*\{([^}]*)\}/ );
if ( fam ) for ( const m of fam[ 1 ].matchAll( /(\w+):\s*'([^']*)'/g ) ) stacks.push( [ 'custom font ' + m[ 1 ], m[ 2 ] ] );
for ( const [ name, stack ] of stacks ) {
	if ( /^var\(/.test( stack.trim() ) ) continue; // an alias of another stack, checked there
	if ( ! bundled.has( first( stack ) ) ) fail( `${ name }: the stack starts with "${ first( stack ) }", not a bundled Greek font (${ stack.trim().slice( 0, 60 ) })` );
}
console.log( bad ? `${ bad } problem(s)` : `ok: ${ stacks.length } font stacks, ${ bundled.size } bundled families with Greek` );
process.exit( bad ? 1 : 0 );

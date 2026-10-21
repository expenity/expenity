// Every file the service worker caches, and every script/style index.html loads, must be in the publish copy list.
// A file missing there makes the update download fail with a 404 on every device.
import { readFileSync } from 'node:fs';
const lists = [ 'bin/publish-app.sh', 'bin/publish-beta.sh' ].map( ( f ) => [ f, new Set( readFileSync( f, 'utf8' ).match( /for f in (.*?); do cp/ )[ 1 ].split( /\s+/ ) ) ] );
const sw = readFileSync( 'sw.js', 'utf8' ).match( /const FILES = \[([\s\S]*?)\]/ )[ 1 ], need = new Set( [ ...sw.matchAll( /'\.?\/?([^'"\/]+\.[a-z0-9]+)'/g ) ].map( ( m ) => m[ 1 ] ) );
for ( const m of readFileSync( 'index.html', 'utf8' ).matchAll( /(?:src|href)="([^"?\/:]+\.(?:js|css|json|svg|png|webmanifest))"/g ) ) need.add( m[ 1 ] );
let bad = 0;
for ( const [ f, set ] of lists ) { const miss = [ ...need ].filter( ( x ) => ! set.has( x ) ); if ( miss.length ) { bad = 1; console.error( 'FAIL ' + f + ' does not copy: ' + miss.join( ', ' ) ); } }
if ( bad ) process.exit( 1 ); console.log( 'ok: every cached file is in the publish lists' );

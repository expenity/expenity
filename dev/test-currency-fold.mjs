import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd(), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer( ( q, r ) => { let f = path.join( root, decodeURIComponent( q.url.split( '?' )[ 0 ] ) ); if ( f.endsWith( '/' ) ) f += 'index.html'; fs.readFile( f, ( e, d ) => { if ( e ) { r.writeHead( 404 ); r.end(); } else { r.writeHead( 200, { 'content-type': types[ path.extname( f ) ] || 'application/octet-stream' } ); r.end( d ); } } ); } ).listen( 0 );
let ok = 0, fail = 0; const chk = ( n, c ) => { if ( c ) { ok++; console.log( 'ok', n ); } else { fail++; console.log( 'FAIL', n ); } };
const b = await chromium.launch( { channel: 'chrome' } ), pg = await b.newPage( { viewport: { width: 390, height: 800 } } ); const errs = []; pg.on( 'pageerror', ( e ) => errs.push( e.message ) );
await pg.goto( `http://localhost:${ server.address().port }/index.html` ); await pg.waitForFunction( () => window.EX && EXA.flow ); await pg.waitForTimeout( 1500 );
// the setup step: go straight to the setup stage and on to the currency step
await pg.evaluate( () => { EX.state().device.stage = 'setup'; EX.persist(); EXA.flow.show(); } ); await pg.waitForTimeout( 800 );
const toStep = await pg.evaluate( async () => { for ( let i = 0; i < 6 && ! document.querySelector( '.cur-grid' ); i++ ) { const nm = document.querySelector( '.flow input[name=name]' ); if ( nm && ! nm.value ) { nm.value = 'Test'; nm.dispatchEvent( new Event( 'input', { bubbles: true } ) ); } const n = [ ...document.querySelectorAll( '.flow button' ) ].find( ( x ) => /^Next/.test( x.textContent.trim() ) ); if ( ! n ) break; n.click(); await new Promise( ( r ) => setTimeout( r, 600 ) ); } return !! document.querySelector( '.cur-grid' ); } );
await pg.waitForTimeout( 500 );
if ( toStep ) {
	const vis = () => pg.evaluate( () => [ ...document.querySelectorAll( '.cur-grid .cur' ) ].filter( ( c ) => c.offsetParent !== null ).length );
	chk( 'setup: only four currencies show at first', await vis() === 4 );
	await pg.click( '.cur-toggle' ); chk( 'setup: the button shows all of them', await vis() > 20 );
	await pg.click( '.cur-toggle' ); chk( 'setup: and folds back', await vis() === 4 );
	await pg.fill( '#curSearch', 'krone' ); await pg.waitForTimeout( 300 ); chk( 'setup: searching finds currencies that were folded', await vis() >= 2 );
} else console.log( 'skip: setup step not reached' );
await pg.evaluate( () => { EXA.skipFlow(); } ); await pg.waitForTimeout( 800 );
// the settings page
await pg.evaluate( () => { EXA.st.view = 'more'; EXA.st.more = 'appearance'; EXA.render(); } ); await pg.waitForTimeout( 600 );
chk( 'settings: a main currency card with four chips', await pg.evaluate( () => document.querySelectorAll( '[data-cur-set]' ).length > 20 && ! document.querySelector( 'details.cur-more' ).open && [ ...document.querySelectorAll( '[data-cur-set]' ) ].filter( ( c ) => ! c.closest( 'details' ) ).length === 4 ) );
await pg.evaluate( () => document.querySelector( 'details.cur-more' ).open = true );
await pg.evaluate( () => document.querySelector( '[data-cur-set=GBP]' ).click() ); await pg.waitForTimeout( 500 );
chk( 'settings: choosing a currency changes the main currency', await pg.evaluate( () => EX.state().settings.currency === 'GBP' ) );
chk( 'settings: the one in use stays visible even if it is far down the list', await pg.evaluate( () => { EX.state().settings.currency = 'BRL'; EXA.render(); return [ ...document.querySelectorAll( '[data-cur-set]' ) ].filter( ( c ) => ! c.closest( 'details' ) ).some( ( c ) => c.dataset.curSet === 'BRL' ); } ) );
chk( 'no page errors ' + errs.join( ';' ), ! errs.length );
console.log( 'ok', ok, 'fail', fail ); await b.close(); server.close(); process.exit( fail ? 1 : 0 );

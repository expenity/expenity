import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd(), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer( ( q, r ) => { let f = path.join( root, decodeURIComponent( q.url.split( '?' )[ 0 ] ) ); if ( f.endsWith( '/' ) ) f += 'index.html'; fs.readFile( f, ( e, d ) => { if ( e ) { r.writeHead( 404 ); r.end(); } else { r.writeHead( 200, { 'content-type': types[ path.extname( f ) ] || 'application/octet-stream' } ); r.end( d ); } } ); } ).listen( 0 );
let ok = 0, fail = 0; const chk = ( n, c ) => { if ( c ) { ok++; console.log( 'ok', n ); } else { fail++; console.log( 'FAIL', n ); } };
const b = await chromium.launch( { channel: 'chrome' } ), pg = await b.newPage( { viewport: { width: 390, height: 700 } } ); const errs = []; pg.on( 'pageerror', ( e ) => errs.push( e.message ) );
await pg.goto( `http://localhost:${ server.address().port }/index.html?demo=1` ); await pg.waitForFunction( () => document.documentElement.dataset.demoReady === '1', null, { timeout: 30000 } ); await pg.waitForTimeout( 1200 );
const flagged = ( name ) => pg.evaluate( ( n ) => { const el = document.querySelector( `#sheet [name="${ n }"]` ); if ( ! el ) return 'missing'; const w = el.closest( '.f-bad' ); if ( ! w ) return 'not flagged'; const r = w.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 2 && el.getAttribute( 'aria-invalid' ) === 'true' ? 'ok' : 'flagged but ' + JSON.stringify( [ Math.round( r.top ), Math.round( r.bottom ), 'pulse' ] ); }, name );
const submit = async ( sel ) => { await pg.evaluate( ( s ) => document.querySelector( s ).requestSubmit(), sel ); await pg.waitForTimeout( 1600 ); };
// a goal with no name
await pg.evaluate( () => EXA.openGoal() ); await pg.waitForSelector( '#goalForm' ); await submit( '#goalForm' );
chk( 'goal: the empty name is highlighted and in view, without changing the layout (' + await flagged( 'gname' ) + ')', await flagged( 'gname' ) === 'ok' );
await pg.evaluate( () => UI.closeSheet( true ) );
// the add-expense form saved empty: the page moves to the amount and marks it
await pg.evaluate( () => { EX.state().device.entryMode = 'casual'; EXA.openTx( null, { type: 'expense' } ); } ); await pg.waitForTimeout( 700 );
await pg.evaluate( () => document.querySelector( '[data-tx=save]' ).click() ); await pg.waitForTimeout( 900 );
chk( 'expense: saving empty marks the amount field', await pg.evaluate( () => !! document.querySelector( '#sheet [aria-invalid="true"], #sheet .f-bad' ) ) );
await pg.evaluate( () => UI.closeSheet( true ) );
// an eFriend plan with a date in the past
await pg.evaluate( () => EXA.openEfPlan( null, { name: 'Trip', target: '250', deadline: '2020-01-01' } ) ); await pg.waitForSelector( '#efPlanForm' ); await submit( '#efPlanForm' );
chk( 'plan: the date in the past is flagged (' + await flagged( 'pdate' ) + ')', await flagged( 'pdate' ) === 'ok' );
// typing in the field clears the highlight
await pg.evaluate( () => { const i = document.querySelector( '[name=pdate]' ); i.value = '2030-01-01'; i.dispatchEvent( new Event( 'change', { bubbles: true } ) ); } );
chk( 'the layout does not change: no extra message is inserted', await pg.evaluate( () => ! document.querySelector( '#sheet .f-err' ) ) );
chk( 'fixing the field removes the highlight', await pg.evaluate( () => ! document.querySelector( '#sheet .f-bad' ) ) );
await pg.evaluate( () => UI.closeSheet( true ) );
// a wallet with no name
await pg.evaluate( () => EXA.openWallet && EXA.openWallet() ); await pg.waitForTimeout( 400 );
if ( await pg.evaluate( () => !! document.querySelector( '#walletForm' ) ) ) { await pg.evaluate( () => { document.querySelector( '#walletForm [name=name]' ).value = ''; } ); await submit( '#walletForm' ); chk( 'wallet: the empty name is flagged (' + await flagged( 'name' ) + ')', await flagged( 'name' ) === 'ok' ); }
chk( 'no page errors ' + errs.join( ';' ), ! errs.length );
console.log( 'ok', ok, 'fail', fail ); await b.close(); server.close(); process.exit( fail ? 1 : 0 );

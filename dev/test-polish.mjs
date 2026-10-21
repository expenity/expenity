import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd(), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer( ( q, r ) => { let f = path.join( root, decodeURIComponent( q.url.split( '?' )[ 0 ] ) ); if ( f.endsWith( '/' ) ) f += 'index.html'; fs.readFile( f, ( e, d ) => { if ( e ) { r.writeHead( 404 ); r.end(); } else { r.writeHead( 200, { 'content-type': types[ path.extname( f ) ] || 'application/octet-stream' } ); r.end( d ); } } ); } ).listen( 0 );
let ok = 0, fail = 0; const chk = ( n, c ) => { if ( c ) { ok++; console.log( 'ok', n ); } else { fail++; console.log( 'FAIL', n ); } };
const b = await chromium.launch( { channel: 'chrome' } ), base = `http://localhost:${ server.address().port }/index.html`;
let pg = await b.newPage( { viewport: { width: 390, height: 800 } } ); const errs = []; pg.on( 'pageerror', ( e ) => errs.push( e.message ) );
await pg.goto( base + '?demo=1' ); await pg.waitForFunction( () => document.documentElement.dataset.demoReady === '1', null, { timeout: 30000 } ); await pg.waitForTimeout( 1200 );
// the wallet share button says what it does
await pg.evaluate( () => { const a = EX.state().accounts[ 0 ]; EXA.openWallet( a.id ); } ); await pg.waitForTimeout( 600 );
chk( 'wallet: no "Share the love" in the wallet form', await pg.evaluate( () => ! /Share the love/i.test( document.getElementById( 'sheet' ).textContent ) ) );
await pg.evaluate( () => UI.closeSheet( true ) );
// snooze by swiping: only for bills due today or late
await pg.evaluate( () => { const S = EX.state(); S.bills.push( { id: 'late1', name: 'Late bill', amount: '10', category: 'other', next: EX.addDays( EX.today(), -2 ), repeat: 'once', currency: S.settings.currency, account: S.accounts[ 0 ].id } ); EX.save(); EXA.go( 'bills' ); } ); await pg.waitForTimeout( 700 );
chk( 'snooze: a late bill has a Snooze button on the left swipe', await pg.evaluate( () => !! document.querySelector( '.sw[data-id="late1"] .sw-l [data-sw="snooze"]' ) ) );
chk( 'snooze: a bill that is not due yet does not', await pg.evaluate( () => { const fut = EX.state().bills.filter( ( x ) => x.next > EX.today() ).map( ( x ) => x.id ), rows = [ ...document.querySelectorAll( '.sw[data-kind=bill]' ) ].filter( ( x ) => fut.includes( x.dataset.id ) ); return rows.length > 0 && rows.every( ( r ) => ! r.querySelector( '[data-sw="snooze"]' ) ); } ) );
await pg.evaluate( () => document.querySelector( '.sw[data-id="late1"]' ).dispatchEvent( new CustomEvent( 'swipeaction', { bubbles: true, detail: { action: 'snooze', id: 'late1', kind: 'bill' } } ) ) ); await pg.waitForTimeout( 600 );
chk( 'snooze: it snoozes for one day', await pg.evaluate( () => EX.state().bills.find( ( x ) => x.id === 'late1' ).snooze === EX.addDays( EX.today(), 1 ) ) );
await pg.evaluate( () => EXA.go( 'home' ) ); await pg.waitForTimeout( 600 );
chk( 'snooze: the snoozed bill leaves the Due soon list', await pg.evaluate( () => ! /Late bill/.test( ( document.querySelector( '[data-home=due]' ) || document.body ).textContent ) ) );
// a blinking cursor in the amount
await pg.evaluate( () => { EX.state().device.entryMode = 'casual'; EXA.openTx( null, { type: 'expense' } ); } ); await pg.waitForTimeout( 800 );
await pg.evaluate( () => document.querySelector( '[data-tx=target-amount]' ).click() ); await pg.waitForTimeout( 400 );
chk( 'amount: a blinking cursor shows while the keypad is open', await pg.evaluate( () => { const c = document.querySelector( '.amt-display.on .amt-caret' ); return !! c && getComputedStyle( c ).display !== 'none' && getComputedStyle( c ).animationName !== 'none'; } ) );
await pg.evaluate( () => UI.closeSheet( true ) );
chk( 'no page errors ' + errs.join( ';' ), ! errs.length ); await pg.close();
// the embedded demo ends at the plan
pg = await b.newPage( { viewport: { width: 420, height: 760 } } ); const e2 = []; pg.on( 'pageerror', ( e ) => e2.push( e.message ) );
await pg.goto( base + '?demo=1&ask=1&lang=en' ); await pg.waitForSelector( '.ef-cp', { timeout: 30000 } ); await pg.waitForSelector( '.ef-chipq', { timeout: 30000 } );
await pg.fill( '#efChatQ', 'laptop 900 in 2 weeks' ); await pg.evaluate( () => document.querySelector( '#efChatForm' ).requestSubmit() );
await pg.waitForSelector( '.ef-chipq.go', { timeout: 30000 } ); await pg.evaluate( () => document.querySelector( '.ef-chipq.go' ).click() ); await pg.waitForSelector( '#efRes', { timeout: 30000 } );
await pg.evaluate( () => document.querySelector( '[data-ef-askplan]' ).click() ); await pg.waitForSelector( '.ef-embed-end', { timeout: 10000 } );
chk( 'demo: making the plan ends the demo with an Open Expenity button', await pg.evaluate( () => !! document.querySelector( '.ef-embed-end a[target=_top]' ) && ! document.querySelector( '#efPlanForm' ) ) );
chk( 'demo: nothing of the app is reachable behind it (it covers the whole screen)', await pg.evaluate( () => { const r = document.querySelector( '.ef-embed-end' ).getBoundingClientRect(); return r.width >= innerWidth - 1 && r.height >= innerHeight - 1 && document.elementFromPoint( 10, 10 ).closest( '.ef-embed-end' ); } ) );
await pg.close();
pg = await b.newPage( { viewport: { width: 420, height: 760 } } ); await pg.goto( base + '?demo=1&ask=1&lang=en' ); await pg.waitForSelector( '.ef-cp', { timeout: 30000 } ); await pg.waitForSelector( '[data-ef-cpx]' );
await pg.evaluate( () => document.querySelector( '[data-ef-cpx]' ).click() );
chk( 'demo: closing the chat also ends the demo instead of showing the app', await pg.evaluate( () => !! document.querySelector( '.ef-embed-end' ) ) );
chk( 'no page errors ' + e2.join( ';' ), ! e2.length );
console.log( 'ok', ok, 'fail', fail ); await b.close(); server.close(); process.exit( fail ? 1 : 0 );

import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd(), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer( ( q, r ) => { let f = path.join( root, decodeURIComponent( q.url.split( '?' )[ 0 ] ) ); if ( f.endsWith( '/' ) ) f += 'index.html'; fs.readFile( f, ( e, d ) => { if ( e ) { r.writeHead( 404 ); r.end(); } else { r.writeHead( 200, { 'content-type': types[ path.extname( f ) ] || 'application/octet-stream' } ); r.end( d ); } } ); } ).listen( 0 );
const port = server.address().port; let ok = 0, fail = 0; const chk = ( n, c ) => { if ( c ) { ok++; console.log( 'ok', n ); } else { fail++; console.log( 'FAIL', n ); } };
const b = await chromium.launch( { channel: 'chrome' } ), pg = await b.newPage( { viewport: { width: 390, height: 800 } } ); const errs = []; pg.on( 'pageerror', ( e ) => errs.push( e.message ) );
await pg.addInitScript( () => { localStorage.setItem( 'expenity.lang', 'en' ); } );
await pg.goto( `http://localhost:${ port }/index.html` ); await pg.waitForFunction( () => window.EXA && EXA.flow );
await pg.evaluate( () => { const d = EX.state().device; d.langHinted = true; EX.state().settings.efInstant = true; d.stage = 'setup'; EXA.flow.show(); } ); await pg.waitForTimeout( 500 );
chk( 'the welcome page shows the logo, the language switch and both bots', await pg.evaluate( () => !! document.querySelector( '.ob-intro' ) && document.querySelectorAll( '[data-ob-lang]' ).length === 2 && document.querySelectorAll( '.ob-bot svg' ).length === 2 ) );
await pg.click( '[data-ob-lang=el]' ); await pg.waitForTimeout( 150 );
chk( 'switching to Greek translates the welcome page at once', await pg.evaluate( () => EX.lang() === 'el' && /Καλώς ήρθατε/.test( document.querySelector( '.ob-intro h1' ).textContent ) ) );
await pg.click( '[data-ob-lang=en]' ); await pg.waitForTimeout( 150 );
chk( 'and back to English', await pg.evaluate( () => EX.lang() === 'en' && /Welcome/.test( document.querySelector( '.ob-intro h1' ).textContent ) ) );
await pg.click( '[data-ob-go]' ); await pg.waitForSelector( '.ob-pick' );
chk( 'the picker follows the chosen language and has no Choose button yet', await pg.evaluate( () => /Choose your eFriend/.test( document.querySelector( '.ob-pick-title' ).textContent ) && document.querySelector( '#obChoose' ).hidden ) );
await pg.screenshot( { path: '/tmp/ob-pick.png' } );
await pg.focus( '#obH' ); await pg.keyboard.press( 'End' ); await pg.waitForTimeout( 200 );
chk( 'at the end the Choose button appears for Boogie', await pg.evaluate( () => ! document.querySelector( '#obChoose' ).hidden && document.querySelector( '#obChoose' ).dataset.pick === 'boogie' ) );
await pg.keyboard.press( 'Home' ); await pg.waitForTimeout( 200 );
chk( 'at the other end it offers Chip', await pg.evaluate( () => document.querySelector( '#obChoose' ).dataset.pick === 'chip' ) );
await pg.click( '#obChoose' ); await pg.waitForSelector( '#obChips [data-ob-chip]' );
chk( 'Chip was chosen and the chat starts with the name question', await pg.evaluate( () => EX.state().settings.efChar === 'chip' && /call you/.test( document.querySelector( '#obChat' ).textContent ) ) );
const chip = async ( i ) => { await pg.waitForSelector( '#obChips [data-ob-chip]' ); await pg.click( `#obChips [data-ob-chip="${ i }"]` ); await pg.waitForTimeout( 150 ); };
const type = async ( v ) => { await pg.waitForSelector( '#obForm:not([hidden]) input' ); await pg.fill( '#obForm input', v ); await pg.press( '#obForm input', 'Enter' ); await pg.waitForTimeout( 150 ); };
await type( 'Maria' ); await chip( 1 ); // USD
await type( '1500.5' ); await chip( 0 ); await chip( 1 ); // monthly, day 5
await pg.waitForSelector( '#obChips [data-ob-chip]' ); await chip( 0 ); await chip( 1 ); await chip( 8 ); // rent, electricity, done
await pg.waitForSelector( '#obBillForm' ); await pg.fill( '[name=a0]', '520' ); await pg.fill( '[name=a1]', '60' ); await pg.click( '#obBillForm button[type=submit]' ); await pg.waitForTimeout( 200 );
await chip( 0 ); await type( '2000' ); await chip( 0 ); await chip( 1 ); // trip 2000, careful, casual
await pg.waitForSelector( '#obSum', { timeout: 20000 } );
const r = await pg.evaluate( () => { const S = EX.state(); return { cur: S.settings.currency, name: S.settings.name, inc: S.incomes.map( ( x ) => x.amount + x.repeat ), bills: S.bills.map( ( b ) => b.name + b.amount ), goal: S.goals.map( ( g ) => g.name + g.target ), bud: S.budgets.length, cush: S.settings.efCushion, entry: EX.state().device.entryMode, rows: document.querySelectorAll( '.ob-sum-r' ).length }; } );

console.log( JSON.stringify( r ) ); chk( 'everything is created', r.cur === 'USD' && r.name === 'Maria' && r.inc[ 0 ] === '1500.5monthly' && r.bills.length === 2 && /Trip2000/.test( r.goal[ 0 ] ) && r.bud === 4 && r.cush === 2 && r.entry === 'casual' && r.rows === 9 );
await pg.screenshot( { path: '/tmp/ob-sum.png' } );
await pg.click( '[data-ob-rm=bud]' ); chk( 'the estimated budgets can be removed', await pg.evaluate( () => EX.state().budgets.length === 0 ) );
await pg.waitForSelector( '#obChips [data-ob-chip="1"]' ); await pg.click( '#obChips [data-ob-chip="1"]' ); await pg.waitForFunction( () => /20 seconds/.test( document.querySelector( '#obChat' ).textContent ) ); await pg.click( '#obChips [data-ob-chip="0"]' ); await pg.waitForTimeout( 700 );
chk( 'eFriend pitches the install page, then it shows before the app opens', await pg.evaluate( () => EX.state().device.stage === 'install' && EX.state().settings.setupDone === true && ! document.querySelector( '.ob-chat' ) && !! document.querySelector( '#flow [data-flow^=install]' ) ) );
chk( 'no page errors ' + errs.join( ';' ), ! errs.length );
console.log( ok + ' ok, ' + fail + ' failed' ); await b.close(); server.close(); process.exit( fail ? 1 : 0 );

import { chromium, devices } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd(), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer( ( q, r ) => { let f = path.join( root, decodeURIComponent( q.url.split( '?' )[ 0 ] ) ); if ( f.endsWith( '/' ) ) f += 'index.html'; fs.readFile( f, ( e, d ) => { if ( e ) { r.writeHead( 404 ); r.end(); } else { r.writeHead( 200, { 'content-type': types[ path.extname( f ) ] || 'application/octet-stream' } ); r.end( d ); } } ); } ).listen( 0 );
let ok = 0, fail = 0; const chk = ( n, c ) => { if ( c ) { ok++; console.log( 'ok', n ); } else { fail++; console.log( 'FAIL', n ); } };
const b = await chromium.launch( { channel: 'chrome' } );
const url = `http://localhost:${ server.address().port }/index.html`;
// a phone: no field may take focus by itself
let ctx = await b.newContext( { viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true } ), pg = await ctx.newPage();
await pg.addInitScript( () => { window.EXKB_TEST = true; } );
await pg.goto( url ); await pg.waitForFunction( () => window.EX && EX.efriend ); await pg.evaluate( () => { EXA.skipFlow(); } ); await pg.waitForTimeout( 1200 );
await pg.evaluate( () => EXA.efriendAskOpen() ); await pg.waitForSelector( '#efChatQ' ); await pg.waitForTimeout( 800 );
chk( 'phone: the chat opens without the keyboard', await pg.evaluate( () => document.activeElement.tagName !== 'INPUT' ) );
chk( 'phone: a script cannot focus a text field by itself', await pg.evaluate( () => { document.getElementById( 'efChatQ' ).focus(); return document.activeElement.tagName !== 'INPUT'; } ) );
chk( 'phone: autofocus is ignored', await pg.evaluate( async () => { const i = document.createElement( 'input' ); i.setAttribute( 'autofocus', '' ); document.body.appendChild( i ); await new Promise( ( r ) => setTimeout( r, 100 ) ); const ok = document.activeElement !== i && ! i.hasAttribute( 'autofocus' ); i.remove(); return ok; } ) );
await pg.tap( '#efChatQ' );
chk( 'phone: tapping the field opens it', await pg.evaluate( () => document.activeElement.id === 'efChatQ' ) );
chk( 'phone: code that keeps a typing person in the field can (EXKB.allow)', await pg.evaluate( () => { document.activeElement.blur(); EXKB.allow(); document.getElementById( 'efChatQ' ).focus(); return document.activeElement.id === 'efChatQ'; } ) );
await pg.evaluate( () => UI.closeSheet && UI.closeSheet( true ) );
await pg.evaluate( () => { document.querySelector( '[data-ef-cpx]' ) && document.querySelector( '[data-ef-cpx]' ).click(); } );
// a form sheet with autofocus
await pg.evaluate( () => EXA.openAdd && EXA.openAdd() ); await pg.waitForTimeout( 500 );
chk( 'phone: no field is focused when a sheet opens', await pg.evaluate( () => ! ( document.activeElement && /INPUT|TEXTAREA/.test( document.activeElement.tagName ) ) ) );
await ctx.close();
// a computer keeps focusing the chat field
ctx = await b.newContext( { viewport: { width: 1100, height: 800 } } ); pg = await ctx.newPage();
await pg.goto( url ); await pg.waitForFunction( () => window.EX && EX.efriend ); await pg.evaluate( () => { EXA.skipFlow(); Object.defineProperty( navigator, 'webdriver', { get: () => false } ); } ); await pg.waitForTimeout( 1200 );
await pg.evaluate( () => EXA.efriendAskOpen() ); await pg.waitForSelector( '.ef-chipq', { timeout: 30000 } );
chk( 'computer: the chat field is still focused for typing', await pg.evaluate( () => document.activeElement.id === 'efChatQ' ) );
await ctx.close();
console.log( 'ok', ok, 'fail', fail ); await b.close(); server.close(); process.exit( fail ? 1 : 0 );

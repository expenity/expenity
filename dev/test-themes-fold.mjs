import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd(), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer( ( q, r ) => { let f = path.join( root, decodeURIComponent( q.url.split( '?' )[ 0 ] ) ); if ( f.endsWith( '/' ) ) f += 'index.html'; fs.readFile( f, ( e, d ) => { if ( e ) { r.writeHead( 404 ); r.end(); } else { r.writeHead( 200, { 'content-type': types[ path.extname( f ) ] || 'application/octet-stream' } ); r.end( d ); } } ); } ).listen( 0 );
let ok = 0, fail = 0; const chk = ( n, c ) => { if ( c ) { ok++; console.log( 'ok', n ); } else { fail++; console.log( 'FAIL', n ); } };
const b = await chromium.launch( { channel: 'chrome' } ), pg = await b.newPage( { viewport: { width: 390, height: 800 } } ); const errs = []; pg.on( 'pageerror', ( e ) => errs.push( e.message ) );
await pg.goto( `http://localhost:${ server.address().port }/index.html?demo=1` ); await pg.waitForFunction( () => document.documentElement.dataset.demoReady === '1', null, { timeout: 30000 } ); await pg.waitForTimeout( 1200 );
await pg.evaluate( () => { document.body.insertAdjacentHTML( 'beforeend', '<div id="tp" style="position:fixed;inset:0;z-index:99999;background:#fff;overflow:auto;padding:16px">' + EXA.themePicker() + '</div>' ); } );
const vis = () => pg.evaluate( () => [ ...document.querySelectorAll( '#tp .theme-cell' ) ].filter( ( c ) => c.offsetParent !== null ).length );
const total = await pg.evaluate( () => document.querySelectorAll( '#tp .theme-cell' ).length );
chk( 'only four themes show at first (of ' + total + ')', await vis() === 4 && total > 4 );
chk( 'a button offers all of them', await pg.evaluate( () => !! document.querySelector( '#tp [data-themes-toggle]' ) ) );
await pg.click( '#tp [data-themes-toggle]' ); chk( 'it expands to every theme', await vis() === total );
await pg.click( '#tp [data-themes-toggle]' ); chk( 'and folds back', await vis() === 4 );
// the current theme is always among the visible ones
await pg.evaluate( () => { const last = [ ...document.querySelectorAll( '#tp [data-skin-set]' ) ].pop().dataset.skinSet; EXA.setSkin( last ); document.getElementById( 'tp' ).innerHTML = EXA.themePicker(); } );
chk( 'the theme in use stays visible even if it is far down the list', await pg.evaluate( () => { const c = document.querySelector( '#tp .theme-card.on' ); return !! c && c.closest( '.theme-cell' ).offsetParent !== null; } ) );
// calmer motion
await pg.evaluate( () => { document.getElementById( 'tp' ).remove(); EXA.setSkin( 'emerald' ); EXA.updateAmbient && EXA.updateAmbient( true ); } ); await pg.waitForTimeout( 400 );
chk( 'the default theme has only a few leaves', await pg.evaluate( () => { const a = document.querySelector( '.ambient-emerald' ); return !! a && a.children.length <= 4; } ) );
chk( 'no page errors ' + errs.join( ';' ), ! errs.length );
console.log( 'ok', ok, 'fail', fail ); await b.close(); server.close(); process.exit( fail ? 1 : 0 );

import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd(), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer( ( q, r ) => { let f = path.join( root, decodeURIComponent( q.url.split( '?' )[ 0 ] ) ); if ( f.endsWith( '/' ) ) f += 'index.html'; fs.readFile( f, ( e, d ) => { if ( e ) { r.writeHead( 404 ); r.end(); } else { r.writeHead( 200, { 'content-type': types[ path.extname( f ) ] || 'application/octet-stream' } ); r.end( d ); } } ); } ).listen( 0 );
const port = server.address().port; let ok = 0, fail = 0; const chk = ( n, c ) => { if ( c ) { ok++; console.log( 'ok', n ); } else { fail++; console.log( 'FAIL', n ); } };
const b = await chromium.launch( { channel: 'chrome' } ), pg = await b.newPage( { viewport: { width: 390, height: 800 } } ); const errs = []; pg.on( 'pageerror', ( e ) => errs.push( e.message ) );
await pg.goto( `http://localhost:${ port }/index.html` ); await pg.waitForFunction( () => window.EX && EX.efriend );
await pg.evaluate( () => { const S = EX.state(); S.settings.onboarded = true; EX.setLang( 'en' ); S.device.efOnboard = 1; EXA.skipFlow && ( EXA.skipFlow(), EX.state().device.entryMode = 'casual' ); } );
await pg.evaluate( () => { const S = EX.state(); S.settings.onboarded = true; EX.setLang( 'en' ); S.device.efOnboard = 1; EXA.skipFlow && ( EXA.skipFlow(), EX.state().device.entryMode = 'casual' ); EXA.st.view = 'more'; EXA.st.more = 'efriend'; EXA.st.efSub = 'look'; EXA.render(); } ); await pg.waitForTimeout( 300 );
const css = ( v ) => pg.evaluate( ( v ) => getComputedStyle( document.documentElement ).getPropertyValue( v ).trim(), v );
const stored = () => pg.evaluate( () => { for ( const k of Object.keys( localStorage ) ) { try { const j = JSON.parse( localStorage[ k ] ); if ( j && j.settings ) return j.settings.efChip || null; } catch ( e ) { /* not ours */ } } return 'none'; } );
chk( 'both friends have a gear', await pg.evaluate( () => document.querySelectorAll( '[data-ef-gear]' ).length === 2 && !! document.querySelector( '[data-ef-gear=chip]' ) ) );
await pg.click( '[data-ef-gear=chip]' ); await pg.waitForTimeout( 300 );
chk( 'Chip gear opens a full page with Chip, three colour rows, a slider and Save', await pg.evaluate( () => document.querySelectorAll( '#sheet [data-chip-part]' ).length === 3 && !! document.querySelector( '#sheet [data-chip-i]' ) && !! document.querySelector( '#sheet [data-chip-save]' ) && !! document.querySelector( '#sheet .ef-mascot' ) && document.querySelector( '#sheet' ).classList.contains( 'ef-lightfull' ) ) );
await pg.click( '#sheet [data-chip-part=e] [data-chip-color="#b79cff"]' ); await pg.click( '#sheet [data-chip-part=r] [data-chip-color="#6cb4ff"]' ); await pg.waitForTimeout( 200 );
chk( 'parts take their own colours live, nothing stored yet', ( await css( '--chip-eye' ) ) === '#b79cff' && ( await css( '--chip-mouth' ) ) === '#9ff3e6' && ( await css( '--chip-ear' ) ) !== '#0f766e' && ( await stored() ) === null );
await pg.evaluate( () => { const r = document.querySelector( '#sheet [data-chip-i]' ); r.value = 100; r.dispatchEvent( new Event( 'input', { bubbles: true } ) ); } );
chk( 'the slider sets the glow, and the eyes really draw in the chosen colour', ( await css( '--chip-glow' ) ) === '1.00' && await pg.evaluate( () => { const e = document.querySelector( '#sheet .ef-eyes .ef-ce' ); const cs = getComputedStyle( e ); return [ cs.stroke, cs.fill ].some( ( c ) => c === 'rgb(183, 156, 255)' ); } ) );
await pg.click( '#sheet [data-chip-all]', { force: true } ); await pg.waitForTimeout( 200 );
chk( 'Match all collapses to one row and copies the eye colour to mouth and ears', await pg.evaluate( () => document.querySelectorAll( '#sheet [data-chip-part]' ).length === 1 ) && ( await css( '--chip-mouth' ) ) === '#b79cff' );
await pg.click( '#sheet [data-chip-color="#b8f23a"]' ); await pg.waitForTimeout( 150 );
chk( 'with Match all one tap colours everything', ( await css( '--chip-eye' ) ) === '#b8f23a' && ( await css( '--chip-mouth' ) ) === '#b8f23a' );
await pg.evaluate( () => document.querySelector( '#sheet [data-close]' ).click() ); await pg.waitForTimeout( 400 );
chk( 'the X puts Chip back', ( await css( '--chip-eye' ) ) === '#9ff3e6' && ( await css( '--chip-glow' ) ) === '0.60' && ( await stored() ) === null );
await pg.click( '[data-ef-gear=chip]' ); await pg.waitForTimeout( 300 );
await pg.click( '#sheet [data-chip-part=e] [data-chip-color="#ff8fc8"]' ); await pg.click( '#sheet [data-chip-save]' ); await pg.waitForTimeout( 500 );
const st = await stored();
chk( 'Save keeps it everywhere', ( await css( '--chip-eye' ) ) === '#ff8fc8' && st && st.e === '#ff8fc8' && JSON.stringify( st ).length < 120 && ! ( await pg.evaluate( () => document.querySelector( '#sheet' ).open ) ) );
for ( const [ w, h ] of [ [ 360, 640 ], [ 412, 735 ] ] ) for ( const lang of [ 'en', 'el' ] ) { await pg.setViewportSize( { width: w, height: h } ); await pg.evaluate( ( l ) => { EX.setLang( l ); EXA.render(); document.querySelector( '[data-ef-gear=chip]' ).click(); }, lang ); await pg.waitForTimeout( 250 );
	chk( `layout ${ w }x${ h } ${ lang }`, await pg.evaluate( () => { const b = document.querySelector( '#sheet .sheet-pad' ); return document.documentElement.scrollWidth <= innerWidth && b.scrollWidth <= b.clientWidth + 1 && ! /\bef[A-Z][A-Za-z]+\b/.test( document.querySelector( '#sheet' ).textContent ); } ) );
	await pg.evaluate( () => document.querySelector( '#sheet [data-close]' ).click() ); await pg.waitForTimeout( 250 ); }
// the gear pages fit the screen: no scrolling, for both friends, both languages, small and large phones
for ( const [ w, h ] of [ [ 360, 640 ], [ 390, 700 ], [ 412, 735 ], [ 390, 844 ] ] ) for ( const lang of [ 'en', 'el' ] ) for ( const who of [ 'chip', 'boogie' ] ) { await pg.setViewportSize( { width: w, height: h } ); await pg.evaluate( ( [ l, g ] ) => { EX.setLang( l ); EXA.render(); document.querySelector( g === 'chip' ? '[data-ef-gear=chip]' : '[data-ef-gear]:not([data-ef-gear=chip])' ).click(); }, [ lang, who ] ); await pg.waitForTimeout( 300 );
	const fit = await pg.evaluate( () => { const sc = document.querySelector( '#sheet .sheet-scroll' ); const sv = document.querySelector( '#sheet .ef-lightart svg' ).getBoundingClientRect(); return { over: sc.scrollHeight - sc.clientHeight, art: Math.round( sv.height ) }; } );
	chk( `no scrolling on the ${ who } page at ${ w }x${ h } ${ lang } (overflow ${ fit.over }px, picture ${ fit.art }px)`, fit.over <= 1 );
	await pg.evaluate( () => document.querySelector( '#sheet [data-close]' ).click() ); await pg.waitForTimeout( 250 ); }
chk( 'no page errors ' + errs.join( ';' ), ! errs.length );
console.log( ok + ' ok, ' + fail + ' failed' ); await b.close(); server.close(); process.exit( fail ? 1 : 0 );

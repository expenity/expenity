import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd(), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer( ( q, r ) => { let f = path.join( root, decodeURIComponent( q.url.split( '?' )[ 0 ] ) ); if ( f.endsWith( '/' ) ) f += 'index.html'; fs.readFile( f, ( e, d ) => { if ( e ) { r.writeHead( 404 ); r.end(); } else { r.writeHead( 200, { 'content-type': types[ path.extname( f ) ] || 'application/octet-stream' } ); r.end( d ); } } ); } ).listen( 0 );
const port = server.address().port; let ok = 0, fail = 0; const chk = ( n, c ) => { if ( c ) { ok++; console.log( 'ok', n ); } else { fail++; console.log( 'FAIL', n ); } };

const b = await chromium.launch( { channel: 'chrome' } );
const legacy = () => ( { ef: !! document.querySelector( '.ef-ob' ), tour: !! document.querySelector( '.tt' ), welcome: !! document.querySelector( '#flowRegister' ), wiz: !! document.querySelector( '#setupForm' ) } );
const open = async ( lang, vp, state ) => {
	const pg = await ( await b.newContext( { viewport: vp } ) ).newPage();
	await pg.addInitScript( ( [ l, st ] ) => { Object.defineProperty( navigator, 'webdriver', { get: () => false } ); if ( ! sessionStorage.getItem( 'seeded' ) ) { sessionStorage.setItem( 'seeded', 1 ); localStorage.setItem( 'expenity.lang', l ); if ( st ) localStorage.setItem( 'expenity.v2', JSON.stringify( st ) ); } }, [ lang, state ] );
	await pg.goto( `http://localhost:${ port }/index.html` ); await pg.waitForFunction( () => window.EXA && EXA.flow ); await pg.waitForTimeout( 1500 ); return pg;
};
for ( const [ lang, vp ] of [ [ 'en', { width: 390, height: 800 } ], [ 'el', { width: 1200, height: 800 } ] ] ) {
	let pg = await open( lang, vp );
	chk( lang + ' fresh: only the new welcome shows', await pg.evaluate( () => { const d = EX.state().device; return d.stage === 'setup' && !! document.querySelector( '.ob-intro' ); } ) && ! Object.values( await pg.evaluate( legacy ) ).some( Boolean ) );
	await pg.click( '[data-ob-go]' ); await pg.waitForSelector( '[data-ob-skip]', { state: 'attached' } ).catch( () => {} );
	await pg.evaluate( () => EXA.onboard.show && 0 );
	await pg.focus( '#obH' ); await pg.keyboard.press( 'End' ); await pg.click( '#obChoose' ); await pg.waitForSelector( '[data-ob-skip]' ); await pg.click( '[data-ob-skip]' ); await pg.waitForTimeout( 2500 );
	chk( lang + ' skip: app opens, no tour, no old eFriend intro', await pg.evaluate( () => { const d = EX.state().device; return d.stage === 'done' && d.efOnboard === 1 && d.tourDone === true; } ) && ! Object.values( await pg.evaluate( legacy ) ).some( Boolean ) );
	await pg.reload(); await pg.waitForTimeout( 2500 );
	chk( lang + ' finished user: nothing after a reload', await pg.evaluate( () => EX.state().device.stage === 'done' ) && ! Object.values( await pg.evaluate( legacy ) ).some( Boolean ) );
	await pg.context().close();
	pg = await open( lang, vp, { bills: [], txs: [], accounts: [], categories: [], budgets: [], goals: [], incomes: [], settings: { currency: 'EUR', setupDone: true }, device: { stage: 'done', onboarded: true }, sync: { rev: 0, base: {}, spaces: {} } } );
	chk( lang + ' returning user (old data, no flags): no onboarding at all', ! Object.values( await pg.evaluate( legacy ) ).some( Boolean ) );
	await pg.context().close();
	pg = await open( lang, vp, { bills: [], txs: [], accounts: [], categories: [], budgets: [], goals: [], incomes: [], settings: { currency: 'EUR' }, device: { stage: 'welcome' }, sync: { rev: 0, base: {}, spaces: {} } } );
	chk( lang + ' stale classic welcome stage moves to the new flow', await pg.evaluate( () => EX.state().device.stage === 'setup' && ! document.querySelector( '#flowRegister' ) ) );
	await pg.context().close();
}
console.log( ok + ' ok, ' + fail + ' failed' ); await b.close(); server.close(); process.exit( fail ? 1 : 0 );

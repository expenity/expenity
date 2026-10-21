// Critical tests for the eFriend Blog (release 1): facts, claim accuracy, stability, gentle/kind, gating, layout.
import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd(), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer( ( q, r ) => { let f = path.join( root, decodeURIComponent( q.url.split( '?' )[ 0 ] ) ); if ( f.endsWith( '/' ) ) f += 'index.html'; fs.readFile( f, ( e, d ) => { if ( e ) { r.writeHead( 404 ); r.end(); } else { r.writeHead( 200, { 'content-type': types[ path.extname( f ) ] || 'application/octet-stream' } ); r.end( d ); } } ); } ).listen( 0 );
const port = server.address().port; let ok = 0, fail = 0; const chk = ( n, c ) => { if ( c ) { ok++; console.log( 'ok', n ); } else { fail++; console.log( 'FAIL', n ); } };
const b = await chromium.launch( { channel: 'chrome' } ), pg = await b.newPage( { viewport: { width: 390, height: 800 } } ); const errs = []; pg.on( 'pageerror', ( e ) => errs.push( e.message ) );
await pg.goto( `http://localhost:${ port }/index.html` ); await pg.waitForFunction( () => window.EX && EX.efriend && EXA.efblog );
await pg.evaluate( () => { const S = EX.state(); S.settings.onboarded = true; S.device.langHinted = true; S.device.efOnboard = 1; EX.setLang( 'en' ); } );

// Synthetic data: n entries over `days` days ending today.
await pg.evaluate( () => {
	const E = EXA.efblog;
	window.mk = ( n, days, o = {} ) => { const cats = o.cats || [ 'food', 'transport', 'leisure', 'shopping' ], out = []; const td = EX.today();
		for ( let i = 0; i < n; i++ ) out.push( { id: 't' + i, type: o.type || 'expense', amount: String( 5 + ( i % 7 ) ), category: cats[ i % cats.length ], date: EX.addDays( td, -Math.floor( ( n - 1 - i ) * days / Math.max( 1, n - 1 ) ) ), name: i === 0 ? 'Coffee' : '' } );
		return out; };
	window.all = ( txs, o = {} ) => E.CHAPTERS.map( ( c ) => [ c.id, E.render( c.id, E.facts( txs, EX.today() ), { char: 'boogie', lang: 'en', gentle: false, kind: false, ...o } ) ] );
} );
const td = await pg.evaluate( () => EX.today() );

// 1. Facts engine
const thin = await pg.evaluate( () => { const f = EXA.efblog.facts( mk( 5, 4, { cats: [ 'food' ] } ), EX.today() ); return { f, ready: EXA.efblog.CHAPTERS.map( ( c ) => c.ready( f ) ) }; } );
chk( 'thin data: 5 entries, one category => only chapter 1 ready, no top-3 gaps crash', thin.f.n === 5 && thin.f.cats === 1 && thin.ready.join() === 'true,false,false' );
const heavy = await pg.evaluate( () => { const f = EXA.efblog.facts( mk( 120, 90 ), EX.today() ); return { f, ready: EXA.efblog.CHAPTERS.map( ( c ) => c.ready( f ) ), fin: EXA.efblog.finished( f ) }; } );
chk( 'heavy data: all chapters ready, shares present, finished', heavy.ready.every( Boolean ) && heavy.f.t3p != null && heavy.fin && heavy.f.wdi != null );
const inc = await pg.evaluate( () => { const f = EXA.efblog.facts( mk( 12, 20, { type: 'income', cats: [ 'salary' ] } ), EX.today() ); return { f, txt: window.all( mk( 12, 20, { type: 'income', cats: [ 'salary' ] } ) ).flatMap( ( x ) => x[ 1 ] ).map( ( l ) => l.text ).join( ' ' ) }; } );
chk( 'only income: no expense facts, chapter 1 only, no crash', inc.f.ne === 0 && inc.f.t1k === undefined && ! /\{/.test( inc.txt ) );
const bills = await pg.evaluate( () => { const f = EXA.efblog.facts( [], EX.today() ); return { f, kind: EXA.efblog.kind( [ { next: '2000-01-01' } ], [], EX.today() ) }; } );
chk( 'no entries (only bills): empty facts, nothing written', bills.f.n === 0 && ! bills.kind );

// 2. Claim accuracy
const acc = await pg.evaluate( () => { const txs = mk( 80, 60 ), f = EXA.efblog.facts( txs, EX.today() ), res = [];
	const ex = txs.filter( ( x ) => x.type === 'expense' ), by = {}; let tot = 0; ex.forEach( ( x ) => { by[ x.category ] = ( by[ x.category ] || 0 ) + Number( x.amount ); tot += Number( x.amount ); } );
	const top = Object.keys( by ).sort( ( a, b ) => by[ b ] - by[ a ] )[ 0 ]; res.push( f.t1k === top && f.t1p === Math.round( by[ top ] / tot * 100 ) && f.ne === ex.length && f.n === txs.length );
	const lines = window.all( txs ).flatMap( ( x ) => x[ 1 ] ).map( ( l ) => l.text );
	res.push( lines.every( ( l ) => ! /[{}]/.test( l ) ) ); res.push( lines.some( ( l ) => l.includes( '**' + f.t1p + '%**' ) ) ); res.push( lines.some( ( l ) => l.includes( String( f.ne ) ) ) );
	// a sentence is never written when its facts are missing: thin data has no second category
	const one = window.all( mk( 25, 10, { cats: [ 'food' ] } ) ).flatMap( ( x ) => x[ 1 ] ).map( ( l ) => l.text );
	res.push( ! one.some( ( l ) => /Second place|Third place/.test( l ) ) );
	return res; } );
chk( 'facts match the data; every line fully filled; thin data skips second/third place', acc.every( Boolean ) );

// 3. Stability and persona/language
const stab = await pg.evaluate( () => { const txs = mk( 80, 60 ), a = JSON.stringify( window.all( txs ) ), b2 = JSON.stringify( window.all( txs ) ), f1 = JSON.stringify( EXA.efblog.facts( txs, EX.today() ) );
	const chip = JSON.stringify( window.all( txs, { char: 'chip' } ) ), el = JSON.stringify( window.all( txs, { lang: 'el' } ) ), f2 = JSON.stringify( EXA.efblog.facts( txs, EX.today() ) );
	const nl = ( s ) => JSON.parse( s ).map( ( x ) => x[ 1 ].length ).join();
	return { same: a === b2, diffChip: a !== chip, diffEl: a !== el, facts: f1 === f2, sameLines: nl( a ) === nl( chip ) && nl( a ) === nl( el ) }; } );
chk( 'same data+seed => identical text; Chip and Greek change wording, not facts or the number of lines', stab.same && stab.diffChip && stab.diffEl && stab.facts && stab.sameLines );

// 4. Gentle and kind
const gk = await pg.evaluate( () => { const txs = mk( 80, 60 ); const fun = window.all( txs ), gen = window.all( txs, { gentle: true } ), res = [];
	fun.forEach( ( [ id, l ], i ) => { res.push( JSON.stringify( l.filter( ( x ) => ! x.roast ) ) === JSON.stringify( gen[ i ][ 1 ] ) ); } );
	res.push( fun.flatMap( ( x ) => x[ 1 ] ).some( ( l ) => l.roast ) && ! gen.flatMap( ( x ) => x[ 1 ] ).some( ( l ) => l.roast ) );
	const hard = window.all( mk( 40, 30, { cats: [ 'insurance' ] } ) ).flatMap( ( x ) => x[ 1 ] ); res.push( ! hard.some( ( l ) => l.roast && /insurance|Insurance/i.test( l.text ) ) && ! window.all( mk( 40, 30, { cats: [ 'health', 'loans' ] } ) )[ 1 ][ 1 ].some( ( l ) => l.roast ) );
	const late = Array.from( { length: 3 }, ( _, i ) => ( { next: '2000-01-0' + ( i + 1 ) } ) ); res.push( EXA.efblog.kind( late, [], EX.today() ) && ! EXA.efblog.kind( late.slice( 0, 2 ), [ 5 ], EX.today() ) && EXA.efblog.kind( [], [ -1 ], EX.today() ) );
	const kd = window.all( txs, { kind: true } ); const money = kd.filter( ( x ) => x[ 0 ] !== 'first' ).flatMap( ( x ) => x[ 1 ] ); res.push( ! money.some( ( l ) => l.roast ) && money.some( ( l ) => l.kind ) );
	return res; } );
chk( 'gentle drops exactly the roast lines; hard topics never teased; kindness guard triggers and softens', gk.every( Boolean ) );

// 5. Gating (real state, real page)
const gate = async ( n, days, expect ) => pg.evaluate( ( [ n, days ] ) => { const S = EX.state(); S.txs = mk( n, days ); S.settings.efBlog = { c: [], gentle: 0 }; S.device.efbSeen = []; EXA.efblog.update(); const s = EXA.efblog.status(); return { locked: s.locked, fin: s.finished, w: s.written.length }; }, [ n, days ] );
let g = await gate( 8, 5 ); chk( 'day 5: locked, chapter 1 already written in the background', g.locked && g.w === 1 );
g = await gate( 25, 12 ); chk( 'day 12: sneak peek open, chapters 1-2 written', ! g.locked && g.w === 2 && ! g.fin );
g = await gate( 100, 20 ); chk( '100 entries: finished', g.fin );
g = await gate( 45, 62 ); chk( '60 days + 40 entries: finished', g.fin );
g = await gate( 45, 40 ); chk( '40 days + 45 entries: not finished', ! g.fin );

// 6. Layout, both sizes, both languages, both friends, locked and open
for ( const [ w, h ] of [ [ 360, 640 ], [ 412, 735 ] ] ) for ( const lang of [ 'en', 'el' ] ) for ( const ch of [ 'boogie', 'chip' ] ) for ( const mode of [ 'locked', 'open' ] ) {
	await pg.setViewportSize( { width: w, height: h } );
	await pg.evaluate( ( [ lang, ch, mode ] ) => { const S = EX.state(); EX.setLang( lang ); S.settings.efChar = ch; S.txs = mk( 40, mode === 'locked' ? 4 : 40 ); S.settings.efBlog = { c: [], gentle: 0 }; S.device.efbSeen = []; EXA.st.efbCh = ''; EXA.st.view = 'more'; EXA.st.more = 'efblog'; EXA.render(); }, [ lang, ch, mode ] ); await pg.waitForTimeout( 150 );
	const r = await pg.evaluate( () => { const e = document.querySelector( '.efb' ); return { page: document.documentElement.scrollWidth <= innerWidth, box: !! e && e.scrollWidth <= e.clientWidth + 1, raw: /\befb[A-Z]\w+|\{\w+\}/.test( document.querySelector( '#view' ).textContent ) }; } );
	chk( `layout ${ w }x${ h } ${ lang } ${ ch } ${ mode }`, r.page && r.box && ! r.raw );
}
// Home card, More row + badge, gentle switch end to end
await pg.setViewportSize( { width: 390, height: 800 } );
const ui = await pg.evaluate( async () => { const S = EX.state(); EX.setLang( 'en' ); S.settings.efChar = 'boogie'; S.txs = mk( 40, 40 ); S.settings.efBlog = { c: [], gentle: 0 }; S.device.efbSeen = []; EXA.st.view = 'home'; EXA.render(); const card = !! document.querySelector( '.efb-card' );
	EXA.st.view = 'more'; EXA.st.more = 'root'; EXA.render(); const badge = !! document.querySelector( '.mrow[data-more=efblog] .efb-badge' );
	EXA.st.more = 'efblog'; EXA.render(); const roastOn = document.querySelectorAll( '.efb-roast' ).length; const sw = document.querySelector( '[data-efb-gentle]' ); sw.click(); await new Promise( ( r ) => setTimeout( r, 200 ) );
	return { card, badge, roastOn, gentle: S.settings.efBlog.gentle, roastOff: document.querySelectorAll( '.efb-roast' ).length, small: JSON.stringify( S.settings.efBlog ).length }; } );
console.log( JSON.stringify( ui ) ); chk( 'Home card, More row with badge, gentle switch removes roast lines, record stays tiny (' + ui.small + ' chars)', ui.card && ui.badge && ui.roastOn > 0 && ui.gentle === 1 && ui.roastOff === 0 && ui.small < 400 );
chk( 'no page errors ' + errs.join( ';' ), ! errs.length );
console.log( ok + ' ok, ' + fail + ' failed' ); await b.close(); server.close(); process.exit( fail ? 1 : 0 );

// Nothing may go beyond the screen on a phone: every main screen and sheet is measured at three Android widths.
import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd(), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer( ( q, r ) => { let f = path.join( root, decodeURIComponent( q.url.split( '?' )[ 0 ] ) ); if ( f.endsWith( '/' ) ) f += 'index.html'; fs.readFile( f, ( e, d ) => { if ( e ) { r.writeHead( 404 ); r.end(); } else { r.writeHead( 200, { 'content-type': types[ path.extname( f ) ] || 'application/octet-stream' } ); r.end( d ); } } ); } ).listen( 0 );
let ok = 0, fail = 0; const bad = [];
const b = await chromium.launch( { channel: 'chrome' } );
const measure = () => {
	const W = innerWidth, out = [];
	const clipped = ( el ) => { for ( let p = el.parentElement; p; p = p.parentElement ) { const o = getComputedStyle( p ).overflowX; if ( o !== 'visible' ) { const r = p.getBoundingClientRect(); if ( r.right <= W + 1 && r.left >= -1 ) return true; } } return false; };
	document.querySelectorAll( 'body *' ).forEach( ( el ) => {
		const cs = getComputedStyle( el ); if ( cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed' && ! el.closest( 'dialog[open], .ef-cp' ) ) return;
		if ( el.closest( 'svg' ) && el.tagName !== 'svg' ) return; if ( el.closest( '[hidden], .efp-bg, #toast' ) ) return;
		const r = el.getBoundingClientRect(); if ( r.width < 2 || r.height < 2 ) return;
		if ( ( r.right > W + 1 || r.left < -1 ) && ! clipped( el ) ) out.push( ( el.id ? '#' + el.id : '' ) + '.' + String( el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className ).trim().split( /\s+/ ).slice( 0, 2 ).join( '.' ) + ' <' + el.tagName.toLowerCase() + '> ' + Math.round( r.left ) + '..' + Math.round( r.right ) );
	} );
	// a container that scrolls sideways by accident (not a tab strip or similar) hides content from the person
	document.querySelectorAll( 'body *' ).forEach( ( el ) => {
		const cs = getComputedStyle( el ); if ( ! /(auto|scroll)/.test( cs.overflowX ) || el.scrollWidth <= el.clientWidth + 1 || cs.display === 'none' ) return;
		const cls = String( el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className ); if ( /tab|chip|strip|seg|pill|scroll-x|carousel|swiper|table|reel|gallery|cal-wd/i.test( cls ) || el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.tagName === 'PRE' || el.tagName === 'TABLE' || el.closest( 'table' ) ) return;
		const r = el.getBoundingClientRect(); if ( r.width < 2 ) return; out.push( 'SCROLLS SIDEWAYS: ' + cls.trim().split( /\s+/ ).slice( 0, 2 ).join( '.' ) + ' <' + el.tagName.toLowerCase() + '> ' + el.scrollWidth + '>' + el.clientWidth );
	} );
	return { page: document.documentElement.scrollWidth > W + 1, out: [ ...new Set( out ) ].slice( 0, 6 ) };
};
for ( const [ w, scale ] of [ [ 320, 100 ], [ 360, 100 ], [ 412, 100 ], [ 360, 130 ], [ 412, 150 ] ] ) {
	for ( const lang of [ 'en', 'el' ] ) {
		const ctx = await b.newContext( { viewport: { width: w, height: 780 }, isMobile: true, hasTouch: true } ), pg = await ctx.newPage();
		await pg.goto( `http://localhost:${ server.address().port }/index.html?demo=1&lang=${ lang }` ); await pg.waitForFunction( () => document.documentElement.dataset.demoReady === '1', null, { timeout: 30000 } ); await pg.waitForTimeout( 1500 );
		if ( scale !== 100 ) await pg.addStyleTag( { content: `html { font-size: ${ scale }% !important; -webkit-text-size-adjust: ${ scale }%; text-size-adjust: ${ scale }%; } body, input, button, select, textarea { font-size: ${ scale }%; }` } );
		const screens = [
			[ 'home', () => EXA.go( 'home' ) ], [ 'activity', () => EXA.go( 'activity' ) ], [ 'bills', () => EXA.go( 'bills' ) ], [ 'plan', () => EXA.go( 'plan' ) ], [ 'more', () => EXA.go( 'more' ) ],
			[ 'reports', () => { EXA.st.view = 'reports'; EXA.render(); } ], [ 'efriend page', () => { EXA.st.view = 'more'; EXA.st.more = 'efriend'; EXA.render(); } ],
			[ 'add menu', () => EXA.openAdd() ], [ 'expense form', () => EXA.openTx( null, { type: 'expense' } ) ], [ 'bill form', () => EXA.openBill() ], [ 'plan form', () => EXA.openEfPlan( null, { name: 'Bike', target: '500' } ) ],
			[ 'eFriend analysis', () => { const g = EX.efriend.plans()[ 0 ]; if ( g ) EXA.openEfriend( g.id ); else EXA.openEfPlan( null, { name: 'Trip', target: '800' } ); } ],
			[ 'chat', () => EXA.efriendAskOpen() ],
			[ 'chat with the form', async () => { EXA.efriendAskOpen(); await new Promise( ( r ) => setTimeout( r, 900 ) ); document.querySelector( '[data-ef-skip]' ).click(); } ],
			[ 'chat with More open', async () => { EXA.efriendAskOpen(); await new Promise( ( r ) => setTimeout( r, 900 ) ); const m = document.querySelector( '.ef-chipq.more' ); if ( m ) m.click(); } ],
			[ 'chat result', async () => { EXA.efriendAskOpen( { text: 'laptop 900 in 2 weeks' } ); await new Promise( ( r ) => setTimeout( r, 1500 ) ); const y = document.querySelector( '.ef-chipq.go' ); if ( y ) y.click(); await new Promise( ( r ) => setTimeout( r, 1500 ) ); } ], [ 'chat history', () => EXA.efriendAskOpen( { hist: true } ) ],
		];
		for ( const [ name, fn ] of screens ) {
			await pg.evaluate( () => { document.querySelectorAll( '.ef-cp,.ef-ob' ).forEach( ( x ) => x.remove() ); document.body.classList.remove( 'ef-ob-open' ); UI.closeSheet && UI.closeSheet( true ); } ); await pg.waitForTimeout( 250 );
			await pg.evaluate( fn ); await pg.waitForTimeout( name.startsWith( 'chat' ) ? 2600 : 700 );
			const m = await pg.evaluate( measure ), good = ! m.page && ! m.out.length;
			if ( good ) ok++; else { fail++; bad.push( `${ w }px@${ scale }% ${ lang } ${ name }: ${ m.page ? 'PAGE SCROLLS SIDEWAYS ' : '' }${ m.out.join( ' | ' ) }` ); }
		}
		await ctx.close();
	}
}
bad.forEach( ( x ) => console.log( 'FAIL', x ) ); console.log( 'ok', ok, 'fail', fail ); await b.close(); server.close(); process.exit( fail ? 1 : 0 );

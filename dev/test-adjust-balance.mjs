import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd(), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer( ( q, r ) => { let f = path.join( root, decodeURIComponent( q.url.split( '?' )[ 0 ] ) ); if ( f.endsWith( '/' ) ) f += 'index.html'; fs.readFile( f, ( e, d ) => { if ( e ) { r.writeHead( 404 ); r.end(); } else { r.writeHead( 200, { 'content-type': types[ path.extname( f ) ] || 'application/octet-stream' } ); r.end( d ); } } ); } ).listen( 0 );
const port = server.address().port; let ok = 0, fail = 0; const chk = ( n, c ) => { if ( c ) { ok++; console.log( 'ok', n ); } else { fail++; console.log( 'FAIL', n ); } };
const b = await chromium.launch( { channel: 'chrome' } ), pg = await b.newPage( { viewport: { width: 390, height: 800 } } ); const errs = []; pg.on( 'pageerror', ( e ) => errs.push( e.message ) );
await pg.goto( `http://localhost:${ port }/index.html` ); await pg.waitForFunction( () => window.EX && EX.efriend );

const boot = async ( w, h ) => { await pg.setViewportSize( { width: w, height: h } ); await pg.evaluate( () => { const S = EX.state(); S.settings.onboarded = true; S.device.langHinted = true; S.device.efOnboard = 1; S.device.stage = 'done'; EX.setLang( 'en' ); EXA.skipFlow && EXA.skipFlow(); S.device.stage = 'done'; document.body.classList.remove( 'in-flow' ); document.querySelectorAll( '.flow' ).forEach( ( e ) => e.remove() ); } ); };
await boot( 390, 800 );
// Data: one wallet, opening 100, income 50 (salary), expense 30 (food) this month => balance 120.
await pg.evaluate( () => { const S = EX.state(), td = EX.today(); S.accounts = [ { id: 'w1', name: 'Bank', type: 'bank', currency: 'EUR', opening: '100' } ]; S.txs = [
	{ id: 'a', type: 'income', amount: '50', account: 'w1', category: 'salary', date: td, name: 'Pay' }, { id: 'b', type: 'expense', amount: '30', account: 'w1', category: 'food', date: td, name: 'Shop' } ]; EX.save(); window.snap = () => { const m = new Date(); const f = EX.flow( EX.monthTxs( m.getFullYear(), m.getMonth() ) ); return { bal: EX.balance( EX.account( 'w1' ) ), inc: EX.mainCents( f.income ), exp: EX.mainCents( f.expense ), rep: EX.reportTxs().length, blog: EXA.efblog.facts( EX.state().txs, EX.today() ).n }; }; } );
const s0 = await pg.evaluate( () => snap() );
chk( 'start: balance 120', s0.bal === 12000 && s0.inc === 5000 && s0.exp === 3000 );
// 1. Adjust down to 95 -> neutral entry, balance equals typed
await pg.evaluate( () => EXA.adjust.open( 'w1' ) ); await pg.waitForTimeout( 200 );
await pg.fill( '#adjForm [name=real]', '95' ); await pg.waitForTimeout( 100 );
chk( 'where-did-it-go appears for a decrease with Wallet adjustment as default', await pg.evaluate( () => { const w = document.getElementById( 'adjWhere' ), s = document.querySelector( '#adjForm [name=cat]' ); return ! w.hidden && s.value === 'walletAdjust' && /less/.test( document.getElementById( 'adjDiff' ).textContent ) && ! [ ...s.options ].some( ( o, i ) => i && o.value === 'walletAdjust' ); } ) );
await pg.click( '#adjForm button[type=submit]' ); await pg.waitForTimeout( 300 );
const s1 = await pg.evaluate( () => ( { ...snap(), n: EX.state().txs.length, t: EX.state().txs.find( ( x ) => EX.isAdjust( x ) ) } ) );
chk( 'balance is exactly 95; entry is a Wallet adjustment dated today', s1.bal === 9500 && s1.t && s1.t.type === 'expense' && s1.t.amount === '25.00' && s1.t.date === td0() && s1.t.category === 'walletAdjust' );
function td0() { return new Date().toLocaleDateString( 'sv' ); }
chk( 'not income or spending: month totals, reports and blog facts unchanged', s1.inc === 5000 && s1.exp === 3000 && s1.rep === s0.rep && s1.blog === s0.blog );
const ex = await pg.evaluate( () => { const S = EX.state(), td = EX.today(); S.budgets = [ { id: 'bg', category: 'all', amount: '1000', period: 'monthly' } ];
	const sp = EX.plan ? EX.plan.spent( 'all', EX.addDays( td, -30 ), td ) : null; const ss = EXA.safeSpend ? JSON.stringify( EXA.safeSpend.compute ? EXA.safeSpend.compute() : null ) : '';
	return { sp, ins: EXA.insights ? 1 : 0 }; } );
chk( 'budget spent excludes the adjustment (3000 not 5500)', ex.sp === null || ex.sp === 3000 || ex.sp === 30 );
// 2. Undo restores
await pg.evaluate( () => document.querySelector( '#toast button' ).click() ); await pg.waitForTimeout( 200 );
chk( 'undo restores the old balance and removes the entry', await pg.evaluate( () => EX.balance( EX.account( 'w1' ) ) === 12000 && ! EX.state().txs.some( ( x ) => EX.isAdjust( x ) ) ) );
// 3. Up, with a real income category -> normal income
await pg.evaluate( () => EXA.adjust.open( 'w1' ) ); await pg.fill( '#adjForm [name=real]', '130' ); await pg.selectOption( '#adjForm [name=cat]', 'gifts' ); await pg.click( '#adjForm button[type=submit]' ); await pg.waitForTimeout( 300 );
chk( 'choosing a real category makes a normal income entry', await pg.evaluate( () => { const x = EX.state().txs.find( ( z ) => z.category === 'gifts' ); return x && x.type === 'income' && ! EX.isAdjust( x ) && EX.balance( EX.account( 'w1' ) ) === 13000; } ) );
await pg.evaluate( () => { const S = EX.state(); S.txs = S.txs.filter( ( x ) => x.category !== 'gifts' ); } );
// 4. Edit an adjustment through openTx; delete works
await pg.evaluate( () => EXA.adjust.open( 'w1' ) ); await pg.fill( '#adjForm [name=real]', '140' ); await pg.click( '#adjForm button[type=submit]' ); await pg.waitForTimeout( 300 );
await pg.evaluate( () => EXA.openTx( EX.state().txs.find( ( x ) => EX.isAdjust( x ) ) ) ); await pg.waitForTimeout( 200 );
chk( 'editing an adjustment opens the adjust sheet', await pg.evaluate( () => !! document.getElementById( 'adjForm' ) && document.querySelector( '#adjForm [name=real]' ).value === '140.00' ) );
await pg.fill( '#adjForm [name=real]', '150' ); await pg.click( '#adjForm button[type=submit]' ); await pg.waitForTimeout( 300 );
chk( 'edit changes the same entry; balance 150', await pg.evaluate( () => EX.state().txs.filter( ( x ) => EX.isAdjust( x ) ).length === 1 && EX.balance( EX.account( 'w1' ) ) === 15000 ) );
await pg.evaluate( () => EXA.removeTx( EX.state().txs.find( ( x ) => EX.isAdjust( x ) ).id ) ); await pg.waitForTimeout( 100 );
chk( 'deleting the adjustment brings the balance back', await pg.evaluate( () => EX.balance( EX.account( 'w1' ) ) === 12000 ) );
// 5. Wallet sheet has the button
await pg.evaluate( () => EXA.openWallet( 'w1' ) ); await pg.waitForTimeout( 200 );
chk( 'wallet sheet offers Adjust balance', await pg.evaluate( () => !! document.querySelector( '#sheet [data-adj-open=w1]' ) ) ); await pg.evaluate( () => UI.closeSheet( true ) );
// 6. Nudge timing
const nudge = ( f ) => pg.evaluate( f );
await pg.evaluate( () => { const d = EX.state().device; d.firstSeen = Date.now() - 10 * 864e5; d.adjN = { w1: [ EX.addDays( EX.today(), -4 ), '' ] }; EXA.st.view = 'home'; EXA.render(); } ); await pg.waitForTimeout( 300 );
chk( 'nudge shows after 4 days with wallet name and balance', await pg.evaluate( () => { const c = document.querySelector( '.adj-nudge' ); return !! c && /Bank/.test( c.textContent ) && /120/.test( c.textContent ) && document.querySelectorAll( '.adj-nudge' ).length === 1; } ) );
await pg.click( '[data-adj-later]' ); await pg.waitForTimeout( 200 );
chk( 'Later snoozes for a day', await pg.evaluate( () => ! document.querySelector( '.adj-nudge' ) && EX.state().device.adjN.w1[ 1 ] === EX.addDays( EX.today(), 1 ) ) );
await pg.evaluate( () => { EX.state().device.adjN.w1 = [ EX.addDays( EX.today(), -4 ), '' ]; EXA.render(); } ); await pg.waitForTimeout( 200 );
await pg.click( '[data-adj-ok]' ); await pg.waitForTimeout( 200 );
chk( 'Looks right resets the timer and changes nothing else', await pg.evaluate( () => ! document.querySelector( '.adj-nudge' ) && EX.state().device.adjN.w1[ 0 ] === EX.today() && EX.state().txs.length === 2 ) );
await pg.evaluate( () => { const d = EX.state().device; d.adjN.w1 = [ EX.addDays( EX.today(), -2 ), '' ]; EXA.render(); } );
chk( 'not yet after 2 days', await pg.evaluate( () => ! document.querySelector( '.adj-nudge' ) ) );
await pg.evaluate( () => { const d = EX.state().device; d.adjN.w1 = [ EX.addDays( EX.today(), -9 ), '' ]; d.firstSeen = Date.now() - 864e5; EXA.render(); } );
chk( 'not in the first 2 days of use', await pg.evaluate( () => ! document.querySelector( '.adj-nudge' ) ) );
await pg.evaluate( () => { const d = EX.state().device; d.firstSeen = Date.now() - 9 * 864e5; EX.state().accounts.push( { id: 'w2', name: 'Old', type: 'cash', currency: 'EUR', opening: '5', archived: true } ); d.adjN.w2 = [ '2000-01-01', '' ]; EXA.render(); } ); await pg.waitForTimeout( 200 );
chk( 'one card, archived wallets never asked about', await pg.evaluate( () => document.querySelectorAll( '.adj-nudge' ).length === 1 && /Bank/.test( document.querySelector( '.adj-nudge' ).textContent ) ) );
await pg.evaluate( () => { EX.state().settings.adjNudge = false; EXA.render(); } );
chk( 'off switch hides it', await pg.evaluate( () => ! document.querySelector( '.adj-nudge' ) ) );
await pg.evaluate( () => { EX.state().settings.adjNudge = true; EX.state().settings.features = { tier: 'custom', off: [ 'balanceNudge' ] }; EXA.features.apply(); EXA.render(); } );
chk( 'Features toggle off hides it', await pg.evaluate( () => ! document.querySelector( '.adj-nudge' ) ) );
await pg.evaluate( () => { EX.state().settings.features = { tier: 'advanced' }; EXA.features.apply(); } );
// 7. Layout, EN + EL
for ( const [ w, h ] of [ [ 360, 640 ], [ 412, 735 ] ] ) for ( const lang of [ 'en', 'el' ] ) {
	await pg.setViewportSize( { width: w, height: h } ); await pg.evaluate( ( l ) => { EX.setLang( l ); EX.state().device.adjN.w1 = [ EX.addDays( EX.today(), -9 ), '' ]; EXA.st.view = 'home'; EXA.render(); }, lang ); await pg.waitForTimeout( 300 );
	const homeOk = await pg.evaluate( () => !! document.querySelector( '.adj-nudge' ) && document.documentElement.scrollWidth <= innerWidth && [ ...document.querySelectorAll( '.adj-nudge *' ) ].every( ( e ) => e.getBoundingClientRect().right <= innerWidth + 1 ) );
	await pg.evaluate( () => { EXA.adjust.open( 'w1' ); } ); await pg.fill( '#adjForm [name=real]', '10' ); await pg.waitForTimeout( 200 );
	const sheetOk = await pg.evaluate( () => { const sh = document.getElementById( 'sheet' ); return sh.scrollWidth <= sh.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth && ! /\badj[A-Z]\w+|cat_walletAdjust/.test( sh.textContent ); } );
	await pg.evaluate( () => UI.closeSheet( true ) );
	chk( `${ w }x${ h } ${ lang }: nudge card and sheet fit, no raw keys`, homeOk && sheetOk );
}
await pg.evaluate( () => { EX.setLang( 'el' ); EXA.st.view = 'activity'; EXA.render(); } );
chk( 'no page errors', errs.length === 0 ); if ( errs.length ) console.log( errs );
console.log( `${ ok } ok, ${ fail } failed` ); await b.close(); server.close(); process.exit( fail ? 1 : 0 );

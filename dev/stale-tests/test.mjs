/**
 * Logic and screen tests, run in a real browser without the server (guest mode), mostly on an emulated phone:
 * quick-add in English and Greek, recurrence, first-run flow, the add flow with the keypad, wallets and transfers, swipe
 * actions with real touch events, detail sheets, the back button, calendar file, translations, migration from 0.1, the
 * side rail and details pane on desktop, and layout checks: every tap target at least 44px, no sideways scrolling.
 *   npm test        (needs Google Chrome via playwright-core)
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = createServer( ( req, res ) => {
	const path = normalize( decodeURIComponent( req.url.split( '?' )[ 0 ] ) ).replace( /^(\.\.[/\\])+/, '' );
	const file = join( ROOT, path === '/' ? 'index.html' : path );
	if ( ! existsSync( file ) ) { res.writeHead( 404 ).end(); return; }
	res.writeHead( 200, { 'content-type': TYPES[ extname( file ) ] || 'application/octet-stream' } ).end( readFileSync( file ) );
} ).listen( 0 );
const BASE = `http://localhost:${ server.address().port }/`;

const browser = await chromium.launch( { channel: 'chrome' } );
const errors = [];
let fail = 0;
const ok = ( cond, label, extra = '' ) => { if ( ! cond ) { fail++; console.log( 'FAIL', label, extra ); } else console.log( 'ok  ', label ); };
async function newPage( opts = {} ) {
	const context = await browser.newContext( { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'en-US', timezoneId: 'Europe/Athens', ...opts } );
	await context.addInitScript( () => { try { if ( ! localStorage.getItem( 'expenity.skin' ) ) localStorage.setItem( 'expenity.skin', 'emerald' ); } catch ( e ) { /* ignore */ } } ); // the tests were written for the original green theme
	const page = await context.newPage();
	page.on( 'pageerror', ( e ) => errors.push( String( e ) ) );
	page.on( 'console', ( m ) => { if ( m.type() === 'error' && ! /beacon|cloudflare|ERR_|Failed to load resource/.test( m.text() ) ) errors.push( m.text() ); } );
	await page.goto( BASE );
	await page.waitForSelector( '#tabbar button', { state: 'attached' } );
	return { context, page };
}
const { context, page } = await newPage();
const cdp = await context.newCDPSession( page );
const st = () => page.evaluate( () => JSON.parse( JSON.stringify( window.EX.state() ) ) );
const tab = ( name ) => page.click( `[data-go=${ name }]:visible` );
const keys = async ( s ) => { if ( await page.locator('#txKeypad').isHidden() ) await page.click('[data-tx=target-amount]'); for ( const k of s ) await page.click( `.keypad [data-key="${ k }"]` ); };
const addTx = async ( type, amount, name ) => { await page.click( '.fab' ); await page.click( `[data-act=tx-${ type }]` ); await keys( amount ); if ( name ) await page.fill( '#txDesc', name ); if(type==='transfer'){await page.click('[data-entry=wallet]');await page.locator('[data-tx-wallet]').first().click();await page.click('[data-entry=to-wallet]');await page.locator('[data-tx-to]').first().click();} };
async function swipe( selector, dx ) {
	const box = await page.locator( selector ).first().boundingBox();
	const y = box.y + box.height / 2, x0 = box.x + box.width * ( dx > 0 ? 0.25 : 0.75 );
	await cdp.send( 'Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [ { x: x0, y } ] } );
	for ( let i = 1; i <= 8; i++ ) await cdp.send( 'Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [ { x: x0 + ( dx * i ) / 8, y } ] } );
	await cdp.send( 'Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] } );
	await page.waitForTimeout( 150 );
}

/* ---- Sentence parsing, English and Greek */
const q = ( text, opts ) => page.evaluate( ( [ x, o ] ) => window.EX.parseQuick( x, o ), [ text, opts || {} ] );
const eq = async ( text, want, opts ) => { const got = await q( text, opts ); const bad = Object.entries( want ).filter( ( [ k, v ] ) => got[ k ] !== v ); ok( ! bad.length, `parse: ${ text }`, JSON.stringify( got ) ); };
await eq( 'Netflix 15.99 monthly on the 3rd', { name: 'Netflix', amount: '15.99', repeat: 'monthly', day: 3 } );
await eq( 'Rent €850 every month on 1st', { name: 'Rent', amount: '850', currency: 'EUR', repeat: 'monthly', day: 1 } );
await eq( 'Electricity ~60 monthly 15th', { name: 'Electricity', amount: '60', variable: true, repeat: 'monthly', day: 15 } );
await eq( 'Car insurance 420 yearly 12 march', { name: 'Car insurance', amount: '420', repeat: 'yearly', day: 12 } );
await eq( 'Gym £35 weekly friday', { name: 'Gym', amount: '35', currency: 'GBP', repeat: 'weekly' } );
await eq( 'Netflix 15,99 μηνιαία στις 3', { name: 'Netflix', amount: '15.99', repeat: 'monthly', day: 3 } );
await eq( 'Ενοίκιο 850€ κάθε μήνα στις 1', { name: 'Ενοίκιο', amount: '850', currency: 'EUR', repeat: 'monthly', day: 1 } );
await eq( 'Ρεύμα ΔΕΗ ~60 ευρώ κάθε μήνα την 15η', { name: 'Ρεύμα ΔΕΗ', amount: '60', variable: true, repeat: 'monthly', day: 15 } );
await eq( 'Ασφάλεια αυτοκινήτου 420 ετήσια 12 Μαρτίου', { name: 'Ασφάλεια αυτοκινήτου', amount: '420', repeat: 'yearly', day: 12 } );
await eq( 'ΕΝΦΙΑ 300 τριμηνιαία 28 Φεβρουαρίου', { name: 'ΕΝΦΙΑ', amount: '300', repeat: 'quarterly', day: 28 } );
const yest = await page.evaluate( () => window.EX.addDays( window.EX.today(), -1 ) );
await eq( 'Coffee 3.50 yesterday', { name: 'Coffee', amount: '3.50', date: yest }, { past: true } );
await eq( 'Σούπερ μάρκετ 42,30 χθες', { name: 'Σούπερ μάρκετ', amount: '42.30', date: yest }, { past: true } );
await eq( 'Salary 1500 income', { name: 'Salary', amount: '1500', type: 'income' }, { past: true } );
await eq( 'Μισθός 1500 έσοδο', { name: 'Μισθός', amount: '1500', type: 'income' }, { past: true } );
const taxi = await q( 'Taxi 12 friday', { past: true } );
ok( taxi.date <= ( await page.evaluate( () => window.EX.today() ) ) && taxi.name === 'Taxi', 'a weekday in a transaction means the most recent one' );
const rec = await page.evaluate( () => { const D = window.EX, b = { repeat: 'monthly', day: 31 }; const a = D.nextAfter( b, '2026-01-31' ), c = D.nextAfter( b, a ), d = D.nextAfter( b, c ); return [ a, c, d, D.nextAfter( { repeat: 'yearly', day: 29 }, '2028-02-29' ), D.nextAfter( { repeat: 'once' }, '2026-01-01' ) ]; } );
ok( rec[ 0 ] === '2026-02-28' && rec[ 1 ] === '2026-03-31' && rec[ 2 ] === '2026-04-30' && rec[ 3 ] === '2029-02-28' && rec[ 4 ] === null, 'recurrence: month ends, leap day, one-off', rec.join( ' ' ) );
const parity = await page.evaluate( () => { const L = window.EXPENITY_I18N.langs; return { missing: Object.keys( L.en ).filter( ( k ) => ! ( k in L.el ) ), extra: Object.keys( L.el ).filter( ( k ) => ! ( k in L.en ) ) }; } );
ok( ! parity.missing.length && ! parity.extra.length, 'every English string has a Greek one and the reverse', JSON.stringify( parity ) );
const iconsOk = await page.evaluate( () => { const used = new Set(); const src = [ ...window.EX.EXPENSE_CATS, ...window.EX.INCOME_CATS ].map( ( c ) => window.EX.CAT_STYLE[ c[ 0 ] ][ 0 ] ).concat( Object.values( window.EX.WALLET_ICON ) ); return src.filter( ( n ) => ! window.EXI[ n ] ); } );
ok( ! iconsOk.length, 'every category and wallet icon exists in the bundled set', iconsOk.join( ',' ) );

/* ---- First run */
ok( await page.locator( '#flow' ).isVisible() && await page.locator( '#flow form#flowRegister' ).count() === 1, 'a new user sees the account screen first' );
ok( await page.locator( '[data-go]:visible' ).count() === 0 || ! await page.locator( '#tabbar' ).isVisible(), 'nothing of the app is reachable behind the first screen' );
ok( ( await st() ).accounts.length === 0, 'no wallet exists before the flow is done' );
await page.click( '[data-flow=guest]' );
ok( await page.locator( '.install-video-guide video' ).isVisible() && await page.locator( '[data-flow=install-skip]' ).isVisible(), 'next: the install guide with an animation and a skip' );
await page.click( '[data-fstep=plat][data-plat=android]' );
ok( await page.locator( '.install-video-guide.plat-android' ).count() === 1, 'the install guide can switch platform' );
await page.click( '[data-flow=install-skip]' );
await page.click('#confirmYes');
await page.waitForSelector('#setupForm input[name=name]');
ok( await page.locator( '#setupForm input[name=name]' ).isVisible(), 'then the setup wizard starts, asking for a name' );
await page.fill( '#setupForm [name=name]', 'Tester' ); await page.click( '[data-flow=next]' );
await page.click( '[data-fstep=cur][data-cur=EUR]' ); await page.click( '[data-flow=next]' );
ok( await page.locator( '[data-fstep=aim]' ).count() === 7, 'the wizard asks what the person wants help with (seven aims)' );
ok( await page.locator( '[data-fstep=aim][data-aim=track].on' ).count() === 1 && await page.locator( '.multi-hint' ).count() === 1, 'one aim is already chosen, and the step says more than one can be chosen' );
await page.click( '[data-fstep=aim][data-aim=save]' ); await page.click( '[data-fstep=aim][data-aim=subs]' ); await page.click( '[data-flow=next]' );
ok( await page.locator( '[data-flow=add-goal]' ).isVisible(), 'choosing to save for something adds a goal step' );
await page.click( '[data-fstep=gpreset][data-k=trip]' ); await page.click( '[data-fstep=gpreset][data-k=car]' ); await page.click( '[data-flow=add-goal]' );
ok( await page.locator( '.grow' ).count() === 3, 'the goal step can hold several goals' );
await page.fill( '.grow >> nth=0 >> [name=gtarget]', '800' ); await page.fill( '.grow >> nth=1 >> [name=gtarget]', '9000' ); await page.click( '.grow >> nth=2 >> [data-flow=rm-goal]' ); await page.click( '[data-flow=next]' );
await page.click( '[data-flow=next]' ); // the plan step (Basic, Pro or Advanced) comes before the wallets
await page.locator( '[data-wrow="1"] .switch' ).click();
await page.fill( '[data-wrow="0"] [name=wname]', 'Main wallet' ); await page.fill( '[data-wrow="0"] [name=wopening]', '100' );
await page.click( '[data-flow=next]' );
await page.click( '[data-flow=next]' ); // the daily number step
await page.click( '[data-fstep=motion][data-motion=off]' );
ok( await page.evaluate( () => document.documentElement.dataset.motion ) === 'off', 'animations can be switched off in the wizard' );
await page.click( '[data-flow=next]' );
// the tour, then the animated lessons (receipts, one sentence, extras, help icon) until the swipe tips
for ( let i = 0; i < 10 && ! await page.locator( '.swipe-demo' ).count(); i++ ) await page.click( '[data-flow=next]' );
ok( await page.locator( '.swipe-demo' ).isVisible() && await page.locator( '.tip-list li' ).count() === 3, 'the wizard shows an animated demo of swiping a row' );
await page.click( '[data-flow=next]' );
ok( await page.locator( '[data-flow=start]' ).isVisible(), 'the wizard ends on a done screen' );
await page.click( '[data-flow=start]' );
ok( ! await page.locator( '#flow' ).isVisible(), 'finishing opens the app' );
{ const g = await st(); ok( g.goals.length === 2 && g.goals[ 0 ].target === '800' && g.goals[ 0 ].icon === 'plane' && g.settings.aims.includes( 'save' ), 'the first goal and the aims from setup are saved' ); }
let s = await st();
ok( s.accounts.length === 1 && s.accounts[ 0 ].name === 'Main wallet' && s.accounts[ 0 ].opening === '100' && s.settings.currency === 'EUR' && ! s.accounts[ 0 ].auto && s.settings.name === 'Tester', 'the first wallet comes from the first-run answers' );
ok( await page.locator( '#tabbar .fab' ).isVisible() && await page.locator( '#tabbar .tab' ).count() === 4, 'phone: bottom tab bar with four tabs and a center + button' );
ok( ! await page.locator( '#rail' ).isVisible() && ! await page.locator( '#pane' ).isVisible(), 'phone: no side rail or pane' );

/* ---- Add flow: amount first, keypad */
await page.click( '.fab' );
ok( await page.locator( '.entry-add-row' ).count() >= 4, 'the + button opens a sheet with labelled actions' );
await page.click( '[data-act=tx-income]' );
await keys( '15' ); await page.click( '.keypad [data-key="0"]' ); await page.click( '.keypad [data-key="0"]' );
ok( await page.locator( '#amtVal' ).innerText() === '1,500', 'the keypad builds the amount (thousands are grouped for reading)' );
await page.click( '.keypad [data-key="<"]' ); await page.click( '.keypad [data-key="0"]' );
await page.fill( '#txDesc', 'Salary' );
ok(await page.locator('.catchip.on').count()===0,'income does not silently pick a category');await page.click('[data-entry-group=category] > summary');await page.waitForTimeout(700);await page.click('[data-tx-cat=salary]',{force:true});
await page.click('[data-tx=save]');if(await page.locator('#txErr:visible').count())throw Error(await page.locator('#txErr').innerText());
await page.click( '.fab' ); await page.click( '[data-act=tx-expense]' );
await page.click('[data-entry-group=extras] > summary');await page.click( '[data-tx=quick]' ); await page.fill( '#txQuick', 'Groceries 42,30 yesterday' );
await page.click('[data-entry-group=category] > summary');ok(await page.locator('#amtVal').innerText()==='42.30'&&await page.locator('[data-tx-cat=food]').innerText().then(x=>x.includes('Suggested')),'sentence parsing fills amount and suggests a category');await page.click('[data-tx-cat=food]');
await page.click( '[data-tx=save]' );
s = await st();
ok( s.txs.length === 2 && s.txs.some( ( x ) => x.type === 'income' && x.amount === '1500' && x.category === 'salary' ) && s.txs.some( ( x ) => x.amount === '42.30' && x.category === 'food' && x.date === yest ), 'an income and a sentence-entered expense were saved', JSON.stringify( s.txs ) );
let bal = await page.evaluate( () => window.EX.balance( window.EX.state().accounts[ 0 ] ) );
ok( bal === 155770, 'the balance includes the opening balance', String( bal ) );
await page.click( '.fab' ); await page.click( '[data-act=tx-expense]' );
ok( await page.locator( '#amtVal' ).innerText() === '0', 'an empty amount shows 0' );
await page.click( '[data-tx=save]' );
ok( await page.locator( '#txErr:not([hidden])' ).count() === 1, 'saving without an amount shows an error' );
await page.keyboard.press( 'Escape' );
ok( ! await page.locator( '#sheet[open]' ).count(), 'Escape closes the sheet' );

/* ---- Wallets and transfers */
await page.click( '[data-act=add-wallet]:visible >> nth=0' );
await page.fill( '#walletForm [name=name]', 'Dollars' ); await page.click( '[data-wtype=savings]' ); await page.fill( '#walletForm [name=currency]', 'usd' ); await page.fill( '#walletForm [name=opening]', '100' );
await page.click( '#walletForm [type=submit]' );
await addTx( 'transfer', '50' );
ok( await page.locator( '[data-tx=target-to]' ).count() === 1, 'a transfer between currencies asks for the amount received' );
await page.click( '[data-tx=target-to]' ); await keys( '54' ); await page.click( '[data-tx=save]' );
s = await st();
const [ w1, w2 ] = s.accounts;
const b1 = await page.evaluate( ( id ) => window.EX.balance( window.EX.account( id ) ), w1.id ), b2 = await page.evaluate( ( id ) => window.EX.balance( window.EX.account( id ) ), w2.id );
ok( b1 === 150770 && b2 === 15400, 'the transfer moves 50 out and 54 in', `${ b1 } ${ b2 }` );
ok( ( await page.evaluate( () => window.EX.flow( window.EX.state().txs ) ) ).income.length === 1, 'transfers are neither income nor expense' );

/* ---- Activity */
await tab( 'activity' );
ok( await page.locator( '.sw[data-kind=tx]' ).count() === 3, 'Activity lists the three entries' );
await page.click( '[data-act=toggle-search]' ); await page.fill( '#txSearch', 'grocer' );
ok( await page.locator( '.sw[data-kind=tx]' ).count() === 1, 'search narrows the list' );
await page.click( '[data-act=toggle-search]' );
await page.click( '[data-txtype=income]' );
ok( await page.locator( '.sw[data-kind=tx]' ).count() === 1, 'the Income chip shows only income' );
await page.click( '[data-txtype=all]' );

/* ---- Detail sheet, edit, and the back button */
await page.click( '.sw[data-kind=tx] >> nth=0' );
ok( await page.locator( '#sheet[open] .detail' ).count() === 1, 'tapping a row opens a detail sheet on a phone' );
await page.goBack();
await page.waitForTimeout( 200 );
ok( ! await page.locator( '#sheet[open]' ).count(), 'the browser back button closes the sheet' );
await page.click( '.sw[data-kind=tx] >> nth=0' ); await page.click( '[data-act=edit-tx]' );
ok( await page.locator( '#amtVal' ).innerText() !== '0', 'Edit opens the add sheet filled in' );
await page.keyboard.press( 'Escape' );

/* ---- Swipe actions with real touch events */
await page.click( '.fab' ); await page.click( '[data-act=add-bill]' );
await page.fill( '#quick', 'Netflix 15.99 monthly on the 3rd' ); if(await page.locator('#billForm [name=account]').count()&&!await page.locator('#billForm [name=account]').inputValue()){const id=await page.evaluate(()=>EX.writableAccounts()[0].id);await page.selectOption('#billForm [name=account]',id);}await page.click( '#saveBtn' );
await tab( 'bills' );
await swipe( '.sw[data-kind=bill]', 200 );
s = await st();
ok( ! s.txs.some( ( x ) => x.billId ) && await page.locator( '.sw.open .sw-act.paid' ).isVisible(), 'swiping a bill right only reveals Paid: nothing is recorded yet' );
await page.click( '.sw.open .sw-act.paid' );
s = await st();
ok( s.txs.some( ( x ) => x.billId && x.amount === '15.99' && x.type === 'expense' ), 'tapping Paid records the expense' );
await page.click( '#toast .link' );
s = await st();
ok( ! s.txs.some( ( x ) => x.billId ), 'Undo takes the payment back' );
await swipe( '.sw[data-kind=bill]', -250 );
ok( await page.locator( '.sw.open .sw-act.edit' ).isVisible() && await page.locator( '.sw.open .sw-act.del' ).isVisible(), 'swiping a bill left reveals Edit and Delete' );
await page.click( '.sw.open .sw-act.edit' );
ok( await page.locator( '#sheet[open] #billForm' ).count() === 1, 'tapping Edit opens the bill for editing' );
await page.keyboard.press( 'Escape' );
await tab( 'activity' );
const before = ( await st() ).txs.length;
await swipe( '.sw[data-kind=tx] >> nth=0', -250 );
ok( ( await st() ).txs.length === before && await page.locator( '.sw.open' ).count() === 1, 'swiping a transaction left deletes nothing by itself' );
await page.click( 'h1.ab-title, .ab-title' ).catch( () => {} );
ok( await page.locator( '.sw.open' ).count() === 0, 'tapping elsewhere closes the open row' );
await swipe( '.sw[data-kind=tx] >> nth=0', -250 );
await page.waitForTimeout( 1000 ); ok( await page.locator( '.sw.open' ).count() === 1, 'an opened row stays open for a moment' );
await page.waitForTimeout( 1500 ); ok( await page.locator( '.sw.open' ).count() === 0, 'after two seconds without a touch the row slides back by itself' );
await swipe( '.sw[data-kind=tx] >> nth=0', -250 );
await page.click( '.sw.open .sw-act.del' );
ok( ( await st() ).txs.length === before - 1, 'tapping Delete deletes it' );
await page.click( '#toast .link' );
ok( ( await st() ).txs.length === before, 'Undo brings it back' );
await swipe( '.sw[data-kind=tx] >> nth=0', -250 );
await page.click( '.sw.open .sw-act.edit' );
ok( await page.locator( '#sheet[open] #amtVal' ).count() === 1, 'tapping Edit opens the transaction' );
await page.keyboard.press( 'Escape' );

/* ---- More, categories, calendar file */
await page.click( '.ab-avatar .avatar:visible' );
ok( await page.locator( '.mrow' ).count() >= 6, 'More lists wallets, categories, reminders, data, appearance and about' );
await page.click( '[data-more=categories]' ); await page.click( '[data-act=add-cat]' );
await page.fill( '#taxonomyCategory [name=name]', 'Pets' ); await page.click( '#taxonomyCategory [data-tax-icon=paw]' ); await page.click( '#taxonomyCategory [data-tax-color=pink]' ); ok( await page.locator( '.taxonomy-preview .tint-pink' ).count() === 1, 'the category preview follows the chosen icon and colour' ); await page.click( '#taxonomyCategory [type=submit]' );
ok( ( await st() ).categories.length === 1, 'a custom category can be added' );
await page.click( '[data-act=more-back]' );
const ics = await page.evaluate( () => window.EXApp.buildIcs() );
ok( /BEGIN:VEVENT/.test( ics ) && /RRULE:FREQ=MONTHLY/.test( ics ) && /TRIGGER:-PT63H/.test( ics ), 'calendar file has event, rule and 3-day alarm' );

/* ---- Layout: tap targets and sideways scrolling on every screen and sheet, on a regular and a small phone */
async function audit( label ) {
	const r = await page.evaluate( () => {
		const small = [];
		const visible = ( el ) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle( el ); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && b.bottom > 0 && b.top < innerHeight; };
		const root = document.querySelector( '#sheet[open]' ) || document.body;
		root.querySelectorAll( 'button, a[href], select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea, summary, [role=tab]' ).forEach( ( el ) => {
			if ( ! visible( el ) || el.closest( '[hidden], .sw-back, .sheet-grab' ) || el.disabled && false ) return;
			if ( document.querySelector( '#sheet[open]' ) && ! el.closest( '#sheet' ) ) return;
			const b = el.getBoundingClientRect();
			if ( Math.min( b.width, b.height ) < 43.5 ) small.push( `${ el.tagName.toLowerCase() }${ el.className ? '.' + String( el.className ).split( ' ' )[ 0 ] : '' } ${ Math.round( b.width ) }x${ Math.round( b.height ) } "${ ( el.textContent || el.getAttribute( 'aria-label' ) || '' ).trim().slice( 0, 20 ) }"` );
		} );
		const main = document.querySelector( '#view' );
		return { small, overflowX: document.documentElement.scrollWidth > innerWidth + 1 || ( ! document.querySelector( '#sheet[open]' ) && main.scrollWidth > main.clientWidth + 1 ) };
	} );
	ok( ! r.small.length, `${ label }: every tap target is at least 44px`, r.small.slice( 0, 4 ).join( ' | ' ) );
	ok( ! r.overflowX, `${ label }: no sideways scrolling` );
}
const screens = async ( prefix ) => {
	for ( const name of [ 'home', 'activity', 'bills', 'reports' ] ) { await tab( name ); await audit( `${ prefix } ${ name }` ); }
	await tab( 'bills' ); await page.click( '[data-billsmode=calendar]' ); await audit( `${ prefix } bill calendar` ); await page.click( '[data-billsmode=list]' );
	await page.click( '.ab-avatar .avatar:visible' ); await audit( `${ prefix } more` );
	for ( const sub of [ 'wallets', 'reminders', 'data', 'appearance', 'account', 'about' ] ) { if(await page.locator('[data-act=more-back]').count())await page.click('[data-act=more-back]'); await page.locator(`[data-more=${sub}]`).first().evaluate(el=>{const d=el.closest('details');if(d)d.open=true;});await page.click( `[data-more=${ sub }]` ); await audit( `${ prefix } more/${ sub }` ); }
	await page.click( '[data-act=more-back]' ); await tab( 'home' );
	await page.click( '.fab' ); await audit( `${ prefix } add sheet` );
	await page.click( '[data-act=tx-expense]' ); await audit( `${ prefix } transaction sheet` ); await page.keyboard.press( 'Escape' );
	await page.click( '.fab' ); await page.click( '[data-act=add-bill]' ); await audit( `${ prefix } bill sheet` ); await page.keyboard.press( 'Escape' );
	await page.click( '[data-act=add-wallet]:visible >> nth=0' ); await audit( `${ prefix } wallet sheet` ); await page.keyboard.press( 'Escape' );
	await page.click( '.ab-avatar .avatar:visible' ); await page.click( '[data-more=account]' ); await page.click( '[data-act=auth-signin]' ); await audit( `${ prefix } sign-in sheet` ); await page.keyboard.press( 'Escape' ); await tab( 'home' );
};
await screens( 'phone' );
await page.setViewportSize( { width: 375, height: 667 } );
await screens( 'small phone' );
await page.setViewportSize( { width: 390, height: 844 } );

/* ---- Greek */
await page.click( '.ab-avatar .avatar:visible' ); await page.locator('[data-more=appearance]').evaluate(el=>el.closest('details').open=true);await page.click( '[data-more=appearance]' ); await page.click( '[data-lang=el]' );
ok( await page.getAttribute( 'html', 'lang' ) === 'el' && /Αρχική/.test( await page.locator( '#tabbar .tab' ).first().innerText() ), 'switching to Greek translates the app' );
for ( const name of [ 'home', 'activity', 'bills', 'reports' ] ) { await tab( name ); ok( ( await page.locator( '#view' ).innerText() ).length > 20, `Greek ${ name } view renders` ); }
await page.click( '.fab' ); await page.click( '[data-act=tx-expense]' );
ok( /εξόδου/.test( await page.locator( '#sheetTitle' ).innerText() ), 'the add sheet is in Greek' );
await page.click('[data-tx=target-amount]');
ok( await page.locator( '.keypad [data-key="."]' ).innerText() === ',', 'the Greek keypad uses a decimal comma' );
await audit( 'Greek transaction sheet' );
await page.keyboard.press( 'Escape' );
await page.evaluate( () => window.EX.setLang( 'en' ) );
await context.close();

/* ---- Desktop: side rail, details pane, keyboard */
{
	const { context: dctx, page: d } = await newPage( { viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false } );
	await d.evaluate( () => { window.EXA.skipFlow(); } );
	await d.evaluate( () => { const X = window.EX, S = X.state(); S.txs.push( { id: 't1', type: 'expense', amount: '12', category: 'food', date: X.today(), name: 'Lunch', account: S.accounts[ 0 ].id } ); S.bills.push( { id: 'b1', name: 'Rent', amount: '850', currency: 'EUR', category: 'housing', repeat: 'monthly', next: X.addDays( X.today(), 4 ), day: 1, account: S.accounts[ 0 ].id } ); X.save(); } );
	ok( await d.locator( '#rail' ).isVisible() && ! await d.locator( '#tabbar' ).isVisible() && await d.locator( '#pane' ).isVisible(), 'desktop: side rail and details pane, no tab bar' );
	await d.click( '#rail [data-go=activity]' ); await d.click( '.sw[data-kind=tx]' );
	ok( await d.locator( '#pane .detail' ).count() === 1 && ! await d.locator( '#sheet[open]' ).count(), 'desktop: a tapped row shows its details in the pane, not a sheet' );
	await d.click( '#rail [data-go=bills]' ); await d.click( '.sw[data-kind=bill]' );
	ok( await d.locator( '#pane [data-act=pay-bill]' ).count() === 1, 'desktop: a bill shows its actions in the pane' );
	await d.click( '#rail [data-go=bills]' ); await d.click( '.sw[data-kind=bill]' );
	ok( await d.evaluate( () => { const p = document.querySelector( '#pane' ); return p.scrollWidth <= p.clientWidth + 1 && [ ...p.querySelectorAll( '.btn' ) ].every( ( b ) => b.getBoundingClientRect().right <= p.getBoundingClientRect().right + 1 ); } ), 'desktop: the details pane fits, with every action button inside it' );
	await d.keyboard.press( 'n' );
	ok( await d.locator( '#sheet[open] .entry-add-row' ).count() === 4, 'desktop: the n key opens the add sheet' );
	await d.keyboard.press( 'Escape' );
	ok( ! await d.evaluate( () => document.documentElement.scrollWidth > innerWidth + 1 ), 'desktop: no sideways scrolling' );
	await dctx.close();
}
{ // Tablet portrait: rail, no pane, sheets as dialogs
	const { context: tctx, page: tp } = await newPage( { viewport: { width: 820, height: 1180 } } );
	await tp.evaluate( () => { window.EXA.skipFlow(); } );
	ok( await tp.locator( '#rail' ).isVisible() && ! await tp.locator( '#tabbar' ).isVisible() && ! await tp.locator( '#pane' ).isVisible(), 'tablet: side rail, no tab bar, no pane' );
	await tp.click( '.rail-add' );
	const box = await tp.locator( '#sheet' ).boundingBox();
	ok( box.width <= 600 && box.y > 20, 'tablet: the add sheet is a centered dialog, not full width' );
	await tctx.close();
}

/* ---- Tablet and laptop sizes: no sideways scrolling anywhere, and nothing scrolls sideways inside a screen */
for ( const [ w, h, name ] of [ [ 744, 1133, 'iPad mini' ], [ 1133, 744, 'iPad mini landscape' ], [ 820, 1180, 'iPad Air' ], [ 1180, 820, 'iPad Air landscape' ], [ 834, 1194, 'iPad Pro 11' ], [ 1024, 1366, 'iPad Pro 12.9' ], [ 800, 1280, 'Android tablet' ], [ 1280, 800, 'laptop' ], [ 1440, 900, 'desktop' ] ] ) {
	const { context: c, page: p } = await newPage( { viewport: { width: w, height: h } } );
	await p.evaluate( () => { window.EXA.skipFlow(); const X = window.EX, S = X.state(), td = X.today(); S.accounts.push( { id: 'w2', name: 'Bank account', type: 'bank', currency: 'EUR', opening: '500' }, { id: 'w3', name: 'Card', type: 'card', currency: 'EUR', opening: '0' }, { id: 'w4', name: 'Savings', type: 'savings', currency: 'EUR', opening: '900' } ); for ( let i = 0; i < 8; i++ ) { S.txs.push( { id: 'x' + i, type: i % 3 ? 'expense' : 'income', amount: String( 10 + i ), category: 'food', date: X.addDays( td, -i ), name: 'Item ' + i, account: S.accounts[ 0 ].id } ); S.bills.push( { id: 'bb' + i, name: 'Bill ' + i, amount: '20', currency: 'EUR', category: 'utilities', repeat: 'monthly', next: X.addDays( td, i - 2 ), day: 1, account: S.accounts[ 0 ].id } ); } X.save(); } );
	let bad = [];
	for ( const v of [ 'home', 'activity', 'bills', 'reports', 'more' ] ) {
		await p.evaluate( ( x ) => window.EXA.go( x ), v );
		const r = await p.evaluate( () => { const vw = innerWidth, out = []; const main = document.querySelector( '#view' ); if ( document.documentElement.scrollWidth > vw + 1 ) out.push( 'page' ); if ( main.scrollWidth > main.clientWidth + 1 ) out.push( 'view' ); document.querySelectorAll( '#view *' ).forEach( ( el ) => { const cs = getComputedStyle( el ); if ( ( cs.overflowX === 'auto' || cs.overflowX === 'scroll' ) && el.scrollWidth > el.clientWidth + 1 ) out.push( el.className || el.tagName ); } ); return out; } );
		if ( r.length ) bad.push( v + ': ' + r.join( ',' ) );
	}
	ok( ! bad.length, `${ name } ${ w }x${ h }: no horizontal scrolling on any screen`, bad.join( ' | ' ) );
	await c.close();
}

/* ---- Themes: every theme draws every screen without sideways scrolling, with readable contrast */
{
	const { context: c, page: p } = await newPage( { viewport: { width: 390, height: 844 } } );
	await p.evaluate( () => { window.EXA.skipFlow(); const X = window.EX, S = X.state(), td = X.today(); for ( let i = 0; i < 6; i++ ) { S.txs.push( { id: 'k' + i, type: i % 3 ? 'expense' : 'income', amount: String( 10 + i ), category: 'food', date: X.addDays( td, -i ), name: 'Item ' + i, account: S.accounts[ 0 ].id } ); S.bills.push( { id: 'kb' + i, name: 'Bill ' + i, amount: '20', currency: 'EUR', category: 'utilities', repeat: 'monthly', next: X.addDays( td, i - 2 ), day: 1, account: S.accounts[ 0 ].id } ); } X.save(); } );
	const ids = await p.evaluate( () => window.EXA.THEMES.map( ( x ) => x.id ) );
	ok( ids.length === 15, 'fourteen themes and a custom palette' );
	for ( const id of ids ) {
		await p.evaluate( ( x ) => window.EXA.setSkin( x ), id );
		const bad = [];
		for ( const v of [ 'home', 'activity', 'bills', 'reports', 'more' ] ) {
			await p.evaluate( ( x ) => window.EXA.go( x ), v );
			const r = await p.evaluate( () => { const out = []; if ( document.documentElement.scrollWidth > innerWidth + 1 ) out.push( 'page' ); const m = document.querySelector( '#view' ); if ( m.scrollWidth > m.clientWidth + 1 ) out.push( 'view' ); return out; } );
			if ( r.length ) bad.push( v + ': ' + r.join( ',' ) );
		}
		ok( ! bad.length, `theme ${ id }: no sideways scrolling`, bad.join( ' | ' ) );
		const low = await p.evaluate( () => {
			const cs = getComputedStyle( document.documentElement ), g = ( n ) => cs.getPropertyValue( n ).trim();
			const rgb = ( c ) => { const m = String( c ).match( /#([0-9a-f]{3,8})|rgba?\(([^)]+)\)/i ); if ( ! m ) return null; if ( m[ 1 ] ) { let h = m[ 1 ]; if ( h.length === 3 ) h = h.replace( /./g, '$&$&' ); return [ 0, 2, 4 ].map( ( i ) => parseInt( h.slice( i, i + 2 ), 16 ) ); } return m[ 2 ].split( ',' ).slice( 0, 3 ).map( Number ); };
			const lum = ( [ r, g2, b ] ) => { const f = ( v ) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow( ( v + 0.055 ) / 1.055, 2.4 ); }; return 0.2126 * f( r ) + 0.7152 * f( g2 ) + 0.0722 * f( b ); };
			const ratio = ( a, b ) => { const A = rgb( a ), B = rgb( b ); if ( ! A || ! B ) return 99; const x = lum( A ), y = lum( B ); return ( Math.max( x, y ) + 0.05 ) / ( Math.min( x, y ) + 0.05 ); };
			const first = ( v ) => ( String( v ).match( /#[0-9a-f]{3,8}|rgba?\([^)]+\)/i ) || [ '' ] )[ 0 ];
			const pairs = [ [ 'ink/bg', g( '--ink' ), g( '--bg' ), 4.5 ], [ 'ink/surface', g( '--ink' ), g( '--surface' ), 4.5 ], [ 'muted/surface', g( '--muted' ), g( '--surface' ), 3 ], [ 'brand', g( '--brand-ink' ), first( g( '--brand' ) ), 3.5 ], [ 'hero', g( '--hero-ink' ), first( g( '--hero-bg' ) ), 3 ] ];
			return pairs.filter( ( [ , a, b, min ] ) => ratio( a, b ) < min ).map( ( [ n, a, b ] ) => `${ n } ${ a } on ${ b }` );
		} );
		ok( ! low.length, `theme ${ id }: readable contrast`, low.join( ' | ' ) );
	}
	await c.close();
}

/* ---- Add sheets at small phone widths: nothing scrolls sideways and nothing sticks out */
for ( const w of [ 320, 360, 390, 430 ] ) {
	const { context: c, page: p } = await newPage( { viewport: { width: w, height: 760 } } );
	await p.evaluate( () => { window.EXA.skipFlow(); const S = window.EX.state(); S.accounts.push( { id: 'a2', name: 'A very long wallet name here', type: 'bank', currency: 'EUR', opening: '0' }, { id: 'a3', name: 'Card', type: 'card', currency: 'EUR', opening: '0' }, { id: 'a4', name: 'Savings', type: 'savings', currency: 'EUR', opening: '0' } ); window.EX.save(); } );
	const audit = () => p.evaluate( () => { const vw = innerWidth, out = []; document.querySelectorAll( 'body *' ).forEach( ( el ) => { const r = el.getBoundingClientRect(), cs = getComputedStyle( el ); if ( ! r.width || cs.visibility === 'hidden' || el.closest( '[hidden]' ) || el.closest( '.keypad' ) && false ) return; if ( ( cs.overflowX === 'auto' || cs.overflowX === 'scroll' ) && el.scrollWidth > el.clientWidth + 1 && ! el.matches( 'html, body' ) ) out.push( 'scroller ' + ( el.id || el.className ) ); if ( r.right > vw + 1 && el.offsetParent !== null && ! el.closest( '.flow, .mock-phone, .mock-window' ) ) out.push( 'out ' + ( el.id || el.className || el.tagName ) + ' ' + Math.round( r.right ) ); } ); return [ ...new Set( out ) ].slice( 0, 6 ); } );
	await p.click( '.fab' ); await p.click( '[data-act=tx-expense]' );
	let r = await audit(); ok( ! r.length, `${ w }px expense sheet: nothing scrolls sideways or sticks out`, r.join( ' | ' ) );
	await p.click('[data-entry-group=category] > summary');await p.click( '[data-tx-catsmore]' ); r = await audit(); ok( ! r.length, `${ w }px expense sheet with all categories`, r.join( ' | ' ) );
	await p.click('[data-entry-group=payment] > summary');await p.click('[data-entry=date]'); r = await audit(); ok( ! r.length, `${ w }px date picker row`, r.join( ' | ' ) );
	await p.click('[data-entry=type]');await p.click( '[data-tx-type=transfer]' ); r = await audit(); ok( ! r.length, `${ w }px transfer sheet`, r.join( ' | ' ) );
	await p.keyboard.press( 'Escape' ); await p.click( '.fab' ); await p.click( '[data-act=add-bill]' ); r = await audit(); ok( ! r.length, `${ w }px bill sheet`, r.join( ' | ' ) );
	await p.keyboard.press( 'Escape' ); await p.evaluate( () => window.EXA.go( 'home' ) ); r = await audit(); ok( ! r.length, `${ w }px home`, r.join( ' | ' ) );
	await c.close();
}

/* ---- Plan: budgets, goals, recurring income */
{
	const { context: c, page: p } = await newPage( { viewport: { width: 390, height: 844 } } );
	await p.evaluate( () => { window.EXA.skipFlow(); const X = window.EX, S = X.state(); S.settings.currency = 'EUR'; S.accounts[ 0 ].currency = 'EUR'; S.txs.push( { id: 'e1', type: 'expense', amount: '60', category: 'food', date: X.today(), name: 'Shop', account: S.accounts[ 0 ].id } ); X.save(); window.EXA.go( 'plan' ); } );
	ok( await p.locator( '[data-plan=add-budget]' ).isVisible(), 'plan: the Plan screen opens with an add-budget button' );
	await p.click( '[data-plan=add-budget]' ); await p.selectOption( '#budgetForm [name=category]', 'food' ); await p.fill( '#budgetForm [name=amount]', '200' ); await p.click( '#budgetForm [type=submit]' );
	let s = await p.evaluate( () => JSON.parse( JSON.stringify( window.EX.state() ) ) ); ok( s.budgets.length === 1 && s.budgets[ 0 ].category === 'food' && s.budgets[ 0 ].amount === '200', 'plan: a budget is saved' );
	ok( ( await p.locator( '.bcard' ).innerText() ).includes( '€140' ), 'plan: the budget shows what is left (200 minus 60)' );
	await p.click( '[data-tab=goals]' ); await p.click( '[data-plan=add-goal]' ); await p.fill( '#goalForm [name=gname]', 'Trip' ); await p.fill( '#goalForm [name=target]', '1000' ); await p.click( '#goalForm [type=submit]' );
	s = await p.evaluate( () => JSON.parse( JSON.stringify( window.EX.state() ) ) ); ok( s.goals.length === 1 && s.goals[ 0 ].name === 'Trip', 'plan: a goal is saved' );
	await p.click( '[data-plan=goal-money]' ); await p.fill( '#contribForm [name=amount]', '300' ); await p.click( '#contribForm [type=submit]' );
	s = await p.evaluate( () => JSON.parse( JSON.stringify( window.EX.state() ) ) ); const gtx = s.txs.find( ( x ) => x.goalId ); ok( gtx && gtx.type === 'expense' && gtx.amount === '300', 'plan: adding money to a goal records a transaction tied to the goal' );
	ok( ( await p.locator( '.gcard' ).innerText() ).includes( '30%' ), 'plan: the goal ring shows 30 percent' );
	await p.evaluate( () => window.EXA.go( 'plan' ) ); await p.click( '[data-tab=budgets]' );
	ok( ( await p.locator( '.bcard' ).innerText() ).includes( '€140' ), 'plan: money set aside for a goal is not counted as spending' );
	await p.evaluate(()=>window.EXA.go('activity')); await p.click('[data-txtype=income]'); await p.click('[data-income-mode=recurring]'); await p.click( '[data-plan=add-income]' ); await p.fill( '#incomeForm [name=iname]', 'Salary' ); await p.fill( '#incomeForm [name=amount]', '1500' ); await p.selectOption('#incomeForm [name=account]',await p.evaluate(()=>EX.writableAccounts()[0].id));await p.click( '#incomeForm [type=submit]' );
	s = await p.evaluate( () => JSON.parse( JSON.stringify( window.EX.state() ) ) ); ok( s.incomes.length === 1 && s.incomes[ 0 ].repeat === 'monthly', 'plan: recurring income is saved' );
	const before = s.incomes[ 0 ].next; await p.click( '[data-plan=receive]' );
	s = await p.evaluate( () => JSON.parse( JSON.stringify( window.EX.state() ) ) ); ok( s.txs.some( ( x ) => x.incomeId === s.incomes[ 0 ].id && x.type === 'income' ) && s.incomes[ 0 ].next > before, 'plan: marking income received adds it and moves the next date on' );
	for ( const w of [ 320, 390 ] ) { await p.setViewportSize( { width: w, height: 800 } ); for ( const tb of [ 'budgets', 'goals', 'income' ] ) { await p.evaluate( ( x ) => { if(x==='income'){window.EXA.st.txFilter.type='income';window.EXA.st.incomeMode='recurring';window.EXA.go('activity');}else{window.EXA.st.planTab=x;window.EXA.go('plan');} }, tb ); const over = await p.evaluate( () => document.documentElement.scrollWidth > innerWidth + 1 || document.querySelector( '#view' ).scrollWidth > document.querySelector( '#view' ).clientWidth + 1 ); ok( ! over, `plan ${ tb } at ${ w }px: no sideways scrolling` ); } }
	await c.close();
}

/* ---- Reports: every tab draws, filters work, nothing scrolls sideways */
{
	const { context: c, page: p } = await newPage( { viewport: { width: 390, height: 844 } } );
	await p.evaluate( () => { window.EXA.skipFlow(); const X = window.EX, S = X.state(), td = X.today(); const w = S.accounts[ 0 ].id; S.accounts.push( { id: 'usd', name: 'Dollars', type: 'bank', currency: 'USD', opening: '300' } ); S.settings.currency = 'EUR'; S.accounts[ 0 ].currency = 'EUR'; S.accounts[ 0 ].opening = '1000';
		for ( let m = 0; m < 5; m++ ) { S.txs.push( { id: 'si' + m, type: 'income', amount: '1800', category: 'salary', date: X.addDays( td, -m * 30 ), name: 'Salary', account: w } ); [ [ 'food', 220 ], [ 'transport', 80 ], [ 'leisure', 60 ] ].forEach( ( [ k, a ], i ) => S.txs.push( { id: 'sx' + m + i, type: 'expense', amount: String( a + m * 5 ), category: k, date: X.addDays( td, -m * 30 - i - 1 ), name: k === 'food' ? 'Market' : 'Thing ' + i, account: i === 2 ? 'usd' : w } ) ); }
		S.bills.push( { id: 'nf', name: 'Netflix', amount: '15.99', currency: 'EUR', category: 'subscriptions', repeat: 'monthly', next: X.addDays( td, 5 ), day: 1, account: w } ); S.incomes.push( { id: 'in1', name: 'Salary', amount: '1800', currency: 'EUR', account: w, repeat: 'monthly', next: X.addDays( td, 10 ), day: 1, category: 'salary' } ); X.rates = { base: 'EUR', date: td, rates: { USD: 1.1 } }; X.save(); window.EXA.go( 'reports' ); } );
	for ( const w of [ 320, 390, 820 ] ) {
		await p.setViewportSize( { width: w, height: 900 } );
		const bad = [];
		for ( const tab of [ 'overview', 'spending', 'flow', 'trends', 'forecast', 'subs', 'table' ] ) {
			await p.evaluate( ( x ) => { window.EXA.st.rep.tab = x; window.EXA.go( 'reports' ); }, tab );
			const r = await p.evaluate( () => { const m = document.querySelector( '#view' ); const out = []; if ( document.documentElement.scrollWidth > innerWidth + 1 ) out.push( 'page' ); if ( m.scrollWidth > m.clientWidth + 1 ) out.push( 'view' ); m.querySelectorAll( '*' ).forEach( ( el ) => { const cs = getComputedStyle( el ); if ( ( cs.overflowX === 'auto' || cs.overflowX === 'scroll' ) && el.scrollWidth > el.clientWidth + 1 ) out.push( 'scroller ' + el.className ); } ); out.push( m.innerText.length < 30 ? 'empty' : '' ); return out.filter( Boolean ); } );
			if ( r.length ) bad.push( tab + ': ' + r.join( ',' ) );
		}
		ok( ! bad.length, `reports at ${ w }px: all seven tabs draw without sideways scrolling`, bad.join( ' | ' ) );
	}
	await p.setViewportSize( { width: 390, height: 844 } );
	await p.evaluate( () => { window.EXA.st.rep.tab = 'overview'; window.EXA.st.rep.period = '3m'; window.EXA.go( 'reports' ); } );
	ok( ( await p.locator( '.tiles' ).first().innerText() ).includes( '€' ), 'reports: the overview shows money in the main currency' );
	await p.click( '[data-rep=filters]' ); await p.selectOption( '#repFilterForm [name=cat]', 'food' ); await p.click( '#repFilterForm [type=submit]' );
	await p.click( '[data-tab=table]' );
	const rows = await p.locator( '.tbl.big tbody tr' ).count(); ok( rows > 0 && rows <= 5, `reports: the category filter narrows the table (${ rows } rows)` );
	await p.click( '[data-rep=filters]' ); await p.click( '[data-rep=clear]' );
	await p.click( '[data-tab=forecast]' ); ok( ( await p.locator( '#repBody' ).innerText() ).length > 100 && await p.locator( '#repBody svg.chart' ).count() >= 1, 'reports: the forecast draws a chart' );
	await c.close();
}

/* ---- Ideas: suggestions from the person's own data */
{
	const { context: c, page: p } = await newPage( { viewport: { width: 390, height: 844 } } );
	await p.evaluate( () => { window.EXA.skipFlow(); const X = window.EX, S = X.state(), td = X.today(), w = S.accounts[ 0 ].id; S.settings.currency = 'EUR'; S.accounts[ 0 ].currency = 'EUR'; S.settings.aims = [ 'save', 'subs' ];
		S.bills.push( { id: 'nf', name: 'Netflix', amount: '15.99', currency: 'EUR', category: 'subscriptions', repeat: 'monthly', next: X.addDays( td, 5 ), day: 1, account: w } );
		S.goals.push( { id: 'g1', name: 'Trip', target: '1000', deadline: '', icon: 'plane' } );
		[ 2, 6, 10, 14 ].forEach( ( d, i ) => S.txs.push( { id: 'dl' + i, type: 'expense', amount: '14.50', category: 'food', date: X.addDays( td, -d ), name: 'efood order', account: w } ) );
		[35,40].forEach((d,i)=>S.txs.push({id:'older'+i,type:'expense',amount:'5',category:'food',date:X.addDays(td,-d),name:'Food',account:w}));
		S.txs.push( { id: 'in', type: 'income', amount: '1500', category: 'salary', date: X.addDays( td, -3 ), name: 'Salary', account: w } ); X.save(); window.EXA.go( 'home' ); } );
	const ideas = await p.evaluate( () => window.EX.ideas.list().map( ( i ) => i.id ) );
	ok(ideas.includes('grow:food'),'ideas: spending growth has comparable recorded periods',ideas.join(','));
	const evidence=await p.evaluate(()=>window.EX.ideas.list().find(i=>i.id==='grow:food').evidence);
	ok(evidence.rows.length===4&&evidence.older.length===2,'ideas: comparison links to matching recorded expenses');
	ok(await p.locator('.idea').count()===1,'ideas: Home shows one focused suggestion');
	await p.click( '.idea [data-idea=off]' ); ok( ( await p.evaluate( () => window.EX.state().settings.tipsOff.length ) ) === 1, 'ideas: an idea can be hidden' );
	await p.evaluate( () => { window.EXA.st.ideasExpanded = true; window.EXA.go( 'home' ); } );
	ok( await p.locator( '.aim' ).count() === 7, 'ideas: the aims can be changed from Home Ideas' );
	const over = await p.evaluate( () => document.documentElement.scrollWidth > innerWidth + 1 ); ok( ! over, 'ideas: no sideways scrolling' );
	await c.close();
}

/* ---- A redraw never steals the field someone is typing in */
{
	const { context: c, page: p } = await newPage( { viewport: { width: 390, height: 844 } } );
	await p.evaluate( () => { window.EXA.skipFlow(); window.EXA.go( 'more', 'reminders' ); } );
	await p.click( '#setCur' ); await p.fill( '#setCur', 'US' );
	await p.evaluate( () => { window.EX.emit( 'remote' ); window.EX.emit( 'syncstatus' ); } ); await p.waitForTimeout( 200 );
	ok( await p.evaluate( () => document.activeElement.id === 'setCur' && document.activeElement.value === 'US' ), 'a sync redraw keeps the focus and the text of the field being typed in' );
	await p.evaluate( () => window.EXA.go( 'activity' ) ); await p.evaluate( () => { window.EXA.st.searchOpen = true; window.EXA.render(); } );
	await p.click( '#txSearch' ); await p.keyboard.type( 'cof' ); await p.evaluate( () => window.EX.emit( 'remote' ) ); await p.waitForTimeout( 200 );
	ok( await p.evaluate( () => document.activeElement.id === 'txSearch' && document.activeElement.value === 'cof' ), 'the search box keeps its text and focus across a redraw' );
	await c.close();
}

/* ---- Notifications when the app is closed (push): the card tells the truth in each situation */
{
	const { context: c, page: p } = await newPage( { viewport: { width: 390, height: 844 } } );
	await p.evaluate( () => { window.EXA.skipFlow(); window.EXA.go( 'more', 'reminders' ); } );
	ok( ( await p.locator( '.card', { hasText: 'Notifications on this device' } ).innerText() ).includes( 'Create an account' ), 'push: without an account the card says an account is needed' );
	ok( await p.locator( '#notifyBtn' ).count() === 1, 'push: guests still get notifications while the app is open' );
	await p.evaluate( () => { window.EX.auth.isSignedIn = () => true; window.EXA.render(); } );
	ok( await p.locator( '[data-push=on]' ).count() === 1 && await p.locator( '#notifyBtn' ).count() === 1, 'push: signed in, the card offers to turn notifications on' );
	await c.grantPermissions(['notifications']);
	await p.evaluate( () => { window.EX.state().device.push = { hour: 9 }; window.EX.state().device.notify = false; window.EXA.render(); } );
	ok( await p.locator( '#pushHour' ).count() === 1 && await p.locator( '[data-push=test]' ).count() === 1 && await p.locator( '#notifyBtn' ).count() === 0, 'push: when on, it shows the time, a test button and hides the in-app option' );
	await c.close();
}

/* ---- Home order, and Reports: an "All" view and icons on the tabs */
{
	const { context: c, page: p } = await newPage( { viewport: { width: 390, height: 844 } } );
	await p.evaluate( () => { window.EXA.skipFlow(); const X = window.EX, S = X.state(), td = X.today(); S.settings.aims = [ 'save' ]; S.bills.push( { id: 'hb', name: 'Rent', amount: '500', currency: 'EUR', category: 'housing', repeat: 'monthly', next: X.addDays( td, 2 ), day: 1, account: S.accounts[ 0 ].id } ); S.txs.push( { id: 'ht', type: 'income', amount: '1000', category: 'salary', date: td, name: 'Salary', account: S.accounts[ 0 ].id } ); S.goals = []; X.save(); window.EXA.go( 'home' ); } );
	const order = await p.evaluate( () => [ ...document.querySelectorAll( '#view .sec-head h2' ) ].map( ( h ) => h.textContent ) );
	ok( order.indexOf( 'Due soon' ) >= 0 && ( order.indexOf( 'Ideas for you' ) < 0 || order.indexOf( 'Due soon' ) < order.indexOf( 'Ideas for you' ) ), 'home: Due soon comes before Ideas for you', order.join( ' | ' ) );
	await p.evaluate( () => { const X = window.EX; X.state().bills[ 0 ].next = X.addDays( X.today(), 10 ); X.save(); window.EXA.go( 'home' ); } );
	const calm = await p.evaluate( () => [ ...document.querySelectorAll( '#view .sec-head h2' ) ].map( ( h ) => h.textContent ) );
	ok( calm.indexOf( 'Wallets' ) >= 0 && calm.indexOf( 'Wallets' ) < calm.indexOf( 'Due soon' ), 'home: with nothing due in two days, Wallets come first and Due soon follows', calm.join( ' | ' ) );
	await p.evaluate( () => { const X = window.EX; X.state().bills[ 0 ].next = X.addDays( X.today(), -1 ); X.save(); window.EXA.go( 'home' ); } );
	const late = await p.evaluate( () => [ ...document.querySelectorAll( '#view .sec-head h2' ) ].map( ( h ) => h.textContent ) );
	ok( late.indexOf( 'Due soon' ) < late.indexOf( 'Wallets' ), 'home: an overdue bill also puts Due soon first', late.join( ' | ' ) );
	await p.evaluate( () => window.EXA.go( 'reports' ) );
	ok( await p.locator( '.tabs2 .chip.on' ).innerText().then( ( s ) => /All/.test( s ) ), 'reports: opens on All' );
	ok( await p.locator( '.tabs2 .chip svg' ).count() === 8, 'reports: every tab has an icon' );
	ok( await p.locator( '.rep-sec' ).count() === 6, 'reports: All shows every report with a heading and an Open link' );
	await p.click( '.rep-sec [data-tab=forecast]' ); ok( await p.locator( '.tabs2 .chip.on' ).innerText().then( ( s ) => /Forecast/.test( s ) ), 'reports: Open goes to that report' );
	await c.close();
}

/* ---- Dragging a finger sideways on the page does not move the page: only swipe rows react */
{
	const { context: c, page: p } = await newPage( { viewport: { width: 390, height: 844 } } );
	const cd = await c.newCDPSession( p );
	await p.evaluate( () => { window.EXA.skipFlow(); window.EXA.setSkin( 'synthwave' ); window.EXA.go( 'home' ); } );
	const before = await p.evaluate( () => ( { x: document.querySelector( '.hero' ).getBoundingClientRect().x, sl: document.querySelector( '#view' ).scrollLeft } ) );
	const y = 220;
	await cd.send( 'Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [ { x: 300, y } ] } );
	for ( let i = 1; i <= 10; i++ ) await cd.send( 'Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [ { x: 300 - i * 25, y } ] } );
	const during = await p.evaluate( () => ( { x: document.querySelector( '.hero' ).getBoundingClientRect().x, sl: document.querySelector( '#view' ).scrollLeft, bl: document.scrollingElement.scrollLeft } ) );
	await cd.send( 'Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] } );
	ok( during.x === before.x && during.sl === 0 && during.bl === 0, 'a sideways drag on the page does not move it', JSON.stringify( [ before, during ] ) );
	await p.evaluate( () => { const X = window.EX, S = X.state(); S.budgets.push( { id: 'bx', category: 'food', amount: '20', period: 'monthly' } ); S.goals.push( { id: 'gx', name: 'A very long goal name for a trip with the whole family', target: '5000', icon: 'plane' } ); X.save(); window.EXA.setSkin( 'terminal' ); } );
	for ( const w of [ 360, 390 ] ) for ( const v of [ 'home', 'plan' ] ) { await p.setViewportSize( { width: w, height: 800 } ); await p.evaluate( ( x ) => window.EXA.go( x ), v ); ok( await p.evaluate( () => { const m = document.querySelector( '#view' ); return m.scrollWidth <= m.clientWidth + 1; } ), `budgets and goals fit at ${ w }px on ${ v } in a wide-lettered theme` ); }
	const css = await p.evaluate( () => ( { ox: getComputedStyle( document.querySelector( '#view' ) ).overflowX, ta: getComputedStyle( document.querySelector( '#view' ) ).touchAction } ) );
	ok( css.ox === 'hidden' && /pan-y/.test( css.ta ), 'the main view only pans vertically', JSON.stringify( css ) );
	await c.close();
}

/* ---- Tablets and computers: no swipe rows; a click opens the details with the same actions */
{
	const { context: c, page: p } = await newPage( { viewport: { width: 820, height: 1180 } } );
	const cd = await c.newCDPSession( p );
	await p.evaluate( () => { window.EXA.skipFlow(); const X = window.EX, S = X.state(); S.bills.push( { id: 'tb', name: 'Rent', amount: '500', currency: 'EUR', category: 'housing', repeat: 'monthly', next: X.today(), day: 1, account: S.accounts[ 0 ].id } ); S.txs.push( { id: 'tt', type: 'expense', amount: '9', category: 'food', date: X.today(), name: 'Lunch', account: S.accounts[ 0 ].id } ); X.save(); window.EXA.go( 'activity' ); } );
	ok( ! await p.locator( '.sw-back' ).first().isVisible(), 'tablet: the hidden swipe buttons are not shown' );
	const box = await p.locator( '.sw[data-kind=tx]' ).first().boundingBox();
	await cd.send( 'Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [ { x: box.x + 500, y: box.y + 30 } ] } );
	for ( let i = 1; i <= 8; i++ ) await cd.send( 'Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [ { x: box.x + 500 - i * 30, y: box.y + 30 } ] } );
	await cd.send( 'Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] } );
	ok( await p.locator( '.sw.open' ).count() === 0, 'tablet: dragging a row does not open swipe buttons' );
	await p.click( '.sw[data-kind=tx] .sw-front' );
	ok( await p.locator( '#sheet[open] [data-act=edit-tx], #pane [data-act=edit-tx]' ).count() >= 1 && await p.locator( '#sheet[open] [data-act=del-tx], #pane [data-act=del-tx]' ).count() >= 1, 'tablet: a click opens the details with Edit and Delete' );
	await c.close();
}

/* ---- Check for updates (More, Account) */
{
	const { context: c, page: p } = await newPage( { viewport: { width: 390, height: 844 } } );
	await p.evaluate( () => { window.EXA.skipFlow(); window.EXA.go( 'more', 'account' ); } );
	await p.waitForTimeout( 400 );
	await p.click( '#updBtn' ); await p.waitForFunction( () => /latest version/.test( document.querySelector( '#updLine' ).textContent ), null, { timeout: 5000 } );
	ok( true, 'update check: the same build says the app is up to date' );
	await c.route('**/releases.json',route=>route.fulfill({status:503,body:'Unavailable'}));
	await p.click('#updBtn'); await p.waitForFunction(()=>/Could not download/.test(document.querySelector('#updLine').textContent),null,{timeout:5000});
	ok(!await p.locator('#updBtn').isDisabled(),'update check: a failed manifest download shows an error and permits retry');
	await c.close();
}

/* ---- Effects: the balance card flips, numbers roll up and end on the real text */
{
	const { context: c, page: p } = await newPage( { viewport: { width: 390, height: 844 } } );
	await p.evaluate( () => { window.EXA.skipFlow(); const X = window.EX, S = X.state(); S.settings.currency = 'EUR'; S.accounts[ 0 ].currency = 'EUR'; S.accounts[ 0 ].opening = '1250'; X.save(); window.EXA.go( 'home' ); } );
	await p.waitForTimeout( 1300 );
	ok( ( await p.locator( '.hero-front > b' ).innerText() ).includes( '1,250' ), 'the rolling number ends on the real balance' );
	ok( await p.locator( '.hero-flip' ).getAttribute( 'aria-pressed' ) === 'false', 'the balance card starts on its front' );
	await p.click( '.hero-flip' ); await p.waitForTimeout( 900 );
	ok( await p.locator( '.hero-flip.flipped' ).count() === 1 && await p.locator( '.hero-flip' ).getAttribute( 'aria-pressed' ) === 'true', 'tapping the card flips it to this month' );
	const hidden = await p.evaluate( () => getComputedStyle( document.querySelector( '.hero-front' ) ).transform );
	ok( hidden !== 'none', 'the front is turned away', hidden );
	await p.evaluate( () => { window.EXA.go( 'activity' ); window.EXA.go( 'home' ); } );
	ok( await p.locator( '.hero-flip.flipped' ).count() === 1, 'the card stays flipped when you come back' );
	await p.keyboard.press( 'Tab' ); await p.evaluate( () => document.querySelector( '.hero-flip' ).focus() ); await p.keyboard.press( 'Enter' ); await p.waitForTimeout( 200 );
	ok( await p.locator( '.hero-flip.flipped' ).count() === 0, 'Enter flips it back (keyboard)' );
	await c.close();
}

/* ---- Migration from version 0.1 */
{
	const ctx2 = await browser.newContext( { locale: 'en-US' } );
	const old = await ctx2.newPage();
	await old.addInitScript( () => { localStorage.setItem( 'expenity.v1', JSON.stringify( { bills: [ { id: 'b1', name: 'Rent', amount: '850', currency: 'EUR', category: 'housing', repeat: 'monthly', next: '2030-01-01', day: 1 } ], payments: [ { id: 'p1', billId: 'b1', name: 'Rent', category: 'housing', currency: 'EUR', due: '2026-09-01', amount: '850', paidOn: '2026-09-01' } ], settings: { currency: 'EUR', lead: 3 } } ) ); } );
	await old.goto( BASE ); await old.waitForSelector( '#tabbar button', { state: 'attached' } );
	const mig = await old.evaluate( () => JSON.parse( JSON.stringify( window.EX.state() ) ) );
	ok( mig.bills.length === 1 && mig.txs.length === 1 && mig.txs[ 0 ].type === 'expense' && mig.txs[ 0 ].billId === 'b1' && mig.accounts.length === 1, 'data from version 0.1 moves over: payments become expense transactions' );
	ok( ! await old.locator( '#flow' ).isVisible(), 'someone with existing data skips the first-run flow' );
	await ctx2.close();
}

ok( ! errors.length, 'no console errors', errors.join( ' | ' ) );
await browser.close(); server.close();
console.log( fail ? `\n${ fail } failed` : '\nall passed' );
process.exit( fail ? 1 : 0 );

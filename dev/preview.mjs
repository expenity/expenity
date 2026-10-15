// Takes screenshots of the app on emulated phones, tablets and desktop, with demo data, for looking at the design.
//   node dev/preview.mjs <outdir> [el]
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
const OUT = process.argv[ 2 ] || '/tmp/expenity-preview', LANG = process.argv[ 3 ] || 'en';
mkdirSync( OUT, { recursive: true } );
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer( ( req, res ) => { const p = normalize( decodeURIComponent( req.url.split( '?' )[ 0 ] ) ); const f = join( process.cwd(), p === '/' ? 'index.html' : p ); if ( ! existsSync( f ) ) { res.writeHead( 404 ).end(); return; } res.writeHead( 200, { 'content-type': T[ extname( f ) ] || 'application/octet-stream' } ).end( readFileSync( f ) ); } ).listen( 0 );
const base = `http://localhost:${ server.address().port }/`;
const browser = await chromium.launch( { channel: 'chrome' } );
const DEMO = () => {
	const X = window.EX, S = X.state(), td = X.today(), t = X.t;
	S.settings.currency = 'EUR'; S.accounts.length = 0;
	S.accounts.push( { id: 'w1', name: t( 'wtBank' ), type: 'bank', currency: 'EUR', opening: '1200' }, { id: 'w2', name: t( 'wtCash' ), type: 'cash', currency: 'EUR', opening: '80' }, { id: 'w3', name: t( 'wtSavings' ), type: 'savings', currency: 'EUR', opening: '5400' } );
	const add = ( type, amount, category, off, name, account = 'w1' ) => S.txs.push( { id: X.uid(), type, amount: String( amount ), category, date: X.addDays( td, off ), name, account } );
	for ( let m = 0; m < 6; m++ ) { add( 'income', 1800 + m * 40, 'salary', -m * 30 - 9, t( 'cat_salary' ) ); [ [ 'food', 210 + m * 15 ], [ 'transport', 80 + m * 5 ], [ 'leisure', 90 ], [ 'shopping', 120 + m * 20 ], [ 'health', 35 ] ].forEach( ( [ c, a ], i ) => add( 'expense', a, c, -m * 30 - i * 2 - 1, t( 'cat_' + c ) ) ); }
	add( 'expense', 3.5, 'food', 0, t( 'sampleCoffee' ), 'w2' ); add( 'expense', 42.3, 'food', -1, t( 'cat_food' ) );
	const mk = ( key, amount, cat, repeat, off, extra = {} ) => S.bills.push( Object.assign( { id: X.uid(), name: t( key ), amount: String( amount ), currency: 'EUR', category: cat, repeat, next: X.addDays( td, off ), day: X.parse( X.addDays( td, off ) ).getDate(), lead: null, account: 'w1' }, extra ) );
	mk( 'sampleRent', 850, 'housing', 'monthly', 4 ); mk( 'sampleElectricity', 64.2, 'utilities', 'monthly', -2, { variable: true } ); mk( 'tplNetflix', 15.99, 'subscriptions', 'monthly', 1 ); mk( 'tplSpotify', 10.99, 'subscriptions', 'monthly', 12 ); mk( 'sampleCarIns', 420, 'insurance', 'yearly', 38 );
	S.budgets.push( { id: 'bg1', category: 'food', amount: '300', period: 'monthly', rollover: false }, { id: 'bg2', category: 'leisure', amount: '100', period: 'monthly', rollover: false }, { id: 'bg3', category: 'all', amount: '1500', period: 'monthly', rollover: true } ); S.goals.push( { id: 'g1', name: 'Summer trip', target: '2000', deadline: X.addDays( td, 150 ), icon: 'plane' }, { id: 'g2', name: 'Laptop', target: '1200', deadline: '', icon: 'device-laptop' } ); S.txs.push( { id: 'gt1', type: 'expense', amount: '700', account: 'w1', category: 'goal', date: X.addDays( td, -20 ), name: 'Summer trip', goalId: 'g1' }, { id: 'gt2', type: 'expense', amount: '300', account: 'w1', category: 'goal', date: X.addDays( td, -5 ), name: 'Summer trip', goalId: 'g1' }, { id: 'gt3', type: 'expense', amount: '250', account: 'w1', category: 'goal', date: X.addDays( td, -9 ), name: 'Laptop', goalId: 'g2' } ); S.incomes.push( { id: 'i1', name: 'Salary', amount: '1900', currency: 'EUR', account: 'w1', repeat: 'monthly', next: X.addDays( td, 11 ), day: 1, category: 'salary' } );
	S.settings.name = 'George'; S.device.bannerDismissed = false; window.EXA.skipFlow();
};
async function open( { width, height, dark = false, touch = true, demo = true, mobile = true } ) {
	const ctx = await browser.newContext( { viewport: { width, height }, deviceScaleFactor: 2, hasTouch: touch, isMobile: mobile && touch, locale: LANG === 'el' ? 'el-GR' : 'en-IE', colorScheme: dark ? 'dark' : 'light', timezoneId: 'Europe/Athens' } );
	await ctx.addInitScript( ( l ) => { localStorage.setItem( 'expenity.lang', l ); }, LANG );
	const page = await ctx.newPage();
	const errs = []; page.on( 'pageerror', ( e ) => errs.push( String( e ) ) );
	await page.goto( base ); await page.waitForSelector( '#tabbar button', { state: 'attached' } );
	if ( demo ) { await page.evaluate( DEMO ); await page.waitForTimeout( 300 ); }
	return { page, ctx, errs };
}
const shot = async ( page, name ) => { await page.waitForTimeout( 350 ); await page.screenshot( { path: join( OUT, name + '.png' ) } ); console.log( name ); };
const PHONE = { width: 390, height: 844 };
{ // Phone
	const { page, ctx, errs } = await open( { ...PHONE, demo: false } );
	await shot( page, 'p-flow1-welcome' ); await page.click( '[data-flow=guest]' );
	await page.click( '[data-fstep=plat][data-plat=ios]' ); await page.waitForTimeout( 1500 ); await shot( page, 'p-flow2-install-a' ); await page.waitForTimeout( 3000 ); await shot( page, 'p-flow2-install-b' ); await page.waitForTimeout( 3000 ); await shot( page, 'p-flow2-install-c' );
	await page.click( '[data-fstep=plat][data-plat=android]' ); await page.waitForTimeout( 4500 ); await shot( page, 'p-flow2-install-android' );
	await page.click( '[data-flow=install-skip]' ); await shot( page, 'p-flow3-name' ); await page.fill( '#setupForm [name=name]', 'George' ); await page.click( '[data-flow=next]' ); await shot( page, 'p-flow3-currency' ); await page.click( '[data-flow=next]' ); await shot( page, 'p-flow3-aims' ); await page.click( '[data-fstep=aim][data-aim=save]' ); await page.click( '[data-fstep=aim][data-aim=subs]' ); await shot( page, 'p-flow3-aims-on' ); await page.click( '[data-flow=next]' ); await page.click( '[data-fstep=gpreset][data-k=trip]' ); await page.fill( '#setupForm [name=gtarget]', '1500' ); await shot( page, 'p-flow3-goal' ); await page.click( '[data-flow=next]' ); await shot( page, 'p-flow3-wallets' ); await page.click( '[data-flow=next]' ); await shot( page, 'p-flow3-look' ); await page.click( '[data-flow=next]' ); await shot( page, 'p-flow3-done' );
	await page.evaluate( DEMO ); await page.waitForTimeout( 200 );
	await shot( page, 'p-home' );
	await page.click( '.fab' ); await shot( page, 'p-add-sheet' );
	await page.click( '[data-act=tx-expense]' ); await page.click( '[data-key="1"]' ); await page.click( '[data-key="2"]' ); await page.click( '[data-key="."]' ); await page.click( '[data-key="5"]' ); await page.fill( '#txDesc', 'Lunch' ); await shot( page, 'p-tx-sheet' );
	await page.keyboard.press( 'Escape' );
	await page.click( '[data-go=activity]:visible' ); await shot( page, 'p-activity' );
	await page.click( '[data-act=open-tx]' ); await shot( page, 'p-tx-detail' ); await page.keyboard.press( 'Escape' );
	await page.click( '[data-go=bills]:visible' ); await shot( page, 'p-bills' );
	await page.click( '[data-act=open-bill]' ); await shot( page, 'p-bill-detail' ); await page.keyboard.press( 'Escape' );
	await page.click( '[data-go=reports]:visible' ); await shot( page, 'p-reports' );
	await page.click( '.ab-avatar .avatar' ); await shot( page, 'p-more' );
	await page.click( '[data-more=appearance]' ); await shot( page, 'p-more-appearance' );
	await page.click( '[data-act=more-back]' ); await page.click( '[data-more=account]' ); await page.click( '[data-act=auth-signin]' ); await shot( page, 'p-auth' );
	console.log( 'errors:', errs.join( ' | ' ) || 'none' ); await ctx.close();
}
{ const { page, ctx } = await open( { ...PHONE } );
	await page.evaluate( () => { const X = window.EX, S = X.state(); S.settings.aims = [ 'save', 'subs' ]; S.txs.push( { id: 'dd1', type: 'expense', amount: '18.40', category: 'food', date: X.addDays( X.today(), -3 ), name: 'efood', account: 'w1' }, { id: 'dd2', type: 'expense', amount: '22.10', category: 'food', date: X.addDays( X.today(), -9 ), name: 'Wolt order', account: 'w1' } ); X.save(); window.EXA.go( 'home' ); } );
	await shot( page, 'pl-home' );
	await page.evaluate( () => { window.EXA.st.planTab = 'ideas'; window.EXA.go( 'plan' ); } ); await shot( page, 'pl-ideas' );
	for ( const tb of [ 'budgets', 'goals', 'income' ] ) { await page.evaluate( ( x ) => { window.EXA.st.planTab = x; window.EXA.go( 'plan' ); }, tb ); await shot( page, 'pl-' + tb ); }
	for ( const tb of [ 'overview', 'spending', 'flow', 'trends', 'forecast', 'subs', 'table' ] ) { await page.evaluate( ( x ) => { window.EXA.st.rep.tab = x; window.EXA.st.rep.period = '12m'; window.EXA.go( 'reports' ); }, tb ); await shot( page, 'rp-' + tb ); }
	await ctx.close(); }
{ const { page, ctx } = await open( { width: 820, height: 1180 } ); await page.evaluate( () => { window.EXA.st.rep.tab = 'overview'; window.EXA.st.rep.period = '12m'; window.EXA.go( 'reports' ); } ); await shot( page, 'rp-tablet' ); await page.evaluate( () => window.EXA.go( 'plan' ) ); await shot( page, 'pl-tablet' ); await ctx.close(); }
{ const { page, ctx } = await open( { ...PHONE, dark: true } ); await shot( page, 'p-home-dark' ); await page.click( '[data-go=activity]:visible' ); await shot( page, 'p-activity-dark' ); await ctx.close(); }
{ const { page, ctx } = await open( { width: 375, height: 667 } ); await shot( page, 'se-home' ); await page.click( '.fab' ); await page.click( '[data-act=tx-expense]' ); await shot( page, 'se-tx-sheet' ); await ctx.close(); }
{ const { page, ctx } = await open( { width: 820, height: 1180 } ); await shot( page, 't-home' ); await page.click( '[data-go=activity]:visible' ); await shot( page, 't-activity' ); await page.click( '[data-go=bills]:visible' ); await shot( page, 't-bills' ); await ctx.close(); }
{ const { page, ctx } = await open( { width: 744, height: 1133 } ); await shot( page, 'tmini-home' ); await ctx.close(); }
{ const { page, ctx } = await open( { width: 820, height: 1180, demo: false } ); await shot( page, 't-flow-welcome' ); await page.click( '[data-flow=guest]' ); await page.waitForTimeout( 2500 ); await shot( page, 't-flow-install' ); await ctx.close(); }
{ const { page, ctx } = await open( { width: 1280, height: 800 } ); await page.click( '[data-go=activity]:visible' ); await page.click( '[data-act=open-tx]' ); await shot( page, 'l-activity-pane' ); await page.click( '[data-go=reports]:visible' ); await shot( page, 'l-reports' ); await ctx.close(); }
{ const { page, ctx } = await open( { width: 1440, height: 900, touch: false, mobile: false } ); await page.click( '[data-go=bills]:visible' ); await page.click( '[data-act=open-bill]' ); await shot( page, 'd-bills-pane' ); await page.click( '.rail-add' ); await shot( page, 'd-add' ); await ctx.close(); }
{ // Every theme: home and activity on a phone
	const { page, ctx } = await open( { ...PHONE } );
	for ( const id of await page.evaluate( () => window.EXA.THEMES.map( ( x ) => x.id ) ) ) {
		await page.evaluate( ( x ) => { window.EXA.setSkin( x ); window.EXA.go( 'home' ); }, id ); await shot( page, 'th-' + id + '-home' );
		await page.evaluate( () => window.EXA.go( 'activity' ) ); await shot( page, 'th-' + id + '-activity' );
	}
	await page.evaluate( () => window.EXA.go( 'more', 'appearance' ) ); await shot( page, 'th-picker' );
	await ctx.close();
}
await browser.close(); server.close();

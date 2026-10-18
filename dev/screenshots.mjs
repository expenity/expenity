/**
 * Captures the documentation and website screenshots into docs/images/ from generated demo data (so the images can be
 * published freely), in English (*.png) and Greek (*-el.png). Phone shots are 390x844 at 2x; tablet is wider.
 *
 *   npm install && node dev/screenshots.mjs
 *
 * Needs Google Chrome (via playwright-core). Serves the repository folder on a local port.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const OUT = join( ROOT, 'docs/images' );
mkdirSync( OUT, { recursive: true } );
for ( const f of readdirSync( OUT ) ) if ( f.endsWith( '.png' ) ) unlinkSync( join( OUT, f ) ); // start clean: no stale screenshots
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = createServer( ( req, res ) => {
	const path = normalize( decodeURIComponent( req.url.split( '?' )[ 0 ] ) ).replace( /^(\.\.[/\\])+/, '' );
	const file = join( ROOT, path === '/' ? 'index.html' : path );
	if ( ! existsSync( file ) ) { res.writeHead( 404 ).end(); return; }
	res.writeHead( 200, { 'content-type': TYPES[ extname( file ) ] || 'application/octet-stream' } ).end( readFileSync( file ) );
} ).listen( 0 );
const BASE = `http://127.0.0.1:${ server.address().port }/`;
const browser = await chromium.launch( { channel: 'chrome' } );

const DEMO = () => {
	const X = window.EX, S = X.state(), td = X.today(), t = X.t;
	S.settings.currency = 'EUR'; S.settings.name = 'Maria'; S.settings.aims = [ 'save', 'subs', 'spend' ]; S.accounts.length = 0;
	S.accounts.push( { id: 'w1', name: t( 'wtBank' ), type: 'bank', currency: 'EUR', opening: '1200' }, { id: 'w2', name: t( 'wtCash' ), type: 'cash', currency: 'EUR', opening: '80' }, { id: 'w3', name: t( 'wtSavings' ), type: 'savings', currency: 'EUR', opening: '5400' } );
	const add = ( type, amount, category, off, name, account = 'w1' ) => S.txs.push( { id: X.uid(), type, amount: String( amount ), category, date: X.addDays( td, off ), name, account } );
	for ( let m = 0; m < 6; m++ ) { add( 'income', 1800 + m * 40, 'salary', -m * 30 - 9, t( 'cat_salary' ) ); [ [ 'food', 210 + m * 15 ], [ 'transport', 80 + m * 5 ], [ 'leisure', 90 ], [ 'shopping', 120 + m * 20 ], [ 'health', 35 ] ].forEach( ( [ c, a ], i ) => add( 'expense', a, c, -m * 30 - i * 2 - 1, t( 'cat_' + c ) ) ); }
	add( 'expense', 3.5, 'food', 0, t( 'sampleCoffee' ), 'w2' ); add( 'expense', 42.3, 'food', -1, t( 'cat_food' ) ); add( 'expense', 18.4, 'food', -3, 'efood' ); add( 'expense', 22.1, 'food', -9, 'Wolt' ); add( 'expense', 19.9, 'food', -14, 'efood' );
	const mk = ( key, amount, cat, repeat, off, extra = {} ) => S.bills.push( Object.assign( { id: X.uid(), name: t( key ), amount: String( amount ), currency: 'EUR', category: cat, repeat, next: X.addDays( td, off ), day: X.parse( X.addDays( td, off ) ).getDate(), lead: null, account: 'w1' }, extra ) );
	mk( 'sampleRent', 850, 'housing', 'monthly', 4 ); mk( 'sampleElectricity', 64.2, 'utilities', 'monthly', -2, { variable: true } ); mk( 'tourSubscription', 15.99, 'subscriptions', 'monthly', 1 ); mk( 'cat_subscriptions', 10.99, 'subscriptions', 'monthly', 12 ); mk( 'sampleCarIns', 420, 'insurance', 'yearly', 38 ); mk( 'sampleGym', 35, 'health', 'monthly', 16 );
	S.budgets.push( { id: 'bg1', category: 'food', amount: '300', period: 'monthly', rollover: false }, { id: 'bg2', category: 'leisure', amount: '100', period: 'monthly', rollover: false }, { id: 'bg3', category: 'all', amount: '1500', period: 'monthly', rollover: true } );
	S.goals.push( { id: 'g1', name: t( 'goalPreset_trip' ), target: '2000', deadline: X.addDays( td, 150 ), icon: 'plane' }, { id: 'g2', name: X.lang() === 'el' ? 'Υπολογιστής' : 'Laptop', target: '1200', deadline: '', icon: 'device-laptop' } );
	S.txs.push( { id: 'gt1', type: 'expense', amount: '700', account: 'w1', category: 'goal', date: X.addDays( td, -20 ), name: t( 'goalPreset_trip' ), goalId: 'g1' }, { id: 'gt2', type: 'expense', amount: '300', account: 'w1', category: 'goal', date: X.addDays( td, -5 ), name: t( 'goalPreset_trip' ), goalId: 'g1' }, { id: 'gt3', type: 'expense', amount: '250', account: 'w1', category: 'goal', date: X.addDays( td, -9 ), name: X.lang() === 'el' ? 'Υπολογιστής' : 'Laptop', goalId: 'g2' } );
	S.incomes.push( { id: 'i1', name: t( 'cat_salary' ), amount: '1900', currency: 'EUR', account: 'w1', repeat: 'monthly', next: X.addDays( td, 11 ), day: 1, category: 'salary' } );
	S.device.bannerDismissed = true; S.device.scanHoldHintSeen = true; S.device.installDismissed = true; window.EXA.skipFlow();
};

async function open( lang, { width = 390, height = 844, dark = false, touch = true, demo = true } = {} ) {
	const context = await browser.newContext( { viewport: { width, height }, deviceScaleFactor: 2, hasTouch: touch, isMobile: touch && width < 700, locale: lang === 'el' ? 'el-GR' : 'en-IE', colorScheme: dark ? 'dark' : 'light', timezoneId: 'Europe/Athens' } );
	await context.addInitScript( ( l ) => { try { localStorage.setItem( 'expenity.lang', l ); } catch ( e ) { /* ignore */ } }, lang );
	const page = await context.newPage();
	await page.goto( BASE ); await page.waitForSelector( '#tabbar button', { state: 'attached' } );
	if ( demo ) { await page.evaluate( DEMO ); await page.waitForTimeout( 400 ); }
	return { page, context };
}
let sfx = '';
const shot = async ( page, name ) => { await page.waitForTimeout( 950 ); await page.screenshot( { path: join( OUT, name + sfx + '.png' ) } ); console.log( name + sfx ); };
const go = ( page, view, more ) => page.evaluate( ( [ v, m ] ) => window.EXA.go( v, m || 'root' ), [ view, more ] );

for ( const lang of [ 'en', 'el' ] ) {
	sfx = lang === 'el' ? '-el' : '';
	{ // First run: welcome, install guide, setup wizard (phone)
		const { page, context } = await open( lang, { demo: false } );
		await shot( page, 'welcome' );
		await page.click( '[data-flow=guest]' ); await page.click( '[data-fstep=plat][data-plat=ios]' ); await page.waitForTimeout( 1500 ); await shot( page, 'install' );
		await page.click( '[data-flow=install-skip]' ); await page.waitForTimeout( 300 ); await page.locator( '#sheet[open] .btn:not([data-close])' ).first().click().catch( () => {} ); await page.waitForTimeout( 400 ); await page.fill( '#setupForm [name=name]', 'Maria' ); await page.click( '[data-flow=next]' ); await page.click( '[data-flow=next]' );
		await page.click( '[data-fstep=aim][data-aim=save]' ); await page.click( '[data-fstep=aim][data-aim=subs]' ); await shot( page, 'setup-aims' );
		for ( let i = 0; i < 9 && await page.locator( '.swipe-demo' ).count() === 0; i++ ) { if(await page.locator('.tour-grid').count())await shot(page,'setup-tour'); await page.click('[data-flow=next]'); } await page.waitForTimeout( 2200 ); await shot( page, 'setup-tips' );
		await context.close();
	}
	{ // The app on a phone
		const { page, context } = await open( lang );
		await shot( page, 'home' );
		await page.click( '.fab' ); await page.click( '[data-act=tx-expense]' ); await page.click('[data-tx=target-amount]'); await page.click( '[data-key="1"]' ); await page.click( '[data-key="2"]' ); await page.click( '[data-key="."]' ); await page.click( '[data-key="5"]' ); await page.fill( '#txDesc', lang === 'el' ? 'Μεσημεριανό' : 'Lunch' ); await page.click('[data-tx=field-done]'); await shot( page, 'add-expense' );
		await page.keyboard.press( 'Escape' );
		await go( page, 'activity' ); await shot( page, 'activity' );
		await go( page, 'bills' ); await shot( page, 'bills' );
		await page.evaluate( () => { window.EXA.st.planTab = 'budgets'; } ); await go( page, 'plan' ); await shot( page, 'plan-budgets' );
		await page.evaluate( () => { window.EXA.st.planTab = 'goals'; } ); await go( page, 'plan' ); await shot( page, 'plan-goals' );
		await page.evaluate( () => { window.EXA.st.ideasExpanded = true; } ); await go( page, 'home' ); await shot( page, 'plan-ideas' );
		for ( const tab of [ 'overview', 'spending', 'forecast' ] ) { await page.evaluate( ( x ) => { window.EXA.st.rep.tab = x; window.EXA.st.rep.period = '12m'; }, tab ); await go( page, 'reports' ); await shot( page, 'reports-' + tab ); }
		await go( page, 'more', 'wallets' ); await shot( page, 'wallets' );
		await go( page, 'more', 'appearance' ); await shot( page, 'themes' );
		await page.evaluate( () => { window.EX.auth.isSignedIn = () => true; window.EX.auth.user = () => ( { id: 'u1', email: 'maria@example.com' } ); const S = window.EX.state(); S.accounts[ 0 ].space = 'abc12345def67890'; S.sync.spaces = { abc12345def67890: { name: S.accounts[ 0 ].name, role: 'owner', owner: true, members: 2, rev: 0, base: {} } }; window.EX.spaces.members = async () => ( { ok: true, json: { members: [ { id: 'u1', email: 'maria@example.com', role: 'owner', you: true }, { id: 'u2', email: 'nikos@example.com', role: 'editor' } ], invites: [] } } ); window.EXA.openShare( S.accounts[ 0 ].id ); } );
		await shot( page, 'share' );
		await context.close();
	}
	{ // New in 0.2x: features, tutorials, help, targets, filters, recently deleted, drafts, contact, theme editor, avatar, hold menu
		const { page, context } = await open( lang );
		await go( page, 'home' ); await page.waitForTimeout( 600 );
		await page.evaluate( () => { const S = window.EX.state(); S.settings.targets = { spend: { period: 'month', amount: '900' }, income: { period: 'month', amount: '2500' } }; window.EXA.render(); } );
		await shot( page, 'home-targets' );
		await page.click( '[data-target-edit]' ); await page.waitForSelector( '#targetForm' ); await shot( page, 'targets' ); await page.evaluate( () => window.UI.closeSheet( true ) );
		await go( page, 'more', 'features' ); await shot( page, 'features' );
		await page.evaluate( () => { window.EXA.features.choose( 'advanced' ); } );
		await go( page, 'more', 'tutorials' ); await shot( page, 'tutorials' );
		await go( page, 'home' ); await page.evaluate( () => window.EXA.help.open( 'scan', true ) ); await page.waitForTimeout( 1500 ); await shot( page, 'help-popup' ); await page.evaluate( () => document.querySelector( '[data-hp-close]' ).click() );
		await go( page, 'activity' ); await page.evaluate( () => { window.EXA.st.searchOpen = true; Object.assign( window.EXA.st.txFilter, { min: '20', max: '300', from: '', to: '' } ); window.EXA.render(); } ); await shot( page, 'filters' );
		await page.evaluate( () => { Object.assign( window.EXA.st.txFilter, { min: '', max: '', from: '', to: '' } ); window.EXA.st.searchOpen = false; } );
		await page.evaluate( () => { const S = window.EX.state(); const x = S.txs.find( ( y ) => y.type === 'expense' ); window.EXA.removeTx( x.id ); } ); await go( page, 'more', 'trash' ); await page.evaluate( () => { document.getElementById( 'toast' ).hidden = true; } ); await shot( page, 'trash' );
		await page.evaluate( () => window.EXA.openTx( null, { type: 'expense' } ) ); await page.waitForSelector( '#txDesc' ); await page.fill( '#txDesc', lang === 'el' ? 'Μανάβης' : 'Farmers market' ); await page.waitForTimeout( 900 );
		await page.evaluate( () => window.UI.closeSheet( true ) ); await go( page, 'home' ); await page.evaluate( () => { document.getElementById( 'toast' ).hidden = true; } ); await shot( page, 'drafts' );
		await page.evaluate( () => window.EXA.contact.open() ); await page.click( '#ctEditor' ); await page.keyboard.type( lang === 'el' ? 'Μου αρέσει πολύ η εφαρμογή!' : 'I love the app, thank you!' ); await shot( page, 'contact' ); await page.evaluate( () => window.UI.closeSheet( true ) );
		await go( page, 'more', 'appearance' ); await page.click( '[data-theme-edit=sunset]' ); await page.waitForSelector( '#customThemeForm' ); await shot( page, 'theme-edit' ); await page.evaluate( () => window.UI.closeSheet( true ) );
		await page.evaluate( () => { window.EX.state().settings.avatar = { type: 'preset', id: 'fox' }; window.EXA.avatar.open(); } ); await shot( page, 'avatar' ); await page.evaluate( () => window.UI.closeSheet( true ) );
		await go( page, 'activity' ); await page.waitForSelector( '.sw .sw-front' ); { const b = await page.locator( '.sw .sw-front' ).first().boundingBox(); await page.mouse.move( b.x + 60, b.y + 25 ); await page.mouse.down(); await page.waitForTimeout( 700 ); await page.mouse.up(); } await shot( page, 'hold-menu' );
		await context.close();
	}
	{ // First-run steps that are new: plan, daily number, extras, help icon
		const { page, context } = await open( lang, { demo: false } );
		await page.click( '[data-flow=guest]' ); await page.click( '[data-fstep=plat][data-plat=ios]' ).catch( () => {} ); await page.click( '[data-flow=install-skip]' ); await page.waitForTimeout( 300 ); await page.locator( '#sheet[open] .btn:not([data-close])' ).first().click().catch( () => {} );
		const wanted = { plan: 'setup-plan', target: 'setup-daily', extras: 'setup-extras', help: 'setup-help', scan: 'setup-scan' };
		for ( let i = 0; i < 22; i++ ) {
			await page.waitForTimeout( 500 );
			const h = await page.evaluate( () => ( document.querySelector( '#flow h1' ) || {} ).textContent || '' );
			const key = await page.evaluate( () => ( document.querySelector( '#flow [data-fstep=plan]' ) ? 'plan' : document.querySelector( '#flow [data-fstep=tgt]' ) ? 'target' : document.querySelector( '#flow [data-car]' ) ? 'extras' : document.querySelector( '#flow .help-demo' ) ? 'help' : document.querySelector( '#flow .tt-phone' ) ? 'scan' : '' ) );
			if ( key && wanted[ key ] ) { await shot( page, wanted[ key ] ); delete wanted[ key ]; }
			const nm = page.locator( '#setupForm [name=name]' ); if ( await nm.count() ) await nm.fill( 'Maria' );
			if ( await page.locator( '[data-flow=start]' ).count() ) break;
			const nx = page.locator( '[data-flow=next]' ); if ( await nx.count() ) await nx.click();
		}
		await context.close();
	}
	{ // Themes: six looks side by side (one image)
		const { page, context } = await open( lang );
		const shots = [];
		for ( const id of [ 'minimal', 'paper', 'terminal', 'synthwave', 'blueprint', 'candy' ] ) { await page.evaluate( ( x ) => { window.EXA.setSkin( x ); window.EXA.go( 'home' ); }, id ); await page.waitForTimeout( 500 ); shots.push( 'data:image/png;base64,' + ( await page.screenshot() ).toString( 'base64' ) ); }
		const tp = await context.newPage();
		await tp.setViewportSize( { width: 1500, height: 560 } );
		await tp.setContent( `<body style="margin:0;background:#e9efec;display:flex;gap:18px;padding:18px;justify-content:center;overflow:hidden">${ shots.map( ( s ) => `<img src="${ s }" style="height:524px;border-radius:22px;box-shadow:0 14px 30px -14px rgba(0,0,0,.45)">` ).join( '' ) }</body>` );
		await tp.waitForTimeout( 500 ); await tp.screenshot( { path: join( OUT, 'themes-gallery' + sfx + '.png' ) } ); console.log( 'themes-gallery' + sfx );
		await context.close();
	}
	{ // Dark and tablet
		const { page, context } = await open( lang, { dark: true } ); await shot( page, 'home-dark' ); await context.close();
		const t = await open( lang, { width: 820, height: 1180 } ); await shot( t.page, 'tablet-home' ); await go( t.page, 'reports' ); await shot( t.page, 'tablet-reports' ); await t.context.close();
	}
}
await browser.close(); server.close();

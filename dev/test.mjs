/**
 * Logic tests for the app, run in a real browser: quick-add parsing in English and Greek,
 * recurrence, calendar file, and the language switch.   npm test
 * Needs Google Chrome (via playwright-core).
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
const BASE = `http://127.0.0.1:${ server.address().port }/`;

const browser = await chromium.launch( { channel: 'chrome' } );
const page = await ( await browser.newContext( { locale: 'en-US' } ) ).newPage();
const errors = [];
page.on( 'pageerror', ( e ) => errors.push( String( e ) ) );
page.on( 'console', ( m ) => { if ( m.type() === 'error' && ! /beacon|cloudflare|ERR_/.test( m.text() ) ) errors.push( m.text() ); } );
await page.goto( BASE );
await page.waitForSelector( '.empty' );

let fail = 0;
const ok = ( cond, label, extra = '' ) => { if ( ! cond ) { fail++; console.log( 'FAIL', label, extra ); } else console.log( 'ok  ', label ); };

const q = ( text ) => page.evaluate( ( x ) => window.Duenest.parseQuick( x ), text );
const eq = async ( text, want ) => {
	const got = await q( text );
	const bad = Object.entries( want ).filter( ( [ k, v ] ) => got[ k ] !== v );
	ok( ! bad.length, `parse: ${ text }`, JSON.stringify( got ) );
};

await eq( 'Netflix 15.99 monthly on the 3rd', { name: 'Netflix', amount: '15.99', repeat: 'monthly', day: 3 } );
await eq( 'Rent €850 every month on 1st', { name: 'Rent', amount: '850', currency: 'EUR', repeat: 'monthly', day: 1 } );
await eq( 'Electricity ~60 monthly 15th', { name: 'Electricity', amount: '60', variable: true, repeat: 'monthly', day: 15 } );
await eq( 'Car insurance 420 yearly 12 march', { name: 'Car insurance', amount: '420', repeat: 'yearly', day: 12 } );
await eq( 'Gym £35 weekly friday', { name: 'Gym', amount: '35', currency: 'GBP', repeat: 'weekly' } );
await eq( 'Phone 25 tomorrow', { name: 'Phone', amount: '25', repeat: 'once' } );
await eq( 'Netflix 15,99 μηνιαία στις 3', { name: 'Netflix', amount: '15.99', repeat: 'monthly', day: 3 } );
await eq( 'Ενοίκιο 850€ κάθε μήνα στις 1', { name: 'Ενοίκιο', amount: '850', currency: 'EUR', repeat: 'monthly', day: 1 } );
await eq( 'Ρεύμα ΔΕΗ ~60 ευρώ κάθε μήνα την 15η', { name: 'Ρεύμα ΔΕΗ', amount: '60', variable: true, repeat: 'monthly', day: 15 } );
await eq( 'Ασφάλεια αυτοκινήτου 420 ετήσια 12 Μαρτίου', { name: 'Ασφάλεια αυτοκινήτου', amount: '420', repeat: 'yearly', day: 12 } );
await eq( 'Γυμναστήριο 35 εβδομαδιαία Παρασκευή', { name: 'Γυμναστήριο', amount: '35', repeat: 'weekly' } );
await eq( 'ΕΝΦΙΑ 300 τριμηνιαία 28 Φεβρουαρίου', { name: 'ΕΝΦΙΑ', amount: '300', repeat: 'quarterly', day: 28 } );

// Recurrence: a bill due on the 31st keeps its day across short months.
const rec = await page.evaluate( () => {
	const D = window.Duenest, b = { repeat: 'monthly', day: 31 };
	const a = D.nextAfter( b, '2026-01-31' ), c = D.nextAfter( b, a ), d = D.nextAfter( b, c );
	return [ a, c, d, D.nextAfter( { repeat: 'yearly', day: 29 }, '2028-02-29' ), D.nextAfter( { repeat: 'once' }, '2026-01-01' ) ];
} );
ok( rec[ 0 ] === '2026-02-28' && rec[ 1 ] === '2026-03-31' && rec[ 2 ] === '2026-04-30', 'recurrence: monthly on the 31st', rec.join( ' ' ) );
ok( rec[ 3 ] === '2029-02-28' && rec[ 4 ] === null, 'recurrence: leap day yearly, one-off ends', rec.join( ' ' ) );

// The app: add a bill in a sentence, mark it paid, undo, calendar file.
await page.click( '#addBtn' );
await page.fill( '#quick', 'Netflix 15.99 monthly on the 3rd' );
ok( ( await page.inputValue( '[name=name]' ) ) === 'Netflix' && ( await page.inputValue( '[name=amount]' ) ) === '15.99', 'form is filled from the sentence' );
await page.click( '#saveBtn' );
await page.waitForSelector( '.row' );
ok( ( await page.locator( '.row' ).count() ) === 1, 'bill appears in the list' );
await page.click( '[data-act=paid]' );
await page.click( '#payDlg [type=submit]' );
ok( ( await page.evaluate( () => window.Duenest.state().payments.length ) ) === 1, 'mark paid records a payment' );
await page.click( '#toast .link' );
ok( ( await page.evaluate( () => window.Duenest.state().payments.length ) ) === 0, 'undo removes the payment' );
const ics = await page.evaluate( () => window.Duenest.buildIcs() );
ok( /BEGIN:VEVENT/.test( ics ) && /RRULE:FREQ=MONTHLY/.test( ics ) && /TRIGGER:-PT63H/.test( ics ) && /\r\n/.test( ics ), 'calendar file has event, rule and 3-day alarm' );

// Greek.
await page.click( '#langBtn' );
ok( ( await page.locator( '#tabs button' ).first().innerText() ) === 'Σήμερα' && ( await page.getAttribute( 'html', 'lang' ) ) === 'el', 'switching to Greek translates the app' );
ok( /^Πληρωμή: Netflix/.test( ( await page.evaluate( () => window.Duenest.buildIcs() ).then( ( s ) => /SUMMARY:(.*)/.exec( s )[ 1 ] ) ) ), 'calendar file follows the language' );
ok( ( await page.evaluate( () => localStorage.getItem( 'duenest.lang' ) ) ) === 'el', 'language is remembered' );
for ( const tab of [ 'calendar', 'insights', 'settings' ] ) { await page.click( `[data-tab=${ tab }]` ); ok( ( await page.locator( '#view' ).innerText() ).length > 20, `Greek ${ tab } view renders` ); }
await page.click( '[data-lang=en]' );
ok( ( await page.getAttribute( 'html', 'lang' ) ) === 'en', 'back to English' );

ok( ! errors.length, 'no console errors', errors.join( ' | ' ) );
await browser.close(); server.close();
console.log( fail ? `\n${ fail } failed` : '\nall passed' );
process.exit( fail ? 1 : 0 );

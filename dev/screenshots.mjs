/**
 * Captures the documentation screenshots into docs/images/ from the app's built-in sample bills
 * (generated data, so the images can be published freely), in English (*.png) and Greek (*-el.png).
 *
 *   npm install && node dev/screenshots.mjs
 *
 * Needs Google Chrome (via playwright-core). Serves the repository folder on a local port.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const OUT = join( ROOT, 'docs/images' );
mkdirSync( OUT, { recursive: true } );
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = createServer( ( req, res ) => {
	const path = normalize( decodeURIComponent( req.url.split( '?' )[ 0 ] ) ).replace( /^(\.\.[/\\])+/, '' );
	const file = join( ROOT, path === '/' ? 'index.html' : path );
	if ( ! existsSync( file ) ) { res.writeHead( 404 ).end(); return; }
	res.writeHead( 200, { 'content-type': TYPES[ extname( file ) ] || 'application/octet-stream' } ).end( readFileSync( file ) );
} ).listen( 0 );
const BASE = `http://127.0.0.1:${ server.address().port }/`;
const browser = await chromium.launch( { channel: 'chrome' } );

async function open( lang, { width = 1280, height = 860, dark = false, sample = true } = {} ) {
	const context = await browser.newContext( { viewport: { width, height }, deviceScaleFactor: 2, locale: lang === 'el' ? 'el-GR' : 'en-IE', colorScheme: dark ? 'dark' : 'light', timezoneId: 'Europe/Athens' } );
	await context.addInitScript( ( l ) => { try { localStorage.setItem( 'expenity.lang', l ); } catch ( e ) { /* ignore */ } }, lang );
	const page = await context.newPage();
	await page.goto( BASE );
	await page.waitForSelector( '.empty' );
	if ( sample ) { await page.click( '[data-act=sample]' ); await page.waitForSelector( '.row' ); await page.evaluate( () => { document.getElementById( 'toast' ).hidden = true; } ); }
	await page.waitForTimeout( 250 );
	return { page, context };
}
const shot = async ( page, name, opts = {} ) => { await page.waitForTimeout( 150 ); await page.screenshot( { path: join( OUT, name + '.png' ), ...opts } ); console.log( name ); };

for ( const lang of [ 'en', 'el' ] ) {
	const sfx = lang === 'el' ? '-el' : '';
	{ // Empty state, then today.
		const { page, context } = await open( lang, { sample: false } );
		await shot( page, 'empty' + sfx );
		await page.click( '[data-act=sample]' ); await page.waitForSelector( '.row' ); await page.evaluate( () => { document.getElementById( 'toast' ).hidden = true; } );
		await shot( page, 'today' + sfx );
		// Paid sheet, add dialog with a sentence.
		await page.click( '.row [data-act=paid]' ); await shot( page, 'mark-paid' + sfx );
		await page.keyboard.press( 'Escape' );
		await page.click( '#addBtn' );
		await page.fill( '#quick', lang === 'el' ? 'Netflix 15,99 μηνιαία στις 3' : 'Netflix 15.99 monthly on the 3rd' );
		await shot( page, 'add-bill' + sfx );
		await page.keyboard.press( 'Escape' );
		await page.click( '[data-tab=calendar]' ); await shot( page, 'calendar' + sfx );
		await page.click( '[data-tab=insights]' ); await shot( page, 'insights' + sfx );
		await page.click( '[data-tab=settings]' ); await shot( page, 'settings' + sfx );
		await context.close();
	}
	{ // Phone and dark mode.
		const { page, context } = await open( lang, { width: 390, height: 844 } );
		await shot( page, 'phone-today' + sfx );
		await context.close();
		const d = await open( lang, { dark: true } );
		await shot( d.page, 'today-dark' + sfx );
		await d.context.close();
	}
}
await browser.close(); server.close();

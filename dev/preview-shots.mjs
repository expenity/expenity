/**
 * Makes the pictures for the website's "Try it" preview (website/src/assets/preview/): the real app, in demo mode, in four themes,
 * on an iPhone, an iPad and a computer, in English and Greek. For each: the home screen (a tall one for the phone, so it can be
 * scrolled), the phone's bottom bar, and the add-expense sheet, plus the positions of the + and close buttons (preview.json).
 *   node dev/preview-shots.mjs
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';
const ROOT = process.cwd(), OUT = join( ROOT, 'website/src/assets/preview' );
rmSync( OUT, { recursive: true, force: true } ); mkdirSync( OUT, { recursive: true } );
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/json' };
const srv = createServer( ( q, r ) => { const p = q.url.split( '?' )[ 0 ]; const f = join( ROOT, p === '/' ? 'index.html' : p ); if ( ! existsSync( f ) ) { r.writeHead( 404 ).end(); return; } r.writeHead( 200, { 'content-type': T[ extname( f ) ] || 'application/octet-stream' } ).end( readFileSync( f ) ); } ).listen( 0 );
const browser = await chromium.launch( { channel: 'chrome' } );
const THEMES = [ 'sunset', 'emerald', 'synthwave', 'candy' ];
const DEVICES = { phone: { w: 390, h: 844, dpr: 1.5, tall: 1750 }, ipad: { w: 820, h: 1180, dpr: 1.25 }, desktop: { w: 1280, h: 800, dpr: 1 } };
const meta = {};
const jpg = ( page, name, opts = {} ) => page.screenshot( { path: join( OUT, name + '.jpg' ), type: 'jpeg', quality: 76, ...opts } );
for ( const lang of [ 'en', 'el' ] ) for ( const skin of THEMES ) for ( const [ dev, d ] of Object.entries( DEVICES ) ) {
	const ctx = await browser.newContext( { viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, locale: lang === 'el' ? 'el-GR' : 'en-IE', reducedMotion: 'reduce' } );
	const page = await ctx.newPage(); const key = `${ dev }-${ skin }-${ lang }`;
	await page.goto( `http://localhost:${ srv.address().port }/?demo=1&lang=${ lang }&skin=${ skin }` ); await page.waitForSelector( 'html[data-demo-ready="1"]' );
	await page.evaluate( () => window.EXA.setMotion( 'off' ) );
	if ( dev === 'phone' ) await page.addStyleTag( { content: ':root { --safe-t: 44px !important; }' } );
	await page.waitForTimeout( 700 );
	const rect = ( sel ) => page.evaluate( ( s ) => { const e = document.querySelector( s ); if ( ! e ) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sel );
	if ( dev === 'phone' ) {
		const bar = await rect( '#tabbar' ), fab = await rect( '.fab' );
		await jpg( page, key + '-bar', { clip: { x: 0, y: bar.y, width: d.w, height: d.h - bar.y } } );
		await page.setViewportSize( { width: d.w, height: d.tall } ); await page.addStyleTag( { content: '#tabbar { display: none !important; }' } ); await page.waitForTimeout( 500 );
		await jpg( page, key + '-home' );
		await page.setViewportSize( { width: d.w, height: d.h } ); await page.addStyleTag( { content: '#tabbar { display: flex !important; }' } ); await page.waitForTimeout( 300 );
		meta.phone = { w: d.w, h: d.h, tall: d.tall, barH: d.h - bar.y, add: { x: fab.x, y: fab.y, w: fab.w, h: fab.h } };
	} else {
		await jpg( page, key + '-home' );
		const add = await rect( '.rail-add' ); meta[ dev ] = { w: d.w, h: d.h, add };
	}
	await page.evaluate( () => window.EXA.openTx( null, { type: 'expense' } ) ); await page.waitForSelector( '#txDesc' ); await page.waitForTimeout( 400 );
	await page.click( '[data-tx=target-amount]' ); for ( const k of [ '1', '2', '.', '5', '0' ] ) await page.click( `[data-key="${ k }"]` ).catch( () => {} );
	await page.fill( '#txDesc', lang === 'el' ? 'Καφές' : 'Coffee' ).catch( () => {} ); await page.waitForTimeout( 500 );
	await jpg( page, key + '-add' );
	meta[ dev ].close = await rect( '#sheet [data-close]' );
	await ctx.close(); console.log( key );
}
writeFileSync( join( OUT, 'preview.json' ), JSON.stringify( meta ) );
await browser.close(); srv.close();

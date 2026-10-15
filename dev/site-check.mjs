// Serves website/dist like GitHub Pages (under /expenity/), screenshots key pages to the given folder and reports console errors and broken links.
//   node dev/site-check.mjs <outdir>
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
const DIST = join( process.cwd(), 'website/dist' ), OUT = process.argv[ 2 ] || '/tmp/expenity-site';
mkdirSync( OUT, { recursive: true } );
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.xml': 'text/xml', '.webmanifest': 'application/manifest+json' };
const server = createServer( ( req, res ) => {
	let p = normalize( decodeURIComponent( req.url.split( '?' )[ 0 ] ) ).replace( /^\/expenity/, '' );
	let f = join( DIST, p );
	if ( existsSync( f ) && statSync( f ).isDirectory() ) f = join( f, 'index.html' );
	if ( ! existsSync( f ) ) { res.writeHead( 404 ).end( 'nf' ); return; }
	res.writeHead( 200, { 'content-type': T[ extname( f ) ] || 'application/octet-stream' } ).end( readFileSync( f ) );
} ).listen( 0 );
const BASE = `http://127.0.0.1:${ server.address().port }/expenity/`;
const browser = await chromium.launch( { channel: 'chrome' } );
const bad = [];
async function visit( path, name, { width = 1360, height = 900, full = true } = {} ) {
	const ctx = await browser.newContext( { viewport: { width, height }, deviceScaleFactor: 1 } );
	const page = await ctx.newPage();
	page.on( 'pageerror', ( e ) => bad.push( path + ' ' + e ) );
	page.on( 'console', ( m ) => { if ( m.type() === 'error' && ! /cloudflare|beacon|ERR_/i.test( m.text() ) ) bad.push( path + ' ' + m.text() ); } );
	page.on( 'response', ( r ) => { if ( r.status() >= 400 && ! /cloudflare/.test( r.url() ) ) bad.push( path + ' ' + r.status() + ' ' + r.url() ); } );
	await page.goto( BASE + path );
	await page.addStyleTag( { content: '*{transition:none!important;animation:none!important}' } );
	await page.evaluate( () => { document.querySelectorAll( '.reveal' ).forEach( ( e ) => e.classList.add( 'is-on' ) ); document.querySelectorAll( 'img[loading]' ).forEach( ( i ) => { i.loading = 'eager'; } ); } );
	await page.waitForLoadState( 'networkidle' );
	await page.waitForTimeout( 400 );
	await page.screenshot( { path: join( OUT, name + '.png' ), fullPage: full } );
	await ctx.close();
}
await visit( '', 'home-en' );
await visit( 'el/', 'home-el' );
await visit( '', 'home-en-phone', { width: 390, height: 844 } );
await visit( 'docs/add-money/', 'doc-en', { full: false } );
await visit( 'el/docs/add-money/', 'doc-el', { full: false } );
await visit( 'docs/', 'docs-home', { full: false } );
await visit( 'el/docs/', 'docs-home-el', { full: false } );
await visit( 'app/', 'app', { full: false } );
await browser.close(); server.close();
console.log( bad.length ? 'PROBLEMS:\n' + bad.join( '\n' ) : 'no console errors or failed requests' );

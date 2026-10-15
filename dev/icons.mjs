// Renders favicon.svg to the PNG icons the installable app needs.   node dev/icons.mjs
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const svg = readFileSync( 'favicon.svg', 'utf8' );
const browser = await chromium.launch( { channel: 'chrome' } );
for ( const size of [ 192, 512 ] ) {
	const page = await browser.newPage( { viewport: { width: size, height: size } } );
	await page.setContent( `<body style="margin:0;background:transparent">${ svg.replace( '<svg ', `<svg width="${ size }" height="${ size }" ` ) }</body>` );
	await page.screenshot( { path: `icon-${ size }.png`, omitBackground: true } );
}
await browser.close();

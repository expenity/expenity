// Renders the social preview image (website/src/assets/og.jpg).   node dev/og.mjs
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const logo = readFileSync( 'favicon.svg', 'utf8' ).replace( '<svg ', '<svg width="84" height="84" ' );
const shot = 'data:image/png;base64,' + readFileSync( 'docs/images/tablet-reports.png' ).toString( 'base64' );
const html = `<body style="margin:0;width:1200px;height:630px;overflow:hidden;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#dff1ea,#f3f9f6 55%,#e3f3ec);position:relative">
<div style="position:absolute;left:70px;top:64px">${ logo }</div>
<div style="position:absolute;left:70px;top:176px;width:560px;font-size:68px;font-weight:800;letter-spacing:-0.045em;line-height:1.04;color:#0f1f1a">Know where your <span style="color:#0a8f6a">money</span> goes.</div>
<div style="position:absolute;left:70px;top:480px;font-size:26px;color:#34463f;width:520px">Expenses, income, bills, budgets and goals. English and Greek.</div>
<div style="position:absolute;left:70px;top:566px;font-size:24px;font-weight:800;color:#0a8f6a">Expenity · free · on every device</div>
<div style="position:absolute;left:650px;top:70px;width:640px;border-radius:22px;overflow:hidden;box-shadow:0 40px 80px -30px rgba(7,100,74,.6);border:1px solid #c4d9cf"><img src="${ shot }" style="display:block;width:100%"></div></body>`;
const browser = await chromium.launch( { channel: 'chrome' } );
const page = await browser.newPage( { viewport: { width: 1200, height: 630 } } );
await page.setContent( html );
await page.screenshot( { path: '/tmp/expenity-og.png' } );
await browser.close();
execFileSync( 'sips', [ '-s', 'format', 'jpeg', '-s', 'formatOptions', '85', '/tmp/expenity-og.png', '--out', 'website/src/assets/og.jpg' ], { stdio: 'ignore' } );

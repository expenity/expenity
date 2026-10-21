/**
 * A short check against a LIVE deployment (the beta app and the real API): sign up with a virtual passkey, add an
 * expense, see it reach the server, sign in again from a second window, then delete the account so nothing is left.
 *   node dev/test-live.mjs https://expenity.github.io/expenity-beta/app/
 */
import { chromium } from 'playwright-core';
const URL_ = process.argv[ 2 ] || 'https://expenity.github.io/expenity-beta/app/';
const browser = await chromium.launch( { channel: 'chrome' } );
let fail = 0;
const ok = ( c, l, x = '' ) => { if ( ! c ) { fail++; console.log( 'FAIL', l, x ); } else console.log( 'ok  ', l ); };
const errors = [];
async function device() {
	const context = await browser.newContext( { locale: 'en-US', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } );
	const page = await context.newPage();
	page.on( 'pageerror', ( e ) => { errors.push( String( e ) ); console.log('browser error:',String(e)); } );
	page.on( 'console', ( m ) => { if ( m.type() === 'error' && ! /beacon|cloudflare|ERR_|Failed to load resource/.test( m.text() ) ) errors.push( m.text() ); } );
	page.on( 'dialog', ( d ) => d.accept() );
	const cdp = await context.newCDPSession( page );
	await cdp.send( 'WebAuthn.enable' );
	const { authenticatorId } = await cdp.send( 'WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', ctap2Version: 'ctap2_1', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true, defaultBackupEligibility: true, defaultBackupState: true } } );
	return { context, page, cdp, authenticatorId };
}
const synced = ( d ) => d.page.waitForFunction( () => window.EX.sync.status === 'ok' && window.EX.sync.pending() === 0, null, { timeout: 30000 } );
const A = await device();
try {
await A.page.goto( URL_ );
await A.page.waitForSelector( '#tabbar button', { state: 'attached' } );
await A.page.evaluate( () => { EXA.skipFlow(); EX.state().device.entryMode='casual'; } );
ok( ( await A.page.title() ).startsWith( '[Beta]' ), 'the beta page loads, marked as beta' );
await A.page.click( '[data-act=auth-create]' );
await A.page.fill( '#registerForm [name=email]', `livecheck${ Date.now() }@example.com` );
await A.page.click( '#registerForm [type=submit]' );
await A.page.waitForSelector( '#codesDone', { timeout: 30000 } );
ok( ( await A.page.locator( '.codes code' ).count() ) === 10, 'live sign-up with a passkey works and shows 10 recovery codes' );
await A.page.check( '#codesSaved' ); await A.page.click( '#codesDone' );
await synced( A );
await A.page.click( '.fab' ); await A.page.click( '[data-act=tx-expense]' );
ok(await A.page.locator('#txKeypad').isHidden(),'amount keypad starts collapsed');
await A.page.click('[data-tx=target-amount]');
for ( const k of '990' ) await A.page.click( `.keypad [data-key="${ k }"]` );
await A.page.click('[data-tx=amount-done]');
ok(await A.page.locator('#txKeypad').isHidden(),'amount Done collapses the keypad');
await A.page.fill( '#txDesc', 'Live check' );
await A.page.check('#rememberName');
await A.page.click('[data-tx=field-done]');
const photo = await A.page.evaluate( () => { const c = document.createElement('canvas'); c.width=1600; c.height=1000; const g=c.getContext('2d');g.fillStyle='#f4dbaf';g.fillRect(0,0,c.width,c.height);g.fillStyle='#222';g.font='60px sans-serif';g.fillText('Expenity live reference photo',80,140);return c.toDataURL('image/png').split(',')[1]; } );
await A.page.locator('.photo-file').setInputFiles({name:'reference.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')});
await A.page.waitForFunction(()=>!!document.querySelector('.photo-slot [name=photo]')?.value, null, {timeout:30000});
await A.page.click( '[data-tx=save]' );
await synced( A );
ok( true, 'an expense synced to the live database' );
const creds = ( await A.cdp.send( 'WebAuthn.getCredentials', { authenticatorId: A.authenticatorId } ) ).credentials;
const B = await device();
for ( const c of creds ) await B.cdp.send( 'WebAuthn.addCredential', { authenticatorId: B.authenticatorId, credential: c } );
await B.page.goto( URL_ ); await B.page.waitForSelector( '#tabbar button', { state: 'attached' } );
await B.page.evaluate( () => { EXA.skipFlow(); EX.state().device.entryMode='casual'; } );
await B.page.click( '.ab-avatar .avatar:visible' ); await B.page.click( '[data-more=account]' ); await B.page.click( '[data-act=auth-signin]' ); await B.page.click( '#authLogin' );
await B.page.waitForFunction( () => window.EX.auth.isSignedIn() && window.EX.state().txs.some( ( x ) => x.name === 'Live check' ), null, { timeout: 30000 } );
ok( true, 'a second device signs in with the passkey and sees the expense' );
ok(await B.page.evaluate(()=>EX.savedNames('expense').some(x=>x.name==='Live check')),'saved transaction names sync to the second device');
const imageRead = await B.page.evaluate(async()=>{const x=window.EX.state().txs.find(x=>x.name==='Live check');if(!x.photo)return false;const r=await EX.api('GET','/api/photos/'+x.photo);if(!r.ok||r.json.bytes>96*1024)return false;const image=new Image();image.src=r.json.data;await image.decode();return image.naturalWidth<=1280&&image.naturalHeight<=1280;});
ok(imageRead,'a compressed reference photo loads on the second device');
ok(await B.page.evaluate(()=>['amberwave','ion','custom'].every(id=>EXA.THEMES.some(t=>t.id===id))),'the new themes and custom editor are deployed');
await A.page.click( '.ab-avatar .avatar:visible' ); await A.page.click( '[data-more=account]' );
await A.page.click( '[data-act=delete-account]' ); await A.page.click( '#confirmYes' );
await A.page.waitForFunction( () => ! window.EX.auth.isSignedIn(), null, { timeout: 30000 } );
ok( true, 'the test account was deleted (nothing left behind)' );
ok( ! errors.length, 'no console errors', errors.join( ' | ' ) );
} finally {
	try { if(await A.page.evaluate(()=>window.EX?.auth.isSignedIn())) { const removed=await A.page.evaluate(()=>EX.auth.deleteAccount()); if(!removed.ok)console.log('Temporary-account cleanup failed'); } } catch(e) { console.log('Temporary-account cleanup:',e.message); }
	await browser.close();
}
console.log( fail ? `\n${ fail } failed` : '\nall passed' );
process.exit( fail ? 1 : 0 );

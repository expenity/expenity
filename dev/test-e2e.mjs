/**
 * End-to-end test: real Chrome windows with virtual passkeys, the app, and a local copy of the Worker API.
 * Sign up, recovery codes, two devices in sync, deletion, offline, devices list and a second passkey,
 * sign out, recovery with a code on a third device, a revoked session, and account deletion.
 *   npm run test:e2e        (needs Chrome and: cd worker && npm install)
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const WORKER = join( ROOT, 'worker' );
const APP_PORT = 8766, API_PORT = 8791;
const APP = `http://localhost:${ APP_PORT }/?api=http://127.0.0.1:${ API_PORT }`;

// Static server for the app.
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = createServer( ( req, res ) => {
	const path = normalize( decodeURIComponent( req.url.split( '?' )[ 0 ] ) ).replace( /^(\.\.[/\\])+/, '' );
	const file = join( ROOT, path === '/' ? 'index.html' : path );
	if ( ! existsSync( file ) ) { res.writeHead( 404 ).end(); return; }
	res.writeHead( 200, { 'content-type': TYPES[ extname( file ) ] || 'application/octet-stream' } ).end( readFileSync( file ) );
} ).listen( APP_PORT );

// Local Worker + database.
const PERSIST = mkdtempSync( join( tmpdir(), 'expenity-e2e-' ) );
execFileSync( 'npx', [ 'wrangler', 'd1', 'execute', 'expenity', '--local', '--persist-to', PERSIST, '--file=schema.sql' ], { cwd: WORKER, stdio: 'ignore' } );
const dev = spawn( 'npx', [ 'wrangler', 'dev', '--local', '--persist-to', PERSIST, '--port', String( API_PORT ), '--var', 'RP_ID:localhost', '--var', `RP_ORIGINS:http://localhost:${ APP_PORT }`, '--var', 'TEST_MODE:1' ], { cwd: WORKER, stdio: 'ignore' } );
const cleanup = () => { dev.kill(); server.close(); try { rmSync( PERSIST, { recursive: true, force: true } ); } catch ( e ) { /* ignore */ } };
process.on( 'exit', cleanup );
for ( let i = 0; i < 80; i++ ) { try { if ( ( await fetch( `http://127.0.0.1:${ API_PORT }/api/health` ) ).ok ) break; } catch ( e ) { /* not up yet */ } await new Promise( ( r ) => setTimeout( r, 500 ) ); }

const browser = await chromium.launch( { channel: 'chrome' } );
const errors = [];
let fail = 0;
const ok = ( cond, label, extra = '' ) => { if ( ! cond ) { fail++; console.log( 'FAIL', label, extra ); } else console.log( 'ok  ', label ); };

/** A "device": its own browser profile with its own virtual passkey authenticator. */
async function device( name ) {
	const context = await browser.newContext( { locale: 'en-US', timezoneId: 'Europe/Athens', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } );
	const page = await context.newPage();
	page.on( 'pageerror', ( e ) => errors.push( `${ name }: ${ e }` ) );
	page.on( 'console', ( m ) => { if ( m.type() === 'error' && ! /beacon|cloudflare|ERR_|Failed to load resource/.test( m.text() ) ) errors.push( `${ name }: ${ m.text() }` ); } );
	page.on( 'dialog', ( d ) => d.accept() );
	const cdp = await context.newCDPSession( page );
	await cdp.send( 'WebAuthn.enable' );
	const { authenticatorId } = await cdp.send( 'WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', ctap2Version: 'ctap2_1', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true, defaultBackupEligibility: true, defaultBackupState: true } } );
	return { name, context, page, cdp, authenticatorId };
}
const synced = ( d ) => d.page.waitForFunction( () => window.EX.sync.status === 'ok' && window.EX.sync.pending() === 0, null, { timeout: 20000 } );
const runSync = async ( d ) => { await d.page.evaluate( () => window.EX.sync.run() ); await synced( d ); };
const txs = ( d ) => d.page.evaluate( () => window.EX.state().txs.map( ( x ) => ( { n: x.name, a: x.amount, t: x.type } ) ) );
const open = async ( d ) => { await d.page.goto( APP ); await d.page.waitForSelector( '#tabbar button', { state: 'attached' } ); await d.page.evaluate( () => { window.EXA.skipFlow(); } ); };
const avatar = ( d ) => d.page.click( '.ab-avatar .avatar:visible' );
async function addTx( d, type, amount, name ) {
	await d.page.click( '.fab' ); await d.page.click( `[data-act=tx-${ type }]` );
	for ( const k of amount ) await d.page.click( `.keypad [data-key="${ k === ',' ? '.' : k }"]` );
	await d.page.fill( '#txDesc', name );
	await d.page.click( '[data-tx=save]' );
}

const A = await device( 'A' );
await open( A );

// 1. Create an account with a passkey.
const email = `e2e${ Date.now() }@example.com`;
await A.page.click( '[data-act=auth-create]' );
await A.page.fill( '#registerForm [name=email]', email );
await A.page.click( '#registerForm [type=submit]' );
await A.page.waitForSelector( '#codesDone', { timeout: 20000 } );
const codes = await A.page.locator( '.codes code' ).allInnerTexts();
ok( codes.length === 10 && codes.every( ( c ) => /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test( c ) ), 'sign-up with a passkey shows ten recovery codes' );
ok( await A.page.locator( '#codesDone' ).isDisabled(), '"Done" waits until the user confirms the codes are saved' );
await A.page.keyboard.press( 'Escape' );
ok( await A.page.locator( '#sheet[open] #codesDone' ).count() === 1, 'Escape does not skip the recovery codes' );
await A.page.check( '#codesSaved' );
await A.page.click( '#codesDone' );
await synced( A );
ok( await A.page.locator( '.ab-avatar .avatar.on' ).count() === 1, 'the avatar shows the signed-in state' );
const creds = ( await A.cdp.send( 'WebAuthn.getCredentials', { authenticatorId: A.authenticatorId } ) ).credentials;
ok( creds.length === 1 && creds[ 0 ].isResidentCredential, 'a discoverable passkey was created on this device' );

// 2. Data entered on A reaches the server, and a second device signs in and gets it.
await addTx( A, 'expense', '12.50', 'Lunch A' );
await synced( A );
const B = await device( 'B' );
for ( const c of creds ) await B.cdp.send( 'WebAuthn.addCredential', { authenticatorId: B.authenticatorId, credential: c } ); // passkeys sync between a person's devices
await open( B );
await avatar( B ); await B.page.click( '[data-more=account]' ); await B.page.click( '[data-act=auth-signin]' );
await B.page.click( '#authLogin' );
await B.page.waitForFunction( () => window.EX.auth.isSignedIn() && window.EX.state().txs.length >= 1, null, { timeout: 20000 } );
ok( ( await txs( B ) ).some( ( x ) => x.n === 'Lunch A' && x.a === '12.50' ), 'device B signs in with the passkey and sees the expense from device A' );
await B.page.click( '[data-go=home]:visible' );
ok( await B.page.locator( '.promo' ).count() === 0 || ! /Not backed up/.test( await B.page.locator( '#view' ).innerText() ), 'a signed-in user no longer sees the backup banner' );

// Pull down from the top of a screen to sync (touch).
await A.page.click( '[data-go=home]:visible' );
await A.page.evaluate( () => { document.getElementById( 'toast' ).hidden = true; } );
await A.cdp.send( 'Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [ { x: 195, y: 200 } ] } );
for ( let i = 1; i <= 10; i++ ) await A.cdp.send( 'Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [ { x: 195, y: 200 + i * 16 } ] } );
await A.cdp.send( 'Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] } );
await A.page.waitForFunction( () => ! document.getElementById( 'toast' ).hidden && /Synced/.test( document.getElementById( 'toast' ).innerText ), null, { timeout: 15000 } );
ok( true, 'pulling down on a screen syncs and says so' );

// 3. Changes flow both ways.
await addTx( B, 'income', '2000', 'Salary B' );
await synced( B );
await runSync( A );
ok( ( await txs( A ) ).some( ( x ) => x.n === 'Salary B' && x.t === 'income' ), 'an income added on B appears on A' );
const aBalance = await A.page.evaluate( () => window.EX.state().accounts.map( ( a ) => window.EX.balance( a ) ).reduce( ( s, v ) => s + v, 0 ) );
const bBalance = await B.page.evaluate( () => window.EX.state().accounts.map( ( a ) => window.EX.balance( a ) ).reduce( ( s, v ) => s + v, 0 ) );
ok( aBalance === bBalance && aBalance === 198750, 'both devices compute the same balance', `${ aBalance } ${ bBalance }` );
ok( await A.page.evaluate( () => window.EX.state().accounts.length ) === 1 && await B.page.evaluate( () => window.EX.state().accounts.length ) === 1, 'signing in on a second device does not create a duplicate wallet' );

// Delete on A, and an edit on B, both arrive.
await A.page.evaluate( () => { const S = window.EX.state(); S.txs = S.txs.filter( ( x ) => x.name !== 'Lunch A' ); window.EX.save(); } );
await synced( A );
await B.page.evaluate( () => { window.EX.state().txs.find( ( x ) => x.name === 'Salary B' ).amount = '2100'; window.EX.save(); } );
await synced( B );
await runSync( B ); await runSync( A );
ok( ( await txs( B ) ).every( ( x ) => x.n !== 'Lunch A' ), 'a deletion on A reaches B' );
ok( ( await txs( A ) ).some( ( x ) => x.n === 'Salary B' && x.a === '2100' ), 'an edit on B reaches A' );

// 4. Offline: changes are kept and sync later.
await B.context.setOffline( true );
await addTx( B, 'expense', '7', 'Offline coffee' );
await B.page.evaluate( () => window.EX.sync.run() );
await B.page.waitForFunction( () => [ 'offline', 'error' ].includes( window.EX.sync.status ), null, { timeout: 15000 } );
ok( await B.page.evaluate( () => window.EX.sync.pending() ) === 1, 'offline: the change waits on the device' );
await B.context.setOffline( false );
await runSync( B ); await runSync( A );
ok( ( await txs( A ) ).some( ( x ) => x.n === 'Offline coffee' ), 'back online: the change arrives on A' );

// 5. Devices and passkeys.
await avatar( A ); await A.page.click( '[data-more=account]' );
await A.page.waitForSelector( '[data-act=add-passkey]' );
await A.page.waitForFunction( () => document.querySelectorAll( '#view li' ).length > 1 );
ok( ( await A.page.locator( '#view' ).innerText() ).includes( 'this device' ), 'Settings lists the passkeys and signed-in devices' );
// A second passkey lives on another authenticator (a phone, a security key). The passkey check uses the first one; before the new
// passkey is created, the first is taken off this virtual authenticator, so the second one is made on a "different" device.
await A.page.route( '**/api/passkeys/options', async ( route ) => { await A.cdp.send( 'WebAuthn.removeCredential', { authenticatorId: A.authenticatorId, credentialId: creds[ 0 ].credentialId } ); await route.continue(); } );
await A.page.click( '[data-act=add-passkey]' );
await A.page.waitForSelector( '[data-act=rm-passkey]', { timeout: 20000 } ).catch( async () => { console.log( 'toast:', await A.page.locator( '#toast' ).innerText().catch( () => '' ) ); throw new Error( 'adding a passkey failed' ); } );
ok( await A.page.locator( '[data-act=rm-passkey]' ).count() === 2, 'a second passkey can be added (with a fresh passkey check)' );

// 6. Sign out on B: the data leaves the device but stays in the account.
await avatar( B ); await B.page.click( '[data-more=account]' );
await B.page.click( '[data-act=sign-out]' ); await B.page.click( '#confirmYes' );
await B.page.waitForFunction( () => ! window.EX.auth.isSignedIn() );
ok( ( await txs( B ) ).length === 0 && await B.page.locator( '.ab-avatar .avatar.on' ).count() === 0, 'signing out removes the data from that device' );

// 7. Recovery with a code on a third device, which also ends the other sessions.
const C = await device( 'C' );
await open( C );
await avatar( C ); await C.page.click( '[data-more=account]' ); await C.page.click( '[data-act=auth-signin]' );
await C.page.click( '[data-act=auth-recover]' );
await C.page.fill( '#recoverForm [name=email]', email );
await C.page.fill( '#recoverForm [name=code]', codes[ 0 ] );
await C.page.click( '#recoverForm [type=submit]' );
await C.page.waitForFunction( () => window.EX.auth.isSignedIn() && window.EX.state().txs.length >= 2, null, { timeout: 20000 } );
ok( true, 'a recovery code adds a new passkey on a new device and brings the data back' );
await runSync( C );
ok( await C.page.evaluate( () => window.EX.auth.codesLeft() ) === 9, 'the used recovery code is gone' );
await A.page.evaluate( () => window.EX.sync.run() );
await A.page.waitForFunction( () => ! window.EX.auth.isSignedIn(), null, { timeout: 15000 } );
ok( ( await txs( A ) ).length >= 2 && await A.page.locator( '.ab-avatar .avatar.on' ).count() === 0, 'recovery signs the old devices out but keeps their local data' );

// 8. Delete the account (needs the passkey).
await C.page.click( '[data-go=home]:visible' ); await avatar( C ); await C.page.click( '[data-more=account]' );
await C.page.click( '[data-act=delete-account]' ); await C.page.click( '#confirmYes' );
await C.page.waitForFunction( () => ! window.EX.auth.isSignedIn(), null, { timeout: 20000 } );
const gone = await fetch( `http://127.0.0.1:${ API_PORT }/api/auth/login/options`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: `http://localhost:${ APP_PORT }` }, body: '{}' } );
ok( gone.ok, 'the API still answers after the account was deleted' );
const D = await device( 'D' );
const deletedKey = ( await C.cdp.send( 'WebAuthn.getCredentials', { authenticatorId: C.authenticatorId } ) ).credentials;
for ( const c of deletedKey ) await D.cdp.send( 'WebAuthn.addCredential', { authenticatorId: D.authenticatorId, credential: c } );
await open( D );
await avatar( D ); await D.page.click( '[data-more=account]' ); await D.page.click( '[data-act=auth-signin]' );
await D.page.click( '#authLogin' );
await D.page.waitForSelector( '#authErr:not([hidden])', { timeout: 15000 } );
ok( true, 'a deleted account cannot be signed into any more' );

// 10. Signing out and back in does not repeat the first-run flow and keeps the name and the data.
{
	const R = await device( 'R' );
	await R.page.goto( APP ); await R.page.waitForSelector( '#flowRegister', { timeout: 20000 } );
	await R.page.fill( '#flowRegister [name=email]', `again${ Date.now() }@example.com` ); await R.page.click( '#flowRegister [type=submit]' );
	await R.page.waitForSelector( '#codesDone', { timeout: 20000 } ); await R.page.check( '#codesSaved' ); await R.page.click( '#codesDone' );
	await R.page.click( '[data-flow=install-skip]' );
	await R.page.fill( '#setupForm [name=name]', 'Maria' ); await R.page.click( '[data-flow=next]' );
	for ( let i = 0; i < 6 && await R.page.locator( '[data-flow=start]' ).count() === 0; i++ ) await R.page.click( '[data-flow=next]' );
	await R.page.click( '[data-flow=start]' );
	await addTx( R, 'expense', '9', 'Bread' ); await runSync( R );
	await R.page.evaluate( () => window.EXA.go( 'more', 'account' ) ); await R.page.click( '[data-act=sign-out]' );
	await R.page.click( '#confirmYes' ).catch( () => {} );
	await R.page.waitForSelector( '#flow [data-flow=signin]', { timeout: 20000 } );
	await R.page.click( '[data-flow=signin]' );
	await R.page.waitForFunction( () => window.EX.auth.isSignedIn() && document.getElementById( 'flow' ).hidden, null, { timeout: 30000 } );
	ok( await R.page.locator( '#flow' ).isHidden(), 'signing back in goes straight to the app (no install guide, no setup)' );
	await runSync( R );
	ok( await R.page.evaluate( () => window.EX.state().settings.name === 'Maria' && window.EX.state().settings.setupDone === true ), 'the name and the finished setup come back from the account' );
	ok( ( await txs( R ) ).some( ( x ) => x.n === 'Bread' ), 'the data comes back too' );
	await R.context.close();
}

// 9. Shared wallets: two people, one wallet.
{
	const signup = async ( d, mail ) => {
		await open( d );
		await d.page.click( '[data-act=auth-create]' ); await d.page.fill( '#registerForm [name=email]', mail ); await d.page.click( '#registerForm [type=submit]' );
		await d.page.waitForSelector( '#codesDone', { timeout: 20000 } ); await d.page.check( '#codesSaved' ); await d.page.click( '#codesDone' );
		await synced( d );
	};
	const P = await device( 'P' ), Q = await device( 'Q' );
	await signup( P, `owner${ Date.now() }@example.com` ); await signup( Q, `member${ Date.now() }@example.com` );
	await P.page.evaluate( () => { const X = window.EX, S = X.state(); S.accounts = [ { id: X.uid(), name: 'Household', type: 'bank', currency: 'EUR', opening: '100' } ]; X.save(); } );
	await Q.page.evaluate( () => { const X = window.EX, S = X.state(); S.accounts = [ { id: X.uid(), name: 'Mine', type: 'cash', currency: 'EUR', opening: '0' } ]; X.save(); } );
	await P.page.evaluate( () => window.EXA.go( 'more', 'wallets' ) );
	await P.page.click( '[data-act=edit-wallet]' ); await P.page.click( '[data-share=open]' ); await P.page.click( '[data-share=start]' );
	await P.page.waitForSelector( '[data-share=invite]', { timeout: 15000 } );
	ok( await P.page.evaluate( () => !! window.EX.state().accounts[ 0 ].space ), 'sharing a wallet puts it in its own space' );
	await P.page.click( '[data-role=editor]' ); await P.page.click( '[data-share=invite]' ); await P.page.waitForSelector( '.invite-box .code', { timeout: 15000 } );
	const code = ( await P.page.locator( '.invite-box .code' ).innerText() ).replace( /\s/g, '' );
	ok( /^[A-Z2-9]{10}$/.test( code ), 'an invite code is shown' );
	await P.page.keyboard.press( 'Escape' );
	await addTx( P, 'expense', '12', 'Groceries' ); await runSync( P );
	// The member joins with the code.
	await Q.page.evaluate( () => window.EXA.go( 'more', 'wallets' ) ); await Q.page.click( '[data-act=join-wallet]' );
	await Q.page.fill( '#joinForm [name=code]', code ); await Q.page.click( '#joinForm [type=submit]' );
	await Q.page.waitForFunction( () => window.EX.state().accounts.some( ( a ) => a.space ), null, { timeout: 20000 } );
	await runSync( Q );
	ok( ( await txs( Q ) ).some( ( x ) => x.n === 'Groceries' ), 'the member sees the wallet and its transactions' );
	ok( await Q.page.evaluate( () => window.EX.state().accounts.filter( ( a ) => a.name === 'Household' ).length === 1 ), 'the member has exactly one copy of the wallet' );
	// The member adds something; the owner receives it, with the author recorded.
	await Q.page.click( '.fab' ); await Q.page.click( '[data-act=tx-expense]' ); await Q.page.click( '[data-tx-wallet]:has-text("Household")' );
	for ( const k of '7' ) await Q.page.click( `.keypad [data-key="${ k }"]` );
	await Q.page.fill( '#txDesc', 'Bread' ); await Q.page.click( '[data-tx=save]' ); await runSync( Q ); await runSync( P );
	ok( ( await txs( P ) ).some( ( x ) => x.n === 'Bread' ), 'what the member adds reaches the owner' );
	ok( await P.page.evaluate( () => { const x = window.EX.state().txs.find( ( z ) => z.name === 'Bread' ); return !! x && !! x.by && x.by !== window.EX.auth.user().id; } ), 'a shared transaction records who added it (the member, not the owner)' );
	// The owner makes the member a viewer: the member can no longer write.
	await P.page.evaluate( () => window.EXA.go( 'more', 'wallets' ) ); await P.page.click( '[data-act=edit-wallet]' ); await P.page.click( '[data-share=open]' );
	await P.page.waitForSelector( 'select[data-share-role]', { timeout: 15000 } ); await P.page.selectOption( 'select[data-share-role]', 'viewer' ); await P.page.waitForTimeout( 800 ); await P.page.keyboard.press( 'Escape' );
	await runSync( Q );
	ok( await Q.page.evaluate( () => window.EX.role( window.EX.state().accounts.find( ( a ) => a.space ) ) === 'viewer' ), 'the role change reaches the member' );
	await Q.page.evaluate( () => window.EXA.go( 'activity' ) );
	await Q.page.click( '.fab' ); await Q.page.click( '[data-act=tx-expense]' );
	ok( await Q.page.locator( '[data-tx-wallet]' ).count() === 0 || ! ( await Q.page.locator( '[data-tx-wallet]' ).allInnerTexts() ).some( ( x ) => x.includes( 'Household' ) ), 'a viewer cannot pick the shared wallet when adding' );
	await Q.page.keyboard.press( 'Escape' );
	// The owner removes the member: the wallet disappears from the member's device.
	await P.page.evaluate( () => window.EXA.go( 'more', 'wallets' ) ); await P.page.click( '[data-act=edit-wallet]' ); await P.page.click( '[data-share=open]' );
	await P.page.waitForSelector( '[data-share=remove]', { timeout: 15000 } ); await P.page.click( '[data-share=remove]' ); await P.page.click( '#confirmYes' ); await P.page.waitForTimeout( 1200 ); await P.page.keyboard.press( 'Escape' );
	await runSync( Q );
	ok( await Q.page.evaluate( () => ! window.EX.state().accounts.some( ( a ) => a.space ) && ! window.EX.state().txs.some( ( x ) => x.name === 'Groceries' ) ), 'a removed member loses the wallet from their device' );
	ok( ( await txs( P ) ).some( ( x ) => x.n === 'Groceries' ), 'the owner keeps everything' );
	// The owner stops sharing: the wallet becomes private and keeps its data.
	await P.page.evaluate( () => window.EXA.go( 'more', 'wallets' ) ); await P.page.click( '[data-act=edit-wallet]' ); await P.page.click( '[data-share=open]' );
	await P.page.waitForSelector( '[data-share=stop]', { timeout: 15000 } ); await P.page.click( '[data-share=stop]' ); await P.page.click( '#confirmYes' );
	await P.page.waitForFunction( () => ! window.EX.state().accounts.some( ( a ) => a.space ), null, { timeout: 20000 } ); await runSync( P );
	ok( ( await txs( P ) ).some( ( x ) => x.n === 'Bread' ), 'after stopping, the owner keeps the data as a private wallet' );
	await P.context.close(); await Q.context.close();
}

ok( ! errors.length, 'no console errors on any device', errors.join( ' | ' ) );
await browser.close();
cleanup();
console.log( fail ? `\n${ fail } failed` : '\nall passed' );
process.exit( fail ? 1 : 0 );

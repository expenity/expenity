/**
 * Tests the Worker API end to end against a local copy (wrangler dev, local D1), with a software passkey:
 * sign-up, sign-in, recovery codes, step-up checks, devices, two "devices" syncing, last-writer-wins,
 * deletions, email codes (through a test mail sink), isolation and account deletion.
 *   npm run test:api        (needs: cd worker && npm install)
 */
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SoftPasskey } from './webauthn-soft.mjs';
import { webcrypto as wc, createPublicKey, createVerify, createECDH, hkdfSync, createDecipheriv, randomBytes } from 'node:crypto';
import { createServer as createHttp } from 'node:http';

const WORKER = join( process.cwd(), 'worker' );
const PERSIST = mkdtempSync( join( tmpdir(), 'expenity-d1-' ) );
const PORT = 8792;
const API = `http://127.0.0.1:${ PORT }`;
const ORIGIN = 'http://localhost:8766';
const VAPID = await ( async () => { const k = await wc.subtle.generateKey( { name: 'ECDH', namedCurve: 'P-256' }, true, [ 'deriveBits' ] ); return { pub: Buffer.from( await wc.subtle.exportKey( 'raw', k.publicKey ) ).toString( 'base64url' ), jwk: await wc.subtle.exportKey( 'jwk', k.privateKey ) }; } )();
const VARS = [ '--var', 'RP_ID:localhost', '--var', `RP_ORIGINS:${ ORIGIN }`, '--var', 'TEST_MODE:1', '--var', 'STATS_TOKEN:testtoken123', '--var', `VAPID_PUBLIC:${ VAPID.pub }`, '--var', `VAPID_PRIVATE_JWK:${ JSON.stringify( VAPID.jwk ) }` ];
execFileSync( 'npx', [ 'wrangler', 'd1', 'execute', 'expenity', '--local', '--persist-to', PERSIST, '--file=schema.sql' ], { cwd: WORKER, stdio: 'ignore' } );
const dev = spawn( 'npx', [ 'wrangler', 'dev', '--local', '--persist-to', PERSIST, '--port', String( PORT ), ...VARS ], { cwd: WORKER, stdio: 'ignore' } );
const stop = () => { dev.kill(); try { rmSync( PERSIST, { recursive: true, force: true } ); } catch ( e ) { /* ignore */ } };
process.on( 'exit', stop );

let fail = 0;
const ok = ( cond, label, extra = '' ) => { if ( ! cond ) { fail++; console.log( 'FAIL', label, extra ); } else console.log( 'ok  ', label ); };
const call = async ( method, path, body, token, extraHeaders = {} ) => {
	const res = await fetch( API + path, { method, headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...( token ? { Authorization: 'Bearer ' + token } : {} ), ...extraHeaders }, body: body ? JSON.stringify( body ) : undefined } );
	let json = null; try { json = await res.json(); } catch ( e ) { /* none */ }
	return { status: res.status, json, headers: res.headers };
};
const newKey = () => new SoftPasskey( { rpId: 'localhost', origin: ORIGIN } );
async function signUp( email, key, lang = 'en' ) {
	const o = await call( 'POST', '/api/auth/register/options', { email, lang } );
	if ( o.status !== 200 ) return o;
	return call( 'POST', '/api/auth/register/verify', { challengeId: o.json.challengeId, response: key.create( o.json.options ), label: 'Test key' } );
}
async function signIn( key ) {
	const o = await call( 'POST', '/api/auth/login/options' );
	return call( 'POST', '/api/auth/login/verify', { challengeId: o.json.challengeId, response: key.get( o.json.options ) } );
}
async function stepUp( key, token ) {
	const o = await call( 'POST', '/api/auth/stepup/options', {}, token );
	const v = await call( 'POST', '/api/auth/stepup/verify', { challengeId: o.json.challengeId, response: key.get( o.json.options ) }, token );
	return v.json?.stepUp;
}

for ( let i = 0; i < 80; i++ ) { try { if ( ( await fetch( API + '/api/health' ) ).ok ) break; } catch ( e ) { /* not up yet */ } await new Promise( ( r ) => setTimeout( r, 500 ) ); }

const email = `test${ Date.now() }@example.com`;
const key1 = newKey();

// Sign-up with a passkey.
ok( ( await call( 'POST', '/api/auth/register/options', { email: 'nope' } ) ).json?.error === 'invalid_email', 'rejects a bad email' );
const reg = await signUp( email, key1, 'el' );
ok( reg.status === 201 && /^ex_/.test( reg.json.token ) && reg.json.user.lang === 'el' && reg.json.user.emailVerified === false, 'signs up with a passkey', JSON.stringify( reg.json ) );
ok( Array.isArray( reg.json.recoveryCodes ) && reg.json.recoveryCodes.length === 10 && /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test( reg.json.recoveryCodes[ 0 ] ), 'shows ten recovery codes once' );
ok( ( await signUp( email.toUpperCase(), newKey() ) ).status === 409, 'the same email (any case) cannot sign up twice' );
const forged = await call( 'POST', '/api/auth/register/options', { email: `forged${ Date.now() }@example.com` } );
const wrongOrigin = new SoftPasskey( { rpId: 'localhost', origin: 'https://evil.example' } );
ok( ( await call( 'POST', '/api/auth/register/verify', { challengeId: forged.json.challengeId, response: wrongOrigin.create( forged.json.options ) } ) ).status === 400, 'a passkey made for another origin is refused' );
const A = reg.json.token;

// Photos are separate, size-limited and authenticated; record sync never accepts someone else's private image.
const jpeg = 'data:image/jpeg;base64,' + Buffer.from([255,216,255,192,0,17,8,0,1,0,1,3,1,17,0,2,17,0,3,17,0,255,217]).toString('base64');
ok((await call('POST','/api/photos',{data:jpeg})).status===401,'photos require sign-in');
ok((await call('POST','/api/photos',{data:'data:image/svg+xml;base64,PHN2Zz4='},A)).status===400,'SVG attachments are rejected');
ok((await call('POST','/api/photos',{data:jpeg+'A'.repeat(140000)},A)).status===400,'oversized photos are rejected');
const photoUpload=await call('POST','/api/photos',{data:jpeg},A);
ok(photoUpload.status===200&&photoUpload.json.id.startsWith('ph_'),'a small JPEG uploads separately');
const photoId=photoUpload.json.id;
ok((await call('GET','/api/photos/'+photoId,null,A)).json.data===jpeg,'the owner can read an uploaded photo');

// Sign-in with the passkey, on a second "device".
const s2 = await signIn( key1 );
ok( s2.status === 200 && s2.json.user.email === email, 'signs in with the passkey (no email needed)' );
const B = s2.json.token;
ok( B && B !== A, 'second device gets its own session' );
const replay = await call( 'POST', '/api/auth/login/options' );
const goodAssertion = key1.get( replay.json.options );
await call( 'POST', '/api/auth/login/verify', { challengeId: replay.json.challengeId, response: goodAssertion } );
ok( ( await call( 'POST', '/api/auth/login/verify', { challengeId: replay.json.challengeId, response: goodAssertion } ) ).status === 400, 'a challenge works only once' );
const stranger = newKey();
const so = await call( 'POST', '/api/auth/login/options' );
ok( ( await call( 'POST', '/api/auth/login/verify', { challengeId: so.json.challengeId, response: stranger.get( so.json.options ) } ) ).status === 401, 'an unknown passkey is refused' );
ok( ( await call( 'GET', '/api/me' ) ).status === 401 && ( await call( 'GET', '/api/me', null, 'ex_' + 'x'.repeat( 40 ) ) ).status === 401, 'no token or a fake token is unauthorised' );
const me = await call( 'GET', '/api/me', null, A );
ok( me.json.user.email === email && me.json.recoveryCodesLeft === 10, 'me returns the account and the codes left' );

// Sync between the two devices.
const bill = { id: 'b1', kind: 'bill', data: { id: 'b1', name: 'Rent', amount: '850' }, updatedAt: 1000 };
const tx = { id: 't1', kind: 'tx', data: { id: 't1', type: 'income', amount: '1500', name: 'Salary' }, updatedAt: 1000 };
let s = await call( 'POST', '/api/sync', { since: 0, changes: [ bill, tx ] }, A );
ok( s.status === 200 && s.json.rev === 1 && s.json.changes.length === 2, 'device A pushes two records', JSON.stringify( s.json ) );
let pull = await call( 'POST', '/api/sync', { since: 0, changes: [] }, B );
ok( pull.json.changes.length === 2 && pull.json.changes.some( ( c ) => c.data.name === 'Salary' ), 'device B sees them' );
const revB = pull.json.rev;
await call( 'POST', '/api/sync', { since: revB, changes: [ { ...bill, data: { ...bill.data, amount: '900' }, updatedAt: 3000 } ] }, B );
s = await call( 'POST', '/api/sync', { since: 1, changes: [ { ...bill, data: { ...bill.data, amount: '875' }, updatedAt: 2000 } ] }, A );
ok( s.json.changes.find( ( c ) => c.id === 'b1' )?.data.amount === '900', 'last writer wins: the newer edit survives an older one' );
for ( const kind of [ 'account', 'category', 'budget', 'goal', 'settings' ] ) {
	const r = await call( 'POST', '/api/sync', { since: 0, changes: [ { id: 'k_' + kind, kind, data: { name: kind }, updatedAt: 5000 } ] }, A );
	if ( r.status !== 200 ) ok( false, `accepts kind ${ kind }`, JSON.stringify( r.json ) );
}
ok( true, 'accepts accounts, categories, budgets, goals and settings' );
await call( 'POST', '/api/sync', { since: s.json.rev, changes: [ { id: 't1', kind: 'tx', deleted: true, updatedAt: 4000 } ] }, A );
pull = await call( 'POST', '/api/sync', { since: revB, changes: [] }, B );
ok( pull.json.changes.some( ( c ) => c.id === 't1' && c.deleted === true ), 'a deletion is delivered as a tombstone' );
await call( 'POST', '/api/sync', { since: 0, changes: [ { ...tx, updatedAt: 500 } ] }, B );
pull = await call( 'POST', '/api/sync', { since: 0, changes: [] }, A );
ok( pull.json.changes.find( ( c ) => c.id === 't1' )?.deleted === true, 'an older write does not resurrect a deleted record' );
ok( ( await call( 'POST', '/api/sync', { since: 0, changes: [ { id: 'x y', kind: 'bill', data: {}, updatedAt: 1 } ] }, A ) ).status === 400, 'rejects a bad record id' );
ok( ( await call( 'POST', '/api/sync', { since: 0, changes: [ { id: 'x', kind: 'weird', data: {}, updatedAt: 1 } ] }, A ) ).status === 400, 'rejects an unknown kind' );
ok( ( await call( 'POST', '/api/sync', { since: 0, changes: [ { id: 'x', kind: 'bill', data: { big: 'z'.repeat( 9000 ) }, updatedAt: 1 } ] }, A ) ).status === 413, 'rejects an oversized record' );

// Another account sees nothing.
const key2 = newKey();
const other = ( await signUp( `other${ Date.now() }@example.com`, key2 ) ).json.token;
ok( ( await call( 'POST', '/api/sync', { since: 0, changes: [] }, other ) ).json.changes.length === 0, 'another account sees none of this account\'s data' );
ok( ( await call( 'GET', '/api/export', null, A ) ).json.records.some( ( r ) => r.id === 'b1' ), 'export lists the live records' );

ok((await call('GET','/api/photos/'+photoId,null,other)).status===404,'another account cannot read a private photo');
ok((await call('POST','/api/sync',{changes:[{id:'stolenphoto',kind:'tx',data:{photo:photoId},updatedAt:Date.now()}]},other)).status===400,'sync rejects stolen private photo IDs');

// Shared wallets: spaces, invites, roles, permissions.
{
	const viewerKey = newKey();
	const V = ( await signUp( `viewer${ Date.now() }@example.com`, viewerKey ) ).json.token;
	const sp = await call( 'POST', '/api/spaces', { name: 'Home budget' }, A );
	ok( sp.status === 200 && sp.json.role === 'owner' && /^[a-z0-9]{16}$/.test( sp.json.id ), 'a space can be created', JSON.stringify( sp.json ) );
	const sid = sp.json.id;
	ok( ( await call( 'POST', '/api/spaces', { name: '' }, A ) ).status === 400, 'a space needs a name' );
	ok( ( await call( 'POST', `/api/spaces/${ sid }/sync`, { since: 0, changes: [] }, other ) ).status === 404, 'outsiders cannot read a space' );
	ok( ( await call( 'POST', `/api/spaces/${ sid }/invites`, { role: 'editor' }, other ) ).status === 403 || ( await call( 'POST', `/api/spaces/${ sid }/invites`, { role: 'editor' }, other ) ).status === 404, 'outsiders cannot make invites' );
	const w = { id: 'wa', kind: 'account', data: { id: 'wa', name: 'Joint', type: 'bank', currency: 'EUR', opening: '0', space: sid }, updatedAt: Date.now() };
	const push = await call( 'POST', `/api/spaces/${ sid }/sync`, { since: 0, changes: [ w, { id: 'tx1', kind: 'tx', data: { id: 'tx1', type: 'expense', amount: '5', account: 'wa', category: 'food', date: '2026-01-01' }, updatedAt: Date.now() } ] }, A );
	ok( push.status === 200 && push.json.rev === 1, 'the owner writes to the space' );
	ok( ( await call( 'POST', `/api/spaces/${ sid }/sync`, { since: 0, changes: [ { id: 'g', kind: 'goal', data: {}, updatedAt: 1 } ] }, A ) ).status === 400, 'a space only holds wallets, transactions and bills' );
	ok( ( await call( 'POST', '/api/sync', { since: 0, changes: [] }, A ) ).json.changes.every( ( c ) => c.id !== 'wa' ), 'space records never appear in the personal store' );
	const inv = await call( 'POST', `/api/spaces/${ sid }/invites`, { role: 'editor' }, A );
	ok( inv.status === 200 && /^[A-HJ-NP-Z2-9]{10}$/.test( inv.json.code ), 'the owner makes a single-use invite code' );
	ok( ( await call( 'POST', `/api/spaces/${ sid }/invites`, { role: 'owner' }, A ) ).status === 400, 'an invite cannot grant ownership' );
	ok( ( await call( 'POST', '/api/invites/accept', { code: 'AAAAAAAAAA' }, other ) ).status === 404, 'a wrong code is refused' );
	const acc = await call( 'POST', '/api/invites/accept', { code: inv.json.code.toLowerCase() }, other );
	ok( acc.status === 200 && acc.json.id === sid && acc.json.role === 'editor', 'a member joins with the code (any case)' );
	ok( ( await call( 'POST', '/api/invites/accept', { code: inv.json.code }, V ) ).status === 404, 'a code works only once' );
	const pull = await call( 'POST', `/api/spaces/${ sid }/sync`, { since: 0, changes: [] }, other );
	ok( pull.json.changes.length === 2 && pull.json.changes.some( ( c ) => c.id === 'tx1' ), 'the member receives the wallet and its transactions' );
	const edit = await call( 'POST', `/api/spaces/${ sid }/sync`, { since: pull.json.rev, changes: [ { id: 'tx2', kind: 'tx', data: { id: 'tx2', type: 'expense', amount: '9', account: 'wa', category: 'food', date: '2026-01-02', by: 'x' }, updatedAt: Date.now() } ] }, other );
	ok( edit.status === 200, 'an editor can add transactions' );
	ok( ( await call( 'POST', `/api/spaces/${ sid }/sync`, { since: push.json.rev, changes: [] }, A ) ).json.changes.some( ( c ) => c.id === 'tx2' ), 'the owner sees what the editor added' );
	const vinv = await call( 'POST', `/api/spaces/${ sid }/invites`, { role: 'viewer' }, A );
	ok( ( await call( 'POST', '/api/invites/accept', { code: vinv.json.code }, V ) ).json.role === 'viewer', 'a viewer joins' );
	ok( ( await call( 'POST', `/api/spaces/${ sid }/sync`, { since: 0, changes: [ { id: 'tx3', kind: 'tx', data: { id: 'tx3', type: 'expense', amount: '1', account: 'wa', category: 'food', date: '2026-01-03' }, updatedAt: Date.now() } ] }, V ) ).status === 403, 'a viewer cannot write' );
	ok( ( await call( 'POST', `/api/spaces/${ sid }/sync`, { since: 0, changes: [] }, V ) ).json.changes.length === 3, 'a viewer can read' );
	const mem = await call( 'GET', `/api/spaces/${ sid }/members`, null, A );
 const sharedPhoto=(await call('POST','/api/photos',{data:jpeg},other)).json.id;
 const photoTx={id:'phototx',kind:'tx',data:{id:'phototx',type:'expense',amount:'2',account:'wa',photo:sharedPhoto},updatedAt:Date.now()};
 ok((await call('POST',`/api/spaces/${sid}/sync`,{changes:[photoTx]},other)).status===200,'an editor attaches a photo to a shared transaction');
 ok((await call('GET','/api/photos/'+sharedPhoto,null,V)).status===200,'a viewer can open a shared photo');
 ok((await call('POST',`/api/spaces/${sid}/sync`,{changes:[photoTx]},V)).status===403,'a viewer cannot replace a photo');
	ok( mem.json.members.length === 3 && mem.json.members.some( ( m ) => m.role === 'viewer' ), 'the owner lists members' );
	ok( ( await call( 'GET', '/api/spaces', null, other ) ).json.spaces[ 0 ].role === 'editor', 'a member lists the spaces they belong to' );
	ok( ( await call( 'POST', `/api/spaces/${ sid }/members/${ mem.json.members.find( ( m ) => m.role === 'viewer' ).id }`, { role: 'editor' }, other ) ).status === 403, 'only the owner changes roles' );
	ok( ( await call( 'DELETE', `/api/spaces/${ sid }/members/${ mem.json.members.find( ( m ) => m.you ).id }`, null, A ) ).status === 409, 'the owner cannot leave their own space' );
	const vid = mem.json.members.find( ( m ) => m.role === 'viewer' ).id;
	ok( ( await call( 'DELETE', `/api/spaces/${ sid }/members/${ vid }`, null, other ) ).status === 403, 'an editor cannot remove others' );
	ok( ( await call( 'DELETE', `/api/spaces/${ sid }/members/${ vid }`, null, A ) ).status === 200 && ( await call( 'POST', `/api/spaces/${ sid }/sync`, { since: 0, changes: [] }, V ) ).status === 404, 'the owner removes a member and access ends' );
	ok( ( await call( 'DELETE', `/api/spaces/${ sid }`, null, other ) ).status === 403, 'only the owner deletes a space' );
	const oid = ( await call( 'GET', `/api/spaces/${ sid }/members`, null, other ) ).json.members.find( ( m ) => m.you ).id;
	ok( ( await call( 'DELETE', `/api/spaces/${ sid }/members/${ oid }`, null, other ) ).status === 200, 'a member can leave' );
	ok((await call('GET','/api/photos/'+sharedPhoto,null,other)).status===404,'leaving removes access even to the shared photo they uploaded');
	ok( ( await call( 'DELETE', `/api/spaces/${ sid }`, null, A ) ).status === 200 && ( await call( 'GET', '/api/spaces', null, A ) ).json.spaces.length === 0, 'the owner deletes the space' );
}

// Bulk photo deletion keeps records, isolates upload ownership and neutralises offline references.
{
 const keep=(await call('POST','/api/photos',{data:jpeg},other)).json.id;
 const change={id:'photoKeepTx',kind:'tx',data:{id:'photoKeepTx',name:'Preserve me',amount:'7',photo:photoId},updatedAt:Date.now()};
 await call('POST','/api/sync',{changes:[change]},A);
 ok((await call('DELETE','/api/photos',{},A)).status===403,'deleting all photos requires a fresh passkey check');
 const proof=await stepUp(key1,A);
 const removed=await call('DELETE','/api/photos',{},A,{'X-Step-Up':proof});
 ok(removed.status===200&&removed.json.ids.includes(photoId),'bulk deletion removes the account uploads');
 ok((await call('GET','/api/photos/'+photoId,null,A)).status===404,'deleted photos cannot be downloaded');
 ok((await call('GET','/api/photos/'+keep,null,other)).status===200,'bulk deletion keeps another account photos');
 const records=(await call('POST','/api/sync',{since:0,changes:[]},A)).json.changes;
 const tx=records.find(x=>x.id==='photoKeepTx');
 ok(tx&&tx.data.name==='Preserve me'&&tx.data.amount==='7'&&!tx.data.photo,'deletion detaches photos without deleting financial records');
 change.updatedAt=Date.now()+1000;
 const offline=await call('POST','/api/sync',{changes:[change]},A);
 ok(offline.status===200&&!offline.json.changes.find(x=>x.id==='photoKeepTx').data.photo,'an offline edit cannot resurrect a deleted photo');
}

// Push notifications: subscribe, an hourly pass, encrypted delivery that a device can read, once a day only.
{
	const received = [];
	const fake = createHttp( ( rq, rs ) => { const chunks = []; rq.on( 'data', ( c ) => chunks.push( c ) ); rq.on( 'end', () => { received.push( { headers: rq.headers, body: Buffer.concat( chunks ), url: rq.url } ); rs.writeHead( 201 ).end(); } ); } ).listen( 0 );
	const base = `http://127.0.0.1:${ fake.address().port }`;
	const ua = createECDH( 'prime256v1' ); ua.generateKeys(); const authSecret = randomBytes( 16 );
	const subscription = ( n ) => ( { endpoint: `${ base }/push/${ n }`, keys: { p256dh: ua.getPublicKey().toString( 'base64url' ), auth: authSecret.toString( 'base64url' ) } } );
	ok( ( await call( 'GET', '/api/push/key' ) ).json.publicKey === VAPID.pub, 'the public push key is served without signing in' );
	ok( ( await call( 'POST', '/api/push/subscribe', { subscription: subscription( 1 ), tz: 'UTC', hour: 0, lang: 'en' } ) ).status === 401, 'subscribing needs an account' );
	ok( ( await call( 'POST', '/api/push/subscribe', { subscription: { endpoint: 'https://evil.example/x', keys: { p256dh: 'a', auth: 'b' } }, tz: 'UTC', hour: 9 }, A ) ).status === 400, 'an endpoint that is not a known push service is refused' );
	ok( ( await call( 'POST', '/api/push/subscribe', { subscription: subscription( 1 ), tz: 'UTC', hour: 0, lang: 'en' }, A ) ).status === 200, 'a device subscribes' );
	const today = new Date().toISOString().slice( 0, 10 );
	await call( 'POST', '/api/sync', { since: 0, changes: [ { id: 'pbill', kind: 'bill', data: { id: 'pbill', name: 'Rent', next: today, repeat: 'monthly' }, updatedAt: Date.now() } ] }, A );
	const run1 = await fetch( `${ API }/api/test/push-run?now=${ Date.now() }` ).then( ( r ) => r.json() );
	ok( run1.sent === 1 && received.length === 1, 'the hourly pass sends one notification for a bill due today', JSON.stringify( run1 ) );
	// Decrypt the way a browser would (RFC 8291) and read the message.
	const body = received[ 0 ].body, salt = body.subarray( 0, 16 ), idlen = body[ 20 ], asPub = body.subarray( 21, 21 + idlen ), cipher = body.subarray( 21 + idlen );
	const ikm = Buffer.from( hkdfSync( 'sha256', ua.computeSecret( asPub ), authSecret, Buffer.concat( [ Buffer.from( 'WebPush: info\0' ), ua.getPublicKey(), asPub ] ), 32 ) );
	const cek = Buffer.from( hkdfSync( 'sha256', ikm, salt, Buffer.from( 'Content-Encoding: aes128gcm\0' ), 16 ) ), nonce = Buffer.from( hkdfSync( 'sha256', ikm, salt, Buffer.from( 'Content-Encoding: nonce\0' ), 12 ) );
	const dec = createDecipheriv( 'aes-128-gcm', cek, nonce ); dec.setAuthTag( cipher.subarray( cipher.length - 16 ) );
	const plain = Buffer.concat( [ dec.update( cipher.subarray( 0, cipher.length - 16 ) ), dec.final() ] ).toString().replace( /\u0002$/, '' );
	const msg = JSON.parse( plain );
	ok( msg.title === 'A bill is due soon' && /Rent: today/.test( msg.body ), 'the notification is encrypted for the device and says which bill is due', plain );
	const auth = received[ 0 ].headers.authorization, m = /^vapid t=([^,]+), k=(.+)$/.exec( auth || '' );
	const [ h, c, sig ] = ( m ? m[ 1 ] : '..' ).split( '.' );
	const verify = createVerify( 'SHA256' ).update( `${ h }.${ c }` );
	const pubKey = createPublicKey( { key: { kty: 'EC', crv: 'P-256', x: Buffer.from( VAPID.pub, 'base64url' ).subarray( 1, 33 ).toString( 'base64url' ), y: Buffer.from( VAPID.pub, 'base64url' ).subarray( 33 ).toString( 'base64url' ) }, format: 'jwk' } );
	ok( m && m[ 2 ] === VAPID.pub && verify.verify( { key: pubKey, dsaEncoding: 'ieee-p1363' }, Buffer.from( sig, 'base64url' ) ), 'the request is signed with the application key (VAPID)' );
	ok( ( await fetch( `${ API }/api/test/push-run?now=${ Date.now() }` ).then( ( r ) => r.json() ) ).sent === 0, 'the same day sends nothing more' );
	ok( ( await call( 'POST', '/api/push/test', {}, A ) ).json.sent === 1 && received.length === 2, 'a test notification can be sent on demand' );
	ok( ( await call( 'POST', '/api/push/unsubscribe', { endpoint: subscription( 1 ).endpoint }, other ) ).status === 200, 'another account cannot remove it (nothing happens)' );
	ok( ( await call( 'POST', '/api/push/test', {}, A ) ).json.devices === 1, '...so the device is still subscribed' );
	await call( 'POST', '/api/push/unsubscribe', { endpoint: subscription( 1 ).endpoint }, A );
	ok( ( await call( 'POST', '/api/push/test', {}, A ) ).json.devices === 0, 'unsubscribing removes the device' );
	fake.close();
}

// Devices, step-up and passkeys.
let dv = await call( 'GET', '/api/devices', null, A );
ok( dv.json.passkeys.length === 1 && dv.json.sessions.length >= 2 && dv.json.sessions.filter( ( x ) => x.current ).length === 1, 'lists passkeys and sessions' );
ok( ( await call( 'POST', '/api/passkeys/options', {}, A ) ).status === 403, 'adding a passkey needs a fresh passkey check' );
ok( ( await call( 'POST', '/api/auth/stepup/verify', { challengeId: 'nope', response: {} }, A ) ).status === 400, 'a made-up step-up is refused' );
const keyOther = newKey();
let su = await stepUp( key1, A );
ok( /^su_/.test( su ), 'step-up with the passkey gives a short-lived token' );
const ao = await call( 'POST', '/api/passkeys/options', {}, A, { 'X-Step-Up': su } );
ok( ao.status === 200, 'step-up token opens the add-passkey step' );
ok( ( await call( 'POST', '/api/passkeys/options', {}, A, { 'X-Step-Up': su } ) ).status === 403, 'a step-up token works only once' );
ok( ( await call( 'POST', '/api/passkeys/verify', { challengeId: ao.json.challengeId, response: keyOther.create( ao.json.options ), label: 'Second' }, A ) ).status === 200, 'adds a second passkey' );
const viaSecond = await signIn( keyOther );
ok( viaSecond.status === 200 && viaSecond.json.user.email === email, 'signs in with the second passkey' );
dv = await call( 'GET', '/api/devices', null, A );
const secondId = dv.json.passkeys.find( ( p ) => p.label === 'Second' ).id;
ok( ( await call( 'DELETE', `/api/devices/passkey/${ secondId }`, null, A ) ).status === 403, 'removing a passkey needs a step-up' );
su = await stepUp( key1, A );
ok( ( await call( 'DELETE', `/api/devices/passkey/${ secondId }`, null, A, { 'X-Step-Up': su } ) ).status === 200, 'removes a passkey' );
su = await stepUp( key1, A );
const firstId = ( await call( 'GET', '/api/devices', null, A ) ).json.passkeys[ 0 ].id;
ok( ( await call( 'DELETE', `/api/devices/passkey/${ firstId }`, null, A, { 'X-Step-Up': su } ) ).status === 409, 'the last passkey cannot be removed' );
const otherSession = dv.json.sessions.find( ( x ) => ! x.current );
ok( ( await call( 'DELETE', `/api/devices/session/${ otherSession.id }`, null, A ) ).status === 200, 'signs another device out' );

// Recovery codes.
ok( ( await call( 'POST', '/api/auth/recover/options', { email, code: 'AAAA-AAAA-AAAA' } ) ).status === 401, 'a wrong recovery code is refused' );
const code = reg.json.recoveryCodes[ 0 ];
const ro = await call( 'POST', '/api/auth/recover/options', { email, code: code.toLowerCase().replace( /-/g, ' ' ) } );
ok( ro.status === 200, 'a recovery code starts a recovery (case and spacing do not matter)' );
ok( ( await call( 'POST', '/api/auth/recover/options', { email, code } ) ).status === 401, 'a recovery code works only once' );
const keyNew = newKey();
const rv = await call( 'POST', '/api/auth/recover/verify', { challengeId: ro.json.challengeId, response: keyNew.create( ro.json.options ), label: 'After recovery' } );
ok( rv.status === 200 && rv.json.recoveryCodesLeft === 9, 'recovery adds a new passkey and signs in' );
ok( ( await call( 'GET', '/api/me', null, A ) ).status === 401, 'recovery signs every other device out' );
const C = rv.json.token;
su = await stepUp( keyNew, C );
const rg = await call( 'POST', '/api/recovery/regenerate', {}, C, { 'X-Step-Up': su } );
ok( rg.status === 200 && rg.json.recoveryCodes.length === 10 && ( await call( 'GET', '/api/me', null, C ) ).json.recoveryCodesLeft === 10, 'new recovery codes replace the old ones (step-up)' );
ok( ( await call( 'POST', '/api/auth/recover/options', { email, code: reg.json.recoveryCodes[ 1 ] } ) ).status === 401, 'the old codes no longer work' );

// Email codes (through the test mail sink).
ok( ( await call( 'POST', '/api/email/start', {}, C ) ).status === 200, 'sends an email verification code' );
const mail = ( await call( 'GET', `/api/test/outbox?to=${ encodeURIComponent( email ) }` ) ).json.mails[ 0 ];
const emailCode = /(\d{6})/.exec( mail.body )[ 1 ];
ok( /Ο κωδικός/.test( mail.subject ), 'the email follows the account language (Greek)' );
ok( ( await call( 'POST', '/api/email/verify', { code: '000000' }, C ) ).status === 401, 'a wrong email code is refused' );
ok( ( await call( 'POST', '/api/email/verify', { code: emailCode }, C ) ).status === 200 && ( await call( 'GET', '/api/me', null, C ) ).json.user.emailVerified === true, 'a right email code verifies the address' );
await call( 'POST', '/api/auth/recover/email', { email } );
const mail2 = ( await call( 'GET', `/api/test/outbox?to=${ encodeURIComponent( email ) }` ) ).json.mails[ 0 ];
{ // contact form: prefix, sanitising, attachments, honeypot, validation
	const jpg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
	const sent = await call( 'POST', '/api/contact', { category: 'bug', subject: 'Crash\non save', email: 'user@example.com', html: '<p>Hello <b>there</b><script>alert(1)</script> <a href="javascript:x" onclick="y()">bad</a> <a href="https://example.com/x">ok</a> <img src=x onerror=y> &lt; 5 < 6</p>', photos: [ jpg, 'data:text/html;base64,AAAA' ], meta: { version: '9.9.9', lang: 'en', plan: 'pro', signedIn: true, ua: 'TestUA' } } );
	ok( sent.status === 200 && sent.json.ok, 'contact: accepted' );
	const cm = ( await call( 'GET', '/api/test/outbox?to=' + encodeURIComponent( 'mindanticipation@gmail.com' ) ) ).json.mails[ 0 ];
	ok( cm && cm.subject === '[HABIT HERO CONTACT] bug · Crash on save', 'contact: subject has the prefix and one line', cm && cm.subject );
	ok( cm && ! /<script|onclick|onerror|javascript:|<img/i.test( cm.body ) && /<b>there<\/b>/.test( cm.body ) && /href="https:\/\/example.com\/x"/.test( cm.body ), 'contact: html is sanitised, formatting kept' );
	ok( cm && /ATTACHMENTS:1$/.test( cm.body ) && /user@example.com/.test( cm.body ) && /9\.9\.9/.test( cm.body ), 'contact: one valid photo, reply address and app info included' );
	ok( ( await call( 'POST', '/api/contact', { html: '<p>hi</p>' } ) ).status === 400, 'contact: too-short message rejected' );
	const bot = await call( 'POST', '/api/contact', { html: '<p>spam spam spam</p>', website: 'http://x' } );
	const after = ( await call( 'GET', '/api/test/outbox?to=' + encodeURIComponent( 'mindanticipation@gmail.com' ) ) ).json.mails[ 0 ];
	ok( bot.status === 200 && after.subject === cm.subject, 'contact: honeypot is silently dropped' );
}
{ // anonymous usage statistics
	const id = 'dev-' + 'a'.repeat(20), ua = { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };
	const ping = ( extra = {} ) => call( 'POST', '/api/usage', { id, v: '1.2.3', lang: 'el', nlang: 'el-GR', mode: 'app', cls: 'phone', plan: 'pro', skin: 'sunset', signed: true, chan: 'live', ...extra }, undefined, ua );
	ok( ( await ping() ).status === 200, 'usage: ping accepted' );
	ok( ( await ping() ).status === 200, 'usage: same device again the same day' );
	ok( ( await call( 'POST', '/api/usage', { id: 'short' } ) ).status === 400, 'usage: bad id rejected' );
	ok( ( await call( 'POST', '/api/usage', { id: 'b'.repeat(24), v: '1.0.0' }, undefined, { 'User-Agent': 'Googlebot/2.1' } ) ).status === 200, 'usage: bots are accepted but not counted' );
	ok( ( await call( 'GET', '/api/admin/stats?days=7' ) ).status === 401, 'usage: stats need the token' );
	const st = await call( 'GET', '/api/admin/stats?days=7', undefined, 'testtoken123' );
	ok( st.status === 200 && st.json.active.today === 1 && st.json.active.devices === 1, 'usage: one device counted once a day', JSON.stringify( st.json && st.json.active ) );
	const d = st.json.dims;
	ok( d.os[ 0 ].k === 'iOS' && d.browser[ 0 ].k === 'Safari' && d.lang[ 0 ].k === 'el' && d.plan[ 0 ].k === 'pro' && d.cls[ 0 ].k === 'phone' && d.nlang[ 0 ].k === 'el-gr', 'usage: OS, browser, language, plan and device class are recorded', JSON.stringify( d.os ) );
	ok( JSON.stringify( st.json ).indexOf( id ) < 0, 'usage: the raw device id is never returned' );
	ok( typeof st.json.server.accounts === 'number' && Array.isArray( st.json.server.records ), 'usage: server totals are included' );
}
const rc = /(\d{6})/.exec( mail2.body )[ 1 ];
const eo = await call( 'POST', '/api/auth/recover/email/verify', { email, code: rc } );
ok( eo.status === 200 && eo.json.options, 'an emailed code can start a recovery too' );
ok( ( await call( 'POST', '/api/auth/recover/email', { email: 'nobody@example.com' } ) ).status === 200, 'recovery by email answers the same for unknown addresses' );

// CORS, sign out, delete account.
const pre = await fetch( API + '/api/sync', { method: 'OPTIONS', headers: { Origin: ORIGIN } } );
ok( pre.headers.get( 'access-control-allow-origin' ) === ORIGIN && /X-Step-Up/.test( pre.headers.get( 'access-control-allow-headers' ) ), 'CORS allows the app origin and the step-up header' );
{ const r = await fetch( API + '/api/rates' ); const j = await r.json(); ok( r.ok && j.base === 'EUR' && typeof j.rates === 'object', 'exchange rates are public and well-formed (no sign-in needed)' ); }
ok( ( await fetch( API + '/api/health', { headers: { Origin: 'https://evil.example' } } ) ).headers.get( 'access-control-allow-origin' ) === 'null', 'CORS refuses other origins' );
await call( 'POST', '/api/logout', {}, C );
ok( ( await call( 'GET', '/api/me', null, C ) ).status === 401, 'sign out ends the session' );
const D = ( await signIn( keyNew ) ).json.token;
ok( ( await call( 'DELETE', '/api/account', {}, D ) ).status === 403, 'deleting the account needs a step-up' );
su = await stepUp( keyNew, D );
ok( ( await call( 'DELETE', '/api/account', {}, D, { 'X-Step-Up': su } ) ).status === 200, 'account deleted' );
const gone = await call( 'POST', '/api/auth/login/options' );
ok( ( await call( 'POST', '/api/auth/login/verify', { challengeId: gone.json.challengeId, response: keyNew.get( gone.json.options ) } ) ).status === 401, 'a deleted account cannot sign in' );
ok( ( await call( 'GET', '/api/export', null, A ) ).status === 401, 'its old tokens are dead' );

stop();
console.log( fail ? `\n${ fail } failed` : '\nall passed' );
process.exit( fail ? 1 : 0 );

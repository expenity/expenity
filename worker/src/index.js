/**
 * Expenity API: passkey accounts and sync, on Cloudflare Workers with a D1 database.
 *
 * Accounts (no passwords):
 *   POST /api/auth/register/options   { email, lang }                 -> { options, challengeId }
 *   POST /api/auth/register/verify    { challengeId, response, label } -> { token, user, recoveryCodes }
 *   POST /api/auth/login/options                                       -> { options, challengeId }   (discoverable passkeys)
 *   POST /api/auth/login/verify       { challengeId, response }        -> { token, user }
 *   POST /api/auth/recover/options    { email, code }                  -> { options, challengeId }   (recovery code)
 *   POST /api/auth/recover/verify     { challengeId, response, label } -> { token, user }            (new passkey, other sessions end)
 *   POST /api/auth/recover/email      { email }  /  /api/auth/recover/email/verify { email, code }   (needs email enabled)
 *   POST /api/auth/stepup/options     (signed in)  /  /api/auth/stepup/verify { challengeId, response } -> { stepUp }
 * Signed in:
 *   GET  /api/me     POST /api/logout     GET /api/export     POST /api/sync { since, changes }
 *   GET  /api/devices                     passkeys and sessions
 *   POST /api/passkeys/options (step-up) / verify { challengeId, response, label }
 *   DELETE /api/devices/passkey/:id (step-up)   DELETE /api/devices/session/:id
 *   POST /api/recovery/regenerate (step-up)     DELETE /api/account (step-up)
 *   POST /api/email/start  /  /api/email/verify { code }                (needs email enabled)
 *
 * Step-up: sensitive actions need a fresh passkey check; send the returned token in the X-Step-Up header.
 * Sync: each bill, transaction, account, category, budget, goal and the settings is one record. A device sends the
 * records it changed (with updatedAt) and the revision it last saw; the server keeps the newest version of each
 * record (last writer wins), numbers every accepted change, and returns what changed since.
 * Sessions are random bearer tokens, stored hashed.
 */
import {
	generateRegistrationOptions, verifyRegistrationResponse,
	generateAuthenticationOptions, verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const KINDS = new Set( [ 'bill', 'tx', 'account', 'category', 'budget', 'goal', 'income', 'settings' ] );
const MAX_BODY = 2 * 1024 * 1024;
const MAX_CHANGES = 500;
const MAX_DATA = 8000;
const MAX_RECORDS = 20000;
const PAGE = 1000;
const SESSION_DAYS = 90;
const CHALLENGE_MS = 5 * 60000;
const STEP_UP_MS = 5 * 60000;
const enc = new TextEncoder();

/* ------------------------------------------------------------------ Helpers */

const list = ( s ) => ( s || '' ).split( ',' ).map( ( x ) => x.trim() ).filter( Boolean );
function corsHeaders( req, env ) {
	const o = req.headers.get( 'Origin' ) || '';
	const ok = list( env.RP_ORIGINS ).includes( o ) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test( o );
	return {
		'Access-Control-Allow-Origin': ok ? o : 'null',
		'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Step-Up',
		'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
		'Access-Control-Max-Age': '86400',
		Vary: 'Origin',
	};
}
function reply( req, env, data, status = 200 ) {
	return new Response( JSON.stringify( data ), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...corsHeaders( req, env ) },
	} );
}
const fail = ( req, env, error, status = 400 ) => reply( req, env, { error }, status );

const b64url = ( bytes ) => btoa( String.fromCharCode( ...bytes ) ).replace( /\+/g, '-' ).replace( /\//g, '_' ).replace( /=+$/, '' );
const fromB64url = ( s ) => Uint8Array.from( atob( s.replace( /-/g, '+' ).replace( /_/g, '/' ) ), ( c ) => c.charCodeAt( 0 ) );
const randomToken = ( prefix, n = 32 ) => prefix + b64url( crypto.getRandomValues( new Uint8Array( n ) ) );
async function sha256( text ) {
	return b64url( new Uint8Array( await crypto.subtle.digest( 'SHA-256', enc.encode( text ) ) ) );
}
const validEmail = ( e ) => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test( e );
const now = () => Date.now();
const emailEnabled = ( env ) => env.TEST_MODE === '1' || ( env.EMAIL_ENABLED === '1' && !! env.RESEND_API_KEY );
const cleanLabel = ( l ) => ( typeof l === 'string' && l.trim() ? l.trim().slice( 0, 40 ) : 'Passkey' );

async function readJson( req ) {
	const len = Number( req.headers.get( 'Content-Length' ) || 0 );
	if ( len > MAX_BODY ) return { tooLarge: true };
	const text = await req.text();
	if ( text.length > MAX_BODY ) return { tooLarge: true };
	try { const v = text ? JSON.parse( text ) : {}; return v && typeof v === 'object' ? { body: v } : { bad: true }; } catch ( e ) { return { bad: true }; }
}
async function limited( env, name, key ) {
	const l = env[ name ];
	if ( ! l ) return false;
	try { const { success } = await l.limit( { key } ); return ! success; } catch ( e ) { return false; }
}

/* ------------------------------------------------------------------ Sessions, challenges, recovery codes */

async function startSession( env, userId, req ) {
	const token = randomToken( 'ex_' );
	const t = now();
	await env.DB.prepare( 'INSERT INTO sessions (token_hash, user_id, created_at, expires_at, agent) VALUES (?, ?, ?, ?, ?)' )
		.bind( await sha256( token ), userId, t, t + SESSION_DAYS * 864e5, ( req.headers.get( 'User-Agent' ) || '' ).slice( 0, 160 ) ).run();
	return token;
}
async function authenticate( req, env ) {
	const m = /^Bearer (ex_[A-Za-z0-9_-]{20,80})$/.exec( req.headers.get( 'Authorization' ) || '' );
	if ( ! m ) return null;
	const h = await sha256( m[ 1 ] );
	const row = await env.DB.prepare( 'SELECT u.id, u.email, u.email_verified, u.lang, u.rev, u.created_at, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?' ).bind( h ).first();
	if ( ! row || row.expires_at < now() ) return null;
	return { id: row.id, email: row.email, emailVerified: !! row.email_verified, lang: row.lang, rev: row.rev, createdAt: row.created_at, tokenHash: h };
}
const publicUser = ( u ) => ( { id: u.id, email: u.email, emailVerified: !! ( u.emailVerified ?? u.email_verified ), lang: u.lang, createdAt: u.createdAt ?? u.created_at } );

async function newChallenge( env, kind, challenge, extra = {} ) {
	const id = randomToken( 'ch_', 18 );
	await env.DB.batch( [
		env.DB.prepare( 'DELETE FROM challenges WHERE expires_at < ?' ).bind( now() ),
		env.DB.prepare( 'INSERT INTO challenges (id, kind, user_id, email, lang, challenge, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)' )
			.bind( id, kind, extra.userId || null, extra.email || null, extra.lang || null, challenge, now() + CHALLENGE_MS ),
	] );
	return id;
}
/** Single use: the challenge row is deleted when taken. */
async function takeChallenge( env, id, kind ) {
	if ( typeof id !== 'string' ) return null;
	const row = await env.DB.prepare( 'SELECT * FROM challenges WHERE id = ? AND kind = ?' ).bind( id, kind ).first();
	if ( ! row ) return null;
	await env.DB.prepare( 'DELETE FROM challenges WHERE id = ?' ).bind( id ).run();
	return row.expires_at < now() ? null : row;
}

function newRecoveryCodes() {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	return Array.from( { length: 10 }, () => {
		const bytes = crypto.getRandomValues( new Uint8Array( 12 ) );
		const s = Array.from( bytes, ( b ) => alphabet[ b % alphabet.length ] ).join( '' );
		return `${ s.slice( 0, 4 ) }-${ s.slice( 4, 8 ) }-${ s.slice( 8 ) }`;
	} );
}
const normaliseCode = ( c ) => String( c || '' ).toUpperCase().replace( /[^A-Z0-9]/g, '' );
async function storeRecoveryCodes( env, userId, codes ) {
	const hashes = await Promise.all( codes.map( ( c ) => sha256( normaliseCode( c ) ) ) );
	await env.DB.batch( [
		env.DB.prepare( 'DELETE FROM recovery_codes WHERE user_id = ?' ).bind( userId ),
		...hashes.map( ( h ) => env.DB.prepare( 'INSERT INTO recovery_codes (user_id, code_hash) VALUES (?, ?)' ).bind( userId, h ) ),
	] );
}
const codesLeft = async ( env, userId ) => ( await env.DB.prepare( 'SELECT COUNT(*) AS n FROM recovery_codes WHERE user_id = ? AND used_at IS NULL' ).bind( userId ).first() ).n;

/* ------------------------------------------------------------------ Email (off in production until a domain exists) */

async function sendMail( env, to, subject, body ) {
	if ( env.TEST_MODE === '1' ) {
		await env.DB.prepare( 'INSERT INTO outbox (to_addr, subject, body, created_at) VALUES (?, ?, ?, ?)' ).bind( to, subject, body, now() ).run();
		return true;
	}
	if ( env.EMAIL_ENABLED !== '1' || ! env.RESEND_API_KEY ) return false;
	const res = await fetch( 'https://api.resend.com/emails', {
		method: 'POST',
		headers: { Authorization: `Bearer ${ env.RESEND_API_KEY }`, 'Content-Type': 'application/json' },
		body: JSON.stringify( { from: env.EMAIL_FROM, to: [ to ], subject, text: body } ),
	} ).catch( () => null );
	return !! ( res && res.ok );
}
const MAIL = {
	en: { verify: [ 'Your Expenity verification code', ( c ) => `Your code is ${ c }. It works for 10 minutes.` ], recover: [ 'Your Expenity recovery code', ( c ) => `Use this code to add a new passkey: ${ c }. It works for 10 minutes. If this was not you, ignore this email.` ] },
	el: { verify: [ 'Ο κωδικός επαλήθευσης Expenity', ( c ) => `Ο κωδικός σας είναι ${ c }. Ισχύει για 10 λεπτά.` ], recover: [ 'Κωδικός ανάκτησης Expenity', ( c ) => `Χρησιμοποιήστε αυτόν τον κωδικό για να προσθέσετε νέο passkey: ${ c }. Ισχύει για 10 λεπτά. Αν δεν ήσασταν εσείς, αγνοήστε το μήνυμα.` ] },
};
async function sendCode( env, user, purpose ) {
	const code = String( new Uint32Array( crypto.getRandomValues( new Uint32Array( 1 ) ) )[ 0 ] % 1000000 ).padStart( 6, '0' );
	await env.DB.prepare( 'INSERT OR REPLACE INTO email_codes (user_id, purpose, code_hash, attempts, expires_at) VALUES (?, ?, ?, 0, ?)' ).bind( user.id, purpose, await sha256( code ), now() + 10 * 60000 ).run();
	const m = MAIL[ user.lang === 'el' ? 'el' : 'en' ][ purpose ];
	return sendMail( env, user.email, m[ 0 ], m[ 1 ]( code ) );
}
async function checkCode( env, userId, purpose, code ) {
	const row = await env.DB.prepare( 'SELECT code_hash, attempts, expires_at FROM email_codes WHERE user_id = ? AND purpose = ?' ).bind( userId, purpose ).first();
	if ( ! row || row.expires_at < now() || row.attempts >= 5 ) return false;
	if ( row.code_hash !== await sha256( String( code || '' ).trim() ) ) {
		await env.DB.prepare( 'UPDATE email_codes SET attempts = attempts + 1 WHERE user_id = ? AND purpose = ?' ).bind( userId, purpose ).run();
		return false;
	}
	await env.DB.prepare( 'DELETE FROM email_codes WHERE user_id = ? AND purpose = ?' ).bind( userId, purpose ).run();
	return true;
}

/* ------------------------------------------------------------------ Passkeys */

const rp = ( env ) => ( { rpName: env.RP_NAME || 'Expenity', rpID: env.RP_ID } );
const origins = ( env ) => list( env.RP_ORIGINS ).concat( env.TEST_MODE === '1' ? list( env.TEST_ORIGINS ) : [] );
const userCredentials = async ( env, userId ) => ( await env.DB.prepare( 'SELECT id, transports FROM credentials WHERE user_id = ?' ).bind( userId ).all() ).results || [];
const parseTransports = ( t ) => { try { return t ? JSON.parse( t ) : undefined; } catch ( e ) { return undefined; } };

async function registrationOptions( env, { userId, email, exclude = [] } ) {
	return generateRegistrationOptions( {
		...rp( env ), userName: email, userDisplayName: email, userID: fromB64url( userId ), attestationType: 'none',
		authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
		excludeCredentials: exclude.map( ( c ) => ( { id: c.id, transports: parseTransports( c.transports ) } ) ),
	} );
}
async function verifyRegistration( env, response, challenge ) {
	try {
		const r = await verifyRegistrationResponse( { response, expectedChallenge: challenge, expectedOrigin: origins( env ), expectedRPID: env.RP_ID, requireUserVerification: false } );
		return r.verified ? Object.assign( {}, r.registrationInfo.credential, { multi: r.registrationInfo.credentialDeviceType === 'multiDevice' } ) : null;
	} catch ( e ) { return null; }
}
const insertCredential = ( env, userId, cred, label ) => env.DB.prepare( 'INSERT INTO credentials (id, user_id, public_key, counter, multi, transports, label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)' )
	.bind( cred.id, userId, b64url( cred.publicKey ), cred.counter || 0, cred.multi ? 1 : 0, JSON.stringify( cred.transports || [] ), label, now() );

async function verifyAssertion( env, response, challenge, userId ) {
	if ( ! response || typeof response.id !== 'string' ) return null;
	const row = await env.DB.prepare( 'SELECT id, user_id, public_key, counter, multi, transports FROM credentials WHERE id = ?' ).bind( response.id ).first();
	if ( ! row || ( userId && row.user_id !== userId ) ) return null;
	try {
		const r = await verifyAuthenticationResponse( {
			response, expectedChallenge: challenge, expectedOrigin: origins( env ), expectedRPID: env.RP_ID, requireUserVerification: false,
			// Synced passkeys (iCloud, Google, password managers) share one credential across devices, so their counters can
			// legitimately go backwards; the counter is only a clone check for passkeys that live on a single device.
			credential: { id: row.id, publicKey: fromB64url( row.public_key ), counter: row.multi ? 0 : row.counter, transports: parseTransports( row.transports ) },
		} );
		if ( ! r.verified ) return null;
		await env.DB.prepare( 'UPDATE credentials SET counter = ?, last_used = ? WHERE id = ?' ).bind( r.authenticationInfo.newCounter, now(), row.id ).run();
		return row.user_id;
	} catch ( e ) { return null; }
}

async function registerOptions( req, env, body ) {
	const email = String( body.email || '' ).trim().toLowerCase();
	if ( ! validEmail( email ) ) return fail( req, env, 'invalid_email' );
	if ( await env.DB.prepare( 'SELECT 1 FROM users WHERE email = ?' ).bind( email ).first() ) return fail( req, env, 'email_taken', 409 );
	const userId = b64url( crypto.getRandomValues( new Uint8Array( 16 ) ) );
	const options = await registrationOptions( env, { userId, email } );
	const challengeId = await newChallenge( env, 'register', options.challenge, { userId, email, lang: body.lang === 'el' ? 'el' : 'en' } );
	return reply( req, env, { options, challengeId } );
}
async function registerVerify( req, env, body ) {
	const ch = await takeChallenge( env, body.challengeId, 'register' );
	if ( ! ch ) return fail( req, env, 'bad_challenge' );
	const cred = await verifyRegistration( env, body.response, ch.challenge );
	if ( ! cred ) return fail( req, env, 'bad_passkey' );
	const codes = newRecoveryCodes();
	try {
		await env.DB.prepare( 'INSERT INTO users (id, email, email_verified, lang, rev, created_at) VALUES (?, ?, 0, ?, 0, ?)' ).bind( ch.user_id, ch.email, ch.lang || 'en', now() ).run();
	} catch ( e ) { return fail( req, env, 'email_taken', 409 ); }
	await insertCredential( env, ch.user_id, cred, cleanLabel( body.label ) ).run();
	await storeRecoveryCodes( env, ch.user_id, codes );
	const token = await startSession( env, ch.user_id, req );
	return reply( req, env, { token, user: { id: ch.user_id, email: ch.email, emailVerified: false, lang: ch.lang || 'en', createdAt: now() }, recoveryCodes: codes }, 201 );
}

async function loginOptions( req, env ) {
	const options = await generateAuthenticationOptions( { rpID: env.RP_ID, userVerification: 'preferred' } );
	const challengeId = await newChallenge( env, 'login', options.challenge );
	return reply( req, env, { options, challengeId } );
}
async function loginVerify( req, env, body ) {
	const ch = await takeChallenge( env, body.challengeId, 'login' );
	if ( ! ch ) return fail( req, env, 'bad_challenge' );
	const userId = await verifyAssertion( env, body.response, ch.challenge, null );
	if ( ! userId ) return fail( req, env, 'bad_credentials', 401 );
	const user = await env.DB.prepare( 'SELECT id, email, email_verified, lang, created_at FROM users WHERE id = ?' ).bind( userId ).first();
	return reply( req, env, { token: await startSession( env, userId, req ), user: publicUser( user ) } );
}

// Sensitive actions: a passkey check with the signed-in user's own passkeys, good for 5 minutes, single use.
async function stepUpOptions( req, env, user ) {
	const creds = await userCredentials( env, user.id );
	const options = await generateAuthenticationOptions( { rpID: env.RP_ID, userVerification: 'preferred', allowCredentials: creds.map( ( c ) => ( { id: c.id, transports: parseTransports( c.transports ) } ) ) } );
	return reply( req, env, { options, challengeId: await newChallenge( env, 'stepup', options.challenge, { userId: user.id } ) } );
}
async function stepUpVerify( req, env, user, body ) {
	const ch = await takeChallenge( env, body.challengeId, 'stepup' );
	if ( ! ch || ch.user_id !== user.id ) return fail( req, env, 'bad_challenge' );
	if ( ! await verifyAssertion( env, body.response, ch.challenge, user.id ) ) return fail( req, env, 'bad_credentials', 401 );
	const token = randomToken( 'su_' );
	await env.DB.prepare( 'INSERT INTO step_ups (token_hash, user_id, expires_at) VALUES (?, ?, ?)' ).bind( await sha256( token ), user.id, now() + STEP_UP_MS ).run();
	return reply( req, env, { stepUp: token } );
}
async function consumeStepUp( req, env, user ) {
	const t = req.headers.get( 'X-Step-Up' ) || '';
	if ( ! /^su_[A-Za-z0-9_-]{20,80}$/.test( t ) ) return false;
	const h = await sha256( t );
	const row = await env.DB.prepare( 'SELECT user_id, expires_at FROM step_ups WHERE token_hash = ?' ).bind( h ).first();
	if ( ! row ) return false;
	await env.DB.prepare( 'DELETE FROM step_ups WHERE token_hash = ?' ).bind( h ).run();
	return row.user_id === user.id && row.expires_at >= now();
}

async function addPasskeyOptions( req, env, user ) {
	if ( ! await consumeStepUp( req, env, user ) ) return fail( req, env, 'step_up_required', 403 );
	const options = await registrationOptions( env, { userId: user.id.startsWith( 'u_' ) ? user.id : user.id, email: user.email, exclude: await userCredentials( env, user.id ) } );
	return reply( req, env, { options, challengeId: await newChallenge( env, 'addkey', options.challenge, { userId: user.id } ) } );
}
async function addPasskeyVerify( req, env, user, body ) {
	const ch = await takeChallenge( env, body.challengeId, 'addkey' );
	if ( ! ch || ch.user_id !== user.id ) return fail( req, env, 'bad_challenge' );
	const cred = await verifyRegistration( env, body.response, ch.challenge );
	if ( ! cred ) return fail( req, env, 'bad_passkey' );
	try { await insertCredential( env, user.id, cred, cleanLabel( body.label ) ).run(); } catch ( e ) { return fail( req, env, 'passkey_exists', 409 ); }
	return reply( req, env, { ok: true } );
}

/* ------------------------------------------------------------------ Recovery: a code (or an emailed code) lets the user add a new passkey */

async function recoveryRegistration( req, env, user ) {
	const options = await registrationOptions( env, { userId: user.id, email: user.email } );
	return reply( req, env, { options, challengeId: await newChallenge( env, 'recover', options.challenge, { userId: user.id } ) } );
}
async function recoverWithCode( req, env, body ) {
	const email = String( body.email || '' ).trim().toLowerCase();
	const user = validEmail( email ) ? await env.DB.prepare( 'SELECT id, email, lang FROM users WHERE email = ?' ).bind( email ).first() : null;
	const h = await sha256( normaliseCode( body.code ) );
	const row = user ? await env.DB.prepare( 'SELECT used_at FROM recovery_codes WHERE user_id = ? AND code_hash = ?' ).bind( user.id, h ).first() : null;
	if ( ! user || ! row || row.used_at ) return fail( req, env, 'bad_code', 401 );
	await env.DB.prepare( 'UPDATE recovery_codes SET used_at = ? WHERE user_id = ? AND code_hash = ?' ).bind( now(), user.id, h ).run();
	return recoveryRegistration( req, env, user );
}
async function recoverEmailStart( req, env, body ) {
	if ( ! emailEnabled( env ) ) return fail( req, env, 'email_unavailable', 501 );
	const email = String( body.email || '' ).trim().toLowerCase();
	const user = validEmail( email ) ? await env.DB.prepare( 'SELECT id, email, lang, email_verified FROM users WHERE email = ?' ).bind( email ).first() : null;
	if ( user && user.email_verified ) await sendCode( env, user, 'recover' );
	return reply( req, env, { ok: true } ); // the same answer whether or not the account exists
}
async function recoverEmailVerify( req, env, body ) {
	if ( ! emailEnabled( env ) ) return fail( req, env, 'email_unavailable', 501 );
	const email = String( body.email || '' ).trim().toLowerCase();
	const user = validEmail( email ) ? await env.DB.prepare( 'SELECT id, email, lang, email_verified FROM users WHERE email = ?' ).bind( email ).first() : null;
	if ( ! user || ! user.email_verified || ! await checkCode( env, user.id, 'recover', body.code ) ) return fail( req, env, 'bad_code', 401 );
	return recoveryRegistration( req, env, user );
}
async function recoverVerify( req, env, body ) {
	const ch = await takeChallenge( env, body.challengeId, 'recover' );
	if ( ! ch ) return fail( req, env, 'bad_challenge' );
	const cred = await verifyRegistration( env, body.response, ch.challenge );
	if ( ! cred ) return fail( req, env, 'bad_passkey' );
	try { await insertCredential( env, ch.user_id, cred, cleanLabel( body.label ) ).run(); } catch ( e ) { return fail( req, env, 'passkey_exists', 409 ); }
	// Recovery signs every other device out: whoever had access before must now sign in again.
	await env.DB.prepare( 'DELETE FROM sessions WHERE user_id = ?' ).bind( ch.user_id ).run();
	const user = await env.DB.prepare( 'SELECT id, email, email_verified, lang, created_at FROM users WHERE id = ?' ).bind( ch.user_id ).first();
	return reply( req, env, { token: await startSession( env, ch.user_id, req ), user: publicUser( user ), recoveryCodesLeft: await codesLeft( env, ch.user_id ) } );
}

/* ------------------------------------------------------------------ Signed-in account features */

async function me( req, env, user ) {
	return reply( req, env, { user: publicUser( user ), emailEnabled: emailEnabled( env ), recoveryCodesLeft: await codesLeft( env, user.id ) } );
}
async function devices( req, env, user ) {
	const [ pk, ss ] = await Promise.all( [
		env.DB.prepare( 'SELECT id, label, created_at, last_used FROM credentials WHERE user_id = ? ORDER BY created_at' ).bind( user.id ).all(),
		env.DB.prepare( 'SELECT token_hash, created_at, expires_at, agent FROM sessions WHERE user_id = ? ORDER BY created_at DESC' ).bind( user.id ).all(),
	] );
	return reply( req, env, {
		passkeys: ( pk.results || [] ).map( ( r ) => ( { id: r.id, label: r.label, createdAt: r.created_at, lastUsed: r.last_used } ) ),
		sessions: ( ss.results || [] ).map( ( r ) => ( { id: r.token_hash.slice( 0, 12 ), agent: r.agent, createdAt: r.created_at, current: r.token_hash === user.tokenHash } ) ),
	} );
}
async function deletePasskey( req, env, user, id ) {
	if ( ! await consumeStepUp( req, env, user ) ) return fail( req, env, 'step_up_required', 403 );
	const n = ( await env.DB.prepare( 'SELECT COUNT(*) AS n FROM credentials WHERE user_id = ?' ).bind( user.id ).first() ).n;
	if ( n <= 1 ) return fail( req, env, 'last_passkey', 409 );
	await env.DB.prepare( 'DELETE FROM credentials WHERE id = ? AND user_id = ?' ).bind( id, user.id ).run();
	return reply( req, env, { ok: true } );
}
async function deleteSession( req, env, user, id ) {
	if ( ! /^[A-Za-z0-9_-]{12}$/.test( id ) ) return fail( req, env, 'bad_request' );
	await env.DB.prepare( 'DELETE FROM sessions WHERE user_id = ? AND substr(token_hash, 1, 12) = ?' ).bind( user.id, id ).run();
	return reply( req, env, { ok: true } );
}
async function regenerateCodes( req, env, user ) {
	if ( ! await consumeStepUp( req, env, user ) ) return fail( req, env, 'step_up_required', 403 );
	const codes = newRecoveryCodes();
	await storeRecoveryCodes( env, user.id, codes );
	return reply( req, env, { recoveryCodes: codes } );
}
async function deleteAccount( req, env, user ) {
	if ( ! await consumeStepUp( req, env, user ) ) return fail( req, env, 'step_up_required', 403 );
	const owned = await env.DB.prepare( 'SELECT id FROM spaces WHERE owner_id = ?' ).bind( user.id ).all();
	for ( const sp of owned.results || [] ) await removeSpaceData( env, sp.id );
	await env.DB.prepare( 'DELETE FROM space_members WHERE user_id = ?' ).bind( user.id ).run();
	await env.DB.batch( [ 'records', 'sessions', 'credentials', 'recovery_codes', 'step_ups', 'email_codes', 'challenges' ].map( ( t ) => env.DB.prepare( `DELETE FROM ${ t } WHERE user_id = ?` ).bind( user.id ) )
		.concat( [ env.DB.prepare( 'DELETE FROM users WHERE id = ?' ).bind( user.id ) ] ) );
	return reply( req, env, { ok: true } );
}
async function emailStart( req, env, user ) {
	if ( ! emailEnabled( env ) ) return fail( req, env, 'email_unavailable', 501 );
	if ( user.emailVerified ) return reply( req, env, { ok: true, verified: true } );
	return await sendCode( env, user, 'verify' ) ? reply( req, env, { ok: true } ) : fail( req, env, 'email_failed', 502 );
}
async function emailVerify( req, env, user, body ) {
	if ( ! emailEnabled( env ) ) return fail( req, env, 'email_unavailable', 501 );
	if ( ! await checkCode( env, user.id, 'verify', body.code ) ) return fail( req, env, 'bad_code', 401 );
	await env.DB.prepare( 'UPDATE users SET email_verified = 1 WHERE id = ?' ).bind( user.id ).run();
	return reply( req, env, { ok: true } );
}

/* ------------------------------------------------------------------ Sync */

// scope: the personal store of the user, or one shared space. Spaces only hold a wallet, its transactions and its bills.
const SPACE_KINDS = new Set( [ 'bill', 'tx', 'account' ] );
const personalScope = ( user ) => ( { key: user.id, kinds: KINDS, bump: ( env ) => env.DB.prepare( 'UPDATE users SET rev = rev + 1 WHERE id = ? RETURNING rev' ).bind( user.id ).first(), head: ( env ) => env.DB.prepare( 'SELECT rev FROM users WHERE id = ?' ).bind( user.id ).first() } );
const spaceScope = ( id ) => ( { key: 'sp_' + id, kinds: SPACE_KINDS, bump: ( env ) => env.DB.prepare( 'UPDATE spaces SET rev = rev + 1 WHERE id = ? RETURNING rev' ).bind( id ).first(), head: ( env ) => env.DB.prepare( 'SELECT rev FROM spaces WHERE id = ?' ).bind( id ).first() } );
async function sync( req, env, user, body, scope = personalScope( user ) ) {
	const since = Number.isInteger( body.since ) && body.since >= 0 ? body.since : 0;
	const incoming = Array.isArray( body.changes ) ? body.changes : [];
	if ( incoming.length > MAX_CHANGES ) return fail( req, env, 'too_large', 413 );
	const t = now();
	const clean = [];
	for ( const c of incoming ) {
		if ( ! c || typeof c.id !== 'string' || ! /^[A-Za-z0-9_-]{1,64}$/.test( c.id ) || ! scope.kinds.has( c.kind ) ) return fail( req, env, 'bad_request' );
		const deleted = c.deleted === true;
		let data = '';
		if ( ! deleted ) {
			if ( ! c.data || typeof c.data !== 'object' || Array.isArray( c.data ) ) return fail( req, env, 'bad_request' );
			data = JSON.stringify( c.data );
			if ( data.length > MAX_DATA ) return fail( req, env, 'too_large', 413 );
		}
		const u = Number.isFinite( c.updatedAt ) ? Math.min( Math.max( 0, Math.floor( c.updatedAt ) ), t + 5 * 60000 ) : t;
		clean.push( { id: c.id, kind: c.kind, data, u, deleted: deleted ? 1 : 0 } );
	}

	if ( clean.length ) {
		const count = await env.DB.prepare( 'SELECT COUNT(*) AS n FROM records WHERE user_id = ?' ).bind( scope.key ).first();
		if ( count.n + clean.length > MAX_RECORDS + 500 ) return fail( req, env, 'too_large', 413 );
		const bump = await scope.bump( env );
		await env.DB.batch( clean.map( ( c ) => env.DB.prepare(
			`INSERT INTO records (user_id, id, kind, data, updated_at, deleted, rev) VALUES (?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT (user_id, id) DO UPDATE SET kind = excluded.kind, data = excluded.data, updated_at = excluded.updated_at, deleted = excluded.deleted, rev = excluded.rev
			 WHERE excluded.updated_at >= records.updated_at`
		).bind( scope.key, c.id, c.kind, c.data, c.u, c.deleted, bump.rev ) ) );
	}

	const rows = await env.DB.prepare( 'SELECT id, kind, data, updated_at, deleted, rev FROM records WHERE user_id = ? AND rev > ? ORDER BY rev LIMIT ?' ).bind( scope.key, since, PAGE + 1 ).all();
	const all = rows.results || [];
	const more = all.length > PAGE;
	const page = more ? all.slice( 0, PAGE ) : all;
	const head = await scope.head( env );
	return reply( req, env, {
		rev: more ? page[ page.length - 1 ].rev : head.rev, more, serverTime: t,
		changes: page.map( ( r ) => ( { id: r.id, kind: r.kind, data: r.deleted ? null : JSON.parse( r.data ), updatedAt: r.updated_at, deleted: !! r.deleted } ) ),
	} );
}
async function exportAll( req, env, user ) {
	const rows = await env.DB.prepare( 'SELECT id, kind, data, updated_at FROM records WHERE user_id = ? AND deleted = 0 ORDER BY updated_at' ).bind( user.id ).all();
	return reply( req, env, { exportedAt: now(), user: publicUser( user ), records: ( rows.results || [] ).map( ( r ) => ( { id: r.id, kind: r.kind, updatedAt: r.updated_at, data: JSON.parse( r.data ) } ) ) } );
}

/* ------------------------------------------------------------------ Shared wallets (spaces) */

const ROLES = new Set( [ 'editor', 'viewer' ] );
const MAX_OWNED_SPACES = 5;
const MAX_MEMBERS = 12;
const INVITE_MS = 7 * 24 * 3600 * 1000;
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newSpaceId = () => Array.from( crypto.getRandomValues( new Uint8Array( 16 ) ), ( b ) => ( b % 36 ).toString( 36 ) ).join( '' );
const newInviteCode = () => Array.from( crypto.getRandomValues( new Uint8Array( 10 ) ), ( b ) => CODE_CHARS[ b % CODE_CHARS.length ] ).join( '' );
const roleOf = async ( env, spaceId, userId ) => { const r = await env.DB.prepare( 'SELECT role FROM space_members WHERE space_id = ? AND user_id = ?' ).bind( spaceId, userId ).first(); return r ? r.role : null; };

async function listSpaces( req, env, user ) {
	const rows = await env.DB.prepare( `SELECT s.id, s.name, s.owner_id, s.rev, m.role, (SELECT COUNT(*) FROM space_members x WHERE x.space_id = s.id) AS members
		FROM space_members m JOIN spaces s ON s.id = m.space_id WHERE m.user_id = ? ORDER BY s.created_at` ).bind( user.id ).all();
	return reply( req, env, { spaces: ( rows.results || [] ).map( ( r ) => ( { id: r.id, name: r.name, role: r.role, owner: r.owner_id === user.id, members: r.members } ) ) } );
}
async function createSpace( req, env, user, body ) {
	const name = typeof body.name === 'string' ? body.name.trim().slice( 0, 60 ) : '';
	if ( ! name ) return fail( req, env, 'bad_request' );
	const owned = await env.DB.prepare( 'SELECT COUNT(*) AS n FROM spaces WHERE owner_id = ?' ).bind( user.id ).first();
	if ( owned.n >= MAX_OWNED_SPACES ) return fail( req, env, 'too_many_spaces', 409 );
	const id = newSpaceId(), t = now();
	await env.DB.batch( [
		env.DB.prepare( 'INSERT INTO spaces (id, name, owner_id, rev, created_at) VALUES (?, ?, ?, 0, ?)' ).bind( id, name, user.id, t ),
		env.DB.prepare( "INSERT INTO space_members (space_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)" ).bind( id, user.id, t ),
	] );
	return reply( req, env, { id, name, role: 'owner', owner: true, members: 1 } );
}
async function spaceMembers( req, env, user, id ) {
	if ( ! await roleOf( env, id, user.id ) ) return fail( req, env, 'not_found', 404 );
	const rows = await env.DB.prepare( 'SELECT m.user_id, m.role, m.joined_at, u.email FROM space_members m JOIN users u ON u.id = m.user_id WHERE m.space_id = ? ORDER BY m.joined_at' ).bind( id ).all();
	const inv = await roleOf( env, id, user.id ) === 'owner' ? await env.DB.prepare( 'SELECT code_hash, role, expires_at FROM space_invites WHERE space_id = ? AND used_at IS NULL AND expires_at > ? ORDER BY created_at DESC' ).bind( id, now() ).all() : { results: [] };
	return reply( req, env, {
		members: ( rows.results || [] ).map( ( r ) => ( { id: r.user_id, email: r.email, role: r.role, joinedAt: r.joined_at, you: r.user_id === user.id } ) ),
		invites: ( inv.results || [] ).map( ( r ) => ( { id: r.code_hash.slice( 0, 12 ), role: r.role, expiresAt: r.expires_at } ) ),
	} );
}
async function spaceSync( req, env, user, id, body ) {
	const role = await roleOf( env, id, user.id );
	if ( ! role ) return fail( req, env, 'not_found', 404 );
	if ( role === 'viewer' && Array.isArray( body.changes ) && body.changes.length ) return fail( req, env, 'forbidden', 403 );
	return sync( req, env, user, body, spaceScope( id ) );
}
async function createInvite( req, env, user, id, body ) {
	if ( await roleOf( env, id, user.id ) !== 'owner' ) return fail( req, env, 'forbidden', 403 );
	if ( ! ROLES.has( body.role ) ) return fail( req, env, 'bad_request' );
	const open = await env.DB.prepare( 'SELECT COUNT(*) AS n FROM space_invites WHERE space_id = ? AND used_at IS NULL AND expires_at > ?' ).bind( id, now() ).first();
	if ( open.n >= 10 ) return fail( req, env, 'too_many_invites', 409 );
	const code = newInviteCode(), t = now();
	await env.DB.prepare( 'INSERT INTO space_invites (code_hash, space_id, role, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)' ).bind( await sha256( code ), id, body.role, user.id, t, t + INVITE_MS ).run();
	return reply( req, env, { code, role: body.role, expiresAt: t + INVITE_MS } );
}
async function revokeInvite( req, env, user, id, inviteId ) {
	if ( await roleOf( env, id, user.id ) !== 'owner' ) return fail( req, env, 'forbidden', 403 );
	await env.DB.prepare( 'DELETE FROM space_invites WHERE space_id = ? AND substr(code_hash, 1, 12) = ? AND used_at IS NULL' ).bind( id, inviteId ).run();
	return reply( req, env, { ok: true } );
}
async function acceptInvite( req, env, user, body ) {
	const code = typeof body.code === 'string' ? body.code.toUpperCase().replace( /[^A-Z0-9]/g, '' ) : '';
	if ( code.length !== 10 ) return fail( req, env, 'bad_code', 404 );
	const inv = await env.DB.prepare( 'SELECT code_hash, space_id, role, expires_at, used_at FROM space_invites WHERE code_hash = ?' ).bind( await sha256( code ) ).first();
	if ( ! inv || inv.used_at || inv.expires_at < now() ) return fail( req, env, 'bad_code', 404 );
	const space = await env.DB.prepare( 'SELECT id, name, owner_id FROM spaces WHERE id = ?' ).bind( inv.space_id ).first();
	if ( ! space ) return fail( req, env, 'bad_code', 404 );
	if ( await roleOf( env, space.id, user.id ) ) return reply( req, env, { id: space.id, name: space.name, role: await roleOf( env, space.id, user.id ), already: true } );
	const n = await env.DB.prepare( 'SELECT COUNT(*) AS n FROM space_members WHERE space_id = ?' ).bind( space.id ).first();
	if ( n.n >= MAX_MEMBERS ) return fail( req, env, 'space_full', 409 );
	const t = now();
	// Claim the code first: only one request can flip used_at from NULL.
	const claimed = await env.DB.prepare( 'UPDATE space_invites SET used_by = ?, used_at = ? WHERE code_hash = ? AND used_at IS NULL RETURNING code_hash' ).bind( user.id, t, inv.code_hash ).first();
	if ( ! claimed ) return fail( req, env, 'bad_code', 404 );
	await env.DB.prepare( 'INSERT OR IGNORE INTO space_members (space_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)' ).bind( space.id, user.id, inv.role, t ).run();
	return reply( req, env, { id: space.id, name: space.name, role: inv.role, owner: false } );
}
async function setMemberRole( req, env, user, id, memberId, body ) {
	if ( await roleOf( env, id, user.id ) !== 'owner' ) return fail( req, env, 'forbidden', 403 );
	if ( ! ROLES.has( body.role ) || memberId === user.id ) return fail( req, env, 'bad_request' );
	await env.DB.prepare( 'UPDATE space_members SET role = ? WHERE space_id = ? AND user_id = ? AND role != \'owner\'' ).bind( body.role, id, memberId ).run();
	return reply( req, env, { ok: true } );
}
// The owner removes someone, or a member leaves. The owner cannot leave: they delete the wallet instead.
async function removeMember( req, env, user, id, memberId ) {
	const role = await roleOf( env, id, user.id );
	if ( ! role ) return fail( req, env, 'not_found', 404 );
	if ( memberId !== user.id && role !== 'owner' ) return fail( req, env, 'forbidden', 403 );
	if ( memberId === user.id && role === 'owner' ) return fail( req, env, 'owner_cannot_leave', 409 );
	await env.DB.prepare( 'DELETE FROM space_members WHERE space_id = ? AND user_id = ?' ).bind( id, memberId ).run();
	return reply( req, env, { ok: true } );
}
async function removeSpaceData( env, id ) {
	await env.DB.batch( [
		env.DB.prepare( 'DELETE FROM records WHERE user_id = ?' ).bind( 'sp_' + id ),
		env.DB.prepare( 'DELETE FROM space_invites WHERE space_id = ?' ).bind( id ),
		env.DB.prepare( 'DELETE FROM space_members WHERE space_id = ?' ).bind( id ),
		env.DB.prepare( 'DELETE FROM spaces WHERE id = ?' ).bind( id ),
	] );
}
async function deleteSpace( req, env, user, id ) {
	if ( await roleOf( env, id, user.id ) !== 'owner' ) return fail( req, env, 'forbidden', 403 );
	await removeSpaceData( env, id );
	return reply( req, env, { ok: true } );
}

/* ------------------------------------------------------------------ Exchange rates */

// Public and cheap: one cached row, refreshed at most every 12 hours from the ECB reference rates (units of a currency per 1 EUR).
async function rates( req, env ) {
	const row = await env.DB.prepare( 'SELECT fetched_at, rate_date, data FROM rates WHERE id = 1' ).first();
	if ( row && now() - row.fetched_at < 12 * 36e5 ) return reply( req, env, { base: 'EUR', date: row.rate_date, rates: JSON.parse( row.data ) } );
	try {
		const res = await fetch( 'https://api.frankfurter.app/latest?from=EUR' );
		if ( res.ok ) {
			const j = await res.json();
			if ( j && j.rates && typeof j.date === 'string' ) {
				await env.DB.prepare( 'INSERT OR REPLACE INTO rates (id, fetched_at, rate_date, data) VALUES (1, ?, ?, ?)' ).bind( now(), j.date, JSON.stringify( j.rates ) ).run();
				return reply( req, env, { base: 'EUR', date: j.date, rates: j.rates } );
			}
		}
	} catch ( e ) { /* fall back to the cache */ }
	return row ? reply( req, env, { base: 'EUR', date: row.rate_date, rates: JSON.parse( row.data ), stale: true } ) : reply( req, env, { base: 'EUR', date: '', rates: {} } );
}

/* ------------------------------------------------------------------ Routing */

const PUBLIC_POST = {
	'/api/auth/register/options': registerOptions, '/api/auth/register/verify': registerVerify,
	'/api/auth/login/options': loginOptions, '/api/auth/login/verify': loginVerify,
	'/api/auth/recover/options': recoverWithCode, '/api/auth/recover/verify': recoverVerify,
	'/api/auth/recover/email': recoverEmailStart, '/api/auth/recover/email/verify': recoverEmailVerify,
};

export default {
	async fetch( req, env ) {
		const url = new URL( req.url );
		if ( req.method === 'OPTIONS' ) return new Response( null, { status: 204, headers: corsHeaders( req, env ) } );
		const path = url.pathname.replace( /\/+$/, '' );
		if ( path === '' || path === '/api/health' ) return reply( req, env, { ok: true, service: 'expenity-api' } );
		if ( env.TEST_MODE === '1' && path === '/api/test/outbox' ) {
			const rows = await env.DB.prepare( 'SELECT to_addr, subject, body FROM outbox WHERE to_addr = ? ORDER BY id DESC LIMIT 5' ).bind( url.searchParams.get( 'to' ) || '' ).all();
			return reply( req, env, { mails: rows.results || [] } );
		}
		if ( ! path.startsWith( '/api/' ) ) return fail( req, env, 'not_found', 404 );
		if ( path === '/api/rates' && req.method === 'GET' ) return rates( req, env );

		const ip = req.headers.get( 'CF-Connecting-IP' ) || 'local';
		if ( PUBLIC_POST[ path ] ) {
			if ( req.method !== 'POST' ) return fail( req, env, 'not_found', 404 );
			if ( await limited( env, 'AUTH_LIMITER', `${ path }:${ ip }` ) ) return fail( req, env, 'rate_limited', 429 );
			const r = await readJson( req );
			if ( r.tooLarge ) return fail( req, env, 'too_large', 413 );
			if ( r.bad ) return fail( req, env, 'bad_request' );
			return PUBLIC_POST[ path ]( req, env, r.body );
		}

		const user = await authenticate( req, env );
		if ( ! user ) return fail( req, env, 'unauthorized', 401 );
		const M = req.method;
		if ( path === '/api/me' && M === 'GET' ) return me( req, env, user );
		if ( path === '/api/logout' && M === 'POST' ) {
			await env.DB.prepare( 'DELETE FROM sessions WHERE token_hash = ?' ).bind( user.tokenHash ).run();
			return reply( req, env, { ok: true } );
		}
		if ( path === '/api/export' && M === 'GET' ) return exportAll( req, env, user );
		if ( path === '/api/devices' && M === 'GET' ) return devices( req, env, user );
		let m;
		if ( ( m = /^\/api\/devices\/passkey\/([A-Za-z0-9_-]{1,200})$/.exec( path ) ) && M === 'DELETE' ) return deletePasskey( req, env, user, m[ 1 ] );
		if ( ( m = /^\/api\/devices\/session\/([A-Za-z0-9_-]{12})$/.exec( path ) ) && M === 'DELETE' ) return deleteSession( req, env, user, m[ 1 ] );

		if ( path === '/api/spaces' && M === 'GET' ) return listSpaces( req, env, user );
		if ( ( m = /^\/api\/spaces\/([a-z0-9]{8,40})\/members$/.exec( path ) ) && M === 'GET' ) return spaceMembers( req, env, user, m[ 1 ] );
		if ( M === 'POST' || M === 'DELETE' ) {
			if ( await limited( env, 'SYNC_LIMITER', `${ path }:${ user.id }` ) ) return fail( req, env, 'rate_limited', 429 );
			const r = await readJson( req );
			if ( r.tooLarge ) return fail( req, env, 'too_large', 413 );
			if ( r.bad ) return fail( req, env, 'bad_request' );
			const b = r.body;
			if ( path === '/api/sync' && M === 'POST' ) return sync( req, env, user, b );
			if ( path === '/api/spaces' && M === 'POST' ) return createSpace( req, env, user, b );
			if ( path === '/api/invites/accept' && M === 'POST' ) {
				if ( await limited( env, 'AUTH_LIMITER', `invite:${ user.id }` ) ) return fail( req, env, 'rate_limited', 429 );
				return acceptInvite( req, env, user, b );
			}
			let sm;
			if ( ( sm = /^\/api\/spaces\/([a-z0-9]{8,40})\/sync$/.exec( path ) ) && M === 'POST' ) return spaceSync( req, env, user, sm[ 1 ], b );
			if ( ( sm = /^\/api\/spaces\/([a-z0-9]{8,40})\/invites$/.exec( path ) ) && M === 'POST' ) return createInvite( req, env, user, sm[ 1 ], b );
			if ( ( sm = /^\/api\/spaces\/([a-z0-9]{8,40})\/invites\/([A-Za-z0-9_-]{12})$/.exec( path ) ) && M === 'DELETE' ) return revokeInvite( req, env, user, sm[ 1 ], sm[ 2 ] );
			if ( ( sm = /^\/api\/spaces\/([a-z0-9]{8,40})\/members\/([A-Za-z0-9_-]{1,64})$/.exec( path ) ) ) { if ( M === 'POST' ) return setMemberRole( req, env, user, sm[ 1 ], sm[ 2 ], b ); if ( M === 'DELETE' ) return removeMember( req, env, user, sm[ 1 ], sm[ 2 ] ); }
			if ( ( sm = /^\/api\/spaces\/([a-z0-9]{8,40})$/.exec( path ) ) && M === 'DELETE' ) return deleteSpace( req, env, user, sm[ 1 ] );
			if ( path === '/api/auth/stepup/options' && M === 'POST' ) return stepUpOptions( req, env, user );
			if ( path === '/api/auth/stepup/verify' && M === 'POST' ) return stepUpVerify( req, env, user, b );
			if ( path === '/api/passkeys/options' && M === 'POST' ) return addPasskeyOptions( req, env, user );
			if ( path === '/api/passkeys/verify' && M === 'POST' ) return addPasskeyVerify( req, env, user, b );
			if ( path === '/api/recovery/regenerate' && M === 'POST' ) return regenerateCodes( req, env, user );
			if ( path === '/api/account' && M === 'DELETE' ) return deleteAccount( req, env, user );
			if ( path === '/api/email/start' && M === 'POST' ) return emailStart( req, env, user );
			if ( path === '/api/email/verify' && M === 'POST' ) return emailVerify( req, env, user, b );
		}
		return fail( req, env, 'not_found', 404 );
	},
};

/**
 * Web Push for Expenity: real notifications when the app is closed.
 *
 * A device subscribes through the browser's push service (Chrome, Firefox, Edge, Safari on an installed home-screen
 * app). The Worker keeps the subscription and, once an hour from a cron trigger, sends each person one summary of
 * the bills that are due soon or overdue, at their chosen local hour. Messages are encrypted for the device
 * (RFC 8291, aes128gcm) and signed with the application's VAPID key (RFC 8292), both done here with WebCrypto.
 */

const enc = new TextEncoder();
const b64url = ( bytes ) => btoa( String.fromCharCode( ...new Uint8Array( bytes ) ) ).replace( /\+/g, '-' ).replace( /\//g, '_' ).replace( /=+$/, '' );
const fromB64url = ( s ) => Uint8Array.from( atob( s.replace( /-/g, '+' ).replace( /_/g, '/' ) ), ( c ) => c.charCodeAt( 0 ) );
const concat = ( ...parts ) => { const out = new Uint8Array( parts.reduce( ( n, p ) => n + p.length, 0 ) ); let o = 0; parts.forEach( ( p ) => { out.set( p, o ); o += p.length; } ); return out; };

// Push services we are willing to call. The endpoint comes from the browser, so it is checked against this list.
const PUSH_HOSTS = [ /^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/ ];
export function validEndpoint( endpoint, env ) {
	let u;
	try { u = new URL( endpoint ); } catch ( e ) { return false; }
	if ( env.TEST_MODE === '1' && /^http:\/\/127\.0\.0\.1(:\d+)?\//.test( endpoint ) ) return true;
	return u.protocol === 'https:' && endpoint.length <= 600 && PUSH_HOSTS.some( ( re ) => re.test( u.hostname ) );
}

/* ------------------------------------------------------------------ Signing (VAPID) */

async function vapidHeader( env, endpoint ) {
	const jwk = JSON.parse( env.VAPID_PRIVATE_JWK );
	delete jwk.key_ops; delete jwk.ext;
	const key = await crypto.subtle.importKey( 'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, [ 'sign' ] );
	const head = b64url( enc.encode( JSON.stringify( { typ: 'JWT', alg: 'ES256' } ) ) );
	const claims = b64url( enc.encode( JSON.stringify( { aud: new URL( endpoint ).origin, exp: Math.floor( Date.now() / 1000 ) + 12 * 3600, sub: env.VAPID_SUBJECT || 'https://expenity.github.io/expenity/' } ) ) );
	const sig = await crypto.subtle.sign( { name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode( `${ head }.${ claims }` ) );
	return `vapid t=${ head }.${ claims }.${ b64url( sig ) }, k=${ env.VAPID_PUBLIC }`;
}

/* ------------------------------------------------------------------ Encryption (RFC 8291) */

async function hkdf( secret, salt, info, length ) {
	const key = await crypto.subtle.importKey( 'raw', secret, 'HKDF', false, [ 'deriveBits' ] );
	return new Uint8Array( await crypto.subtle.deriveBits( { name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8 ) );
}
export async function encryptPayload( plain, p256dh, auth ) {
	const uaPublic = fromB64url( p256dh ), authSecret = fromB64url( auth );
	const eph = await crypto.subtle.generateKey( { name: 'ECDH', namedCurve: 'P-256' }, true, [ 'deriveBits' ] );
	const asPublic = new Uint8Array( await crypto.subtle.exportKey( 'raw', eph.publicKey ) );
	const uaKey = await crypto.subtle.importKey( 'raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [] );
	const shared = new Uint8Array( await crypto.subtle.deriveBits( { name: 'ECDH', public: uaKey }, eph.privateKey, 256 ) );
	const ikm = await hkdf( shared, authSecret, concat( enc.encode( 'WebPush: info\0' ), uaPublic, asPublic ), 32 );
	const salt = crypto.getRandomValues( new Uint8Array( 16 ) );
	const cek = await hkdf( ikm, salt, enc.encode( 'Content-Encoding: aes128gcm\0' ), 16 );
	const nonce = await hkdf( ikm, salt, enc.encode( 'Content-Encoding: nonce\0' ), 12 );
	const key = await crypto.subtle.importKey( 'raw', cek, 'AES-GCM', false, [ 'encrypt' ] );
	const body = new Uint8Array( await crypto.subtle.encrypt( { name: 'AES-GCM', iv: nonce }, key, concat( enc.encode( plain ), new Uint8Array( [ 2 ] ) ) ) );
	const rs = new Uint8Array( [ 0, 0, 16, 0 ] ); // record size 4096
	return concat( salt, rs, new Uint8Array( [ asPublic.length ] ), asPublic, body );
}

/** Sends one message. Returns 'ok', 'gone' (the subscription is dead and should be removed) or 'fail'. */
export async function sendPush( env, sub, message ) {
	try {
		const body = await encryptPayload( JSON.stringify( message ), sub.p256dh, sub.auth );
		const res = await fetch( sub.endpoint, { method: 'POST', headers: { Authorization: await vapidHeader( env, sub.endpoint ), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '43200', Urgency: 'normal' }, body } );
		if ( res.status === 404 || res.status === 410 ) return 'gone';
		return res.ok ? 'ok' : 'fail';
	} catch ( e ) { return 'fail'; }
}

/* ------------------------------------------------------------------ What is due */

const pad = ( n ) => String( n ).padStart( 2, '0' );
/** The calendar date and hour in a time zone, for a moment in time. */
export function localTime( ms, tz ) {
	try {
		const p = Object.fromEntries( new Intl.DateTimeFormat( 'en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' } ).formatToParts( new Date( ms ) ).map( ( x ) => [ x.type, x.value ] ) );
		return { day: `${ p.year }-${ p.month }-${ p.day }`, hour: Number( p.hour ) };
	} catch ( e ) { const d = new Date( ms ); return { day: `${ d.getUTCFullYear() }-${ pad( d.getUTCMonth() + 1 ) }-${ pad( d.getUTCDate() ) }`, hour: d.getUTCHours() }; }
}
const dayDiff = ( a, b ) => Math.round( ( Date.parse( a + 'T00:00:00Z' ) - Date.parse( b + 'T00:00:00Z' ) ) / 864e5 );

/** Bills due within their reminder window (or overdue) that are not done or snoozed, from the person's own records and their shared wallets. */
export async function dueBills( env, userId, today ) {
	const owners = [ userId ];
	const spaces = await env.DB.prepare( 'SELECT space_id FROM space_members WHERE user_id = ?' ).bind( userId ).all();
	( spaces.results || [] ).forEach( ( s ) => owners.push( 'sp_' + s.space_id ) );
	const qs = owners.map( () => '?' ).join( ',' );
	const rows = await env.DB.prepare( `SELECT kind, data FROM records WHERE deleted = 0 AND kind IN ('bill','settings') AND user_id IN (${ qs })` ).bind( ...owners ).all();
	let lead = 3; const bills = [];
	for ( const r of rows.results || [] ) {
		let d; try { d = JSON.parse( r.data ); } catch ( e ) { continue; }
		if ( r.kind === 'settings' ) { if ( Number.isFinite( d.lead ) ) lead = d.lead; } else bills.push( d );
	}
	return bills.filter( ( b ) => b && ! b.done && b.next && /^\d{4}-\d{2}-\d{2}$/.test( b.next ) && ( ! b.snooze || b.snooze < today ) )
		.map( ( b ) => ( { name: String( b.name || '' ).slice( 0, 60 ), days: dayDiff( b.next, today ), window: Number.isFinite( b.lead ) && b.lead !== null ? b.lead : lead } ) )
		.filter( ( b ) => b.days <= b.window ).sort( ( a, b ) => a.days - b.days );
}

const TEXT = {
	en: { one: 'A bill is due soon', many: ( n ) => `${ n } bills are due soon`, today: 'today', tomorrow: 'tomorrow', in: ( n ) => `in ${ n } days`, late: ( n ) => `${ n } day${ n === 1 ? '' : 's' } overdue`, more: ( n ) => `+${ n } more`, test: 'Notifications are on', testBody: 'You will get a reminder here when a bill is due.' },
	el: { one: 'Ένας λογαριασμός λήγει σύντομα', many: ( n ) => `${ n } λογαριασμοί λήγουν σύντομα`, today: 'σήμερα', tomorrow: 'αύριο', in: ( n ) => `σε ${ n } ημέρες`, late: ( n ) => `${ n } ${ n === 1 ? 'ημέρα' : 'ημέρες' } καθυστέρηση`, more: ( n ) => `+${ n } ακόμα`, test: 'Οι ειδοποιήσεις είναι ενεργές', testBody: 'Θα εμφανίζεται εδώ μια υπενθύμιση όταν λήγει ένας λογαριασμός.' },
};
export function summary( due, lang ) {
	const T = TEXT[ lang ] || TEXT.en;
	const when = ( d ) => ( d < 0 ? T.late( -d ) : d === 0 ? T.today : d === 1 ? T.tomorrow : T.in( d ) );
	const lines = due.slice( 0, 4 ).map( ( b ) => `${ b.name }: ${ when( b.days ) }` );
	if ( due.length > 4 ) lines.push( T.more( due.length - 4 ) );
	return { title: due.length === 1 ? T.one : T.many( due.length ), body: lines.join( '\n' ), tag: 'expenity-due', url: './' };
}
export const testMessage = ( lang ) => { const T = TEXT[ lang ] || TEXT.en; return { title: T.test, body: T.testBody, tag: 'expenity-test', url: './' }; };

/** One hourly pass: for every subscription whose local time has reached the chosen hour, send today's summary once. */
export async function runPush( env, nowMs = Date.now() ) {
	const subs = await env.DB.prepare( 'SELECT s.endpoint, s.user_id, s.p256dh, s.auth, s.tz, s.hour, s.lang, s.last_day FROM push_subs s' ).all();
	let sent = 0;
	for ( const s of subs.results || [] ) {
		const t = localTime( nowMs, s.tz );
		if ( t.hour < s.hour || s.last_day === t.day ) continue;
		const due = await dueBills( env, s.user_id, t.day );
		if ( ! due.length ) { await env.DB.prepare( 'UPDATE push_subs SET last_day = ? WHERE endpoint = ?' ).bind( t.day, s.endpoint ).run(); continue; }
		const r = await sendPush( env, s, summary( due, s.lang ) );
		if ( r === 'gone' ) await env.DB.prepare( 'DELETE FROM push_subs WHERE endpoint = ?' ).bind( s.endpoint ).run();
		else if ( r === 'ok' ) { sent++; await env.DB.prepare( 'UPDATE push_subs SET last_day = ?, fails = 0 WHERE endpoint = ?' ).bind( t.day, s.endpoint ).run(); }
		else await env.DB.prepare( 'UPDATE push_subs SET fails = fails + 1 WHERE endpoint = ?' ).bind( s.endpoint ).run();
	}
	await env.DB.prepare( 'DELETE FROM push_subs WHERE fails >= 10' ).run(); // a subscription that keeps failing is dropped
	return sent;
}

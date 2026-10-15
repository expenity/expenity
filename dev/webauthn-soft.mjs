/**
 * A tiny software passkey ("authenticator") for tests: creates ES256 credentials and signs assertions
 * exactly as a browser would send them, so the API's WebAuthn checks run for real without a browser.
 */
import { createHash, generateKeyPairSync, sign, randomBytes } from 'node:crypto';

const b64 = ( buf ) => Buffer.from( buf ).toString( 'base64url' );
const sha256 = ( data ) => createHash( 'sha256' ).update( data ).digest();

// Minimal CBOR encoder: unsigned and negative integers, byte strings, text strings, maps.
function head( major, n ) {
	if ( n < 24 ) return Buffer.from( [ ( major << 5 ) | n ] );
	if ( n < 256 ) return Buffer.from( [ ( major << 5 ) | 24, n ] );
	return Buffer.from( [ ( major << 5 ) | 25, n >> 8, n & 255 ] );
}
function cbor( v ) {
	if ( Buffer.isBuffer( v ) ) return Buffer.concat( [ head( 2, v.length ), v ] );
	if ( typeof v === 'string' ) { const b = Buffer.from( v ); return Buffer.concat( [ head( 3, b.length ), b ] ); }
	if ( typeof v === 'number' ) return v >= 0 ? head( 0, v ) : head( 1, -1 - v );
	const entries = v instanceof Map ? [ ...v.entries() ] : Object.entries( v );
	return Buffer.concat( [ head( 5, entries.length ), ...entries.flatMap( ( [ k, val ] ) => [ cbor( k ), cbor( val ) ] ) ] );
}

export class SoftPasskey {
	constructor( { rpId, origin } ) {
		this.rpId = rpId;
		this.origin = origin;
		this.id = randomBytes( 32 );
		this.counter = 0;
		const { privateKey, publicKey } = generateKeyPairSync( 'ec', { namedCurve: 'P-256' } );
		this.privateKey = privateKey;
		this.jwk = publicKey.export( { format: 'jwk' } );
		this.userHandle = null;
	}

	/** The JSON a browser sends after navigator.credentials.create(). */
	create( options ) {
		this.userHandle = options.user.id;
		const clientData = Buffer.from( JSON.stringify( { type: 'webauthn.create', challenge: options.challenge, origin: this.origin, crossOrigin: false } ) );
		const cose = cbor( new Map( [ [ 1, 2 ], [ 3, -7 ], [ -1, 1 ], [ -2, Buffer.from( this.jwk.x, 'base64url' ) ], [ -3, Buffer.from( this.jwk.y, 'base64url' ) ] ] ) );
		const counter = Buffer.alloc( 4 );
		const idLen = Buffer.alloc( 2 ); idLen.writeUInt16BE( this.id.length );
		const authData = Buffer.concat( [ sha256( this.rpId ), Buffer.from( [ 0x45 ] ), counter, Buffer.alloc( 16 ), idLen, this.id, cose ] );
		const attestationObject = cbor( { fmt: 'none', attStmt: {}, authData } );
		return { id: b64( this.id ), rawId: b64( this.id ), type: 'public-key', authenticatorAttachment: 'platform', clientExtensionResults: {},
			response: { clientDataJSON: b64( clientData ), attestationObject: b64( attestationObject ), transports: [ 'internal' ] } };
	}

	/** The JSON a browser sends after navigator.credentials.get(). */
	get( options ) {
		this.counter += 1;
		const clientData = Buffer.from( JSON.stringify( { type: 'webauthn.get', challenge: options.challenge, origin: this.origin, crossOrigin: false } ) );
		const counter = Buffer.alloc( 4 ); counter.writeUInt32BE( this.counter );
		const authData = Buffer.concat( [ sha256( this.rpId ), Buffer.from( [ 0x05 ] ), counter ] );
		const signature = sign( 'sha256', Buffer.concat( [ authData, sha256( clientData ) ] ), { key: this.privateKey, dsaEncoding: 'der' } );
		return { id: b64( this.id ), rawId: b64( this.id ), type: 'public-key', authenticatorAttachment: 'platform', clientExtensionResults: {},
			response: { clientDataJSON: b64( clientData ), authenticatorData: b64( authData ), signature: b64( signature ), userHandle: this.userHandle } };
	}
}

/* Duenest service worker: the app works offline. Network first, so updates arrive as soon as you are online. */
const CACHE = 'duenest-v1';
const FILES = [ './', 'index.html', 'app.js', 'i18n.js', 'style.css', 'favicon.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png' ];

self.addEventListener( 'install', ( e ) => {
	e.waitUntil( caches.open( CACHE ).then( ( c ) => c.addAll( FILES ) ).then( () => self.skipWaiting() ) );
} );
self.addEventListener( 'activate', ( e ) => {
	e.waitUntil( caches.keys().then( ( keys ) => Promise.all( keys.filter( ( k ) => k !== CACHE ).map( ( k ) => caches.delete( k ) ) ) ).then( () => self.clients.claim() ) );
} );
self.addEventListener( 'fetch', ( e ) => {
	const req = e.request;
	if ( req.method !== 'GET' || new URL( req.url ).origin !== location.origin ) return;
	e.respondWith(
		fetch( req ).then( ( res ) => {
			const copy = res.clone();
			caches.open( CACHE ).then( ( c ) => c.put( req, copy ) );
			return res;
		} ).catch( () => caches.match( req ).then( ( hit ) => hit || caches.match( './' ) ) )
	);
} );
self.addEventListener( 'notificationclick', ( e ) => {
	e.notification.close();
	e.waitUntil( self.clients.matchAll( { type: 'window' } ).then( ( list ) => ( list.length ? list[ 0 ].focus() : self.clients.openWindow( './' ) ) ) );
} );

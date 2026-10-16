/* Expenity service worker: the app works offline. Network first, so updates arrive as soon as you are online. */
const CACHE = 'expenity-v19';
const FILES = [ './', 'index.html', 'icons.js', 'i18n.js', 'core.js', 'sync.js', 'ui.js', 'views.js', 'forms.js', 'photos.js', 'reports.js', 'plan.js', 'insights.js', 'safe-spend.js', 'receipts.js', 'share.js', 'push.js', 'flow.js', 'installation.js', 'themes.js', 'app.js', 'enhancements.js', 'dashboard.js', 'releases.json', 'theme.js', 'style.css', 'themes.css', 'favicon.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'installation/ios-en.mp4', 'installation/ios-en.png', 'installation/ios-el.mp4', 'installation/ios-el.png', 'installation/android-en.mp4', 'installation/android-en.png', 'installation/android-el.mp4', 'installation/android-el.png', 'installation/desktop-en.mp4', 'installation/desktop-en.png', 'installation/desktop-el.mp4', 'installation/desktop-el.png' ];

self.addEventListener( 'install', ( e ) => {
	e.waitUntil( caches.open( CACHE ).then( ( c ) => c.addAll( FILES ) ).then( () => self.skipWaiting() ) );
} );
self.addEventListener( 'activate', ( e ) => {
	e.waitUntil( caches.keys().then( ( keys ) => Promise.all( keys.filter( ( k ) => k.startsWith(CACHE.startsWith('expenity-beta-') ? 'expenity-beta-' : 'expenity-v') && k !== CACHE ).map( ( k ) => caches.delete( k ) ) ) ).then( () => self.clients.claim() ) );
} );
self.addEventListener( 'fetch', ( e ) => {
	const req = e.request;
	if ( req.method !== 'GET' || new URL( req.url ).origin !== location.origin ) return; // the API is another origin and is never cached
	// Recognition resources are large: load only on demand and keep them through ordinary app updates.
	if(new URL(req.url).pathname.includes('/vendor/ocr/')){
	 e.respondWith((async()=>{const cache=await caches.open('expenity-ocr-v7-fast-8741641');const hit=await cache.match(req);if(hit)return hit;
	  try{const res=await fetch(req);if(res.ok)await cache.put(req,res.clone());return res;}catch(e){return new Response('',{status:503});}
	 })());return;
	}

	// Video seeking (including offline Safari) needs a partial-content response, not the app HTML fallback.
	if(new URL(req.url).pathname.endsWith('.mp4')){
		e.respondWith((async()=>{
			const cache=await caches.open(CACHE);let full=await cache.match(req.url,{ignoreSearch:true});
			if(!full){try{full=await fetch(req.url);if(!full.ok)return full;if(full.status===200)await cache.put(req.url,full.clone());}catch(error){return new Response('',{status:503});}}
			const range=req.headers.get('Range');if(!range)return full;
			const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match)return new Response('',{status:416});
			const bytes=await full.arrayBuffer(),length=bytes.byteLength;
			const start=match[1]?Number(match[1]):Math.max(0,length-Number(match[2]));
			const end=match[1]&&match[2]?Math.min(length-1,Number(match[2])):length-1;
			if(start>=length||end<start||(!match[1]&&!match[2]))return new Response('',{status:416,headers:{'Content-Range':`bytes */${length}`}});
			return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${length}`,'Content-Length':String(end-start+1)}});
		})());return;
	}
	e.respondWith(
		fetch( req ).then( ( res ) => {
			const copy = res.clone();
			caches.open( CACHE ).then( ( c ) => c.put( req, copy ) );
			return res;
		} ).catch( () => caches.match( req ).then( ( hit ) => hit || caches.match( './' ) ) )
	);
} );
// A push message from the server: show it. (The browser requires that every push shows a notification.)
self.addEventListener( 'push', ( e ) => {
	let m = {};
	try { m = e.data ? e.data.json() : {}; } catch ( err ) { m = { title: 'Expenity', body: e.data ? e.data.text() : '' }; }
	e.waitUntil( self.registration.showNotification( m.title || 'Expenity', { body: m.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: m.tag || 'expenity', data: { url: m.url || './' } } ) );
} );
self.addEventListener( 'notificationclick', ( e ) => {
	e.notification.close();
	const url = ( e.notification.data && e.notification.data.url ) || './';
	e.waitUntil( self.clients.matchAll( { type: 'window', includeUncontrolled: true } ).then( ( list ) => ( list.length ? list[ 0 ].focus() : self.clients.openWindow( url ) ) ) );
} );

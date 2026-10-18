(function () {
	'use strict';
	const sec = document.getElementById( 'try' ); if ( ! sec ) return;
	const reduce = matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	const lang = document.documentElement.lang === 'el' ? 'el' : 'en';
	const appUrl = ( () => { const b = document.querySelector( 'link[rel=icon]' ).getAttribute( 'href' ).replace( 'assets/favicon.svg', '' ); return b + 'app/'; } )();
	const screens = [ ...sec.querySelectorAll( '.xp-screen' ) ], tabs = [ ...sec.querySelectorAll( '[data-device]' ) ].filter( ( x ) => x.getAttribute( 'role' ) === 'tab' );
	const chips = [ ...sec.querySelectorAll( '.xp-chip' ) ], modeBtn = sec.querySelector( '[data-mode]' );
	let device = 'phone', skin = 'emerald', dark = false, touched = false, touchedDevice = false, themeClicks = 0;
	const frameOf = ( s ) => s.querySelector( 'iframe' );
	const apply = ( f ) => {
		let n = 0; const go = () => { try { const w = f.contentWindow; if ( w && w.EXA && w.EXA.setSkin && w.document.documentElement.dataset.demoReady === '1' ) { w.EXA.setSkin( skin ); w.EXA.setMode( dark ? 'dark' : 'light' ); setTimeout( () => tint( f ), 450 ); return; } } catch ( e ) { return; } if ( n++ < 80 ) setTimeout( go, 100 ); }; go();
	};
	// The strip above the phone's screen takes the app's own background, with a clock in a readable colour.
	const tint = ( f ) => { try { const bg = f.contentWindow.getComputedStyle( f.contentWindow.document.body ).backgroundColor, m = /(\d+)\D+(\d+)\D+(\d+)/.exec( bg ), v = f.closest( '.xp-view' ); if ( ! m ) return; v.style.background = bg; v.style.setProperty( '--st-ink', ( 0.299 * m[ 1 ] + 0.587 * m[ 2 ] + 0.114 * m[ 3 ] ) > 150 ? '#111' : '#fff' ); } catch ( e ) { /* ignore */ } };
	const fit = () => { screens.forEach( ( s ) => {
		const w = Number( s.dataset.w ), h = Number( s.dataset.h ), avail = s.parentElement.clientWidth || 600;
		const target = s.dataset.device === 'phone' ? 330 : s.dataset.device === 'ipad' ? 520 : Math.min( avail, 980 );
		const k = Math.min( 1, target / w ), v = s.querySelector( '.xp-view' ), f = frameOf( s );
		const strip = s.dataset.device === 'phone' ? 44 : 0; s.style.setProperty( '--k', k ); v.style.width = Math.round( w * k ) + 'px'; v.style.height = Math.round( h * k ) + 'px'; f.style.height = ( h - strip ) + 'px'; f.style.top = Math.round( strip * k ) + 'px'; f.style.transform = 'scale(' + k + ')';
	} ); };
	const show = ( d ) => {
		device = d; tabs.forEach( ( t ) => t.setAttribute( 'aria-selected', String( t.dataset.device === d ) ) );
		screens.forEach( ( s ) => { const on = s.dataset.device === d; s.hidden = ! on; if ( on ) { const f = frameOf( s ); if ( ! f.src || f.src === 'about:blank' ) { f.addEventListener( 'load', () => apply( f ) ); f.src = appUrl + '?demo=1&lang=' + lang + '&skin=' + skin; } else apply( f ); } } );
		fit();
	};
	const setSkin = ( id, user ) => {
		skin = id; chips.forEach( ( c ) => c.setAttribute( 'aria-checked', String( c.dataset.skin === id ) ) );
		screens.forEach( ( s ) => { const f = frameOf( s ); if ( f.src ) apply( f ); } );
		if ( user ) { touched = true; themeClicks++; sec.classList.add( 'xp-touched' ); if ( themeClicks >= 1 && ! touchedDevice ) sec.classList.add( 'xp-nudge-device' ); }
	};
	chips.forEach( ( c ) => c.addEventListener( 'click', () => setSkin( c.dataset.skin, true ) ) );
	tabs.forEach( ( t ) => t.addEventListener( 'click', () => { touched = true; touchedDevice = true; sec.classList.remove( 'xp-nudge-device' ); sec.classList.add( 'xp-touched', 'xp-device-done' ); show( t.dataset.device ); } ) );
	modeBtn.addEventListener( 'click', () => { dark = ! dark; touched = true; modeBtn.setAttribute( 'aria-pressed', String( dark ) ); screens.forEach( ( s ) => { const f = frameOf( s ); if ( f.src ) apply( f ); } ); } );
	[ 'pointerdown', 'keydown' ].forEach( ( e ) => sec.addEventListener( e, ( ev ) => { if ( ev.target.closest( '.xp-chips,.xp-tabs,.xp-mode,.xp-view' ) ) touched = true; } ) );
	new ResizeObserver( fit ).observe( sec.querySelector( '.xp-stage-wrap' ) );
	// Starts when the section is on screen: the app loads, then dresses itself in a few themes until the visitor takes over.
	let started = false;
	const start = () => { if ( started ) return; started = true; show( 'phone' ); if ( reduce ) return; const order = [ 'synthwave', 'mario', 'paper', 'vader', 'sunset', 'bricks', 'amberwave', 'minnie', 'candy', 'ion', 'terminal', 'emerald' ]; let i = 0;
		const tick = () => { if ( touched ) return; setSkin( order[ i++ % order.length ], false ); if ( i === 3 ) sec.classList.add( 'xp-nudge-device' ); setTimeout( tick, 3200 ); }; setTimeout( tick, 4200 ); };
	if ( 'IntersectionObserver' in window ) new IntersectionObserver( ( es, o ) => { if ( es.some( ( e ) => e.isIntersecting ) ) { start(); o.disconnect(); } }, { rootMargin: '200px' } ).observe( sec ); else start();
}() );

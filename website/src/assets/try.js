(function () {
	'use strict';
	const sec = document.getElementById( 'try' ); if ( ! sec ) return;
	const lang = document.documentElement.lang === 'el' ? 'el' : 'en', base = ( document.querySelector( 'link[rel=icon]' ).getAttribute( 'href' ).replace( 'assets/favicon.svg', '' ) ) + sec.dataset.base;
	const screens = [ ...sec.querySelectorAll( '.xp-screen' ) ], tabs = [ ...sec.querySelectorAll( '.xp-tabs [data-device]' ) ], chips = [ ...sec.querySelectorAll( '.xp-chip' ) ];
	const INK = { sunset: '#111', emerald: '#111', synthwave: '#fff', candy: '#111' };
	let device = 'phone', skin = 'sunset', meta = null, touched = false, deviceTouched = false;
	const src = ( dev, part ) => `${ base }${ dev }-${ skin }-${ lang }-${ part }.jpg`;
	const swap = ( img, url ) => { if ( img.getAttribute( 'src' ) === url ) return; const pre = new Image(); pre.onload = () => { img.classList.add( 'is-fade' ); setTimeout( () => { img.src = url; img.classList.remove( 'is-fade' ); }, 120 ); }; pre.src = url; if ( ! img.getAttribute( 'src' ) ) img.src = url; };
	const paint = () => { const s = screens.find( ( x ) => x.dataset.device === device ); s.querySelectorAll( '.xp-img' ).forEach( ( i ) => swap( i, src( device, i.dataset.part ) ) ); s.querySelector( '.xp-view' ).style.setProperty( '--st-ink', INK[ skin ] || '#111' ); };
	const place = ( el, r, w, h ) => { el.style.left = ( r.x / w * 100 ) + '%'; el.style.top = ( r.y / h * 100 ) + '%'; el.style.width = ( r.w / w * 100 ) + '%'; el.style.height = ( r.h / h * 100 ) + '%'; };
	const fit = () => { if ( ! meta ) return; screens.forEach( ( s ) => {
		const dev = s.dataset.device, m = meta[ dev ], avail = s.parentElement.clientWidth || 600, target = dev === 'phone' ? 330 : dev === 'ipad' ? 520 : Math.min( avail, 980 ), k = Math.min( 1, target / m.w ), v = s.querySelector( '.xp-view' );
		s.style.setProperty( '--k', k ); v.style.width = Math.round( m.w * k ) + 'px'; v.style.height = Math.round( m.h * k ) + 'px';
		place( s.querySelector( '.xp-hot-add' ), m.add, m.w, m.h ); place( s.querySelector( '.xp-hot-close' ), m.close, m.w, m.h );
		if ( dev === 'phone' ) { const bar = s.querySelector( '.xp-barimg' ); bar.style.height = ( m.barH / m.h * 100 ) + '%'; s.querySelector( '.xp-pscroll img' ).style.marginBottom = ( m.barH * k ) + 'px'; }
	} ); };
	const show = ( d ) => { device = d; tabs.forEach( ( t ) => t.setAttribute( 'aria-selected', String( t.dataset.device === d ) ) ); screens.forEach( ( s ) => { s.hidden = s.dataset.device !== d; s.querySelector( '.xp-sheet' ).hidden = true; } ); paint(); fit(); };
	chips.forEach( ( c ) => c.addEventListener( 'click', () => { skin = c.dataset.skin; chips.forEach( ( x ) => x.setAttribute( 'aria-checked', String( x === c ) ) ); paint(); touched = true; sec.classList.add( 'xp-touched' ); } ) );
	tabs.forEach( ( t ) => t.addEventListener( 'click', () => { touched = deviceTouched = true; sec.classList.add( 'xp-touched', 'xp-device-done' ); show( t.dataset.device ); } ) );
	sec.addEventListener( 'click', ( e ) => { const add = e.target.closest( '.xp-hot-add' ), close = e.target.closest( '.xp-hot-close' ); if ( ! add && ! close ) return; const sh = e.target.closest( '.xp-screen' ).querySelector( '.xp-sheet' ); sh.hidden = ! add; touched = true; sec.classList.add( 'xp-touched' ); } );
	new ResizeObserver( fit ).observe( sec.querySelector( '.xp-stage-wrap' ) );
	let started = false;
	const start = () => { if ( started ) return; started = true; fetch( base + 'preview.json' ).then( ( r ) => r.json() ).then( ( j ) => { meta = j; show( 'phone' ); } ).catch( () => {} ); };
	// Closed by default: nothing is downloaded until the section is opened for the first time.
	const toggle = document.getElementById( 'xp-try-toggle' ), panel = document.getElementById( 'xp-try-panel' );
	toggle.addEventListener( 'click', () => {
		const open = toggle.getAttribute( 'aria-expanded' ) !== 'true';
		toggle.setAttribute( 'aria-expanded', String( open ) ); sec.classList.toggle( 'is-open', open ); panel.inert = ! open;
		if ( open ) { start(); fit(); setTimeout( fit, 450 ); }
	} );
}() );

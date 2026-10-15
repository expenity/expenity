/* Expenity home page: reveal sections as they scroll into view. Everything is visible without JavaScript or with reduced motion. */
( function () {
	'use strict';
	var still = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	var items = document.querySelectorAll( '.reveal' );
	if ( still || ! ( 'IntersectionObserver' in window ) ) { items.forEach( function ( el ) { el.classList.add( 'is-on' ); } ); return; }
	var io = new IntersectionObserver( function ( entries ) {
		entries.forEach( function ( e ) { if ( e.isIntersecting ) { e.target.classList.add( 'is-on' ); io.unobserve( e.target ); } } );
	}, { threshold: 0.12 } );
	items.forEach( function ( el, i ) { el.style.transitionDelay = ( i % 3 ) * 70 + 'ms'; io.observe( el ); } );
}() );

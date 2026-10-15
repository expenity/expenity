/**
 * Expenity UI helpers: icons, bottom sheets (with the browser's back button), toasts, swipe actions and pull to refresh.
 * No screens here: those are in views.js and forms.js. Everything is on window.UI.
 */
( function () {
	'use strict';
	const EX = window.EX;
	const UI = ( window.UI = {} );
	const $ = ( s, r = document ) => r.querySelector( s );

	/* ------------------------------------------------------------------ Icons */

	UI.icon = ( name, size = 24, cls = '' ) => ( cls ? window.EXI_SVG( name, size ).replace( 'class="i"', `class="i ${ cls }"` ) : window.EXI_SVG( name, size ) );
	/** A colored circle with an icon, the way every category, wallet and action is shown. */
	UI.ci = ( name, color = 'gray', size = 40 ) => `<span class="ci tint-${ color }" style="--s:${ size }px">${ UI.icon( name, Math.round( size * 0.52 ) ) }</span>`;
	UI.catCi = ( info, size = 40 ) => ( info.iconName ? UI.ci( info.iconName, info.color, size ) : `<span class="ci tint-gray" style="--s:${ size }px"><span class="em" aria-hidden="true">${ EX.esc( info.icon ) }</span></span>` );
	UI.walletCi = ( w, size = 40 ) => UI.ci( EX.WALLET_ICON[ w.type ] || 'wallet', 'teal', size );

	/* ------------------------------------------------------------------ Layout helpers */

	UI.isPhone = () => window.matchMedia( '(max-width: 599px)' ).matches;
	UI.isWide = () => window.matchMedia( '(min-width: 1200px)' ).matches;
	UI.isStandalone = () => window.matchMedia( '(display-mode: standalone)' ).matches || window.navigator.standalone === true;
	UI.haptic = ( ms = 12 ) => { try { if ( navigator.vibrate ) navigator.vibrate( ms ); } catch ( e ) { /* not available */ } };

	/* ------------------------------------------------------------------ Toast */

	let toastTimer = null;
	UI.toast = ( msg, undo ) => {
		const el = $( '#toast' );
		el.innerHTML = `<span>${ EX.esc( msg ) }</span>${ undo ? `<button type="button" class="link">${ EX.esc( EX.t( 'undo' ) ) }</button>` : '' }`;
		el.hidden = false;
		el.classList.remove( 'show' ); void el.offsetWidth; el.classList.add( 'show' );
		if ( undo ) $( 'button', el ).onclick = () => { undo(); el.hidden = true; };
		clearTimeout( toastTimer );
		toastTimer = setTimeout( () => { el.hidden = true; }, undo ? 7000 : 4500 );
	};

	/* ------------------------------------------------------------------ Bottom sheet */
	// One <dialog id="sheet"> serves every form and detail. On phones it is a bottom sheet or full-screen sheet; on larger
	// screens the same markup is a centered dialog (CSS only). Opening pushes a history entry so the back button closes it.

	let lock = false, onClose = null, fromPop = false, pendingBack = false;
	const dlg = () => $( '#sheet' );
	UI.sheetOpen = () => dlg().open;
	UI.openSheet = ( html, o = {} ) => {
		const d = dlg();
		$( '.sheet-body', d ).innerHTML = html;
		d.className = 'sheet' + ( o.full ? ' full' : '' ) + ( o.tall ? ' tall' : '' ) + ( o.cls ? ' ' + o.cls : '' );
		lock = !! o.lock;
		onClose = o.onClose || null;
		$( '.sheet-scroll', d ).scrollTop = 0;
		if ( ! d.open ) { d.showModal(); history.pushState( { xsheet: 1 }, '' ); }
		const f = $( '[autofocus]', d );
		if ( f ) f.focus(); else $( '.sheet-body', d ).focus();
	};
	UI.closeSheet = () => { const d = dlg(); if ( d.open ) d.close(); };

	UI.initSheet = () => {
		const d = dlg();
		d.addEventListener( 'close', () => {
			const cb = onClose; onClose = null; lock = false;
			if ( ! fromPop && history.state && history.state.xsheet ) { pendingBack = true; history.back(); }
			if ( cb ) cb();
		} );
		d.addEventListener( 'cancel', ( e ) => { if ( lock ) e.preventDefault(); } );
		d.addEventListener( 'click', ( e ) => { if ( e.target === d && ! lock ) d.close(); } );
		window.addEventListener( 'popstate', () => {
			if ( pendingBack ) { pendingBack = false; return; }
			if ( ! d.open ) return;
			if ( lock ) { history.pushState( { xsheet: 1 }, '' ); return; }
			fromPop = true; d.close(); fromPop = false;
		} );
		// Pull the sheet down by its handle to close it (phones).
		const grab = $( '.sheet-grab', d );
		let y0 = 0, dy = 0, drag = false;
		grab.addEventListener( 'pointerdown', ( e ) => { drag = true; y0 = e.clientY; dy = 0; d.style.transition = 'none'; grab.setPointerCapture( e.pointerId ); } );
		grab.addEventListener( 'pointermove', ( e ) => { if ( ! drag ) return; dy = Math.max( 0, e.clientY - y0 ); d.style.transform = `translateY(${ dy }px)`; } );
		const end = () => { if ( ! drag ) return; drag = false; d.style.transition = ''; d.style.transform = ''; if ( dy > 110 && ! lock ) d.close(); dy = 0; };
		grab.addEventListener( 'pointerup', end ); grab.addEventListener( 'pointercancel', end );
	};

	/* ------------------------------------------------------------------ Swipe actions on rows */
	// Markup: <li class="sw" data-swr="edit" data-swl="del"> <div class="sw-back">…</div> <div class="sw-front">…</div> </li>
	// A touch drag right triggers data-swr, left triggers data-swl. Fires a "swipeaction" event on the row.

	UI.justSwiped = false;
	UI.initSwipe = ( root ) => {
		const THRESHOLD = 76, MAX = 104;
		let row = null, front = null, x0 = 0, y0 = 0, dx = 0, mode = '';
		root.addEventListener( 'pointerdown', ( e ) => {
			if ( e.pointerType === 'mouse' ) return;
			const r = e.target.closest( '.sw' );
			if ( ! r ) return;
			row = r; front = $( '.sw-front', r ); x0 = e.clientX; y0 = e.clientY; dx = 0; mode = '';
		}, { passive: true } );
		root.addEventListener( 'pointermove', ( e ) => {
			if ( ! row ) return;
			const mx = e.clientX - x0, my = e.clientY - y0;
			if ( ! mode ) { if ( Math.abs( mx ) > 10 && Math.abs( mx ) > Math.abs( my ) * 1.4 ) mode = 'x'; else if ( Math.abs( my ) > 10 ) { row = null; return; } else return; }
			dx = Math.max( -MAX, Math.min( MAX, mx ) );
			if ( dx > 0 && ! row.dataset.swr ) dx = 0;
			if ( dx < 0 && ! row.dataset.swl ) dx = 0;
			front.style.transition = 'none';
			front.style.transform = `translateX(${ dx }px)`;
			row.classList.toggle( 'sw-right', dx > 0 ); row.classList.toggle( 'sw-left', dx < 0 );
			row.classList.toggle( 'sw-armed', Math.abs( dx ) >= THRESHOLD );
		}, { passive: true } );
		const finish = () => {
			if ( ! row ) return;
			const r = row, f = front, d = dx; row = null; front = null;
			f.style.transition = ''; f.style.transform = '';
			r.classList.remove( 'sw-right', 'sw-left', 'sw-armed' );
			if ( mode === 'x' ) {
				UI.justSwiped = true; setTimeout( () => { UI.justSwiped = false; }, 80 );
				if ( d >= THRESHOLD && r.dataset.swr ) { UI.haptic(); r.dispatchEvent( new CustomEvent( 'swipeaction', { bubbles: true, detail: { action: r.dataset.swr, id: r.dataset.id, kind: r.dataset.kind } } ) ); }
				else if ( d <= -THRESHOLD && r.dataset.swl ) { UI.haptic(); r.dispatchEvent( new CustomEvent( 'swipeaction', { bubbles: true, detail: { action: r.dataset.swl, id: r.dataset.id, kind: r.dataset.kind } } ) ); }
			}
			mode = '';
		};
		root.addEventListener( 'pointerup', finish ); root.addEventListener( 'pointercancel', finish );
	};

	/* ------------------------------------------------------------------ Pull to refresh */

	UI.initPull = ( scroller, onRefresh, enabled ) => {
		let y0 = 0, pulling = false, dy = 0;
		const ind = $( '#ptr' );
		scroller.addEventListener( 'touchstart', ( e ) => { if ( scroller.scrollTop <= 0 && enabled() ) { y0 = e.touches[ 0 ].clientY; pulling = true; dy = 0; } }, { passive: true } );
		scroller.addEventListener( 'touchmove', ( e ) => {
			if ( ! pulling ) return;
			dy = e.touches[ 0 ].clientY - y0;
			if ( dy > 0 && scroller.scrollTop <= 0 ) {
				if ( e.cancelable ) e.preventDefault();
				const p = Math.min( 1, dy / 90 );
				ind.style.opacity = String( p ); ind.style.transform = `translate(-50%, ${ Math.min( 70, dy * 0.6 ) }px)`; ind.classList.toggle( 'ready', dy > 90 );
				ind.querySelector( 'span' ).textContent = EX.t( dy > 90 ? 'releaseSync' : 'pullSync' );
			} else { pulling = false; ind.style.opacity = '0'; }
		}, { passive: false } );
		const end = () => {
			if ( ! pulling ) return;
			pulling = false;
			const go = dy > 90;
			ind.style.opacity = '0'; ind.style.transform = 'translate(-50%, 0)'; ind.classList.remove( 'ready' );
			if ( go ) onRefresh();
		};
		scroller.addEventListener( 'touchend', end ); scroller.addEventListener( 'touchcancel', end );
	};
}() );

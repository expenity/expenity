/* eFriend announcement page: reveals, the live robot, and three small demos that use the same rules as the app. */
( function () {
	'use strict';
	const $ = ( s, r = document ) => r.querySelector( s ), $$ = ( s, r = document ) => [ ...r.querySelectorAll( s ) ];
	const T = window.EFP_T || {}, SVG = window.EFP_SVG || {};
	const reduce = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	const money = ( n ) => new Intl.NumberFormat( document.documentElement.lang === 'el' ? 'el-GR' : 'en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 } ).format( Math.round( n ) );

	/* ---------------------------------------------------------------- reveal on scroll, count-up, confetti */
	const io = new IntersectionObserver( ( es ) => es.forEach( ( e ) => {
		if ( ! e.isIntersecting ) return; e.target.classList.add( 'in' ); io.unobserve( e.target );
		$$( '[data-count]', e.target ).concat( e.target.matches( '[data-count]' ) ? [ e.target ] : [] ).forEach( count );
		if ( e.target.matches( '[data-confetti]' ) ) confetti( e.target );
	} ), { threshold: .18 } );
	$$( '.efp-rv, .efp-rv-l, .efp-rv-r, .efp-eq, [data-count], [data-confetti]' ).forEach( ( el ) => { if ( reduce ) { el.classList.add( 'in' ); count( el ); } else io.observe( el ); } );
	function count( el ) {
		if ( ! el.dataset.count || el.dataset.done ) return; el.dataset.done = '1'; const to = Number( el.dataset.count ), t0 = performance.now(), dur = 1400;
		if ( reduce ) { el.textContent = money( to ); return; }
		( function tick( now ) { const k = Math.min( 1, ( now - t0 ) / dur ), e = 1 - Math.pow( 1 - k, 3 ); el.textContent = money( to * e ); if ( k < 1 ) requestAnimationFrame( tick ); }( t0 ) );
	}
	function confetti( box ) {
		const host = $( '.efp-confetti', box ); if ( ! host || reduce || host.childElementCount ) return;
		host.innerHTML = Array.from( { length: 22 }, ( _, i ) => `<i style="left:${ ( i * 4.6 ) % 100 }%;animation-delay:${ ( i % 7 ) * .45 }s;animation-duration:${ 3 + ( i % 5 ) * .5 }s">${ [ '🎉', '✨', '🎊', '🥳', '🎈' ][ i % 5 ] }</i>` ).join( '' );
	}

	/* ---------------------------------------------------------------- the live robot (same moods and pokes as the app) */
	let actx = null;
	const sound = ( kind ) => {
		if ( ! $( '.efp' ).dataset.sound ) return;
		try {
			const C = window.AudioContext || window.webkitAudioContext; actx = actx || new C(); if ( actx.state === 'suspended' ) actx.resume(); const c = actx, t0 = c.currentTime, vol = .12;
			const tone = ( type, f1, f2, st, dur ) => { const o = c.createOscillator(), a = c.createGain(); o.type = type; o.frequency.setValueAtTime( f1, t0 + st ); o.frequency.exponentialRampToValueAtTime( f2, t0 + st + dur ); a.gain.setValueAtTime( .0001, t0 + st ); a.gain.exponentialRampToValueAtTime( vol, t0 + st + .015 ); a.gain.exponentialRampToValueAtTime( .0001, t0 + st + dur ); o.connect( a ).connect( c.destination ); o.start( t0 + st ); o.stop( t0 + st + dur + .02 ); };
			if ( kind === 'smile' ) { tone( 'sine', 660, 880, 0, .12 ); tone( 'sine', 880, 1175, .11, .16 ); }
			else if ( kind === 'giggle' ) [ 0, 1, 2, 3, 4 ].forEach( ( i ) => tone( 'triangle', i % 2 ? 1000 : 780, i % 2 ? 900 : 1100, i * .075, .07 ) );
			else { const o = c.createOscillator(), a = c.createGain(), f = c.createBiquadFilter(), l = c.createOscillator(), lg = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime( 120, t0 ); o.frequency.exponentialRampToValueAtTime( 70, t0 + .7 ); f.type = 'lowpass'; f.frequency.value = 520; l.frequency.value = 28; lg.gain.value = vol * .5; a.gain.setValueAtTime( .0001, t0 ); a.gain.exponentialRampToValueAtTime( vol, t0 + .04 ); a.gain.exponentialRampToValueAtTime( .0001, t0 + .75 ); l.connect( lg ).connect( a.gain ); o.connect( f ).connect( a ).connect( c.destination ); o.start( t0 ); l.start( t0 ); o.stop( t0 + .8 ); l.stop( t0 + .8 ); }
		} catch ( e ) { /* silence is fine */ }
	};
	const pokes = new WeakMap();
	document.addEventListener( 'click', ( e ) => {
		const m = e.target.closest && e.target.closest( '.efp-poke .ef-mascot' ); if ( ! m ) return;
		const now = performance.now(), st = pokes.get( m ) || { t: [], timer: 0 }; pokes.set( m, st ); st.t = st.t.filter( ( x ) => now - x < 2500 ); st.t.push( now );
		const n = st.t.length, cls = n >= 5 ? 'angry' : n >= 3 ? 'giggle' : 'smile'; sound( cls );
		m.classList.remove( 'ef-poke-smile', 'ef-poke-giggle', 'ef-poke-angry' ); void m.getBoundingClientRect(); m.classList.add( 'ef-poke-' + cls );
		clearTimeout( st.timer ); st.timer = setTimeout( () => m.classList.remove( 'ef-poke-smile', 'ef-poke-giggle', 'ef-poke-angry' ), cls === 'angry' ? 2400 : 1300 );
		const hint = $( '.efp-pokehint', m.closest( '.efp-poke' ) ); if ( hint ) hint.textContent = T[ 'poke_' + cls ] || '';
		if ( m.closest( '.efp-hero' ) ) say( cls );
	} );
	const sndBtn = $( '#efp-sound' ); if ( sndBtn ) sndBtn.addEventListener( 'click', () => { const root = $( '.efp' ); if ( root.dataset.sound ) { delete root.dataset.sound; sndBtn.setAttribute( 'aria-pressed', 'false' ); sndBtn.textContent = '🔇 ' + T.soundOff; } else { root.dataset.sound = '1'; sndBtn.setAttribute( 'aria-pressed', 'true' ); sndBtn.textContent = '🔊 ' + T.soundOn; sound( 'smile' ); } } );
	// the hero bubble: messages pass one after another, like in the app
	const bubble = $( '#efp-bubble' ), lines = T.lines || []; let li = 0;
	function say( kind ) { if ( ! bubble ) return; bubble.classList.add( 'swap' ); setTimeout( () => { bubble.textContent = kind && T[ 'bub_' + kind ] ? T[ 'bub_' + kind ] : lines[ li++ % lines.length ]; bubble.classList.remove( 'swap' ); }, 280 ); }
	if ( bubble && lines.length ) { bubble.textContent = lines[ li++ ]; if ( ! reduce ) setInterval( () => say(), 5200 ); }
	// replay the logo animation
	const rep = $( '#efp-replay' ), lw = $( '#efp-logo' ); if ( rep && lw ) { const html = lw.innerHTML; rep.addEventListener( 'click', () => { lw.innerHTML = ''; requestAnimationFrame( () => { lw.innerHTML = html; } ); } ); }

	/* ---------------------------------------------------------------- tilting phones */
	if ( ! reduce ) $$( '.efp-phonewrap' ).forEach( ( w ) => {
		const p = $( '.efp-phone', w ); if ( ! p ) return;
		w.addEventListener( 'mousemove', ( e ) => { const r = w.getBoundingClientRect(); p.style.setProperty( '--ry', ( ( e.clientX - r.left ) / r.width - .5 ) * 14 + 'deg' ); p.style.setProperty( '--rx', ( .5 - ( e.clientY - r.top ) / r.height ) * 8 + 'deg' ); } );
		w.addEventListener( 'mouseleave', () => { p.style.setProperty( '--ry', '0deg' ); p.style.setProperty( '--rx', '0deg' ); } );
	} );

	/* ---------------------------------------------------------------- demo 1: how much cushion? (the app's rule, simplified) */
	const calc = $( '#efp-calc' );
	if ( calc ) {
		const STOPS = [ [ 0, 0, [ 217, 45, 32 ] ], [ 20, .5, [ 240, 140, 0 ] ], [ 40, 1, [ 22, 163, 74 ] ], [ 60, 2, [ 20, 160, 168 ] ], [ 80, 3, [ 37, 99, 235 ] ], [ 100, 6, [ 30, 58, 138 ] ] ];
		const lerp = ( a, b, k ) => a + ( b - a ) * k, seg = ( p ) => { for ( let i = 1; i < STOPS.length; i++ ) if ( p <= STOPS[ i ][ 0 ] ) return [ STOPS[ i - 1 ], STOPS[ i ] ]; return [ STOPS[ 4 ], STOPS[ 5 ] ]; };
		const monthsAt = ( p ) => { const [ a, b ] = seg( p ), k = ( p - a[ 0 ] ) / ( b[ 0 ] - a[ 0 ] ); return Math.round( lerp( a[ 1 ], b[ 1 ], k ) * 4 ) / 4; };
		const colorAt = ( p ) => { const [ a, b ] = seg( p ), k = ( p - a[ 0 ] ) / ( b[ 0 ] - a[ 0 ] ); return 'rgb(' + [ 0, 1, 2 ].map( ( i ) => Math.round( lerp( a[ 2 ][ i ], b[ 2 ][ i ], k ) ) ).join( ',' ) + ')'; };
		const word = ( p ) => { const near = STOPS.reduce( ( m, x ) => ( Math.abs( x[ 0 ] - p ) < Math.abs( m[ 0 ] - p ) ? x : m ) ); return T.risk[ STOPS.indexOf( near ) ]; };
		const q = ( id ) => $( '#' + id ), val = ( id ) => Number( q( id ).value );
		const mood = { comfortable: 'robot', ontrack: 'robotHappy', tight: 'robotMeh', atrisk: 'robotWorried', unlikely: 'robotWorried' };
		const run = () => {
			const bal = val( 'c-bal' ), spend = val( 'c-spend' ), cost = val( 'c-cost' ), inc = q( 'c-inc' ).checked ? val( 'c-salary' ) : 0, p = val( 'c-cush' ), m = monthsAt( p );
			q( 'o-bal' ).textContent = money( bal ); q( 'o-spend' ).textContent = money( spend ); q( 'o-cost' ).textContent = money( cost ); q( 'o-salary' ).textContent = money( val( 'c-salary' ) ); q( 'o-cush' ).textContent = word( p ) + ' · ' + m + ' ' + ( m === 1 ? T.month : T.months );
			calc.closest( '.efp-demos' ).style.setProperty( '--c', colorAt( p ) );
			const left = bal - cost, cushion = m * spend; let v;
			const deficit = inc > 0 ? Math.max( 0, spend - inc ) : 0, runway = deficit > 0 ? left / deficit : Infinity;
			if ( left < 0 ) v = bal / cost >= .6 ? 'atrisk' : 'unlikely'; else if ( deficit > 0 ) v = runway >= 6 && left >= cushion ? 'comfortable' : runway >= 3 ? 'ontrack' : runway >= 1 ? 'tight' : 'atrisk'; else if ( left >= cushion ) v = 'comfortable'; else v = ( inc > 0 && left + inc >= spend ) || left >= cushion / 2 ? 'ontrack' : 'tight';
			const months = spend ? left / spend : 0;
			q( 'o-left' ).textContent = left >= 0 ? money( left ) : '−' + money( -left );
			q( 'o-months' ).textContent = left >= 0 ? ( Math.round( months * 10 ) / 10 ) + ' ' + T.months + ' ' + T.ofSpending : T.short;
			q( 'o-chip' ).className = 'ef-chip v-' + v; q( 'o-chip' ).textContent = T.verdict[ v ];
			q( 'o-text' ).textContent = T.say[ v ]; q( 'o-bot' ).innerHTML = SVG[ mood[ v ] ] || '';
			if ( q( 'o-net' ) ) q( 'o-net' ).textContent = inc > 0 ? T.net + ': ' + ( inc - spend >= 0 ? '+' : '−' ) + money( Math.abs( inc - spend ) ) : '';
			q( 'o-income' ).textContent = left < 0 ? '' : deficit > 0 ? T.deficit.replace( '{a}', money( deficit ) ).replace( '{r}', ( Math.round( runway * 10 ) / 10 ) + ' ' + T.months ) : ( inc > 0 && left + inc >= spend ? T.incomeOk : ( inc > 0 ? T.incomeNo : T.noIncome ) );
		};
		$$( 'input', calc ).forEach( ( i ) => i.addEventListener( 'input', run ) ); run();
	}

	/* ---------------------------------------------------------------- demo 2: who comes first? */
	const pr = $( '#efp-prio' );
	if ( pr ) {
		let items = [ { n: T.p[ 0 ], c: 90, e: '🎁' }, { n: T.p[ 1 ], c: 180, e: '👟' }, { n: T.p[ 2 ], c: 3300, e: '✈️' }, { n: T.p[ 3 ], c: 5200, e: '🚗' } ];
		const POOL = 4200, CUSH = 300;
		const draw = ( animate ) => {
			let pool = POOL; const out = items.map( ( it ) => { const left = pool - it.c; let st; if ( left >= CUSH ) st = 'safe'; else if ( left >= 0 ) st = 'fits'; else st = pool >= it.c * .6 ? 'risk' : 'no'; if ( left >= 0 ) pool = left; return Object.assign( { st, left }, it ); } );
			$( '#efp-prio-list', pr ).innerHTML = out.map( ( o, i ) => `<li data-i="${ i }"${ animate === i ? ' style="animation:efp-pop .4s"' : '' }><span class="rk">${ i === 0 ? '🏆' : i + 1 }</span><span style="font-size:1.4rem">${ o.e }</span><b>${ o.n }<small>${ money( o.c ) }</small></b><span class="efp-tag ${ o.st }">${ T.st[ o.st ] }</span><button type="button" data-up aria-label="${ T.up }">▲</button><button type="button" data-down aria-label="${ T.down }">▼</button></li>` ).join( '' );
			const bad = out.findIndex( ( o ) => o.st === 'risk' || o.st === 'no' ); let what = T.allFit;
			if ( bad >= 0 ) { const lower = items.slice( bad + 1 ).reverse(); let drop = null; for ( const y of lower ) { let p2 = POOL, ok = true; for ( const it of items ) { if ( it === y ) continue; if ( it === items[ bad ] ) { ok = p2 - it.c >= 0; break; } p2 -= it.c; if ( p2 < 0 ) { ok = false; break; } } if ( ok ) { drop = y; break; } } what = drop ? T.whatIf.replace( '{drop}', drop.n ).replace( '{plan}', items[ bad ].n ) : T.later.replace( '{plan}', items[ bad ].n ); }
			$( '#efp-prio-what', pr ).textContent = what;
		};
		pr.addEventListener( 'click', ( e ) => { const b = e.target.closest( '[data-up],[data-down]' ); if ( ! b ) return; const i = Number( b.closest( 'li' ).dataset.i ), j = b.hasAttribute( 'data-up' ) ? i - 1 : i + 1; if ( j < 0 || j >= items.length ) return; [ items[ i ], items[ j ] ] = [ items[ j ], items[ i ] ]; draw( j ); } );
		pr.querySelector( '#efp-suggest' ).addEventListener( 'click', () => { items.sort( ( a, b ) => a.c - b.c ); draw( 0 ); } );
		draw();
	}

	/* ---------------------------------------------------------------- Nixie tubes: digits that cycle like a real display, then land */
	const tubes = ( el, text ) => { el.innerHTML = [ ...String( text ) ].map( ( ch ) => `<span class="nx-t${ /\d/.test( ch ) ? '' : ' sep' }"><b>${ ch }</b></span>` ).join( '' ); };
	const land = ( el, text, delay = 0 ) => {
		tubes( el, text ); if ( reduce ) return; const bs = $$( 'b', el ).filter( ( b ) => /\d/.test( b.textContent ) ), fin = bs.map( ( b ) => b.textContent );
		bs.forEach( ( b, i ) => { let n = 0; const go = () => { n++; if ( n < 9 + i * 2 ) { b.textContent = Math.floor( Math.random() * 10 ); setTimeout( go, 55 ); } else b.textContent = fin[ i ]; }; setTimeout( go, delay + i * 60 ); } );
	};
	const nxs = $$( '[data-nx]' ).filter( ( e ) => e.id !== 'nx-timer' );
	nxs.forEach( ( e ) => tubes( e, e.dataset.nx ) );
	const nio = "IntersectionObserver" in window ? new IntersectionObserver( ( ents ) => ents.forEach( ( x ) => { if ( x.isIntersecting ) { land( x.target, x.target.dataset.nx ); nio.unobserve( x.target ); } } ), { threshold: .4 } ) : null;
	nxs.forEach( ( e ) => ( nio ? nio.observe( e ) : land( e, e.dataset.nx ) ) );
	/* ---------------------------------------------------------------- the cassette deck: the real chat, in a player; the counter runs while the tape plays */
	const deck = $( '#deck' ), cf = $( '#efp-chatframe' ), timer = $( '#nx-timer' ); let tick = 0, secs = 0;
	if ( deck && cf && timer ) {
		tubes( timer, '00:00' );
		const show = () => { const t = String( Math.floor( secs / 60 ) ).padStart( 2, '0' ) + ':' + String( secs % 60 ).padStart( 2, '0' ); $$( '.nx-t b', timer ).forEach( ( b, i ) => { b.textContent = t[ i ]; } ); };
		const stop = () => { clearInterval( tick ); deck.classList.remove( 'playing' ); };
		const mk = ( src ) => { const f = document.createElement( 'iframe' ); f.src = src; f.title = cf.dataset.title || 'eFriend'; f.setAttribute( 'allow', '' ); return f; };
		const wait = ( cf.dataset.src || '' ).replace( 'ask=1', 'ask=wait' );
		const preload = () => { if ( ! $( 'iframe', cf ) ) { const f = mk( wait ); f.className = 'pre'; cf.appendChild( f ); } };
		const play = () => {
			let f = $( 'iframe', cf ); if ( ! f ) { preload(); f = $( 'iframe', cf ); }
			const go = $( '#efp-chatgo' ); if ( go ) go.remove();
			f.classList.remove( 'pre' ); try { f.contentWindow.postMessage( 'ef-open', '*' ); } catch ( x ) { /* ignore */ }
			deck.classList.add( 'playing' ); clearInterval( tick ); tick = setInterval( () => { if ( secs < 300 ) { secs++; show(); } else stop(); }, 1000 );
		};
		const eject = () => { stop(); secs = 0; show(); const old = $( 'iframe', cf ); if ( old ) old.remove(); const go = document.createElement( 'button' ); go.type = 'button'; go.className = 'efp-btn dk'; go.id = 'efp-chatgo'; go.textContent = ( $( '#dk-play' ) || {} ).textContent || '▶'; go.addEventListener( 'click', play ); cf.innerHTML = ''; cf.appendChild( go ); preload(); };
		const rewind = () => { secs = 0; show(); const old = $( 'iframe', cf ); if ( old ) old.remove(); const go = $( '#efp-chatgo' ); if ( go ) go.remove(); cf.appendChild( mk( cf.dataset.src ) ); deck.classList.add( 'playing' ); clearInterval( tick ); tick = setInterval( () => { if ( secs < 300 ) { secs++; show(); } else stop(); }, 1000 ); };
		preload();
		const g = $( '#efp-chatgo' ); if ( g ) g.addEventListener( 'click', play );
		const p = $( '#dk-play' ), s = $( '#dk-stop' ), r = $( '#dk-rew' ); if ( p ) p.addEventListener( 'click', play ); if ( s ) s.addEventListener( 'click', eject ); if ( r ) r.addEventListener( 'click', rewind );
	}
	/* ---------------------------------------------------------------- the accordion: open and close one, or all */
	const accs = $$( '.efp-acc' );
	const reveal = ( box ) => $$( '.efp-rv, .efp-rv-l, .efp-rv-r, [data-count], [data-confetti]', box ).forEach( ( el, i ) => { setTimeout( () => { el.classList.add( 'in' ); count( el ); if ( el.matches( '[data-confetti]' ) ) confetti( el ); }, reduce ? 0 : i * 70 ); } );
	accs.forEach( ( a ) => a.addEventListener( 'toggle', () => { if ( a.open ) reveal( a ); } ) );
	const setAll = ( open ) => accs.forEach( ( a ) => { a.open = open; } );
	const ex = $( '#efp-expand' ), co = $( '#efp-collapse' ); if ( ex ) ex.addEventListener( 'click', () => setAll( true ) ); if ( co ) co.addEventListener( 'click', () => { setAll( false ); const top = $( '.efp-acc-ctl' ); if ( top ) top.scrollIntoView( { block: 'center', behavior: reduce ? 'auto' : 'smooth' } ); } );
	const fromHash = () => { const a = location.hash && $( location.hash ); if ( a && a.matches && a.matches( '.efp-acc' ) ) { a.open = true; setTimeout( () => a.scrollIntoView( { block: 'start' } ), 100 ); } };
	fromHash(); window.addEventListener( 'hashchange', fromHash );
	/* ---------------------------------------------------------------- floating "open Expenity" after the hero */
	const sticky = $( '.efp-sticky' ), hero = $( '.efp-hero' );
	if ( sticky && hero ) new IntersectionObserver( ( es ) => sticky.classList.toggle( 'on', ! es[ 0 ].isIntersecting ) ).observe( hero );
}() );

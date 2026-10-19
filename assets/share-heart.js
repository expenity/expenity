/**
 * Share heart: a small animated heart in the footer of each of our websites, and a bigger "Pass it on." block under each blog post.
 * On phones it opens the device's share sheet; everywhere else it copies a short message with the link. Each press adds one to an
 * anonymous counter (site, post and method only: nothing about the person is stored). Add the script with data attributes:
 *   data-site="expenity"  data-url="https://…/"  data-msg="Line shown and shared"  data-msg-el="Greek line"  (footer heart)
 *   data-mode="post"  data-post="slug"  data-anim="coins"  data-title="Pass it on."  data-btn="Share this post"  (blog post block)
 */
( function () {
	'use strict';
	const me = document.currentScript; if ( ! me ) return;
	const d = me.dataset, API = 'https://expenity-api.george-stathopoulos.workers.dev/api/share/site';
	const el = document.documentElement.lang === 'el';
	const msg = ( el && d.msgEl ) || d.msg || '', copied = el ? 'Αντιγράφηκε! Πείτε το και στους άλλους.' : 'Copied! Now go spread the word.', thanks = el ? 'Ευχαριστούμε!' : 'Thank you!';
	const reduce = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	const HEART = '<path d="M60 102C20 72 8 46 22 28 34 14 52 18 60 32 68 18 86 14 98 28 112 46 100 72 60 102Z"/>';

	const css = `
.sh-wrap{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:22px 0 4px;position:relative}
.sh-heart{all:unset;cursor:pointer;display:inline-grid;place-items:center;width:44px;height:44px;border-radius:50%;color:#e5487f;position:relative;-webkit-tap-highlight-color:transparent}
.sh-heart:focus-visible{outline:3px solid currentColor;outline-offset:3px}
.sh-heart svg{width:30px;height:30px;fill:currentColor;animation:shBeat 1.8s ease-in-out infinite;transform-origin:50% 60%}
.sh-heart:hover svg{animation-duration:.7s}
.sh-msg{font-size:14px;line-height:1.4;max-width:46ch;opacity:.9}
.sh-toast{position:absolute;left:54px;top:-18px;font-size:12px;background:#e5487f;color:#fff;padding:4px 10px;border-radius:99px;opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;pointer-events:none;white-space:nowrap}
.sh-toast.on{opacity:1;transform:none}
.sh-bit{position:fixed;z-index:2147483000;pointer-events:none;width:14px;height:14px;fill:#e5487f;animation:shBit .9s ease-out forwards}
@keyframes shBeat{0%,60%,100%{transform:scale(1)}15%{transform:scale(1.22)}30%{transform:scale(.97)}42%{transform:scale(1.14)}}
@keyframes shBit{0%{opacity:1;transform:translate(0,0) scale(.6)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.3) rotate(var(--r))}}
.po{margin:56px 0 24px;padding:28px 22px;border-radius:22px;border:1px dashed color-mix(in srgb,currentColor 35%,transparent);text-align:center;position:relative;overflow:hidden}
.po h2{margin:0 0 4px;font-size:clamp(22px,4vw,30px);letter-spacing:-.02em}
.po-scene{width:150px;height:150px;margin:6px auto 0;cursor:pointer;display:block}
.po-scene svg{width:100%;height:100%;overflow:visible}
.po-msg{margin:6px auto 16px;max-width:42ch;font-size:16px;line-height:1.5}
.po-btn{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:99px;background:#e5487f;color:#fff;font-weight:600;font-size:15px;box-shadow:0 8px 22px -10px #e5487f;transition:transform .2s}
.po-btn:hover{transform:translateY(-2px) scale(1.03)}.po-btn:focus-visible{outline:3px solid currentColor;outline-offset:3px}
.po-btn svg{width:18px;height:18px;fill:#fff}
.po .heart{fill:#e5487f;transform-origin:60px 70px}.po.go .heart{animation:shBeat 1.6s ease-in-out 1s infinite}
.po .ink{fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}
.po .coin{fill:#ffc94d;stroke:#b8860b;stroke-width:2;opacity:0}.po.go .coin{animation:poCoin 1.6s var(--w,0s) ease-in both}
@keyframes poCoin{0%{opacity:0;transform:translateY(-70px)}25%{opacity:1}70%{opacity:1;transform:translateY(22px)}100%{opacity:0;transform:translateY(30px)}}
.po .shackle{fill:none;stroke:#444;stroke-width:6;stroke-linecap:round}.po .lockbody{fill:#ffc94d;stroke:#444;stroke-width:3}
.po.go .shackle{animation:poShackle 1.1s .3s ease-out both}@keyframes poShackle{0%{transform:translateY(-14px)}60%{transform:translateY(2px)}100%{transform:translateY(0)}}
.po .bridge{fill:#8a5a2b;transform-origin:20px 108px;transform:rotate(-78deg)}.po.go .bridge{animation:poBridge 1.2s .3s cubic-bezier(.3,1.4,.5,1) both}@keyframes poBridge{to{transform:rotate(0)}}
.po .pinhead{fill:#2b6fff}.po .pin{transform:translateY(-90px);opacity:0}.po.go .pin{animation:poPin 1.1s .2s cubic-bezier(.3,1.5,.5,1) both}@keyframes poPin{60%{opacity:1;transform:translateY(0)}80%{transform:translateY(-12px)}100%{opacity:1;transform:translateY(0)}}
.po .cell{fill:#e5487f;opacity:0}.po.go .cell{animation:poCell .4s var(--w,0s) ease-out both}@keyframes poCell{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}
.po .cellbg{fill:none;stroke:color-mix(in srgb,currentColor 25%,transparent);stroke-width:1}
.po .cape{fill:#2b6fff;transform-origin:60px 40px}.po.go .cape{animation:poCape 1.1s ease-in-out .4s infinite alternate}@keyframes poCape{from{transform:skewX(-8deg) scaleY(1)}to{transform:skewX(10deg) scaleY(1.08)}}
.po .arm{stroke:#e5487f;stroke-width:7;stroke-linecap:round;transform-origin:96px 62px}.po.go .arm{animation:poWave .6s .4s ease-in-out 6 alternate}@keyframes poWave{from{transform:rotate(-30deg)}to{transform:rotate(25deg)}}
.po .sweep{transform-origin:60px 70px}.po.go .sweep{animation:poSweep 2.4s linear infinite}@keyframes poSweep{to{transform:rotate(360deg)}}
.po .blip{fill:#4ade80;opacity:0}.po.go .blip{animation:poBlip 2.4s var(--w,0s) linear infinite}@keyframes poBlip{0%{opacity:0}10%{opacity:1}60%{opacity:0}}
.po .tick{opacity:0}.po.go .tick{animation:poTick .5s var(--w,0s) ease-out both}@keyframes poTick{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:scale(1)}}
.po .bit{opacity:0}.po.go .bit{animation:poBit 1.6s var(--w,0s) ease-out both}@keyframes poBit{0%{opacity:0;transform:translate(var(--sx),var(--sy)) rotate(var(--r))}30%{opacity:1}100%{opacity:1;transform:translate(0,0) rotate(0)}}
.po .rocket{transform:translateY(60px);opacity:0}.po.go .rocket{animation:poRocket 1.8s .3s ease-in both}@keyframes poRocket{0%{opacity:1;transform:translateY(70px)}100%{opacity:1;transform:translateY(-6px)}}
.po .flame{fill:#ffb020;transform-origin:60px 108px}.po.go .flame{animation:poFlame .25s linear infinite alternate}@keyframes poFlame{from{transform:scaleY(.7)}to{transform:scaleY(1.3)}}
@media (prefers-reduced-motion:reduce){.sh-heart svg,.po .heart,.po *{animation:none!important}.po .coin,.po .cell,.po .tick,.po .bit,.po .pin{opacity:1;transform:none}.po .bridge{transform:none}}
`;
	const style = document.createElement( 'style' ); style.textContent = css; document.head.appendChild( style );

	const count = ( method, post ) => { try { fetch( API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify( { site: d.site || 'blog', post: post || '', method } ), keepalive: true, mode: 'cors', credentials: 'omit' } ).catch( () => {} ); } catch ( e ) { /* counting never blocks sharing */ } };
	const burst = ( from ) => {
		if ( reduce ) return;
		const r = from.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
		for ( let i = 0; i < 10; i++ ) {
			const b = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' ); b.setAttribute( 'viewBox', '0 0 120 120' ); b.setAttribute( 'class', 'sh-bit' ); b.innerHTML = HEART;
			const a = ( Math.PI * 2 * i ) / 10 + Math.random() * .5, dist = 40 + Math.random() * 50;
			b.style.cssText = `left:${ x - 7 }px;top:${ y - 7 }px;--dx:${ Math.cos( a ) * dist }px;--dy:${ Math.sin( a ) * dist - 20 }px;--r:${ Math.round( Math.random() * 90 - 45 ) }deg`;
			document.body.appendChild( b ); setTimeout( () => b.remove(), 1000 );
		}
	};
	const copy = async ( text ) => {
		try { await navigator.clipboard.writeText( text ); return true; } catch ( e ) { /* fall back */ }
		const ta = document.createElement( 'textarea' ); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild( ta ); ta.select();
		try { return document.execCommand( 'copy' ); } catch ( e ) { return false; } finally { ta.remove(); }
	};
	const share = async ( origin, post, note ) => {
		const url = d.mode === 'post' ? location.href.split( '#' )[ 0 ] : ( d.url || location.href ), text = msg;
		burst( origin );
		if ( navigator.share && /Android|iPhone|iPad|iPod/i.test( navigator.userAgent ) ) {
			try { await navigator.share( { title: document.title, text, url } ); count( 'native', post ); note( thanks ); } catch ( e ) { /* cancelled */ }
			return;
		}
		if ( await copy( text + ' ' + url ) ) { count( 'copy', post ); note( copied ); } else note( url );
	};

	// ---- Footer heart
	const footer = () => {
		const host = document.querySelector( 'footer .wrap' ) || document.querySelector( 'footer' ); if ( ! host ) return;
		const w = document.createElement( 'div' ); w.className = 'sh-wrap';
		w.innerHTML = `<button type="button" class="sh-heart" aria-label="${ el ? 'Μοιραστείτε' : 'Share' }"><svg viewBox="0 0 120 120" aria-hidden="true">${ HEART }</svg></button><span class="sh-msg"></span><span class="sh-toast" role="status"></span>`;
		w.querySelector( '.sh-msg' ).textContent = msg;
		const toast = w.querySelector( '.sh-toast' ), btn = w.querySelector( '.sh-heart' );
		const note = ( t ) => { toast.textContent = t; toast.classList.add( 'on' ); setTimeout( () => toast.classList.remove( 'on' ), 2400 ); };
		btn.addEventListener( 'click', () => share( btn, '', note ) );
		host.appendChild( w );
	};

	// ---- Blog post block: a tiny scene per post
	const C = '#e5487f';
	const SCENES = {
		coins: () => `<g class="heart">${ HEART }</g>` + [ 38, 54, 70, 84, 60 ].map( ( x, i ) => `<circle class="coin" cx="${ x }" cy="${ 40 + ( i % 2 ) * 14 }" r="8" style="--w:${ i * .22 }s"/>` ).join( '' ),
		lock: () => `<g class="heart">${ HEART }</g><path class="shackle" d="M48 56V46a12 12 0 0 1 24 0v10"/><rect class="lockbody" x="42" y="54" width="36" height="28" rx="6"/><circle cx="60" cy="68" r="4" fill="#444"/>`,
		bridge: () => `<g class="heart">${ HEART }</g><rect class="bridge" x="20" y="104" width="80" height="10" rx="3"/><rect x="12" y="98" width="14" height="22" rx="3" fill="#6b6b6b"/><rect x="94" y="98" width="14" height="22" rx="3" fill="#6b6b6b"/>`,
		pin: () => `<g class="heart">${ HEART }</g><g class="pin"><circle class="pinhead" cx="60" cy="40" r="11"/><path d="M60 52L54 40h12z" fill="#2b6fff"/><rect x="58" y="50" width="4" height="20" fill="#2b6fff"/></g>`,
		grid: () => { const P = [ '01010', '11111', '11111', '01110', '00100' ]; let s = ''; P.forEach( ( row, r ) => [ ...row ].forEach( ( v, c ) => { const x = 16 + c * 18, y = 16 + r * 18; s += `<rect class="cellbg" x="${ x }" y="${ y }" width="16" height="16" rx="3"/>`; if ( v === '1' ) s += `<rect class="cell" x="${ x }" y="${ y }" width="16" height="16" rx="3" style="--w:${ ( r * 5 + c ) * .06 }s;transform-origin:${ x + 8 }px ${ y + 8 }px"/>`; } ) ); return s; },
		cape: () => `<path class="cape" d="M34 46Q60 30 86 46L98 108 60 92 22 108Z"/><g class="heart">${ HEART }</g>`,
		wave: () => `<g class="heart">${ HEART }</g><line class="arm" x1="96" y1="62" x2="112" y2="38"/><circle cx="52" cy="58" r="4" fill="#fff"/><circle cx="68" cy="58" r="4" fill="#fff"/><path class="ink" d="M52 72q8 8 16 0" />`,
		radar: () => `<g class="heart">${ HEART }</g><g class="sweep"><line x1="60" y1="70" x2="60" y2="8" stroke="#4ade80" stroke-width="3" stroke-linecap="round"/></g><circle class="blip" cx="40" cy="40" r="4" style="--w:.5s"/><circle class="blip" cx="82" cy="50" r="4" style="--w:1.3s"/>`,
		checks: () => `<g class="heart">${ HEART }</g>` + [ 0, 1, 2 ].map( ( i ) => `<path class="tick ink" d="M${ 40 + i * 4 } ${ 44 + i * 14 }l6 6 12-13" style="--w:${ .3 + i * .35 }s;stroke:${ i === 2 ? '#ffc94d' : '#fff' }"/>` ).join( '' ),
		shuffle: () => { const col = [ '#ffc94d', '#2b6fff', '#4ade80', '#fff', '#ff7a45' ]; let s = ''; for ( let i = 0; i < 14; i++ ) { const a = ( i / 14 ) * 6.28; s += `<rect class="bit" x="${ 52 + Math.cos( a ) * 24 }" y="${ 62 + Math.sin( a ) * 22 }" width="9" height="9" rx="2" fill="${ col[ i % 5 ] }" style="--sx:${ Math.round( ( Math.random() - .5 ) * 160 ) }px;--sy:${ Math.round( ( Math.random() - .5 ) * 160 ) }px;--r:${ Math.round( Math.random() * 360 ) }deg;--w:${ i * .05 }s"/>`; } return `<g class="heart">${ HEART }</g>${ s }`; },
		rocket: () => `<g class="heart">${ HEART }</g><g class="rocket"><path d="M60 14c10 10 12 30 8 46H52C48 44 50 24 60 14Z" fill="#fff" stroke="#999" stroke-width="2"/><circle cx="60" cy="38" r="6" fill="#2b6fff"/><path d="M52 60l-10 12 10-3zM68 60l10 12-10-3z" fill="#ff7a45"/><path class="flame" d="M56 62h8l-4 22z"/></g>`,
	};
	const post = () => {
		const host = document.querySelector( '.prose' ) || document.querySelector( 'article, main' ); if ( ! host ) return;
		const sec = document.createElement( 'section' ); sec.className = 'po'; sec.setAttribute( 'aria-label', d.title || 'Pass it on.' );
		sec.innerHTML = `<h2></h2><span class="po-scene" role="img" aria-label="" tabindex="-1"><svg viewBox="0 0 120 120" aria-hidden="true">${ ( SCENES[ d.anim ] || SCENES.wave )() }</svg></span><p class="po-msg"></p><button type="button" class="po-btn"><svg viewBox="0 0 120 120" aria-hidden="true">${ HEART }</svg><span></span></button><span class="sh-toast" role="status" style="left:50%;transform:translateX(-50%);top:auto;bottom:6px"></span>`;
		sec.querySelector( 'h2' ).textContent = d.title || 'Pass it on.'; sec.querySelector( '.po-msg' ).textContent = msg; sec.querySelector( '.po-btn span' ).textContent = d.btn || 'Share this post';
		const toast = sec.querySelector( '.sh-toast' ), note = ( t ) => { toast.textContent = t; toast.classList.add( 'on' ); setTimeout( () => toast.classList.remove( 'on' ), 2400 ); };
		sec.querySelector( '.po-btn' ).addEventListener( 'click', ( e ) => share( e.currentTarget, d.post || '', note ) );
		sec.querySelector( '.po-scene' ).addEventListener( 'click', () => { sec.classList.remove( 'go' ); void sec.offsetWidth; sec.classList.add( 'go' ); } );
		host.insertAdjacentElement( host.classList.contains( 'prose' ) ? 'afterend' : 'beforeend', sec );
		if ( 'IntersectionObserver' in window ) { const io = new IntersectionObserver( ( es ) => es.forEach( ( x ) => { if ( x.isIntersecting ) { sec.classList.add( 'go' ); io.disconnect(); } } ), { threshold: .4 } ); io.observe( sec ); } else sec.classList.add( 'go' );
	};
	const run = d.mode === 'post' ? post : footer;
	if ( document.readyState === 'loading' ) document.addEventListener( 'DOMContentLoaded', run ); else run();
}() );

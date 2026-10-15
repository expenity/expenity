/**
 * Expenity themes: the list, the picker with live previews, and switching. The colors and shapes themselves are in
 * themes.css; the default (Emerald) is in style.css. theme.js applies the saved choice before the first paint.
 */
( function () {
	'use strict';
	const EX = window.EX, UI = window.UI, EXA = window.EXA;
	const { t, esc } = EX;
	const root = document.documentElement;
	// swatch: page color, card color, accent, text. mode: the theme also has a light and a dark version.
	const THEMES = [
		{ id: 'emerald', mode: true, sw: [ '#eef6f3', '#ffffff', '#0a8f6a', '#0f1f1a' ] },
		{ id: 'minimal', mode: true, sw: [ '#fafafa', '#ffffff', '#111111', '#111111' ] },
		{ id: 'paper', sw: [ '#f4ecd8', '#fffdf3', '#2f4b9a', '#2b2a40' ] },
		{ id: 'ledger', sw: [ '#e9eedd', '#fafcf2', '#1f5d3a', '#1c2a1c' ] },
		{ id: 'terminal', sw: [ '#030803', '#071307', '#36ff6d', '#36ff6d' ] },
		{ id: 'synthwave', sw: [ '#120726', '#1f0f45', '#ff3ea5', '#2de2e6' ] },
		{ id: 'blueprint', sw: [ '#0d3b82', '#11449a', '#ffffff', '#f0f7ff' ] },
		{ id: 'candy', sw: [ '#fff1f8', '#ffffff', '#ff6fb0', '#4a2a5c' ] },
		{ id: 'oled', sw: [ '#000000', '#0a0a0a', '#19e6a3', '#ffffff' ] },
		{ id: 'glass', sw: [ '#c9d6ff', '#ffffff', '#5757d9', '#1d2142' ] },
		{ id: 'sunset', sw: [ '#fff3e8', '#fffaf5', '#f0572d', '#4a1f10' ] },
		{ id: 'chalk', sw: [ '#1f3a30', '#274a3d', '#ffd86b', '#f3f0e4' ] },
	];
	EXA.THEMES = THEMES;
	const store = ( k, v ) => { try { if ( v == null ) localStorage.removeItem( k ); else localStorage.setItem( k, v ); } catch ( e ) { /* ignore */ } };
	EXA.skin = () => root.dataset.skin || 'emerald';
	EXA.setSkin = ( id ) => {
		if ( ! THEMES.some( ( x ) => x.id === id ) ) return;
		if ( id === 'emerald' ) delete root.dataset.skin; else root.dataset.skin = id;
		store( 'expenity.skin', id === 'emerald' ? null : id );
		const m = document.querySelector( 'meta[name=theme-color]' );
		if ( m ) m.content = THEMES.find( ( x ) => x.id === id ).sw[ 2 ];
	};
	EXA.setMode = ( v ) => {
		if ( v === 'auto' ) delete root.dataset.theme; else root.dataset.theme = v;
		store( 'expenity.theme', v === 'auto' ? null : v );
	};
	EXA.setMotion = ( v ) => {
		const d = EX.state().device; d.motion = v; EX.persist();
		if ( v === 'auto' ) delete root.dataset.motion; else root.dataset.motion = v;
		store( 'expenity.motion', v === 'auto' ? null : v );
	};
	const card = ( th, cur ) => {
		const [ bg, sf, ac, ink ] = th.sw;
		return `<button type="button" class="theme-card${ th.id === cur ? ' on' : '' }" data-skin-set="${ th.id }" role="radio" aria-checked="${ th.id === cur }">
			<span class="tc-prev" aria-hidden="true" style="background:${ bg }"><i style="background:${ sf };border-color:${ ink }33"><b style="background:${ ac }"></b><u style="background:${ ink }"></u><u style="background:${ ink };width:42%"></u></i></span>
			<span class="tc-name">${ esc( t( 'theme_' + th.id ) ) }</span><small>${ esc( t( 'themeD_' + th.id ) ) }</small></button>`;
	};
	/** The picker: theme cards, then light/dark chips for themes that have both. */
	EXA.themePicker = () => {
		const cur = EXA.skin(), th = THEMES.find( ( x ) => x.id === cur ) || THEMES[ 0 ];
		const mode = root.dataset.theme || 'auto';
		const mc = ( v, label, ic ) => `<button type="button" class="chip big${ mode === v ? ' on' : '' }" data-mode-set="${ v }">${ UI.icon( ic, 20 ) } ${ esc( label ) }</button>`;
		return `<div class="theme-grid" role="radiogroup" aria-label="${ esc( t( 'themesTitle' ) ) }">${ THEMES.map( ( x ) => card( x, cur ) ).join( '' ) }</div>
			${ th.mode ? `<div class="lbl pad0">${ esc( t( 'themeLabel' ) ) }</div><div class="chips wrap">${ mc( 'auto', t( 'themeAuto' ), 'device-mobile' ) }${ mc( 'light', t( 'themeLight' ), 'sun' ) }${ mc( 'dark', t( 'themeDark' ), 'moon' ) }</div>` : '' }`;
	};
}() );

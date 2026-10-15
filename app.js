/**
 * Duenest: a calm place for bills and subscriptions.
 *
 * Runs entirely in the browser. Data lives in localStorage on this device (export a backup from
 * Settings). Reminders: browser notifications while the app is open, plus a calendar file (.ics)
 * with alarms that any phone or computer calendar delivers even when Duenest is closed. Syncing
 * between devices and push reminders with the app closed need a server and are on the roadmap.
 * Languages: English (default) and Greek, see i18n.js.
 */
( function () {
	'use strict';

	/* ------------------------------------------------------------------ Language */

	const I18N = window.DUENEST_I18N;
	let lang = I18N.default;
	try {
		const q = new URLSearchParams( location.search ).get( 'lang' ); // The website links to ?lang=el
		const s = q && I18N.langs[ q ] ? q : localStorage.getItem( 'duenest.lang' );
		if ( s && I18N.langs[ s ] ) { lang = s; if ( q ) localStorage.setItem( 'duenest.lang', s ); }
	} catch ( e ) { /* ignore */ }
	function t( key, vars ) {
		const v = I18N.langs[ lang ][ key ] !== undefined ? I18N.langs[ lang ][ key ] : I18N.langs.en[ key ];
		if ( typeof v === 'function' ) return v( vars || {} );
		if ( typeof v === 'string' && vars ) return v.replace( /\{(\w+)\}/g, ( m, k ) => ( vars[ k ] !== undefined ? vars[ k ] : m ) );
		return v === undefined ? key : v;
	}
	const loc = () => I18N.langs[ lang ].locale;

	/* ------------------------------------------------------------------ Dates */

	const pad = ( n ) => String( n ).padStart( 2, '0' );
	const iso = ( d ) => `${ d.getFullYear() }-${ pad( d.getMonth() + 1 ) }-${ pad( d.getDate() ) }`;
	const parse = ( s ) => { const [ y, m, d ] = s.split( '-' ).map( Number ); return new Date( y, m - 1, d ); };
	const today = () => iso( new Date() );
	const addDays = ( s, n ) => { const d = parse( s ); d.setDate( d.getDate() + n ); return iso( d ); };
	const diffDays = ( a, b ) => Math.round( ( parse( a ) - parse( b ) ) / 864e5 );
	const dim = ( y, m ) => new Date( y, m + 1, 0 ).getDate();
	function addMonths( s, n, day ) {
		const d = parse( s );
		let m = d.getMonth() + n;
		const y = d.getFullYear() + Math.floor( m / 12 );
		m = ( ( m % 12 ) + 12 ) % 12;
		return iso( new Date( y, m, Math.min( day || d.getDate(), dim( y, m ) ) ) );
	}

	/** The due date after `s` for a repeating bill, or null for a one-off. */
	function nextAfter( bill, s ) {
		switch ( bill.repeat ) {
			case 'weekly': return addDays( s, 7 );
			case 'biweekly': return addDays( s, 14 );
			case 'monthly': return addMonths( s, 1, bill.day );
			case 'quarterly': return addMonths( s, 3, bill.day );
			case 'yearly': return addMonths( s, 12, bill.day );
			default: return null;
		}
	}

	/** Open due dates of a bill from its current one up to `to` (inclusive). */
	function occurrences( bill, to ) {
		const out = [];
		let d = bill.next;
		while ( d && d <= to && out.length < 400 ) {
			if ( bill.end && d > bill.end ) break;
			out.push( d );
			d = nextAfter( bill, d );
		}
		return out;
	}

	/* ------------------------------------------------------------------ Data */

	const KEY = 'duenest.v1';
	const CATS = [
		[ 'housing', '🏠' ], [ 'utilities', '💡' ], [ 'subscriptions', '📺' ], [ 'insurance', '🛡️' ], [ 'loans', '💳' ],
		[ 'transport', '🚗' ], [ 'health', '🩺' ], [ 'education', '🎓' ], [ 'taxes', '🏛️' ], [ 'other', '📌' ],
	];
	const catIcon = ( k ) => ( CATS.find( ( c ) => c[ 0 ] === k ) || CATS[ 9 ] )[ 1 ];
	const catName = ( k ) => t( 'cat_' + ( CATS.some( ( c ) => c[ 0 ] === k ) ? k : 'other' ) );
	const TEMPLATES = [
		[ 'tplRent', 'housing', 'monthly' ], [ 'tplElectricity', 'utilities', 'monthly' ], [ 'tplWater', 'utilities', 'quarterly' ], [ 'tplInternet', 'utilities', 'monthly' ],
		[ 'tplPhone', 'utilities', 'monthly' ], [ 'tplNetflix', 'subscriptions', 'monthly' ], [ 'tplSpotify', 'subscriptions', 'monthly' ], [ 'tplCarIns', 'insurance', 'yearly' ],
		[ 'tplCard', 'loans', 'monthly' ], [ 'tplGym', 'health', 'monthly' ], [ 'tplPropTax', 'taxes', 'yearly' ], [ 'tplSchool', 'education', 'quarterly' ],
	];
	const LEADS = [ 0, 1, 2, 3, 5, 7, 14 ];
	const REPEATS = [ 'once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly' ];
	const repeatLabel = ( r ) => t( 'l' + r.charAt( 0 ).toUpperCase() + r.slice( 1 ) );
	const perYear = { weekly: 52, biweekly: 26, monthly: 12, quarterly: 4, yearly: 1 };

	const guessCurrency = () => {
		try { const r = ( navigator.language || 'en-US' ).split( '-' )[ 1 ] || 'US'; const m = { US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', TR: 'TRY' }; return m[ r ] || 'EUR'; } catch ( e ) { return 'EUR'; }
	};
	let S = { bills: [], payments: [], settings: { currency: guessCurrency(), lead: 3, notify: false, lastNotified: {} } };

	function load() {
		try {
			const raw = JSON.parse( localStorage.getItem( KEY ) || 'null' );
			if ( raw && Array.isArray( raw.bills ) ) S = { bills: raw.bills, payments: raw.payments || [], settings: Object.assign( S.settings, raw.settings || {} ) };
		} catch ( e ) { /* private mode or corrupt data: start empty */ }
	}
	let saveFailed = false;
	function save() {
		try { localStorage.setItem( KEY, JSON.stringify( S ) ); saveFailed = false; } catch ( e ) { if ( ! saveFailed ) toast( t( 'tSaveFail' ) ); saveFailed = true; }
	}
	const uid = () => ( window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now().toString( 36 ) + Math.random().toString( 36 ).slice( 2, 8 ) );

	/* ------------------------------------------------------------------ Helpers */

	const $ = ( s, r = document ) => r.querySelector( s );
	const $$ = ( s, r = document ) => [ ...r.querySelectorAll( s ) ];
	const esc = ( s ) => String( s == null ? '' : s ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' ).replace( /"/g, '&quot;' );
	const money = ( n, cur ) => { try { return new Intl.NumberFormat( loc(), { style: 'currency', currency: cur || S.settings.currency, maximumFractionDigits: n % 1 ? 2 : 0 } ).format( n ); } catch ( e ) { return ( cur || '' ) + ' ' + n; } };
	const num = ( n ) => n.toLocaleString( loc(), { maximumFractionDigits: 0 } );
	const lead = ( b ) => ( b.lead == null ? S.settings.lead : b.lead );
	const dayName = ( s ) => parse( s ).toLocaleDateString( loc(), { weekday: 'short', day: 'numeric', month: 'short' } );
	const monthName = ( y, m ) => new Date( y, m, 1 ).toLocaleDateString( loc(), { month: 'long', year: 'numeric' } );
	const amountText = ( b ) => ( b.amount !== '' && b.amount != null ? ( b.variable ? '~' : '' ) + money( Number( b.amount ), b.currency ) : '–' );

	function sumByCur( items, pick = ( x ) => x.amount ) {
		const tot = {};
		items.forEach( ( x ) => { const v = Number( pick( x ) ) || 0; tot[ x.currency ] = ( tot[ x.currency ] || 0 ) + v; } );
		const parts = Object.entries( tot ).filter( ( [ , v ] ) => v ).map( ( [ c, v ] ) => money( v, c ) );
		return parts.length ? parts.join( ' + ' ) : money( 0, S.settings.currency );
	}
	function rel( due ) {
		const n = diffDays( due, today() );
		if ( n === 0 ) return t( 'relToday' );
		if ( n === 1 ) return t( 'relTomorrow' );
		if ( n === -1 ) return t( 'relYesterday' );
		return n < 0 ? t( 'relLate', { n: -n } ) : t( 'relIn', { n } );
	}
	const active = () => S.bills.filter( ( b ) => ! b.done && b.next );
	const byDue = ( a, b ) => ( a.next < b.next ? -1 : a.next > b.next ? 1 : a.name.localeCompare( b.name ) );

	let toastTimer = null;
	function toast( msg, undo ) {
		const el = $( '#toast' );
		el.innerHTML = `<span>${ esc( msg ) }</span>${ undo ? `<button type="button" class="link">${ esc( t( 'undo' ) ) }</button>` : '' }`;
		el.hidden = false;
		if ( undo ) $( 'button', el ).onclick = () => { undo(); el.hidden = true; };
		clearTimeout( toastTimer );
		toastTimer = setTimeout( () => { el.hidden = true; }, undo ? 7000 : 4500 );
	}

	/* ------------------------------------------------------------------ Actions */

	function markPaid( id, amount, paidOn ) {
		const b = S.bills.find( ( x ) => x.id === id );
		if ( ! b || ! b.next ) return;
		const before = JSON.parse( JSON.stringify( b ) );
		const p = { id: uid(), billId: b.id, name: b.name, category: b.category, currency: b.currency, due: b.next, amount, paidOn: paidOn || today() };
		S.payments.push( p );
		const nx = nextAfter( b, b.next );
		if ( ! nx || ( b.end && nx > b.end ) ) { b.done = true; } else { b.next = nx; }
		delete b.snooze;
		save(); render();
		toast( t( 'tPaid', { name: b.name } ), () => {
			S.payments = S.payments.filter( ( x ) => x.id !== p.id );
			Object.assign( b, before ); if ( ! before.done ) delete b.done;
			save(); render();
		} );
	}
	function skip( id ) {
		const b = S.bills.find( ( x ) => x.id === id );
		if ( ! b ) return;
		const before = b.next, wasDone = b.done;
		const nx = nextAfter( b, b.next );
		if ( ! nx ) { b.done = true; } else { b.next = nx; }
		save(); render();
		toast( t( 'tSkipped', { name: b.name } ), () => { b.next = before; if ( ! wasDone ) delete b.done; save(); render(); } );
	}
	function snooze( id, days ) {
		const b = S.bills.find( ( x ) => x.id === id );
		if ( ! b ) return;
		b.snooze = addDays( today(), days );
		save(); render();
		toast( t( 'tSnoozed', { name: b.name, date: dayName( b.snooze ) } ) );
	}
	function removeBill( id ) {
		const i = S.bills.findIndex( ( x ) => x.id === id );
		if ( i < 0 ) return;
		const [ b ] = S.bills.splice( i, 1 );
		save(); render();
		toast( t( 'tDeleted', { name: b.name } ), () => { S.bills.splice( i, 0, b ); save(); render(); } );
	}

	/* ------------------------------------------------------------------ Quick add (a sentence becomes a bill) */

	// Matching is done on a lower-case, accent-free copy of the text (same length as the original), so
	// "Κάθε Μήνα" and "καθε μηνα" are the same. English and Greek words are understood in either UI language.
	const ACC = { 'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω', 'ϊ': 'ι', 'ϋ': 'υ', 'ΐ': 'ι', 'ΰ': 'υ', 'ς': 'σ' };
	const fold = ( s ) => s.toLowerCase().replace( /[άέήίόύώϊϋΐΰς]/g, ( c ) => ACC[ c ] );
	const B = '(?<![\\p{L}\\p{N}])', E = '(?![\\p{L}\\p{N}])';
	const MONTH_RE = '(ιαν|φεβ|μαρ|απρ|μαι|ιουν|ιουλ|αυγ|σεπ|οκτ|νοε|δεκ|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\p{L}*';
	const MONTH_IDX = [ 'ιαν|jan', 'φεβ|feb', 'μαρ|mar', 'απρ|apr', 'μαι|may', 'ιουν|jun', 'ιουλ|jul', 'αυγ|aug', 'σεπ|sep', 'οκτ|oct', 'νοε|nov', 'δεκ|dec' ].map( ( s ) => s.split( '|' ) );
	const WD_RE = '(κυριακη|δευτερα|τριτη|τεταρτη|πεμπτη|παρασκευη|σαββατο|sun|mon|tue|wed|thu|fri|sat)\\p{L}*';
	const WD_IDX = [ [ 'κυριακη', 'sun' ], [ 'δευτερα', 'mon' ], [ 'τριτη', 'tue' ], [ 'τεταρτη', 'wed' ], [ 'πεμπτη', 'thu' ], [ 'παρασκευη', 'fri' ], [ 'σαββατο', 'sat' ] ];

	function nextWithDay( day, from = today() ) {
		const d = parse( from );
		const mk = ( y, m ) => iso( new Date( y, m, Math.min( day, dim( y, m ) ) ) );
		let c = mk( d.getFullYear(), d.getMonth() );
		if ( c < from ) c = mk( d.getFullYear() + ( d.getMonth() === 11 ? 1 : 0 ), ( d.getMonth() + 1 ) % 12 );
		return c;
	}

	/** "Netflix 15.99 monthly on the 3rd" or "Netflix 15,99 μηνιαία στις 3" -> { name, amount, currency, repeat, next, day }. */
	function parseQuick( text ) {
		let orig = ' ' + text.trim() + ' ';
		let norm = fold( orig );
		const out = {};
		const cut = ( re ) => {
			const m = new RegExp( re, 'iu' ).exec( norm );
			if ( ! m ) return null;
			const blank = ' '.repeat( m[ 0 ].length );
			norm = norm.slice( 0, m.index ) + blank + norm.slice( m.index + m[ 0 ].length );
			orig = orig.slice( 0, m.index ) + blank + orig.slice( m.index + m[ 0 ].length );
			return m;
		};
		const cur = /[€$£]/.exec( norm );
		if ( cur ) out.currency = { '€': 'EUR', '$': 'USD', '£': 'GBP' }[ cur[ 0 ] ];
		const code = cut( `${ B }(eur|usd|gbp|chf|cad|aud|sek|nok|dkk|pln|try)${ E }` );
		if ( code ) out.currency = code[ 1 ].toUpperCase();
		if ( cut( `${ B }ευρω${ E }` ) ) out.currency = 'EUR';
		if ( /~/.test( norm ) || cut( `${ B }(about|around|approx\\p{L}*|περιπου)${ E }` ) ) out.variable = true;
		// Repeat.
		const reps = [
			[ `${ B }(bi-?weekly|fortnightly|every (2|two) weeks|καθε (2|δυο) εβδομαδες|ανα (2|δυο) εβδομαδες|δεκαπενθημερ\\p{L}*)${ E }`, 'biweekly' ],
			[ `${ B }(weekly|every week|each week|εβδομαδιαι\\p{L}*|καθε εβδομαδα)${ E }`, 'weekly' ],
			[ `${ B }(quarterly|every (3|three) months|τριμηνια\\p{L}*|καθε (3|τρεις) μηνες|καθε τριμηνο)${ E }`, 'quarterly' ],
			[ `${ B }(yearly|annually|annual|every year|each year|per year|ετησι\\p{L}*|καθε (χρονο|ετος))${ E }`, 'yearly' ],
			[ `${ B }(monthly|every month|each month|per month|a month|μηνιαι\\p{L}*|καθε μηνα|τον μηνα)${ E }`, 'monthly' ],
			[ `${ B }(once|one-?off|one time|εφαπαξ|μια φορα)${ E }`, 'once' ],
		];
		for ( const [ re, v ] of reps ) { if ( cut( re ) ) { out.repeat = v; break; } }
		// Dates.
		let day = null, date = null;
		let m = cut( `${ B }(\\d{4})-(\\d{2})-(\\d{2})${ E }` );
		if ( m ) date = m[ 0 ].trim();
		if ( ! date ) {
			m = cut( `${ B }(today|tomorrow|σημερα|αυριο)${ E }` );
			if ( m ) date = [ 'today', 'σημερα' ].includes( m[ 1 ].toLowerCase() ) ? today() : addDays( today(), 1 );
		}
		if ( ! date ) {
			m = cut( `${ B }(?:(?:on|στις|την)\\s+)?(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th|η|ης)?\\s+(?:of\\s+|του\\s+)?${ MONTH_RE }${ E }` )
				|| cut( `${ B }${ MONTH_RE }\\s+(\\d{1,2})(?:st|nd|rd|th)?${ E }` );
			if ( m ) {
				const dd = Number( m[ 1 ].match( /^\d/ ) ? m[ 1 ] : m[ 3 ] || m[ 2 ] );
				const word = ( m[ 1 ].match( /^\d/ ) ? m[ 2 ] : m[ 1 ] ).toLowerCase();
				const mi = MONTH_IDX.findIndex( ( p ) => p.includes( word ) );
				if ( dd >= 1 && dd <= 31 && mi >= 0 ) {
					const y = new Date().getFullYear();
					let c = iso( new Date( y, mi, Math.min( dd, dim( y, mi ) ) ) );
					if ( c < today() ) c = iso( new Date( y + 1, mi, Math.min( dd, dim( y + 1, mi ) ) ) );
					date = c; day = dd;
					if ( ! out.repeat ) out.repeat = 'once';
				}
			}
		}
		if ( ! date ) {
			m = cut( `${ B }(?:(?:every|on|καθε|την)\\s+)?${ WD_RE }${ E }` );
			if ( m ) {
				const w = m[ 1 ].toLowerCase();
				const target = WD_IDX.findIndex( ( p ) => p.includes( w ) );
				if ( target >= 0 ) {
					date = addDays( today(), ( target - new Date().getDay() + 7 ) % 7 );
					if ( ! out.repeat ) out.repeat = 'weekly';
				}
			}
		}
		if ( ! date ) {
			m = cut( `${ B }(?:(?:on|the|στις|την|στη|καθε)\\s+)*(\\d{1,2})(?:st|nd|rd|th|η|ης)${ E }` ) || cut( `${ B }(?:on|στις|την|στη|καθε)\\s+(?:the\\s+)?(\\d{1,2})(?:\\s+του\\s+μηνα)?${ E }` ) || cut( `${ B }(\\d{1,2})\\s+του\\s+μηνα${ E }` );
			if ( m && Number( m[ 1 ] ) >= 1 && Number( m[ 1 ] ) <= 31 ) {
				day = Number( m[ 1 ] ); date = nextWithDay( day );
				if ( ! out.repeat ) out.repeat = 'monthly';
			}
		}
		// Amount: the first remaining number, with . or , as decimal mark.
		m = /(\d+(?:[.,]\d{1,2})?)/.exec( norm.replace( /(\d)[.,](\d{3})(?!\d)/g, '$1$2' ) );
		if ( m ) {
			out.amount = m[ 1 ].replace( ',', '.' );
			const at = norm.indexOf( m[ 1 ] );
			if ( at >= 0 ) { const blank = ' '.repeat( m[ 1 ].length ); orig = orig.slice( 0, at ) + blank + orig.slice( at + m[ 1 ].length ); norm = norm.slice( 0, at ) + blank + norm.slice( at + m[ 1 ].length ); }
		}
		const name = orig.replace( /[€$£~]/g, ' ' ).replace( new RegExp( `${ B }(on|the|every|each|per|a|an|for|of|about|around|due|pay|bill|στις|στη|στην|στο|τον|την|κάθε|Κάθε|ανά|για|του)${ E }`, 'giu' ), ' ' ).replace( /[^\p{L}\p{N}&'’.+()-]+/gu, ' ' ).replace( /\s+/g, ' ' ).trim();
		if ( name ) out.name = name.charAt( 0 ).toUpperCase() + name.slice( 1 );
		if ( date ) { out.next = date; if ( day ) out.day = day; }
		if ( ! out.repeat && out.next ) out.repeat = 'once';
		return out;
	}

	/* ------------------------------------------------------------------ Views */

	let view = 'today';
	let calMonth = new Date().getFullYear() * 12 + new Date().getMonth();
	let calDay = null;

	function rowHtml( b, opts = {} ) {
		const n = diffDays( b.next, today() );
		const cls = n < 0 ? 'late' : n === 0 ? 'now' : '';
		const snoozed = b.snooze && b.snooze > today();
		const meta = [ opts.showDate === false ? null : rel( b.next ) + ' · ' + dayName( b.next ), repeatLabel( b.repeat ), b.autopay ? t( 'autopay' ) : null, snoozed ? t( 'snoozed' ) : null ].filter( Boolean ).join( ' · ' );
		return `<li class="row ${ cls }" data-id="${ b.id }">
			<button type="button" class="row-main" data-act="edit" aria-label="${ esc( t( 'editAria', { name: b.name } ) ) }">
				<span class="ico c-${ esc( b.category ) }" aria-hidden="true">${ catIcon( b.category ) }</span>
				<span class="row-text"><b>${ esc( b.name ) }</b><small>${ esc( meta ) }</small></span>
				<span class="amt">${ esc( amountText( b ) ) }</span>
			</button>
			<span class="row-act">
				<button type="button" class="btn btn-ok btn-sm" data-act="paid">${ esc( b.autopay ? t( 'checked' ) : t( 'paid' ) ) }</button>
				<details class="more"><summary aria-label="${ esc( t( 'moreFor', { name: b.name } ) ) }">⋯</summary><div class="menu">
					<button type="button" data-act="snooze1">${ esc( t( 'snooze1' ) ) }</button>
					<button type="button" data-act="snooze3">${ esc( t( 'snooze3' ) ) }</button>
					${ b.repeat !== 'once' ? `<button type="button" data-act="skip">${ esc( t( 'skipThis' ) ) }</button>` : '' }
					${ b.payUrl ? `<a href="${ esc( b.payUrl ) }" target="_blank" rel="noopener noreferrer">${ esc( t( 'openLink' ) ) }</a>` : '' }
					${ b.reference ? `<button type="button" data-act="copyref">${ esc( t( 'copyRef' ) ) }</button>` : '' }
					<button type="button" data-act="edit">${ esc( t( 'edit' ) ) }</button>
					<button type="button" data-act="del" class="danger">${ esc( t( 'del' ) ) }</button>
				</div></details>
			</span>
		</li>`;
	}
	const paidRow = ( x, withDate = true ) => `<li class="row done"><span class="row-main static"><span class="ico ok" aria-hidden="true">✓</span><span class="row-text"><b>${ esc( x.name ) }</b><small>${ esc( withDate ? t( 'paidOnDate', { date: dayName( x.paidOn ) } ) : t( 'paidWord' ) ) }</small></span><span class="amt">${ x.amount !== '' && x.amount != null ? esc( money( Number( x.amount ), x.currency ) ) : '–' }</span></span></li>`;

	function viewToday() {
		const list = active().sort( byDue );
		const td = today();
		if ( ! S.bills.length ) {
			return `<section class="empty"><h1>${ esc( t( 'emptyH' ) ) }</h1><p>${ esc( t( 'emptyP' ) ) }</p>
				<div class="cta"><button type="button" class="btn btn-primary" data-act="add">${ esc( t( 'addTitle' ) ) }</button></div>
				<div class="tpls big">${ TEMPLATES.map( ( x, i ) => `<button type="button" class="tpl" data-tpl="${ i }">${ catIcon( x[ 1 ] ) } ${ esc( t( x[ 0 ] ) ) }</button>` ).join( '' ) }</div>
				<p class="muted small">${ esc( t( 'emptySample' ) ) } <button type="button" class="link" data-act="sample">${ esc( t( 'loadSample' ) ) }</button> ${ esc( t( 'emptySample2' ) ) }</p></section>`;
		}
		const late = list.filter( ( b ) => b.next < td );
		const week = list.filter( ( b ) => b.next >= td && b.next <= addDays( td, 7 ) );
		const monthEnd = iso( new Date( new Date().getFullYear(), new Date().getMonth() + 1, 0 ) );
		const restMonth = list.filter( ( b ) => b.next > addDays( td, 7 ) && b.next <= monthEnd );
		const later = list.filter( ( b ) => b.next > addDays( td, 7 ) && b.next > monthEnd );
		const monthAll = list.flatMap( ( b ) => occurrences( b, monthEnd ).map( () => ( { currency: b.currency, amount: b.amount } ) ) );
		const stat = ( label, val, sub, cls = '' ) => `<div class="stat ${ cls }"><small>${ esc( label ) }</small><b>${ esc( val ) }</b><span>${ esc( sub ) }</span></div>`;
		const section = ( title, items, cls = '' ) => items.length ? `<section class="grp ${ cls }"><h2>${ esc( title ) } <span class="count">${ items.length }</span></h2><ul class="rows">${ items.map( ( b ) => rowHtml( b ) ).join( '' ) }</ul></section>` : '';
		return `<h1 class="sr">${ esc( t( 'tabToday' ) ) }</h1>
			<div class="stats">
				${ stat( t( 'statOverdue' ), sumByCur( late ), late.length ? t( 'billsN', { n: late.length } ) : t( 'allClear' ), late.length ? 'bad' : 'good' ) }
				${ stat( t( 'statWeek' ), sumByCur( week ), t( 'billsN', { n: week.length } ) ) }
				${ stat( t( 'statMonth' ), sumByCur( monthAll ), t( 'statMonthSub' ) ) }
			</div>
			${ section( t( 'secOverdue' ), late, 'late' ) }${ section( t( 'secWeek' ), week ) }${ section( t( 'secLaterMonth' ), restMonth ) }${ section( t( 'secComing' ), later ) }
			${ list.length ? '' : `<p class="muted">${ esc( t( 'nothingOpen' ) ) }</p>` }
			${ paidRecentHtml() }`;
	}
	function paidRecentHtml() {
		const p = S.payments.slice().sort( ( a, b ) => ( a.paidOn < b.paidOn ? 1 : -1 ) ).slice( 0, 5 );
		return p.length ? `<section class="grp paid"><h2>${ esc( t( 'recentlyPaid' ) ) }</h2><ul class="rows">${ p.map( ( x ) => paidRow( x ) ).join( '' ) }</ul></section>` : '';
	}

	function viewCalendar() {
		const y = Math.floor( calMonth / 12 ), m = calMonth % 12;
		const first = new Date( y, m, 1 );
		const startPad = ( first.getDay() + 6 ) % 7; // Monday first
		const last = iso( new Date( y, m, dim( y, m ) ) );
		const map = {};
		active().forEach( ( b ) => occurrences( b, last ).forEach( ( d ) => { if ( d >= iso( first ) ) ( map[ d ] = map[ d ] || [] ).push( b ); } ) );
		const paidMap = {};
		S.payments.forEach( ( p ) => { ( paidMap[ p.paidOn ] = paidMap[ p.paidOn ] || [] ).push( p ); } );
		const cells = [];
		for ( let i = 0; i < startPad; i++ ) cells.push( '<div class="cell blank"></div>' );
		for ( let d = 1; d <= dim( y, m ); d++ ) {
			const s = iso( new Date( y, m, d ) );
			const items = map[ s ] || [];
			const pays = paidMap[ s ] || [];
			const cls = [ 'cell', s === today() ? 'today' : '', s === calDay ? 'sel' : '', s < today() && items.length ? 'late' : '' ].join( ' ' );
			cells.push( `<button type="button" class="${ cls }" data-day="${ s }" aria-label="${ esc( t( 'dayAria', { date: dayName( s ), due: items.length, paid: pays.length } ) ) }"><span class="num">${ d }</span><span class="dots">${ items.slice( 0, 3 ).map( () => '<i></i>' ).join( '' ) }${ pays.length ? '<i class="ok"></i>' : '' }</span>${ items.length ? `<small>${ esc( sumByCur( items ) ) }</small>` : '' }</button>` );
		}
		// 2024-01-01 is a Monday: week-day names in the UI language.
		const wd = [ 0, 1, 2, 3, 4, 5, 6 ].map( ( i ) => new Date( 2024, 0, 1 + i ).toLocaleDateString( loc(), { weekday: 'short' } ) );
		const sel = calDay || ( ( new Date().getFullYear() * 12 + new Date().getMonth() ) === calMonth ? today() : null );
		const selItems = sel ? ( map[ sel ] || [] ) : [];
		const selPaid = sel ? ( paidMap[ sel ] || [] ) : [];
		const monthItems = Object.values( map ).flat();
		return `<h1 class="sr">${ esc( t( 'tabCalendar' ) ) }</h1>
			<div class="cal-head"><button type="button" class="btn btn-ghost btn-sm" data-cal="-1" aria-label="${ esc( t( 'prevMonth' ) ) }">‹</button><h2>${ esc( monthName( y, m ) ) }</h2><button type="button" class="btn btn-ghost btn-sm" data-cal="1" aria-label="${ esc( t( 'nextMonth' ) ) }">›</button><button type="button" class="btn btn-ghost btn-sm" data-cal="0">${ esc( t( 'tabToday' ) ) }</button><span class="sp"></span><span class="muted small">${ esc( t( 'dueMonth' ) ) } <b>${ esc( sumByCur( monthItems ) ) }</b></span></div>
			<div class="cal" role="grid">${ wd.map( ( w ) => `<div class="dow" role="columnheader">${ esc( w ) }</div>` ).join( '' ) }${ cells.join( '' ) }</div>
			<section class="grp"><h2>${ sel ? esc( dayName( sel ) ) : esc( t( 'pickDay' ) ) }</h2>
			${ selItems.length ? `<ul class="rows">${ selItems.map( ( b ) => rowHtml( Object.assign( {}, b, { next: sel } ), { showDate: false } ) ).join( '' ) }</ul>` : `<p class="muted">${ esc( t( 'nothingDue' ) ) }</p>` }
			${ selPaid.length ? `<ul class="rows">${ selPaid.map( ( x ) => paidRow( x, false ) ).join( '' ) }</ul>` : '' }
			</section>`;
	}

	function viewInsights() {
		const td = today();
		const bills = active();
		if ( ! S.bills.length ) return `<h1 class="sr">${ esc( t( 'tabInsights' ) ) }</h1><p class="muted">${ esc( t( 'emptyIns' ) ) }</p>`;
		const weeks = [];
		for ( let w = 0; w < 13; w++ ) {
			const from = addDays( td, w * 7 ), to = addDays( td, w * 7 + 6 );
			const items = bills.flatMap( ( b ) => occurrences( b, to ).filter( ( d ) => d >= from ).map( () => b ) );
			weeks.push( { from, items, total: items.reduce( ( s, b ) => s + ( Number( b.amount ) || 0 ), 0 ) } );
		}
		const max = Math.max( 1, ...weeks.map( ( w ) => w.total ) );
		const upTo = ( n ) => weeks.slice( 0, Math.ceil( n / 7 ) );
		const sum = ( n ) => sumByCur( upTo( n ).flatMap( ( w ) => w.items ) );
		const cnt = ( n ) => upTo( n ).reduce( ( k, w ) => k + w.items.length, 0 );
		const yr = String( new Date().getFullYear() );
		const paidYr = S.payments.filter( ( p ) => p.paidOn.startsWith( yr ) && Number( p.amount ) );
		const cat = {};
		paidYr.forEach( ( p ) => { cat[ p.category ] = ( cat[ p.category ] || 0 ) + Number( p.amount ); } );
		const catList = Object.entries( cat ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] );
		const catMax = Math.max( 1, ...catList.map( ( c ) => c[ 1 ] ) );
		const catTotal = catList.reduce( ( s, c ) => s + c[ 1 ], 0 ) || 1;
		const mixed = new Set( paidYr.map( ( p ) => p.currency ) ).size > 1;
		const subs = bills.filter( ( b ) => b.category === 'subscriptions' && perYear[ b.repeat ] ).map( ( b ) => ( { b, yearly: ( Number( b.amount ) || 0 ) * perYear[ b.repeat ] } ) ).sort( ( a, b ) => b.yearly - a.yearly );
		const changes = [];
		S.bills.forEach( ( b ) => {
			const ps = S.payments.filter( ( p ) => p.billId === b.id && Number( p.amount ) ).sort( ( a, c ) => ( a.due < c.due ? -1 : 1 ) );
			if ( ps.length >= 2 ) { const a = Number( ps[ ps.length - 2 ].amount ), c = Number( ps[ ps.length - 1 ].amount ); if ( a && Math.abs( c - a ) / a >= 0.05 ) changes.push( { b, a, c } ); }
		} );
		return `<h1 class="sr">${ esc( t( 'tabInsights' ) ) }</h1>
			<div class="stats">
				<div class="stat"><small>${ esc( t( 'next30' ) ) }</small><b>${ esc( sum( 28 ) ) }</b><span>${ esc( t( 'paymentsN', { n: cnt( 28 ) } ) ) }</span></div>
				<div class="stat"><small>${ esc( t( 'next60' ) ) }</small><b>${ esc( sum( 63 ) ) }</b><span>${ esc( t( 'paymentsN', { n: cnt( 63 ) } ) ) }</span></div>
				<div class="stat"><small>${ esc( t( 'next90' ) ) }</small><b>${ esc( sum( 91 ) ) }</b><span>${ esc( t( 'paymentsN', { n: cnt( 91 ) } ) ) }</span></div>
			</div>
			<section class="card"><h2>${ esc( t( 'weekByWeek' ) ) }</h2><div class="bars" role="img" aria-label="${ esc( t( 'barsAria' ) ) }">${ weeks.map( ( w ) => `<div class="bar"><i style="height:${ Math.round( ( w.total / max ) * 100 ) }%" title="${ esc( dayName( w.from ) + ': ' + sumByCur( w.items ) ) }"></i><small>${ parse( w.from ).getDate() }/${ parse( w.from ).getMonth() + 1 }</small></div>` ).join( '' ) }</div><p class="muted small">${ esc( t( 'weekNote' ) ) }</p></section>
			${ changes.length ? `<section class="card"><h2>${ esc( t( 'priceChanges' ) ) }</h2><ul class="plain">${ changes.map( ( x ) => `<li>${ t( 'priceItem', { name: esc( x.b.name ), a: esc( money( x.a, x.b.currency ) ), c: esc( money( x.c, x.b.currency ) ), pct: ( x.c > x.a ? '+' : '' ) + Math.round( ( ( x.c - x.a ) / x.a ) * 100 ) + '%' } ) }</li>` ).join( '' ) }</ul></section>` : '' }
			<section class="card"><h2>${ esc( t( 'paidByCat' ) ) }</h2>${ catList.length ? `<ul class="hbars">${ catList.map( ( [ k, v ] ) => `<li><span>${ catIcon( k ) } ${ esc( catName( k ) ) }</span><i style="--w:${ Math.round( ( v / catMax ) * 100 ) }%"></i><b>${ esc( num( v ) ) } <em>${ Math.round( ( v / catTotal ) * 100 ) }%</em></b></li>` ).join( '' ) }</ul>${ mixed ? `<p class="muted small">${ esc( t( 'mixedNote' ) ) }</p>` : '' }` : `<p class="muted">${ esc( t( 'noPaid' ) ) }</p>` }</section>
			<section class="card"><h2>${ esc( t( 'subs' ) ) }</h2>${ subs.length ? `<ul class="plain">${ subs.map( ( s ) => `<li>${ t( 'subLine', { name: esc( s.b.name ), year: esc( money( s.yearly, s.b.currency ) ), each: esc( money( Number( s.b.amount ) || 0, s.b.currency ) ), rep: esc( repeatLabel( s.b.repeat ).toLowerCase() ) } ) }</li>` ).join( '' ) }</ul><p class="small">${ t( 'subTotal', { total: esc( sumByCur( subs.map( ( s ) => ( { currency: s.b.currency, amount: s.yearly } ) ) ) ) } ) }</p>` : `<p class="muted">${ esc( t( 'noSubs' ) ) }</p>` }</section>`;
	}

	function viewSettings() {
		const n = typeof Notification === 'undefined' ? null : Notification.permission;
		const on = S.settings.notify && n === 'granted';
		return `<h1 class="sr">${ esc( t( 'tabSettings' ) ) }</h1>
			<section class="card"><h2>${ esc( t( 'sRemind' ) ) }</h2>
				<label class="f">${ esc( t( 'sDefLead' ) ) }<select id="setLead">${ LEADS.map( ( l ) => `<option value="${ l }"${ l === S.settings.lead ? ' selected' : '' }>${ esc( t( 'lead' + l ) ) }</option>` ).join( '' ) }</select></label>
				<label class="f">${ esc( t( 'sMainCur' ) ) }<input id="setCur" list="curList" maxlength="3" value="${ esc( S.settings.currency ) }"></label>
				<div class="setrow"><div><b>${ esc( t( 'sNotif' ) ) }</b><p class="muted small">${ esc( n === null ? t( 'notifNone' ) : n === 'denied' ? t( 'notifDenied' ) : t( 'notifDesc' ) ) }</p></div>
				<button type="button" class="btn ${ on ? 'btn-ghost' : 'btn-primary' }" id="notifyBtn" ${ n === null || n === 'denied' ? 'disabled' : '' }>${ esc( on ? t( 'turnOff' ) : t( 'turnOn' ) ) }</button></div>
				<div class="setrow"><div><b>${ esc( t( 'sClosed' ) ) }</b><p class="muted small">${ esc( t( 'sClosedDesc' ) ) }</p></div><button type="button" class="btn btn-primary" id="icsBtn">${ esc( t( 'dlIcs' ) ) }</button></div>
			</section>
			<section class="card"><h2>${ esc( t( 'sData' ) ) }</h2>
				<p class="muted small">${ esc( t( 'sDataDesc', { b: S.bills.length, p: S.payments.length } ) ) }</p>
				<div class="btn-row"><button type="button" class="btn btn-ghost" id="expJson">${ esc( t( 'dlBackup' ) ) }</button><button type="button" class="btn btn-ghost" id="expCsv">${ esc( t( 'dlCsv' ) ) }</button><label class="btn btn-ghost file">${ esc( t( 'restore' ) ) }<input type="file" id="impJson" accept="application/json,.json" hidden></label></div>
			</section>
			<section class="card"><h2>${ esc( t( 'sAppearance' ) ) }</h2><div class="btn-row"><button type="button" class="btn btn-ghost" data-theme-set="auto">${ esc( t( 'themeAuto' ) ) }</button><button type="button" class="btn btn-ghost" data-theme-set="light">${ esc( t( 'themeLight' ) ) }</button><button type="button" class="btn btn-ghost" data-theme-set="dark">${ esc( t( 'themeDark' ) ) }</button></div></section>
			<section class="card"><h2>${ esc( t( 'sLanguage' ) ) }</h2><div class="btn-row">${ Object.keys( I18N.langs ).map( ( k ) => `<button type="button" class="btn ${ k === lang ? 'btn-primary' : 'btn-ghost' }" data-lang="${ k }" lang="${ k }">${ esc( I18N.langs[ k ].langName ) }</button>` ).join( '' ) }</div></section>
			<section class="card"><h2>${ esc( t( 'sNext' ) ) }</h2><p class="muted small">${ t( 'sNextDesc' ) }</p></section>
			<section class="card danger-zone"><h2>${ esc( t( 'sDanger' ) ) }</h2><p class="muted small">${ esc( t( 'sDangerDesc' ) ) }</p><button type="button" class="btn btn-danger" id="wipeBtn">${ esc( t( 'wipe' ) ) }</button></section>`;
	}

	function render() {
		const html = { today: viewToday, calendar: viewCalendar, insights: viewInsights, settings: viewSettings }[ view ]();
		const open = $( 'details.more[open]' );
		const openId = open ? open.closest( '.row' ).dataset.id : null;
		$( '#view' ).innerHTML = html;
		if ( openId ) { const r = $( `.row[data-id="${ openId }"] details.more` ); if ( r ) r.open = true; }
		$$( '#tabs button' ).forEach( ( b ) => { if ( b.dataset.tab === view ) b.setAttribute( 'aria-current', 'page' ); else b.removeAttribute( 'aria-current' ); } );
	}

	/** Translates the static markup: data-i18n (text), data-i18n-ph (placeholder), data-i18n-aria (aria-label). */
	function applyStatic() {
		document.documentElement.lang = I18N.langs[ lang ].htmlLang;
		document.title = t( 'title' );
		$$( '[data-i18n]' ).forEach( ( el ) => { el.textContent = t( el.dataset.i18n ); } );
		$$( '[data-i18n-ph]' ).forEach( ( el ) => { el.placeholder = t( el.dataset.i18nPh ); } );
		$$( '[data-i18n-aria]' ).forEach( ( el ) => { el.setAttribute( 'aria-label', t( el.dataset.i18nAria ) ); } );
		const other = Object.keys( I18N.langs ).find( ( k ) => k !== lang );
		$( '#langBtn' ).textContent = I18N.langs[ lang ].otherLang;
		$( '#langBtn' ).setAttribute( 'aria-label', I18N.langs[ other ].otherLangLabel );
		$( '#langBtn' ).setAttribute( 'lang', other );
		const f = $( '#catSel' ), keepCat = f.value;
		f.innerHTML = CATS.map( ( c ) => `<option value="${ c[ 0 ] }">${ c[ 1 ] } ${ esc( catName( c[ 0 ] ) ) }</option>` ).join( '' );
		if ( keepCat ) f.value = keepCat;
		const l = $( '#leadSel' ), keepLead = l.value;
		l.innerHTML = `<option value="">${ esc( t( 'leadDefault' ) ) }</option>` + LEADS.map( ( x ) => `<option value="${ x }">${ esc( t( 'lead' + x ) ) }</option>` ).join( '' );
		l.value = keepLead;
		$( '#tpls' ).innerHTML = TEMPLATES.map( ( x, i ) => `<button type="button" class="tpl" data-tpl="${ i }">${ catIcon( x[ 1 ] ) } ${ esc( t( x[ 0 ] ) ) }</button>` ).join( '' );
	}
	function setLang( k ) {
		if ( ! I18N.langs[ k ] ) return;
		lang = k;
		try { localStorage.setItem( 'duenest.lang', k ); } catch ( e ) { /* ignore */ }
		applyStatic(); render();
	}

	/* ------------------------------------------------------------------ Bill form */

	const form = () => $( '#billForm' );
	let editing = null;
	let quickDay = null;

	function setForm( v ) {
		const f = form();
		Object.entries( v ).forEach( ( [ k, val ] ) => {
			const el = f.elements[ k ];
			if ( ! el ) return;
			if ( el.type === 'checkbox' ) el.checked = !! val; else el.value = val == null ? '' : val;
		} );
	}
	function openBill( bill, prefill ) {
		editing = bill || null;
		const f = form();
		f.reset();
		quickDay = null;
		$( '#formErr' ).hidden = true;
		$( '#billTitle' ).textContent = t( bill ? 'editTitle' : 'addTitle' );
		$( '#delBtn' ).hidden = ! bill;
		$( '#quickWrap' ).hidden = !! bill;
		$( '#chips' ).innerHTML = '';
		setForm( bill ? Object.assign( {}, bill, { lead: bill.lead == null ? '' : bill.lead } ) : Object.assign( { currency: S.settings.currency, repeat: 'monthly', category: 'other', lead: '', next: addDays( today(), 7 ) }, prefill || {} ) );
		$( '#billDlg' ).showModal();
		( bill ? f.elements.name : $( '#quick' ) ).focus();
	}
	function readForm() {
		const f = form();
		const g = ( n ) => f.elements[ n ];
		const name = g( 'name' ).value.trim();
		const next = g( 'next' ).value;
		const amountRaw = g( 'amount' ).value.trim().replace( ',', '.' );
		if ( ! name ) return { error: t( 'errName' ) };
		if ( ! next ) return { error: t( 'errNext' ) };
		if ( amountRaw && ! /^\d+(\.\d{1,2})?$/.test( amountRaw ) ) return { error: t( 'errAmount' ) };
		const cur = ( g( 'currency' ).value.trim() || S.settings.currency ).toUpperCase();
		if ( ! /^[A-Z]{3}$/.test( cur ) ) return { error: t( 'errCur' ) };
		const end = g( 'end' ).value;
		if ( end && end < next ) return { error: t( 'errEnd' ) };
		const payUrl = g( 'payUrl' ).value.trim();
		if ( payUrl && ! /^https?:\/\//i.test( payUrl ) ) return { error: t( 'errUrl' ) };
		return { bill: {
			name, amount: amountRaw, currency: cur, next, repeat: g( 'repeat' ).value, category: g( 'category' ).value, end: end || '',
			lead: g( 'lead' ).value === '' ? null : Number( g( 'lead' ).value ), variable: g( 'variable' ).checked, autopay: g( 'autopay' ).checked,
			reference: g( 'reference' ).value.trim(), payUrl, notes: g( 'notes' ).value.trim(),
		} };
	}
	function submitBill() {
		const r = readForm();
		if ( r.error ) { const e = $( '#formErr' ); e.textContent = r.error; e.hidden = false; return; }
		const b = r.bill;
		const wasEditing = !! editing;
		if ( editing ) {
			const keepDay = editing.next === b.next && editing.day ? editing.day : null;
			Object.assign( editing, b, { day: keepDay || parse( b.next ).getDate() } );
			delete editing.done;
		} else {
			S.bills.push( Object.assign( { id: uid(), day: quickDay || parse( b.next ).getDate(), created: today() }, b ) );
		}
		quickDay = null;
		save(); $( '#billDlg' ).close(); render();
		toast( wasEditing ? t( 'tSaved' ) : t( 'tAdded', { name: b.name, lead: t( 'lead' + ( LEADS.includes( lead( b ) ) ? lead( b ) : 3 ) ).toLowerCase() } ) );
	}
	function onQuick() {
		const text = $( '#quick' ).value;
		const p = parseQuick( text );
		const chips = [];
		const set = {};
		if ( p.name ) { set.name = p.name; chips.push( p.name ); }
		if ( p.amount ) { set.amount = p.amount; chips.push( ( p.variable ? '~' : '' ) + p.amount + ' ' + ( p.currency || S.settings.currency ) ); }
		if ( p.currency ) set.currency = p.currency;
		if ( p.variable ) set.variable = true;
		if ( p.repeat ) { set.repeat = p.repeat; chips.push( repeatLabel( p.repeat ) ); }
		if ( p.next ) { set.next = p.next; chips.push( dayName( p.next ) ); }
		quickDay = p.day || null;
		if ( text.trim() ) {
			const lowName = p.name ? fold( p.name ) : '';
			const hit = TEMPLATES.find( ( x ) => lowName && ( lowName.startsWith( fold( t( x[ 0 ] ) ) ) || lowName.startsWith( fold( I18N.langs.en[ x[ 0 ] ] ) ) || lowName.startsWith( fold( I18N.langs.el[ x[ 0 ] ] ) ) ) );
			if ( hit ) set.category = hit[ 1 ];
			setForm( set );
		}
		$( '#chips' ).innerHTML = chips.map( ( c ) => `<span class="chip">${ esc( c ) }</span>` ).join( '' );
	}

	/* ------------------------------------------------------------------ Calendar file, backup, notifications */

	const icsEscape = ( s ) => String( s ).replace( /\\/g, '\\\\' ).replace( /;/g, '\\;' ).replace( /,/g, '\\,' ).replace( /\n/g, '\\n' );
	function buildIcs() {
		const stamp = new Date().toISOString().replace( /[-:]/g, '' ).replace( /\.\d+/, '' );
		const L = [ 'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Duenest//Bills//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + icsEscape( t( 'icsCal' ) ) ];
		const rule = { weekly: 'FREQ=WEEKLY', biweekly: 'FREQ=WEEKLY;INTERVAL=2', monthly: 'FREQ=MONTHLY', quarterly: 'FREQ=MONTHLY;INTERVAL=3', yearly: 'FREQ=YEARLY' };
		active().forEach( ( b ) => {
			const amt = b.amount !== '' && b.amount != null ? ` (${ amountText( b ) })` : '';
			L.push( 'BEGIN:VEVENT', `UID:${ b.id }@duenest`, `DTSTAMP:${ stamp }`, `DTSTART;VALUE=DATE:${ b.next.replace( /-/g, '' ) }`, `SUMMARY:${ icsEscape( t( 'icsPay', { name: b.name, amt } ) ) }` );
			if ( rule[ b.repeat ] ) L.push( 'RRULE:' + rule[ b.repeat ] + ( b.end ? ';UNTIL=' + b.end.replace( /-/g, '' ) : '' ) );
			const desc = [ b.reference && t( 'icsRef' ) + ': ' + b.reference, b.payUrl && t( 'icsPayLink' ) + ': ' + b.payUrl, b.notes ].filter( Boolean ).join( '\n' );
			if ( desc ) L.push( 'DESCRIPTION:' + icsEscape( desc ) );
			L.push( 'TRANSP:TRANSPARENT' );
			// All-day events start at midnight; alarms fire at 09:00 on the reminder day and on the due day.
			if ( lead( b ) > 0 ) L.push( 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${ icsEscape( t( 'icsDueIn', { name: b.name, n: lead( b ) } ) ) }`, `TRIGGER:-PT${ lead( b ) * 24 - 9 }H`, 'END:VALARM' );
			L.push( 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${ icsEscape( t( 'icsToday', { name: b.name } ) ) }`, 'TRIGGER:PT9H', 'END:VALARM', 'END:VEVENT' );
		} );
		L.push( 'END:VCALENDAR' );
		return L.join( '\r\n' ) + '\r\n';
	}
	function download( name, text, type ) {
		const a = document.createElement( 'a' );
		a.href = URL.createObjectURL( new Blob( [ text ], { type } ) );
		a.download = name; document.body.appendChild( a ); a.click(); a.remove();
		setTimeout( () => URL.revokeObjectURL( a.href ), 2000 );
	}
	const csvCell = ( v ) => { let s = String( v == null ? '' : v ); if ( /^[=+\-@]/.test( s ) ) s = "'" + s; return /[",\n]/.test( s ) ? '"' + s.replace( /"/g, '""' ) + '"' : s; };

	function checkNotifications() {
		if ( typeof Notification === 'undefined' || Notification.permission !== 'granted' || ! S.settings.notify ) return;
		const td = today();
		const due = active().filter( ( b ) => ( ! b.snooze || b.snooze <= td ) && diffDays( b.next, td ) <= lead( b ) && S.settings.lastNotified[ b.id ] !== td );
		if ( ! due.length ) return;
		due.forEach( ( b ) => { S.settings.lastNotified[ b.id ] = td; } );
		save();
		const body = due.slice( 0, 4 ).map( ( b ) => `${ b.name }: ${ rel( b.next ).toLowerCase() }` ).join( '\n' ) + ( due.length > 4 ? '\n' + t( 'nMore', { n: due.length - 4 } ) : '' );
		const title = due.length === 1 ? t( 'nTitle1' ) : t( 'nTitleN', { n: due.length } );
		try {
			if ( navigator.serviceWorker && navigator.serviceWorker.ready ) navigator.serviceWorker.ready.then( ( r ) => r.showNotification( title, { body, icon: 'icon-192.png', tag: 'duenest-due' } ) ).catch( () => new Notification( title, { body } ) );
			else new Notification( title, { body } );
		} catch ( e ) { /* notifications unavailable */ }
	}

	const SAMPLE = () => {
		const td = today();
		const mk = ( key, amount, cat, repeat, off, extra = {} ) => Object.assign( { id: uid(), name: t( key ), amount: String( amount ), currency: S.settings.currency, category: cat, repeat, next: addDays( td, off ), day: parse( addDays( td, off ) ).getDate(), lead: null, created: td }, extra );
		return [ mk( 'sampleRent', 850, 'housing', 'monthly', 4 ), mk( 'sampleElectricity', 64.2, 'utilities', 'monthly', -2, { variable: true } ), mk( 'sampleInternet', 29.9, 'utilities', 'monthly', 9 ),
			mk( 'tplNetflix', 15.99, 'subscriptions', 'monthly', 1 ), mk( 'tplSpotify', 10.99, 'subscriptions', 'monthly', 12 ), mk( 'sampleCarIns', 420, 'insurance', 'yearly', 38 ),
			mk( 'sampleCard', 180, 'loans', 'monthly', 6, { autopay: true } ), mk( 'sampleGym', 35, 'health', 'monthly', 16 ) ];
	};

	/* ------------------------------------------------------------------ Events */

	function init() {
		load();
		fetch( 'favicon.svg' ).then( ( r ) => r.text() ).then( ( svg ) => { $( '#logo' ).innerHTML = svg.replace( '<svg ', '<svg width="32" height="32" aria-hidden="true" ' ); } ).catch( () => {} );
		applyStatic();
		render();
		checkNotifications();
		setInterval( checkNotifications, 60000 );

		$( '#tabs' ).addEventListener( 'click', ( e ) => { const b = e.target.closest( 'button[data-tab]' ); if ( b ) { view = b.dataset.tab; render(); $( '#view' ).focus( { preventScroll: true } ); window.scrollTo( 0, 0 ); } } );
		$( '#addBtn' ).addEventListener( 'click', () => openBill() );
		$( '#langBtn' ).addEventListener( 'click', () => setLang( Object.keys( I18N.langs ).find( ( k ) => k !== lang ) ) );
		document.addEventListener( 'click', ( e ) => {
			const dlg = e.target.closest( 'dialog' );
			if ( e.target.closest( '[data-close]' ) ) { e.target.closest( 'dialog' ).close(); return; }
			if ( dlg && e.target === dlg ) { dlg.close(); return; }
			const tpl = e.target.closest( '[data-tpl]' );
			if ( tpl ) {
				const x = TEMPLATES[ Number( tpl.dataset.tpl ) ];
				const pre = { name: t( x[ 0 ] ), category: x[ 1 ], repeat: x[ 2 ] };
				if ( ! $( '#billDlg' ).open ) openBill( null, pre ); else setForm( pre );
				form().elements.amount.focus();
				return;
			}
			const lg = e.target.closest( '[data-lang]' );
			if ( lg ) { setLang( lg.dataset.lang ); return; }
			const cal = e.target.closest( '[data-cal]' );
			if ( cal ) { const n = Number( cal.dataset.cal ); calMonth = n === 0 ? new Date().getFullYear() * 12 + new Date().getMonth() : calMonth + n; calDay = null; render(); return; }
			const day = e.target.closest( '[data-day]' );
			if ( day ) { calDay = day.dataset.day; render(); return; }
			const th = e.target.closest( '[data-theme-set]' );
			if ( th ) { const v = th.dataset.themeSet; try { if ( v === 'auto' ) localStorage.removeItem( 'duenest.theme' ); else localStorage.setItem( 'duenest.theme', v ); } catch ( err ) { /* ignore */ } if ( v === 'auto' ) delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v; return; }
			const act = e.target.closest( '[data-act]' );
			if ( ! act ) { $$( 'details.more[open]' ).forEach( ( d ) => { if ( ! d.contains( e.target ) ) d.open = false; } ); return; }
			const row = act.closest( '.row' );
			const id = row ? row.dataset.id : null;
			const bill = id ? S.bills.find( ( b ) => b.id === id ) : null;
			const a = act.dataset.act;
			if ( a === 'add' ) openBill();
			else if ( a === 'sample' ) { S.bills.push( ...SAMPLE() ); save(); render(); toast( t( 'tSample' ) ); }
			else if ( a === 'edit' && bill ) openBill( bill );
			else if ( a === 'paid' && bill ) {
				$( '#payFor' ).textContent = t( 'payFor', { name: bill.name, date: dayName( bill.next ) } );
				const pf = $( '#payForm' ); pf.dataset.id = bill.id; pf.elements.amount.value = bill.amount; pf.elements.paidOn.value = today();
				$( '#payDlg' ).showModal(); pf.elements.amount.focus(); pf.elements.amount.select();
			}
			else if ( a === 'snooze1' && bill ) snooze( id, 1 );
			else if ( a === 'snooze3' && bill ) snooze( id, 3 );
			else if ( a === 'skip' && bill ) skip( id );
			else if ( a === 'copyref' && bill ) { if ( navigator.clipboard ) navigator.clipboard.writeText( bill.reference ).then( () => toast( t( 'tRefCopied' ) ), () => toast( bill.reference ) ); else toast( bill.reference ); }
			else if ( a === 'del' && bill ) removeBill( id );
		} );
		$( '#payForm' ).addEventListener( 'submit', ( e ) => {
			e.preventDefault();
			const pf = e.target, amt = pf.elements.amount.value.trim().replace( ',', '.' );
			if ( amt && ! /^\d+(\.\d{1,2})?$/.test( amt ) ) { pf.elements.amount.setCustomValidity( t( 'numberHint' ) ); pf.elements.amount.reportValidity(); pf.elements.amount.setCustomValidity( '' ); return; }
			$( '#payDlg' ).close();
			markPaid( pf.dataset.id, amt, pf.elements.paidOn.value );
		} );
		form().addEventListener( 'submit', ( e ) => { e.preventDefault(); submitBill(); } );
		$( '#quick' ).addEventListener( 'input', onQuick );
		$( '#quick' ).addEventListener( 'keydown', ( e ) => { if ( e.key === 'Enter' ) { e.preventDefault(); onQuick(); form().elements.name.focus(); } } );
		$( '#delBtn' ).addEventListener( 'click', () => { if ( editing ) { const id = editing.id; $( '#billDlg' ).close(); removeBill( id ); } } );

		$( '#view' ).addEventListener( 'change', ( e ) => {
			if ( e.target.id === 'setLead' ) { S.settings.lead = Number( e.target.value ); save(); }
			if ( e.target.id === 'setCur' ) { const v = e.target.value.trim().toUpperCase(); if ( /^[A-Z]{3}$/.test( v ) ) { S.settings.currency = v; save(); } }
			if ( e.target.id === 'impJson' ) {
				const file = e.target.files[ 0 ]; if ( ! file ) return;
				file.text().then( ( txt ) => {
					const d = JSON.parse( txt );
					if ( ! d || ! Array.isArray( d.bills ) ) throw new Error( 'bad' );
					if ( ! confirm( t( 'confirmRestore', { n: d.bills.length } ) ) ) return;
					S = { bills: d.bills, payments: d.payments || [], settings: Object.assign( S.settings, d.settings || {} ) };
					save(); render(); toast( t( 'tRestored' ) );
				} ).catch( () => toast( t( 'tBadBackup' ) ) );
			}
		} );
		$( '#view' ).addEventListener( 'click', async ( e ) => {
			const id = e.target.id;
			if ( id === 'icsBtn' ) { if ( ! active().length ) { toast( t( 'tNeedBill' ) ); return; } download( 'duenest-bills.ics', buildIcs(), 'text/calendar' ); toast( t( 'tIcs' ) ); }
			if ( id === 'expJson' ) download( 'duenest-backup-' + today() + '.json', JSON.stringify( S, null, 1 ), 'application/json' );
			if ( id === 'expCsv' ) {
				const rows = [ t( 'csvHead' ) ].concat( S.payments.map( ( p ) => [ p.paidOn, p.name, catName( p.category ), p.due, p.amount, p.currency ] ) );
				download( 'duenest-payments.csv', '﻿' + rows.map( ( r ) => r.map( csvCell ).join( ',' ) ).join( '\n' ), 'text/csv;charset=utf-8' );
			}
			if ( id === 'notifyBtn' ) {
				if ( S.settings.notify && Notification.permission === 'granted' ) { S.settings.notify = false; save(); render(); return; }
				const p = await Notification.requestPermission();
				S.settings.notify = p === 'granted'; save(); render(); if ( p === 'granted' ) { S.settings.lastNotified = {}; checkNotifications(); }
			}
			if ( id === 'wipeBtn' && confirm( t( 'confirmWipe' ) ) ) { S.bills = []; S.payments = []; S.settings.lastNotified = {}; save(); render(); toast( t( 'tWiped' ) ); }
		} );

		if ( 'serviceWorker' in navigator && location.protocol.startsWith( 'http' ) ) navigator.serviceWorker.register( 'sw.js' ).catch( () => {} );
	}

	window.Duenest = { parseQuick, nextAfter, occurrences, addMonths, buildIcs, setLang, state: () => S };
	init();
} )();

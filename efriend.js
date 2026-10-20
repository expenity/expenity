/**
 * eFriend: a small animated companion that coaches a savings goal (the trip, the gift) against its date.
 * It reads what Expenity already knows: wallet balances, upcoming and overdue bills, scheduled income and your spending habits,
 * sorts spending into Must (rent, phone, insurance...), Need (groceries, fuel...) and Want (dining out, streaming...), forecasts
 * what you will have by the date and says, kindly and with jokes, whether the goal will happen and what would help.
 * Everything is calculated on the device; there is no AI call. The maths is in EX.efriend, the screens in EXA.efriendHome / openEfriend.
 */
( function () {
	'use strict';
	const EX = window.EX, UI = window.UI, EXA = window.EXA;
	const { t, esc, money, parse, today, addDays } = EX;
	const S = EX.state, diff = EX.diffDays;
	const F = ( EX.efriend = {} );
	const main = () => S().settings.currency;
	const num = ( v ) => Number( String( v == null ? '' : v ).replace( ',', '.' ) ) || 0;
	const fold = ( s ) => String( s || '' ).toLowerCase().normalize( 'NFD' ).replace( /[̀-ͯ]/g, '' );

	/* ------------------------------------------------------------------ Must / Need / Want */
	// Words decide first (a phone bill is a Must, a streaming plan is a Want, even though both sit in "subscriptions"), then the category.
	const MUST_WORDS = {
		housing: [ 'rent', 'mortgage', 'enoikio', 'stegasi', 'housing', 'koinochrista', 'building charges', 'common charges' ],
		utility: [ 'electric', 'power bill', 'ρευμα', 'revma', 'dei', 'water', 'nero', 'gas bill', 'heating', 'thermansi', 'utilities', 'utility' ],
		telecom: [ 'internet', 'wifi', 'wi-fi', 'broadband', 'fiber', 'phone', 'mobile', 'cellular', 'kinito', 'tilefono', 'telephone', 'sim ' ],
		insurance: [ 'insurance', 'asfal', 'premium' ],
		loan: [ 'loan', 'mortgage', 'daneio', 'credit card', 'kartas', 'instalment', 'installment', 'doseis' ],
		tax: [ 'tax', 'forol', 'foros', 'enfia', 'efka', 'social insurance' ],
		childcare: [ 'childcare', 'daycare', 'nursery', 'school fee', 'tuition', 'paidikos stathmos', 'frontistirio', 'private lesson' ],
	};
	const WANT_WORDS = [ 'netflix', 'spotify', 'disney', 'hbo', 'streaming', 'prime video', 'youtube premium', 'gym', 'fitness', 'magazine', 'game', 'gaming', 'cinema', 'restaurant', 'dining', 'takeaway', 'delivery', 'coffee', 'kafes', 'bar ', 'cocktail', 'clothes', 'shopping', 'hobby', 'subscription box' ];
	const NEED_WORDS = [ 'grocer', 'supermarket', 'super market', 'fuel', 'petrol', 'gasoline', 'bus ', 'metro', 'ticket', 'pharmacy', 'doctor', 'dentist', 'medicine' ];
	const CAT_DEFAULT = {
		housing: 'must', utilities: 'must', insurance: 'must', loans: 'must', taxes: 'must', childcare: 'must', education: 'must', property_tax: 'must', vehicle_tax: 'must', social: 'must', building: 'must',
		health: 'need', food: 'need', fuel: 'need', publicTransport: 'need', transport: 'need', pharmacy: 'need', dental: 'need', vision: 'need', cleaning: 'need', 'home repairs': 'need',
		leisure: 'want', shopping: 'want', dining: 'want', coffee: 'want', delivery: 'want', subscriptions: 'want', presents: 'want', hobbies: 'want', sports: 'want', personalCare: 'want', clothing: 'want', electronics: 'want', furniture: 'want', travel: 'want', accommodation: 'want', donations: 'want', apps: 'want', cloud: 'want', bank_fees: 'must',
	};
	const hit = ( text, words ) => words.some( ( w ) => text.includes( w ) );
	/** 'must' | 'need' | 'want' with the reason key, for a bill or an entry ({ name, category, id }). */
	F.importance = ( item ) => {
		const ov = S().settings.importance || {}, name = fold( item.name ), cat = item.category || '';
		const pick = ov[ 'item:' + ( item.id || '' ) ] || ov[ 'cat:' + cat ];
		if ( pick ) return { level: pick, why: 'custom' };
		for ( const [ why, words ] of Object.entries( MUST_WORDS ) ) if ( hit( name, words ) ) return { level: 'must', why };
		if ( hit( name, WANT_WORDS ) ) return { level: 'want', why: 'want' };
		if ( hit( name, NEED_WORDS ) ) return { level: 'need', why: 'need' };
		const d = CAT_DEFAULT[ cat ];
		if ( d ) return { level: d, why: d === 'must' ? ( cat === 'utilities' ? 'utility' : cat === 'housing' ? 'housing' : cat === 'insurance' ? 'insurance' : cat === 'taxes' ? 'tax' : cat === 'loans' ? 'loan' : 'must' ) : d };
		return { level: 'need', why: 'need' };
	};

	/* ------------------------------------------------------------------ The forecast */
	const centsOf = ( amount, cur ) => { const v = EX.convert( num( amount ), cur || main(), main() ); return v == null ? 0 : Math.round( v * 100 ); };
	F.goals = () => S().goals.filter( ( g ) => g.coach && g.deadline );
	F.forecast = ( goal ) => {
		const now = today(), end = goal.deadline, days = diff( end, now );
		const saved = EX.plan ? EX.plan.saved( goal ) : 0, target = EX.cents( goal.target ), remaining = Math.max( 0, target - saved );
		const wallets = ( goal.wallets && goal.wallets.length ? goal.wallets.map( ( id ) => EX.account( id ) ).filter( Boolean ) : EX.activeAccounts() );
		const out = { goal, days, saved, target, remaining, wallets, done: remaining === 0 };
		if ( out.done ) { out.verdict = 'done'; return out; }
		if ( days <= 0 ) { out.verdict = 'unlikely'; out.late = true; out.projectedFree = 0; out.gap = remaining; out.confidence = 'low'; return out; }
		const balance = EX.mainCents( wallets.map( ( a ) => ( { amount: EX.balance( a ) / 100, currency: a.currency } ) ) );
		// Habits: the last 90 days (at least 14), without goal money, transfers and bill payments (bills are counted from their own schedule).
		const txs = S().txs.filter( ( x ) => x.type !== 'transfer' && ! x.goalId ), first = txs.reduce( ( m, x ) => ( x.date < m ? x.date : m ), now );
		const win = Math.max( 14, Math.min( 90, diff( now, first ) + 1 ) ), since = addDays( now, -win );
		const inWin = txs.filter( ( x ) => x.date >= since && x.date <= now );
		const perCat = {}; inWin.filter( ( x ) => x.type === 'expense' && ! x.billId ).forEach( ( x ) => { perCat[ x.category || 'other' ] = ( perCat[ x.category || 'other' ] || 0 ) + centsOf( x.amount, EX.txCurrency( x ) ); } );
		const level = { must: 0, need: 0, want: 0 }, cats = [];
		Object.entries( perCat ).forEach( ( [ cat, c ] ) => { const imp = F.importance( { category: cat, name: EX.catInfo( cat ).name } ), future = ( c / win ) * days; level[ imp.level ] += future; cats.push( { cat, level: imp.level, why: imp.why, perDay: c / win, future } ); } );
		cats.sort( ( a, b ) => b.future - a.future );
		// Bills until the date (overdue ones included: they must be paid first).
		const bills = []; let billsDue = 0, overdue = 0;
		S().bills.filter( ( b ) => ! b.done && b.next ).forEach( ( b ) => {
			const imp = F.importance( { id: b.id, name: b.name, category: b.category } );
			EX.occurrences( b, end ).forEach( ( d ) => { const c = centsOf( b.amount, b.currency ); billsDue += c; if ( d < now ) overdue += c; bills.push( { b, d, c, level: imp.level, why: imp.why, late: d < now } ); } );
		} );
		// Income: scheduled income exactly, other income at 70% of its usual pace.
		let incomeSched = 0; S().incomes.filter( ( i ) => ! i.done && i.next ).forEach( ( i ) => { EX.occurrences( i, end ).forEach( () => { incomeSched += centsOf( i.amount, i.currency ); } ); } );
		const otherInc = inWin.filter( ( x ) => x.type === 'income' && ! x.incomeId ).reduce( ( s, x ) => s + centsOf( x.amount, EX.txCurrency( x ) ), 0 );
		const incomeOther = Math.round( ( otherInc / win ) * 0.7 * days );
		const buffer = Math.round( ( ( level.must + level.need ) / days ) * 7 );
		const spend = level.must + level.need + level.want;
		const projectedFree = balance + incomeSched + incomeOther - billsDue - spend - buffer;
		const ratio = remaining ? projectedFree / remaining : 9;
		out.verdict = ratio >= 1.25 ? 'comfortable' : ratio >= 1 ? 'ontrack' : ratio >= 0.75 ? 'tight' : ratio >= 0.4 ? 'atrisk' : 'unlikely';
		Object.assign( out, { balance, incomeSched, incomeOther, billsDue, overdue, spend, level, buffer, projectedFree, gap: Math.max( 0, remaining - projectedFree ), extra: Math.max( 0, projectedFree - remaining ), ratio, bills, cats, perWeek: Math.ceil( remaining / Math.max( 1, days / 7 ) ), win } );
		out.confidence = win >= 60 && inWin.length >= 25 ? 'good' : win >= 28 && inWin.length >= 10 ? 'medium' : 'low';
		// What would help: a quarter off the biggest Wants, and subscriptions that could pause.
		const sugg = cats.filter( ( c ) => c.level === 'want' ).map( ( c ) => ( { kind: 'cut', cat: c.cat, gain: Math.round( c.future * 0.25 ) } ) );
		bills.filter( ( x ) => x.level === 'want' && ! x.late ).reduce( ( m, x ) => { const k = x.b.id; ( m[ k ] = m[ k ] || { kind: 'pause', name: x.b.name, gain: 0 } ).gain += x.c; return m; }, ( out._pause = {} ) );
		Object.values( out._pause ).forEach( ( p ) => sugg.push( p ) ); delete out._pause;
		out.suggestions = sugg.filter( ( s ) => s.gain >= Math.max( 100, remaining * 0.01 ) ).sort( ( a, b ) => b.gain - a.gain ).slice( 0, 4 );
		out.gain = out.suggestions.reduce( ( s, x ) => s + x.gain, 0 );
		// Other ways: a smaller goal, or a later date.
		out.affordable = Math.max( 0, projectedFree + saved );
		const perDay = ( projectedFree + buffer ) / days;
		out.laterDays = out.gap > 0 && perDay > 0 ? Math.ceil( out.gap / perDay ) : null;
		out.mustList = bills.filter( ( x ) => x.level === 'must' ).sort( ( a, b ) => ( a.d < b.d ? -1 : 1 ) ).slice( 0, 6 );
		return out;
	};

	/* ------------------------------------------------------------------ The character */
	const MOODS = { comfortable: 'cheer', done: 'cheer', ontrack: 'happy', tight: 'meh', atrisk: 'worried', unlikely: 'worried', nodata: 'meh' };
	/** A small round friend: blinks, bobs, and changes its face with the news. */
	F.mascot = ( verdict, size = 72 ) => {
		const mood = MOODS[ verdict ] || 'happy';
		const mouth = { cheer: '<path d="M22 40q10 12 20 0z" fill="#7a1f3d"/>', happy: '<path d="M23 40q9 9 18 0" fill="none" stroke="#7a1f3d" stroke-width="3" stroke-linecap="round"/>', meh: '<path d="M25 42h14" fill="none" stroke="#7a1f3d" stroke-width="3" stroke-linecap="round"/>', worried: '<path d="M23 44q4-6 9-2t9-2" fill="none" stroke="#7a1f3d" stroke-width="3" stroke-linecap="round"/>' }[ mood ];
		const extra = mood === 'cheer' ? '<path class="ef-spark" d="M52 10l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffc94d"/>' : mood === 'worried' ? '<path class="ef-drop" d="M49 22q3 5 0 8t-3-3z" fill="#7cc4ff"/>' : '';
		return `<svg class="ef-mascot ef-${ mood }" width="${ size }" height="${ size }" viewBox="0 0 64 64" role="img" aria-label="eFriend"><g class="ef-body"><ellipse cx="32" cy="58" rx="16" ry="3" fill="rgba(0,0,0,.12)"/><circle cx="32" cy="32" r="23" fill="var(--accent)"/><circle cx="32" cy="32" r="23" fill="url(#none)"/><ellipse cx="24" cy="22" rx="7" ry="4" fill="#fff" opacity=".25"/><g class="ef-eyes"><circle cx="24" cy="30" r="4.5" fill="#fff"/><circle cx="40" cy="30" r="4.5" fill="#fff"/><circle cx="25" cy="31" r="2.2" fill="#27141b"/><circle cx="41" cy="31" r="2.2" fill="#27141b"/></g>${ mouth }<path d="M30 9q2-6 6-4" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/><circle cx="37" cy="5" r="3" fill="#ffc94d"/>${ extra }</g></svg>`;
	};

	/* ------------------------------------------------------------------ Words (funny on purpose) */
	const pickLine = ( verdict ) => { const lines = t( 'ef_' + verdict ).split( '|' ), d = parse( today() ); return lines[ ( d.getDate() + d.getMonth() ) % lines.length ]; };
	F.sentences = ( f ) => {
		if ( f.verdict === 'done' ) return [ t( 'efDone' ) ];
		if ( f.late ) return [ t( 'efLate' ) ];
		const m = ( c ) => money( c / 100, main() ), out = [ t( 'efNeedWeek', { a: m( f.perWeek ) } ) ];
		out.push( f.gap > 0 ? t( 'efShort', { a: m( f.gap ) } ) : t( 'efSpare', { a: m( f.extra ) } ) );
		if ( f.overdue > 0 ) out.push( t( 'efOverdue', { a: m( f.overdue ) } ) );
		const s = f.suggestions && f.suggestions[ 0 ]; if ( f.gap > 0 && s ) out.push( s.kind === 'cut' ? t( 'efTipCut', { name: EX.catInfo( s.cat ).name, a: m( s.gain ) } ) : t( 'efTipPause', { name: s.name, a: m( s.gain ) } ) );
		return out;
	};

	/* ------------------------------------------------------------------ Home widget */
	const pickGoal = () => { const l = F.goals().map( ( g ) => F.forecast( g ) ); if ( ! l.length ) return null; const rank = { unlikely: 0, atrisk: 1, tight: 2, ontrack: 3, comfortable: 4, done: 5 }; return l.sort( ( a, b ) => ( rank[ a.verdict ] - rank[ b.verdict ] ) || ( a.days - b.days ) )[ 0 ]; };
	EXA.efriendHome = () => {
		const f = pickGoal(); if ( ! f || ! EXA.flipCard ) return '';
		if ( ! ( S().device || {} ).efIntro && ! navigator.webdriver ) setTimeout( () => EXA.efriendIntro(), 600 );
		const g = f.goal, pct = f.target ? Math.min( 100, Math.round( f.saved / f.target * 100 ) ) : 0, label = { comfortable: 'Comfortable', ontrack: 'On track', tight: 'Tight', atrisk: 'At risk', unlikely: 'Unlikely', done: 'Done' }[ f.verdict ];
		const front = `<div class="ef-card ef-${ f.verdict }"><div class="ef-top">${ F.mascot( f.verdict ) }<div class="ef-bubble"><b>${ esc( pickLine( f.verdict ) ) }</b></div></div>
			<div class="ef-meta"><span class="ef-chip">${ label }</span><span>${ esc( t( 'efDaysLeft', { n: Math.max( 0, f.days ) } ) ) }</span></div>
			<div class="ef-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ pct }"><i style="width:${ pct }%"></i><span class="ef-suit" style="left:${ pct }%">${ UI.icon( g.icon || 'plane', 18 ) }</span></div>
			<small>${ esc( money( f.saved / 100, main() ) ) } / ${ esc( money( f.target / 100, main() ) ) }</small></div>`;
		const back = `<div class="wk-back ef-back"><span class="wk-ic bob">${ UI.icon( 'sparkles', 30 ) }</span><h3>${ esc( g.name ) }</h3>${ F.sentences( f ).map( ( s ) => `<p class="wk-line">${ esc( s ) }</p>` ).join( '' ) }<button type="button" class="btn btn-primary" data-ef-open="${ esc( g.id ) }">${ esc( t( 'efOpen' ) ) }</button></div>`;
		return `<section data-home="efriend"><div class="sec-head"><h2>${ esc( g.name ) }</h2><span class="sec-acts">${ EXA.flipBtn( 'efriend' ) }</span></div>${ EXA.flipCard( 'efriend', front, back, 'fc-ef' ) }</section>`;
	};

	/* ------------------------------------------------------------------ Full analysis */
	EXA.openEfriend = ( id ) => {
		const g = S().goals.find( ( x ) => x.id === id ); if ( ! g ) return;
		const f = F.forecast( g ), m = ( c ) => money( c / 100, main() ), label = { comfortable: 'Comfortable', ontrack: 'On track', tight: 'Tight', atrisk: 'At risk', unlikely: 'Unlikely', done: 'Done' }[ f.verdict ];
		const why = ( k ) => t( 'efWhy_' + k ) || t( 'efWhy_must' );
		const mustRows = ( f.mustList || [] ).map( ( x ) => `<li><div><b>${ esc( x.b.name ) }</b><small>${ esc( why( x.why ) ) }</small></div><span>${ x.late ? '<i class="ef-late">Overdue</i> ' : '' }${ esc( m( x.c ) ) }</span></li>` ).join( '' );
		const suggRows = ( f.suggestions || [] ).map( ( s ) => `<li><div><b>${ esc( s.kind === 'cut' ? t( 'efCutLabel', { name: EX.catInfo( s.cat ).name } ) : t( 'efPauseLabel', { name: s.name } ) ) }</b></div><span class="ef-gain">+${ esc( m( s.gain ) ) }</span></li>` ).join( '' );
		const catRows = ( f.cats || [] ).slice( 0, 8 ).map( ( c ) => `<li><div><b>${ esc( EX.catInfo( c.cat ).name ) }</b></div><select data-ef-level="${ esc( c.cat ) }" aria-label="${ esc( EX.catInfo( c.cat ).name ) }">${ [ 'must', 'need', 'want' ].map( ( l ) => `<option value="${ l }"${ c.level === l ? ' selected' : '' }>${ esc( t( 'ef_lvl_' + l ) ) }</option>` ).join( '' ) }</select></li>` ).join( '' );
		const alt = [];
		if ( f.gap > 0 ) { alt.push( t( 'efAltSmaller', { a: m( Math.round( f.affordable ) ), p: Math.min( 99, Math.round( ( 1 - f.affordable / f.target ) * 100 ) ) } ) ); if ( f.laterDays ) alt.push( t( 'efAltLater', { d: EX.dayName( addDays( g.deadline, f.laterDays ) ) } ) ); }
		UI.openSheet( `<div class="sheet-head"><h2>${ esc( g.name ) }</h2><span class="sp"></span><button type="button" class="ab-btn" data-close aria-label="${ esc( t( 'close' ) ) }">${ UI.icon( 'x', 24 ) }</button></div>
			<div class="sheet-pad ef-sheet"><div class="ef-top">${ F.mascot( f.verdict, 84 ) }<div class="ef-bubble"><b>${ esc( pickLine( f.verdict ) ) }</b><span class="ef-chip">${ label }</span></div></div>
			${ f.verdict === 'done' ? '' : `<ul class="ef-kv"><li><span>${ esc( t( 'efStillNeed' ) ) }</span><b>${ esc( m( f.remaining ) ) }</b></li><li><span>${ esc( t( 'efProjected' ) ) }</span><b>${ esc( m( Math.max( 0, f.projectedFree || 0 ) ) ) }</b></li><li><span>${ esc( t( 'efDays' ) ) }</span><b>${ Math.max( 0, f.days ) }</b></li><li><span>${ esc( t( 'efConfidence' ) ) }</span><b>${ esc( t( 'efConf_' + f.confidence ) ) }</b></li></ul>` }
			${ F.sentences( f ).map( ( s ) => `<p class="wk-line">${ esc( s ) }</p>` ).join( '' ) }
			${ suggRows ? `<h3>${ esc( t( 'efHelps' ) ) }</h3><ul class="ef-list">${ suggRows }</ul><p class="muted small">${ esc( t( 'efHelpsNote', { a: m( f.gain ) } ) ) }</p>` : '' }
			${ alt.length ? `<h3>${ esc( t( 'efOtherWays' ) ) }</h3>${ alt.map( ( a ) => `<p class="wk-line">${ esc( a ) }</p>` ).join( '' ) }` : '' }
			${ mustRows ? `<h3>${ esc( t( 'efMustTitle' ) ) }</h3><ul class="ef-list">${ mustRows }</ul>` : '' }
			${ catRows ? `<h3>${ esc( t( 'efSortTitle' ) ) }</h3><p class="muted small">${ esc( t( 'efSortText' ) ) }</p><ul class="ef-list">${ catRows }</ul>` : '' }
			<button type="button" class="btn btn-ghost wide" data-ef-redo="${ esc( id ) }">${ esc( t( 'efRedo' ) ) }</button><p class="muted small">${ esc( t( 'efDisclaimer' ) ) }</p></div>`, { tall: true } );
		document.querySelector( '.ef-sheet' ).addEventListener( 'change', ( e ) => { const s = e.target.closest( '[data-ef-level]' ); if ( ! s ) return; const o = S().settings.importance = S().settings.importance || {}; o[ 'cat:' + s.dataset.efLevel ] = s.value; S().settings.u = Date.now(); EX.save(); EXA.openEfriend( id ); EXA.render(); } );
	};
	document.addEventListener( 'click', ( e ) => { const r = e.target.closest( '[data-ef-redo]' ); if ( r ) { UI.closeSheet(); setTimeout( () => EXA.efriendOnboard( r.dataset.efRedo ), 200 ); return; } const b = e.target.closest( '[data-ef-open]' ); if ( b ) { e.preventDefault(); e.stopImmediatePropagation(); EXA.openEfriend( b.dataset.efOpen ); } }, true );

	/* ------------------------------------------------------------------ Goal form: the switch and the wallets */
	EXA.efriendGoalFields = ( g ) => {
		const ws = EX.writableAccounts(), chosen = g && g.wallets && g.wallets.length ? g.wallets : ws.map( ( w ) => w.id );
		return `<div class="ef-intro"><span class="ef-mini">${ F.mascot( 'happy', 44 ) }</span><div><b>${ esc( t( 'efMeet' ) ) }</b><small>${ esc( t( 'efMeetText' ) ) }</small></div></div>
			<label class="entry-paid ef-switch"><span><b>${ esc( t( 'efToggle' ) ) }</b><small>${ esc( t( 'efToggleHint' ) ) }</small></span><span class="switch"><input type="checkbox" name="coach"${ g && g.coach ? ' checked' : '' }><i></i></span></label>
			<div class="lbl">${ esc( t( 'efWallets' ) ) }</div><div class="chips wrap">${ ws.map( ( w ) => `<label class="chip ef-wallet"><input type="checkbox" name="gw" value="${ esc( w.id ) }"${ chosen.includes( w.id ) ? ' checked' : '' }> ${ esc( EX.accountName( w ) ) }</label>` ).join( '' ) }</div>`;
	};
	EXA.efriendAfterSave = () => { const g = F.goals().slice( -1 )[ 0 ]; if ( g && ! ( S().device || {} ).efOnboard ) setTimeout( () => EXA.efriendOnboard( g.id ), 450 ); };
	EXA.efriendReadFields = ( f ) => ( { coach: !! f.elements.coach?.checked, wallets: [ ...f.querySelectorAll( '[name=gw]:checked' ) ].map( ( x ) => x.value ) } );

	/* ------------------------------------------------------------------ Intro: the Expenity logo turns into "eFriend" */
	// The E and its tick become "e" and "F", then "riend" types itself in and the character hops out. Reduced motion shows the final word.
	F.logoWord = ( cls = '' ) => `<svg class="ef-logo ${ cls }" viewBox="0 0 270 80" role="img" aria-label="eFriend">
		<g class="ef-lg-E"><rect x="6" y="12" width="30" height="8" rx="4" fill="var(--accent)"/><rect x="6" y="52" width="30" height="8" rx="4" fill="var(--accent)"/><rect x="6" y="12" width="8" height="48" rx="4" fill="var(--accent)"/></g>
		<path class="ef-lg-tick" d="m19 36 6 6 12-13" fill="none" stroke="#ffc94d" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
		<text class="ef-lg-e" x="6" y="58" font-size="64" font-weight="800" fill="var(--accent)">e</text>
		<text class="ef-lg-F" x="42" y="58" font-size="64" font-weight="800" fill="#ffc94d">F</text>
		<text class="ef-lg-rest" x="82" y="58" font-size="64" font-weight="800" fill="var(--ink)">${ [ ...'riend' ].map( ( c, i ) => `<tspan style="--i:${ i }">${ c }</tspan>` ).join( '' ) }</text></svg>`;
	EXA.efriendIntro = () => {
		const d = document.createElement( 'div' ); d.className = 'ef-intro-ov'; d.setAttribute( 'role', 'dialog' ); d.setAttribute( 'aria-label', 'eFriend' );
		d.innerHTML = `<div class="ef-intro-card">${ F.logoWord( 'play' ) }<div class="ef-hop">${ F.mascot( 'cheer', 96 ) }</div><p>${ esc( t( 'efMeetText' ) ) }</p><button type="button" class="btn btn-primary">${ esc( t( 'tutDone' ) ) }</button></div>`;
		document.body.appendChild( d ); d.querySelector( 'button' ).addEventListener( 'click', () => d.remove() ); d.addEventListener( 'click', ( e ) => { if ( e.target === d ) d.remove(); } );
		try { S().device.efIntro = 1; } catch ( e ) { /* ignore */ }
	};

	/* ------------------------------------------------------------------ Onboarding: one page, pre-sorted, you adjust */
	// Your spending categories, each already sorted as Must / Need / Want by the rules above. A 3-way toggle changes any of them.
	const LVL = [ 'must', 'need', 'want' ];
	F.sortRows = () => {
		const since = addDays( today(), -90 ), tot = {};
		S().txs.filter( ( x ) => x.type === 'expense' && x.date >= since && ! x.goalId ).forEach( ( x ) => { const c = x.category || 'other'; tot[ c ] = ( tot[ c ] || 0 ) + centsOf( x.amount, EX.txCurrency( x ) ); } );
		S().bills.forEach( ( b ) => { const c = b.category || 'other'; tot[ c ] = tot[ c ] || 1; } );
		const ov = S().settings.importance || {};
		return Object.keys( tot ).sort( ( a, b ) => tot[ b ] - tot[ a ] ).slice( 0, 14 ).map( ( cat ) => {
			const auto = F.importance( { category: cat, name: EX.catInfo( cat ).name, id: '' } );
			const base = ov[ 'cat:' + cat ] ? CAT_DEFAULT[ cat ] || auto.level : auto.level;
			return { cat, spent: tot[ cat ] > 1 ? tot[ cat ] : 0, auto: base, level: ov[ 'cat:' + cat ] || auto.level };
		} );
	};
	EXA.efriendOnboard = ( goalId ) => {
		const rows = F.sortRows();
		try { S().device.efOnboard = 1; } catch ( e ) { /* ignore */ }
		if ( ! rows.length ) { if ( goalId ) EXA.openEfriend( goalId ); return; }
		const row = ( r ) => `<li data-ef-row="${ esc( r.cat ) }"><div><b>${ esc( EX.catInfo( r.cat ).name ) }</b>${ r.spent ? `<small>${ esc( money( r.spent / 100, main() ) ) }</small>` : '' }</div>
			<div class="ef-tri" role="group" aria-label="${ esc( EX.catInfo( r.cat ).name ) }">${ LVL.map( ( l ) => `<button type="button" data-ef-set="${ l }" aria-pressed="${ r.level === l }" class="${ r.level === l ? 'on ' : '' }ef-l-${ l }">${ esc( t( 'ef_lvl_' + l ) ) }</button>` ).join( '' ) }</div></li>`;
		UI.openSheet( `<div class="sheet-head"><h2>${ esc( t( 'efOnbTitle' ) ) }</h2><span class="sp"></span></div>
			<div class="sheet-pad ef-sheet ef-onb"><div class="ef-top">${ F.mascot( 'happy', 72 ) }<div class="ef-bubble"><b>${ esc( t( 'efOnbHi' ) ) }</b></div></div>
			<p class="muted small">${ esc( t( 'efSortText' ) ) }</p>
			<ul class="ef-list">${ rows.map( row ).join( '' ) }</ul>
			<div class="btn-row"><button type="button" class="btn btn-primary wide" data-ef-save>${ esc( t( 'efOnbSave' ) ) }</button></div></div>`, { tall: true } );
		const root = document.querySelector( '.ef-onb' );
		root.addEventListener( 'click', ( e ) => {
			const b = e.target.closest( '[data-ef-set]' );
			if ( b ) { b.parentNode.querySelectorAll( 'button' ).forEach( ( x ) => { const on = x === b; x.classList.toggle( 'on', on ); x.setAttribute( 'aria-pressed', on ); } ); return; }
			if ( ! e.target.closest( '[data-ef-save]' ) ) return;
			const o = S().settings.importance = S().settings.importance || {};
			root.querySelectorAll( '[data-ef-row]' ).forEach( ( li ) => { const cat = li.dataset.efRow, v = li.querySelector( '.on' )?.dataset.efSet, r = rows.find( ( x ) => x.cat === cat ); if ( ! v ) return; if ( v === r.auto ) delete o[ 'cat:' + cat ]; else o[ 'cat:' + cat ] = v; } );
			S().settings.u = Date.now(); EX.save(); UI.closeSheet(); EXA.render();
			if ( goalId ) setTimeout( () => EXA.openEfriend( goalId ), 250 );
		} );
	};

	/* ------------------------------------------------------------------ Strings */
	const en = {
		efMeet: 'Meet your eFriend', efMeetText: 'A small friend who watches your bills, income and habits and tells you, kindly and with jokes, whether this goal will happen.',
		efToggle: 'Let eFriend coach this goal', efToggleHint: 'It checks the goal against your bills, income and spending until the date.', efWallets: 'Money for this goal comes from',
		ef_comfortable: "You're on fire. The suitcase is already packing itself.|At this rate you'll be buying souvenirs for your souvenirs.|Look at you, being all responsible. I'm basically crying.",
		ef_ontrack: "Right on schedule. I'm proud of you, and I don't say that to just anyone.|Smooth sailing. Keep your wallet calm and the plan will happen.|On track! Please don't celebrate with an impulse purchase.",
		ef_tight: "It's tight, but so are my favourite jeans. We can make it work.|A few small tweaks and this plan is back on.|Not a disaster. More of a plot twist.",
		ef_atrisk: "Houston, we have a slightly worrying forecast. Good news: I have ideas.|The plan is wobbling. Let's rescue it with some creative skipping.|Plot twist: the coffee budget has plans of its own. Let's talk.",
		ef_unlikely: "Okay, honest moment: this date is a stretch. Let's pick a smarter plan together.|I believe in you, just not in this exact date. Let's adjust.",
		ef_done: "You did it! Passport time.|Goal reached. I'm doing a tiny happy dance.", ef_nodata: 'I need a bit more history to guess well. Keep adding things!',
		efDone: 'Goal reached. Time to enjoy it!', efLate: 'The date has passed. Move the date or lower the goal and I will help again.',
		efNeedWeek: 'You need about {a} a week to get there.', efShort: 'At your current pace you would be {a} short.', efSpare: 'At your current pace you would have {a} to spare.',
		efOverdue: '{a} of overdue bills must be paid first. They come before any goal.', efTipCut: 'Cutting {name} by a quarter would add about {a}.', efTipPause: 'Pausing {name} would add about {a}.',
		efDaysLeft: '{n} days left', efOpen: 'Full analysis', efStillNeed: 'Still to save', efProjected: 'Likely free by the date', efDays: 'Days left', efConfidence: 'How sure am I?',
		efConf_low: 'A little (not much history yet)', efConf_medium: 'Fairly', efConf_good: 'Quite sure',
		efHelps: 'What would help', efHelpsNote: 'Together these could add about {a} by the date.', efCutLabel: 'Spend a quarter less on {name}', efPauseLabel: 'Pause {name}',
		efOtherWays: 'Other ways to get there', efAltSmaller: 'Aim a little lower: about {a} ({p}% less) fits comfortably.', efAltLater: 'Or move the date to about {d}.',
		efMustTitle: 'Bills that cannot be skipped', efSortTitle: 'How I sorted your spending', efSortText: 'Must = fixed and necessary. Need = necessary but you can shop smarter. Want = nice to have. Change any of them.',
		ef_lvl_must: 'Must', ef_lvl_need: 'Need', ef_lvl_want: 'Want',
		efWhy_housing: 'A roof comes first, and late rent costs fees.', efWhy_utility: 'Lights, water and heating are not optional.', efWhy_telecom: 'Phone and internet keep you reachable and online, so they stay.',
		efWhy_insurance: 'Skipping insurance can cost far more later.', efWhy_loan: 'Missed payments add interest and hurt your record.', efWhy_tax: 'Taxes and contributions have penalties when late.',
		efWhy_childcare: 'Your family depends on it.', efWhy_must: 'Fixed and necessary.', efWhy_custom: 'You marked this as a must.',
		efOnbTitle: 'How you spend', efOnbHi: "Here is how I sorted your spending. Tap to change anything that is different for you.", efOnbSave: 'Looks right', efRedo: 'Review how I sorted your spending',
		efDisclaimer: 'These are estimates from your own history, not financial advice. The more you add, the better my guesses get.',
	};
	const el = {
		efMeet: 'Γνωρίστε το eFriend σας', efMeetText: 'Ένας μικρός φίλος που παρακολουθεί τους λογαριασμούς, τα έσοδα και τις συνήθειές σας και σας λέει, ευγενικά και με αστεία, αν αυτός ο στόχος θα γίνει.',
		efToggle: 'Να προπονεί το eFriend αυτόν τον στόχο', efToggleHint: 'Ελέγχει τον στόχο με βάση τους λογαριασμούς, τα έσοδα και τα έξοδά σας μέχρι την ημερομηνία.', efWallets: 'Τα χρήματα για αυτόν τον στόχο προέρχονται από',
		ef_comfortable: 'Πετάτε! Η βαλίτσα φτιάχνεται μόνη της.|Με αυτόν τον ρυθμό θα αγοράζετε σουβενίρ για τα σουβενίρ σας.|Κοιτάξτε σας, τόσο υπεύθυνοι. Σχεδόν κλαίω.',
		ef_ontrack: 'Στην ώρα σας. Είμαι περήφανο για εσάς και δεν το λέω σε όλους.|Όλα πάνε ρολόι. Κρατήστε το πορτοφόλι ήρεμο και το σχέδιο θα γίνει.|Πάμε καλά! Μην το γιορτάσετε με παρορμητική αγορά, σας παρακαλώ.',
		ef_tight: 'Είναι στενά, αλλά έτσι είναι και το αγαπημένο μου τζιν. Θα τα καταφέρουμε.|Μερικές μικρές αλλαγές και το σχέδιο επανέρχεται.|Όχι καταστροφή. Μάλλον ανατροπή πλοκής.',
		ef_atrisk: 'Χιούστον, έχουμε μια ελαφρώς ανησυχητική πρόβλεψη. Καλά νέα: έχω ιδέες.|Το σχέδιο τρέμει. Ας το σώσουμε με λίγη δημιουργική παράλειψη.|Ανατροπή: ο προϋπολογισμός για καφέδες έχει δικά του σχέδια. Ας μιλήσουμε.',
		ef_unlikely: 'Εντάξει, ειλικρινά: αυτή η ημερομηνία είναι δύσκολη. Ας διαλέξουμε μαζί ένα εξυπνότερο σχέδιο.|Πιστεύω σε εσάς, απλώς όχι σε αυτή ακριβώς την ημερομηνία. Ας την προσαρμόσουμε.',
		ef_done: 'Τα καταφέρατε! Ώρα για διαβατήριο.|Ο στόχος επιτεύχθηκε. Κάνω έναν μικρό χορό χαράς.', ef_nodata: 'Χρειάζομαι λίγο περισσότερο ιστορικό για να μαντέψω σωστά. Συνεχίστε να προσθέτετε!',
		efDone: 'Ο στόχος επιτεύχθηκε. Ώρα να τον απολαύσετε!', efLate: 'Η ημερομηνία πέρασε. Αλλάξτε την ημερομηνία ή μειώστε τον στόχο και θα βοηθήσω ξανά.',
		efNeedWeek: 'Χρειάζεστε περίπου {a} την εβδομάδα για να φτάσετε.', efShort: 'Με τον τρέχοντα ρυθμό θα σας λείπουν {a}.', efSpare: 'Με τον τρέχοντα ρυθμό θα σας περισσεύουν {a}.',
		efOverdue: 'Οφείλετε να πληρώσετε πρώτα {a} εκπρόθεσμων λογαριασμών. Προηγούνται κάθε στόχου.', efTipCut: 'Αν περικόψετε το «{name}» κατά ένα τέταρτο, θα προσθέσετε περίπου {a}.', efTipPause: 'Αν παγώσετε το «{name}», θα προσθέσετε περίπου {a}.',
		efDaysLeft: '{n} ημέρες ακόμα', efOpen: 'Πλήρης ανάλυση', efStillNeed: 'Μένουν να αποταμιευτούν', efProjected: 'Πιθανώς ελεύθερα μέχρι την ημερομηνία', efDays: 'Ημέρες που απομένουν', efConfidence: 'Πόσο σίγουρο είμαι;',
		efConf_low: 'Λίγο (δεν υπάρχει ακόμα αρκετό ιστορικό)', efConf_medium: 'Αρκετά', efConf_good: 'Πολύ',
		efHelps: 'Τι θα βοηθούσε', efHelpsNote: 'Μαζί αυτά θα μπορούσαν να προσθέσουν περίπου {a} μέχρι την ημερομηνία.', efCutLabel: 'Ξοδέψτε ένα τέταρτο λιγότερο σε «{name}»', efPauseLabel: 'Παγώστε το «{name}»',
		efOtherWays: 'Άλλοι τρόποι να φτάσετε', efAltSmaller: 'Στοχεύστε λίγο χαμηλότερα: περίπου {a} ({p}% λιγότερο) χωράει άνετα.', efAltLater: 'Ή μετακινήστε την ημερομηνία γύρω στις {d}.',
		efMustTitle: 'Λογαριασμοί που δεν παραλείπονται', efSortTitle: 'Πώς ταξινόμησα τα έξοδά σας', efSortText: 'Αναγκαίο = σταθερό και απαραίτητο. Ανάγκη = απαραίτητο αλλά μπορείτε να ψωνίσετε εξυπνότερα. Επιθυμία = καλό να υπάρχει. Αλλάξτε οποιοδήποτε.',
		ef_lvl_must: 'Αναγκαίο', ef_lvl_need: 'Ανάγκη', ef_lvl_want: 'Επιθυμία',
		efWhy_housing: 'Πρώτα η στέγη, και το ενοίκιο που καθυστερεί έχει επιβαρύνσεις.', efWhy_utility: 'Ρεύμα, νερό και θέρμανση δεν είναι προαιρετικά.', efWhy_telecom: 'Το τηλέφωνο και το internet σας κρατούν προσβάσιμους και συνδεδεμένους, γι’ αυτό μένουν.',
		efWhy_insurance: 'Η παράλειψη ασφάλισης μπορεί να κοστίσει πολύ περισσότερο αργότερα.', efWhy_loan: 'Οι χαμένες δόσεις προσθέτουν τόκους και βλάπτουν το ιστορικό σας.', efWhy_tax: 'Οι φόροι και οι εισφορές έχουν πρόστιμα όταν καθυστερούν.',
		efWhy_childcare: 'Η οικογένειά σας εξαρτάται από αυτό.', efWhy_must: 'Σταθερό και απαραίτητο.', efWhy_custom: 'Το σημάνατε ως αναγκαίο.',
		efOnbTitle: 'Πώς ξοδεύετε', efOnbHi: 'Έτσι ταξινόμησα τα έξοδά σας. Πατήστε για να αλλάξετε ό,τι διαφέρει για εσάς.', efOnbSave: 'Σωστά', efRedo: 'Δείτε πώς ταξινόμησα τα έξοδά σας',
		efDisclaimer: 'Πρόκειται για εκτιμήσεις από το δικό σας ιστορικό και όχι για οικονομική συμβουλή. Όσο περισσότερα προσθέτετε, τόσο καλύτερα μαντεύω.',
	};
	Object.assign( window.EXPENITY_I18N.langs.en, en ); Object.assign( window.EXPENITY_I18N.langs.el, el );
}() );

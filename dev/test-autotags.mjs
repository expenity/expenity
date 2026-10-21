import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd(), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer( ( q, r ) => { let f = path.join( root, decodeURIComponent( q.url.split( '?' )[ 0 ] ) ); if ( f.endsWith( '/' ) ) f += 'index.html'; fs.readFile( f, ( e, d ) => { if ( e ) { r.writeHead( 404 ); r.end(); } else { r.writeHead( 200, { 'content-type': types[ path.extname( f ) ] || 'application/octet-stream' } ); r.end( d ); } } ); } ).listen( 0 );
let ok = 0, fail = 0; const chk = ( n, c ) => { if ( c ) { ok++; console.log( 'ok', n ); } else { fail++; console.log( 'FAIL', n ); } };
const b = await chromium.launch( { channel: 'chrome' } ), pg = await b.newPage( { viewport: { width: 390, height: 800 } } ); const errs = []; pg.on( 'pageerror', ( e ) => errs.push( e.message ) );
await pg.goto( `http://localhost:${ server.address().port }/index.html?demo=1&lang=en` ); await pg.waitForFunction( () => document.documentElement.dataset.demoReady === '1', null, { timeout: 30000 } ); await pg.waitForTimeout( 1200 );
const R = ( fn ) => pg.evaluate( fn );
chk( 'the built-in list has 200 or more everyday things', await R( () => Object.keys( EXA.autoTags.vocab ).length >= 200 ) );
const s1 = await R( () => { const S = EX.state(); S.txs.length = 0; S.bills.length = 0; S.incomes.length = 0; S.goals.length = 0; S.budgets.length = 0; S.settings.tags = []; return EXA.autoTagsSuggest( 'I want a watch that costs $49', { category: 'shopping' } ); } );
chk( '"I want a watch that costs $49" gives watch and shopping (' + s1 + ')', s1.includes( 'Watch' ) && s1.includes( 'Shopping' ) );
chk( 'never more than three tags', await R( () => EXA.autoTagsSuggest( 'coffee at the cinema with the kids, a gift and a pizza', { category: 'dining' } ).length <= 3 ) );
chk( 'an existing tag that means the same is reused ("watches")', await R( () => { EX.state().settings.tags = [ 'watches' ]; const r = EXA.autoTagsSuggest( 'new watch 49', { category: 'shopping' } ); EX.state().settings.tags = []; return r.includes( 'watches' ) && ! r.includes( 'Watch' ); } ) );
chk( 'Greek words give the Greek tags', await R( () => { EX.setLang( 'el' ); const r = EXA.autoTagsSuggest( 'ρολόι 49 ευρώ', { category: 'shopping' } ); EX.setLang( 'en' ); return r.includes( 'Ρολόι' ) && r.includes( 'Αγορές' ); } ) );
chk( 'a Greek word and its English twin are the same thing', await R( () => { EX.state().settings.tags = [ 'Ρολόι' ]; const r = EXA.autoTagsSuggest( 'watch 49' ); EX.state().settings.tags = []; return r.includes( 'Ρολόι' ); } ) );
const ap = await R( () => { const rec = { name: 'Coffee and a gift', tags: [ 'mine' ] }; EXA.autoTags.apply( rec, 'tx' ); return rec; } );
chk( 'tags you typed are kept and only the missing ones are added (' + ap.tags + ')', ap.tags[ 0 ] === 'mine' && ap.tags.length <= 3 && ap.autoTags.length === ap.tags.length - 1 && ! ap.autoTags.includes( 'mine' ) );
chk( 'with three tags typed, nothing is added', await R( () => { const rec = { name: 'Coffee', tags: [ 'a', 'b', 'c' ] }; EXA.autoTags.apply( rec, 'tx' ); return rec.tags.length === 3 && ! rec.autoTags; } ) );
chk( 'it can be turned off', await R( () => { EX.state().settings.autoTags = false; const rec = { name: 'Coffee' }; EXA.autoTags.apply( rec, 'tx' ); EX.state().settings.autoTags = true; return ! rec.tags; } ) );
// an eFriend plan gets tags when it is saved
await R( () => { EXA.openEfPlan( null, { name: 'New watch for my girlfriend', target: '450', deadline: EX.addDays( EX.today(), 40 ) } ); } ); await pg.waitForSelector( '#efPlanForm' ); await R( () => document.querySelector( '#efPlanForm' ).requestSubmit() ); await pg.waitForTimeout( 700 );
chk( 'an eFriend plan gets auto tags too', await R( () => { const g = EX.state().goals.find( ( x ) => /watch/i.test( x.name ) ); return !! g && ( g.tags || [] ).some( ( x ) => /watch/i.test( x ) ); } ) );
// improve my tags: preview, apply, undo
const before = await R( () => { const S = EX.state(); S.settings.autoTags = false; S.txs.length = 0; const acc = S.accounts[ 0 ].id, mk = ( n, tags ) => S.txs.push( { id: EX.uid(), type: 'expense', amount: '3', account: acc, date: EX.today(), name: n, category: 'coffee', tags } ); mk( 'Coffee', [ 'coffee' ] ); mk( 'Coffee 2', [ 'Coffees' ] ); mk( 'Flat white', [ 'coffe' ] ); mk( 'Latte' , [] ); mk( 'Cinema night', [] ); S.settings.autoTags = true; EX.save(); const p = EXA.autoTags.plan(); return { merges: p.merges.length, changes: p.changes.length, to: p.merges[ 0 ] && p.merges[ 0 ].to }; } );
chk( 'the scan finds look-alike tags to merge and older entries to improve (' + JSON.stringify( before ) + ')', before.merges >= 1 && before.changes >= 3 );
await R( () => EXA.openImproveTags() ); await pg.waitForSelector( '[data-at=apply]' ); chk( 'a preview shows before anything changes', await R( () => ! EX.state().txs.some( ( x ) => x.autoTags ) ) );
await R( () => document.querySelector( '[data-at=apply]' ).click() ); await pg.waitForTimeout( 500 );
chk( 'applying merges the tags and keeps your typed ones', await R( () => { const t = EX.state().txs.map( ( x ) => x.tags || [] ); const coffees = t.slice( 0, 3 ).map( ( x ) => x[ 0 ] ); return new Set( coffees.map( ( x ) => x.toLowerCase().replace( /s$/, '' ) ) ).size === 1 && t[ 3 ].length >= 1; } ) );
await R( () => EXA.autoTags.undo() ); chk( 'undo puts everything back', await R( () => { const t = EX.state().txs.map( ( x ) => ( x.tags || [] ).join() ); return t[ 0 ] === 'coffee' && t[ 1 ] === 'Coffees' && t[ 2 ] === 'coffe' && t[ 3 ] === ''; } ) );
// the notice every 10 entries and the settings card
chk( 'no notice before 10 new entries', await R( () => { EX.state().device.atNew = 4; return EXA.autoTagsNotice() === ''; } ) );
chk( 'after 10 new entries a notice offers the scan', await R( () => { EX.state().device.atNew = 10; return /data-at="improve"/.test( EXA.autoTagsNotice() ); } ) );
await R( () => { EXA.go( 'home' ); } ); await pg.waitForTimeout( 600 ); await R( () => document.querySelector( '[data-at=later]' ).click() );
chk( 'Not now starts the count again', await R( () => EX.state().device.atNew === 0 ) );
await R( () => { EXA.st.view = 'more'; EXA.st.more = 'appearance'; EXA.render(); } ); await pg.waitForTimeout( 500 );
chk( 'Settings has an Auto tags card with the switch and the scan button', await R( () => !! document.querySelector( '[data-at-toggle]' ) && !! document.querySelector( '[data-at=improve]' ) ) );
chk( 'no page errors ' + errs.join( ';' ), ! errs.length );
console.log( 'ok', ok, 'fail', fail ); await b.close(); server.close(); process.exit( fail ? 1 : 0 );

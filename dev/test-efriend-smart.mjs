import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd(), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer( ( q, r ) => { let f = path.join( root, decodeURIComponent( q.url.split( '?' )[ 0 ] ) ); if ( f.endsWith( '/' ) ) f += 'index.html'; fs.readFile( f, ( e, d ) => { if ( e ) { r.writeHead( 404 ); r.end(); } else { r.writeHead( 200, { 'content-type': types[ path.extname( f ) ] || 'application/octet-stream' } ); r.end( d ); } } ); } ).listen( 0 );
const port = server.address().port; let ok = 0, fail = 0; const chk = ( n, c ) => { if ( c ) { ok++; console.log( 'ok', n ); } else { fail++; console.log( 'FAIL', n ); } };
const b = await chromium.launch( { channel: 'chrome' } ), pg = await b.newPage( { viewport: { width: 390, height: 800 } } ); const errs = []; pg.on( 'pageerror', ( e ) => errs.push( e.message ) );
await pg.goto( `http://localhost:${ port }/index.html` ); await pg.waitForFunction( () => window.EX && EX.efriend );
await pg.evaluate( () => { const S = EX.state(); S.settings.onboarded = true; S.device.efOnboard = 1; EXA.skipFlow && EXA.skipFlow(); S.accounts.push( { id: 'w1', name: 'Bank', type: 'bank', currency: S.settings.currency, opening: '5000' } ); EX.save(); } );
const none = await pg.evaluate( () => ( { l: EX.efriend.suggestLimits(), b: EX.efriend.budgetIdeas(), c: EX.efriend.suggestCushion2(), w: EXA.efLimitWarn( { type: 'expense', amount: '999', date: EX.today(), account: EX.activeAccounts()[ 0 ].id } ) } ) );
chk( 'no data: no limit suggestion, no budget ideas, no cushion hint, no warning without limits', ! none.l && ! none.b.length && ! none.c && ! none.w );
// 70 days of history: spending ~40/day across food and fun, income 2000 monthly in 3 blocks of different size
const r = await pg.evaluate( () => {
	const S = EX.state(), acc = EX.activeAccounts()[ 0 ].id, now = EX.today(); S.txs = []; S.bills = []; S.budgets = [];
	for ( let i = 1; i <= 70; i++ ) { const d = EX.addDays( now, -i ); S.txs.push( { id: 'f' + i, type: 'expense', amount: '25', category: 'food', account: acc, date: d, name: 'x' } ); if ( i % 2 ) S.txs.push( { id: 'g' + i, type: 'expense', amount: '30', category: 'leisure', account: acc, date: d, name: 'y' } ); }
	[ [ 5, 2400 ], [ 35, 1500 ], [ 65, 2100 ] ].forEach( ( [ n, a ], i ) => S.txs.push( { id: 'i' + i, type: 'income', amount: String( a ), category: 'salary', account: acc, date: EX.addDays( now, -n ), name: 'Salary' } ) );
	EX.save(); const F = EX.efriend; return { l: F.suggestLimits(), ideas: F.budgetIdeas(), c: F.suggestCushion2(), notes: F.limitNotes() };
} );
chk( 'limits suggested from history (' + JSON.stringify( r.l ) + ')', r.l && r.l.month > 0 && r.l.day > 0 && r.l.week > 0 && r.l.days >= 14 );
chk( 'suggested limits do not contradict each other', r.l && r.l.day * 30 <= r.l.month * 1.05 && r.l.day * 7 <= r.l.week * 1.05 );
chk( 'budget ideas for food and leisure', r.ideas.length === 2 && r.ideas.every( ( x ) => x.amount > 0 && x.amount <= x.usual + 5000 ) );
chk( 'income that swings gives a bigger cushion (' + JSON.stringify( r.c ) + ')', r.c && r.c.m === 3 );
const w = await pg.evaluate( () => { const F = EX.efriend, acc = EX.activeAccounts()[ 0 ].id, now = EX.today(); F.saveLimits( 'day', '50' ); const over = EXA.efLimitWarn( { type: 'expense', amount: '60', date: now, account: acc } ), under = EXA.efLimitWarn( { type: 'expense', amount: '5', date: now, account: acc } ), inc = EXA.efLimitWarn( { type: 'income', amount: '999', date: now, account: acc } ), fut = EXA.efLimitWarn( { type: 'expense', amount: '999', date: EX.addDays( now, 3 ), account: acc } ); F.saveLimits( 'day', '' ); F.saveLimits( 'month', '100' ); const mon = EXA.efLimitWarn( { type: 'expense', amount: '5', date: now, account: acc } ); F.saveLimits( 'month', '' ); return { over, under, inc, fut, mon }; } );
chk( 'warns when over the daily limit', /\d/.test( w.over || '' ) ); chk( 'quiet when under', ! w.under ); chk( 'quiet for income and future dates', ! w.inc && ! w.fut ); chk( 'warns on the monthly limit', !! w.mon );
const add = await pg.evaluate( () => { const F = EX.efriend, n0 = EX.state().budgets.length; F.addBudgets( F.budgetIdeas().slice( 0, 1 ) ); return { n: EX.state().budgets.length - n0, left: F.budgetIdeas().length }; } );
chk( 'adding a budget idea creates a monthly budget and removes the idea', add.n === 1 && add.left === 1 );
const low = await pg.evaluate( () => { const S = EX.state(), acc = EX.activeAccounts()[ 0 ].id, F = EX.efriend, bal = Math.round( EX.balance( EX.account( acc ) ) / 100 ); S.bills.push( { id: 'b1', name: 'Rent', amount: '9000', account: acc, currency: S.settings.currency, category: 'housing', repeat: 'once', next: EX.addDays( EX.today(), 10 ) } ); EX.save(); return F.lowAhead(); } );
chk( 'low balance ahead names the day and the bill (' + JSON.stringify( low ) + ')', low && low.kind && low.why === 'Rent' && low.k >= 5 && low.k <= 11 );
await pg.evaluate( () => EX.emit && EX.emit( 'change' ) ); const home = await pg.evaluate( () => EXA.efriendHome() ); chk( 'Home shows the warning banner', /ef-low/.test( home ) );
chk( 'no page errors ' + errs.join( ';' ), ! errs.length );
console.log( 'ok', ok, 'fail', fail ); await b.close(); server.close(); process.exit( fail ? 1 : 0 );

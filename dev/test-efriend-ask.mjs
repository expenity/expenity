// Ask eFriend: "Can I buy shoes that cost 49?" -> an answer, the best days on a calendar, and a way into a plan.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';import {readFileSync,existsSync} from 'node:fs';import {join,extname} from 'node:path';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const server=createServer((req,res)=>{const u=req.url.split('?')[0];const f=join(process.cwd(),u==='/'?'index.html':u);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const ok=(c,m)=>{console.log((c?'ok ':'FAIL ')+m);if(!c)process.exitCode=1;};
const browser=await chromium.launch({channel:'chrome'}),page=await (await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'})).newPage();
const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.addInitScript(()=>{localStorage.setItem('expenity.lang','en');});
await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EX?.efriend);
// parsing
const P=await page.evaluate(()=>['Can I buy shoes that cost $49?','new phone 650','Can I afford a 1,200 euro laptop?','μπορώ να αγοράσω παπούτσια 49;','dinner out 80.50'].map(q=>EX.efriend.parseAsk(q)));
const P2=await page.evaluate(()=>['New iPhone 16 pro max 1250$','no, it\'s 1250 the price','iphone 16 1250 euro','2 shoes 80'].map((q,i)=>EX.efriend.parseAsk(q,i===1)));
ok(P2[0].cost===125000&&/iPhone 16 pro max/.test(P2[0].item),'"New iPhone 16 pro max 1250$" -> the price is 1250, not 16 ('+JSON.stringify(P2[0])+')');
ok(P2[1].cost===125000&&!P2[1].item,'a correction like "no, it is 1250 the price" gives only the price ('+JSON.stringify(P2[1])+')');
ok(P2[2].cost===125000&&/16/.test(P2[2].item),'the biggest number is the price when there is no sign ('+JSON.stringify(P2[2])+')');
ok(P2[3].cost===8000,'"2 shoes 80" -> 80');
const P3=await page.evaluate(()=>['I want to buy a new watch for my girlfriend','I would like to buy a new watch for my girlfriend, 500 euros','Θέλω να αγοράσω ένα ρολόι για τη φίλη μου 300','thinking of getting a trip to Paris','I need a laptop for work 900'].map(q=>EX.efriend.parseAsk(q)));
ok(P3[0].item==='Watch'&&P3[0].who==='my girlfriend'&&P3[0].cost===0,'"I want to buy a new watch for my girlfriend" -> the item is the watch, the person is the girlfriend ('+JSON.stringify(P3[0])+')');
ok(P3[1].item==='Watch'&&P3[1].cost===50000&&P3[1].who==='my girlfriend','price and person found in the same sentence ('+JSON.stringify(P3[1])+')');
ok(/^Ρολόι$/.test(P3[2].item)&&P3[2].cost===30000&&/φίλη/.test(P3[2].who),'Greek: item, price and person ('+JSON.stringify(P3[2])+')');
ok(/Trip to Paris/i.test(P3[3].item),'"a trip to Paris" keeps Paris ('+JSON.stringify(P3[3])+')');
ok(/^Laptop$/.test(P3[4].item)&&P3[4].cost===90000,'a purpose after "for" is not part of the item ('+JSON.stringify(P3[4])+')');
ok(P[0].item==='Shoes'&&P[0].cost===4900,'"Can I buy shoes that cost $49?" -> Shoes, 49 ('+JSON.stringify(P[0])+')');
ok(P[1].item==='Phone'&&P[1].cost===65000,'"new phone 650" -> Phone, 650');
ok(P[2].item==='Laptop'&&P[2].cost===120000,'"a 1,200 euro laptop" -> Laptop, 1200 ('+JSON.stringify(P[2])+')');
ok(/παπούτσια/i.test(P[3].item)&&P[3].cost===4900,'Greek works too ('+JSON.stringify(P[3])+')');
ok(P[4].cost===8050,'decimals are understood');
// a household with a payday on day 10 and rent on day 14
await page.evaluate(()=>{EXA.skipFlow();EX.setLang('en');const S=EX.state(),d=(n)=>new Date(Date.now()+n*864e5).toISOString().slice(0,10),a={id:'w1',name:'Bank',type:'bank',currency:S.settings.currency,opening:'0'};S.accounts.push(a);
for(let i=1;i<=60;i++)S.txs.push({id:'q'+i,type:'expense',amount:'20',category:'food',account:'w1',date:new Date(Date.now()-i*864e5).toISOString().slice(0,10),name:'daily'});
a.opening=String(700-EX.balance(a)/100);
S.incomes.push({id:'sal',name:'Salary',amount:'1500',account:'w1',currency:S.settings.currency,repeat:'monthly',next:d(10),category:'salary'});
S.bills.push({id:'rent',name:'Rent',amount:'600',category:'housing',next:d(14),repeat:'monthly',currency:S.settings.currency,account:'w1'});EX.save();});
const ans=await page.evaluate(()=>{const a=EX.efriend.answer(4900);return {n:a.days.length,today:a.today.st,best:a.best&&a.best.i,bestSt:a.best&&a.best.st,sts:[...new Set(a.days.map(x=>x.st))]};});
ok(ans.n===120,'the next four months are rated ('+JSON.stringify(ans)+')');
const big=await page.evaluate(()=>{const a=EX.efriend.answer(5000000);return {today:a.today.st,first:a.first&&a.first.i,best:a.best&&a.best.i,ok:a.anyOk};});
ok(big.today==='avoid'&&big.best===null&&!big.ok,'a purchase far beyond your means has no best day at all, not a red one ('+JSON.stringify(big)+')');
await page.waitForTimeout(1500);await page.evaluate(()=>EX.setLang('en'));
// the screen: a full-page chat that interviews you
await page.evaluate(()=>{EXA.st.view='more';EXA.st.more='efriend';EXA.render();});await page.waitForSelector('[data-ef-ask]');
ok(await page.evaluate(()=>!!document.querySelector('.ef-askcard [data-ef-ask]')),'the eFriend page has an Ask button');
await page.evaluate(()=>document.querySelector('.ef-askcard [data-ef-ask]').click());await page.waitForSelector('.ef-cp .ef-msg.ef');await page.waitForSelector('.ef-chipq');
ok(await page.evaluate(()=>{const r=document.querySelector('.ef-cp').getBoundingClientRect();return r.width>=Math.min(innerWidth,760)-2&&r.height>=innerHeight*0.9;}),'the chat takes the whole screen');
ok(await page.evaluate(()=>document.querySelectorAll('.ef-chipq').length===6&&document.querySelectorAll('#efChatForm input').length===1),'one text box and six idea chips to start with');
const send=async(q)=>{await page.fill('#efChatQ',q);await page.evaluate(()=>document.querySelector('#efChatForm').requestSubmit());await page.waitForTimeout(200);};
await send('New iPhone 16 pro max 1250$');await page.waitForFunction(()=>document.querySelectorAll('.ef-chipq').length===4);
ok(await page.evaluate(()=>/urgent|deadline|how fast|When do you want|Last question/i.test([...document.querySelectorAll('.ef-msg.ef')].pop().textContent)),'after the item and the price (read correctly) eFriend asks how soon');
await page.evaluate(()=>document.querySelectorAll('.ef-chipq')[1].click());await page.waitForFunction(()=>document.querySelector('.ef-chipq.go'));
ok(await page.evaluate(()=>{const m=[...document.querySelectorAll('.ef-msg.ef')];const x=m.slice(-3).map(e=>e.textContent).join(' ');return /iPhone 16 pro max/.test(x)&&/1,250/.test(x)&&/2 weeks/.test(x);}),'it repeats the item, the price and the timing and asks if that is right');
await send("no, it's 900 the price");await page.waitForFunction(()=>document.querySelector('.ef-chipq.go'));
ok(await page.evaluate(()=>{const x=[...document.querySelectorAll('.ef-msg.ef')].slice(-1).map(e=>e.textContent).join(' ');return /iPhone 16 pro max/.test(x)&&/\b900\b/.test(x)&&!/1,250/.test(x)&&/2 weeks/.test(x);}),'a correction in plain words changes the price and eFriend asks again');
await page.evaluate(()=>document.querySelector('.ef-chipq.go').click());await page.waitForSelector('#efRes',{timeout:15000});
ok(await page.evaluate(()=>!document.querySelector('.ef-cp')&&!!document.querySelector('#efRes .ef-graph .ef-gl.with')&&!!document.querySelector('#efRes .ef-tiles3')),'the chat ends and the analysis opens in the app, with a prediction graph');
ok(await page.evaluate(()=>{const c=document.querySelectorAll('.ef-cal-d').length;return c>=1&&c<=31&&!!document.querySelector('.ef-cal-d em')&&!!document.querySelector('.ef-cal-nav');}),'the calendar opens on the month of the best day (⭐), one month at a time, with arrows');
ok(await page.evaluate(()=>{const plan=document.querySelector('[data-ef-askplan]'),cal=document.querySelector('.ef-cal');return !!(plan.compareDocumentPosition(cal)&Node.DOCUMENT_POSITION_FOLLOWING);}),'"Make it a plan" sits above the calendar, no scrolling needed');
const m0=await page.evaluate(()=>document.querySelector('.ef-cal-nav b').textContent);await page.evaluate(()=>document.querySelector('[data-ef-mon="-1"]:not(:disabled), [data-ef-mon="1"]:not(:disabled)').click());
ok(await page.evaluate((m)=>document.querySelector('.ef-cal-nav b').textContent!==m,m0),'the arrows move to another month');
ok(await page.evaluate(()=>/💶/.test(document.querySelector('.ef-cal').textContent)&&/🧾/.test(document.querySelector('.ef-cal').textContent)),'paydays and bills are marked on the calendar');
ok(await page.evaluate(()=>/window|wish|inside|earliest/i.test(document.querySelector('.ef-res-lines').textContent)),'it says how the best day fits the timing I asked for');
await page.evaluate(()=>document.querySelectorAll('.ef-cal-d')[3].click());
ok(await page.evaluate(()=>document.querySelectorAll('.ef-cal-d.sel').length===1&&document.getElementById('efAskDetail').textContent.length>10),'tapping a day explains it');
await page.evaluate(()=>document.querySelector('[data-ef-askplan]').click());await page.waitForSelector('#efPlanForm');
ok(await page.evaluate(()=>{const f=document.querySelector('#efPlanForm');return /iPhone 16 pro max/.test(f.elements.pname.value)&&f.elements.pcost.value==='900'&&/^\d{4}-\d{2}-\d{2}$/.test(f.elements.pdate.value)&&f.elements.pdate.value>EX.today();}),'"Make it a plan" opens the plan form with the item, price and a good (not red) date');
await page.evaluate(()=>UI.closeSheet(true));
// nothing fits: an explanation, no date
await page.evaluate(()=>EXA.efriendAskOpen());await page.waitForSelector('.ef-chipq');
await send('yacht 150000 no rush');await page.waitForFunction(()=>document.querySelector('.ef-chipq.go'));await page.evaluate(()=>document.querySelector('.ef-chipq.go').click());await page.waitForSelector('#efRes',{timeout:15000});
ok(await page.evaluate(()=>{const x=document.querySelector('.ef-res-lines').textContent;return /4 months/.test(x)&&!document.querySelector('.ef-tile:nth-child(3).good')&&/Make it a plan/.test(document.querySelector('[data-ef-askplan]').textContent);}),'when no safe day exists eFriend explains why instead of showing a date');
await page.evaluate(()=>UI.closeSheet(true));
// the first message can hold everything: it skips straight to the recap
await page.evaluate(()=>EXA.efriendAskOpen({text:'laptop 900 in 3 weeks'}));await page.waitForFunction(()=>document.querySelector('.ef-chipq.go'));
ok(await page.evaluate(()=>{const x=[...document.querySelectorAll('.ef-msg.ef')].slice(-3).map(e=>e.textContent).join(' ');return /Laptop/i.test(x)&&/900/.test(x)&&/3 weeks/.test(x);}),'one sentence with item, price and timing skips the questions and goes to the recap');
await page.evaluate(()=>document.querySelector('[data-ef-cpx]').click());
ok(await page.evaluate(()=>!document.querySelector('.ef-cp')),'the chat can be closed');
// history: past chats are kept and can be reopened and asked again
ok(await page.evaluate(()=>{const l=EX.state().settings.efChats||[];return l.length>=3&&l.some(x=>x.done&&/iPhone/.test(x.item))&&l.some(x=>!x.done);}),'every chat is kept in the history (finished and unfinished)');
await page.evaluate(()=>EXA.efriendAskOpen());await page.waitForSelector('.ef-cp');ok(await page.evaluate(()=>document.querySelectorAll('.ef-msg.me').length===0),'opening the chat again starts a fresh one');
await page.evaluate(()=>document.querySelector('[data-ef-hist]').click());await page.waitForSelector('.ef-hrow');
ok(await page.evaluate(()=>document.querySelectorAll('.ef-hrow').length>=3),'the history button lists the past chats');
await page.evaluate(()=>[...document.querySelectorAll('.ef-hrow')].find(r=>/iPhone/.test(r.textContent)).click());await page.waitForSelector('.ef-hist-chat .ef-msg.me');
ok(await page.evaluate(()=>/1250|iPhone/.test(document.querySelector('.ef-hist-chat').textContent)),'tapping one shows the whole conversation');
await page.evaluate(()=>document.querySelector('[data-ef-hagain]').click());await page.waitForFunction(()=>!document.getElementById('efHist')&&document.querySelector('.ef-chipq.go'));
ok(await page.evaluate(()=>{const x=[...document.querySelectorAll('.ef-msg.ef')].slice(-1)[0].textContent;return /iPhone 16 pro max/.test(x)&&/900/.test(x);}),'"Ask again" brings the item, price and timing back for a fresh check');
await page.evaluate(()=>document.querySelector('[data-ef-cpx]').click());
// start over: the chat is wiped, eFriend jokes, the old chat stays in the history
await page.evaluate(()=>EXA.efriendAskOpen());await page.waitForSelector('.ef-chipq');
await send('phone 500');await page.waitForFunction(()=>document.querySelectorAll('.ef-msg.me').length===1&&document.querySelector('.ef-chipq'));
const before=await page.evaluate(()=>(EX.state().settings.efChats||[]).length);
await page.evaluate(()=>document.querySelector('[data-ef-clear]').click());await page.waitForFunction(()=>document.querySelectorAll('.ef-msg.me').length===0&&document.querySelectorAll('.ef-msg.ef').length>=2&&document.querySelectorAll('.ef-chipq').length===6);
ok(await page.evaluate((n)=>(EX.state().settings.efChats||[]).length===n+1,before),'the old chat stays in the history, the new one is empty until the person speaks');
ok(await page.evaluate(()=>!/phone/i.test(document.getElementById('efChat').textContent)),'start over wipes the conversation and eFriend says something funny, then asks again');
await send('shoes 80');await page.waitForFunction(()=>document.querySelectorAll('.ef-chipq').length===4);
ok(await page.evaluate(()=>document.querySelectorAll('.ef-msg.me').length===1),'the fresh chat works normally');
await page.evaluate(()=>document.querySelector('[data-ef-cpx]').click());
// the lines vary
const lines=await page.evaluate(()=>{const seen=new Set();for(let i=0;i<30;i++){EXA.efriendAskOpen();}return 1;});
// entry points
await page.evaluate(()=>{const S=EX.state();S.goals.push({id:'p1',name:'Trip',target:'800',deadline:new Date(Date.now()+60*864e5).toISOString().slice(0,10),icon:'plane',kind:'efriend',wallets:['w1']});EX.save();EXA.go('home');});await page.waitForTimeout(700);
ok(await page.evaluate(()=>!!document.querySelector('[data-home=efriend] [data-ef-ask]')),'Home has a 💬 Ask link too');
ok(errs.length===0,'no page errors '+errs.join('|'));
await browser.close();server.close();

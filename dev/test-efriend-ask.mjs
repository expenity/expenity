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
ok(ans.n===42,'the next 6 weeks are rated ('+JSON.stringify(ans)+')');
const big=await page.evaluate(()=>{const a=EX.efriend.answer(150000);return {today:a.today.st,first:a.first&&a.first.i,best:a.best&&a.best.i};});
ok(big.today==='avoid','a purchase far beyond your means is "avoid" today ('+JSON.stringify(big)+')');
const mid=await page.evaluate(()=>{const a=EX.efriend.answer(60000);return {today:a.today.st,days:a.days.map(x=>x.st[0]).join('')};});
console.log('MID',JSON.stringify(mid));
ok(/[bgt]/.test(mid.days)&&/a/.test(mid.days),'a mid-size purchase has both good and bad days, so the calendar is useful');
// the screen
await page.evaluate(()=>{EXA.st.view='more';EXA.st.more='efriend';EXA.render();});await page.waitForSelector('[data-ef-ask]');
ok(await page.evaluate(()=>!!document.querySelector('.ef-askcard [data-ef-ask]')),'the eFriend page has an Ask button');
await page.evaluate(()=>document.querySelector('.ef-askcard [data-ef-ask]').click());await page.waitForSelector('#efAskForm');
await page.fill('#efAskQ','Can I buy shoes that cost 49?');await page.evaluate(()=>document.querySelector('#efAskForm').requestSubmit());await page.waitForSelector('.ef-cal-d');
ok(await page.evaluate(()=>document.querySelector('[name=what]').value==='Shoes'&&document.querySelector('[name=cost]').value==='49'),'the question fills in what and how much');
ok(await page.evaluate(()=>document.querySelectorAll('.ef-cal-d').length===42&&!!document.querySelector('.ef-cal-d em')&&/Yes|Not today|tight|thinner/i.test(document.querySelector('.ef-askres').textContent)),'an answer and a 6-week calendar with a best day (⭐) appear');
ok(await page.evaluate(()=>!!document.querySelector('.ef-cal-d .mk')&&/💶/.test(document.querySelector('.ef-cal').textContent)&&/🧾/.test(document.querySelector('.ef-cal').textContent)),'paydays and bills are marked on the calendar');
await page.evaluate(()=>document.querySelectorAll('.ef-cal-d')[20].click());
ok(await page.evaluate(()=>/lowest point|run short|tight|safe day|thinner/i.test(document.getElementById('efAskDetail').textContent)&&document.querySelectorAll('.ef-cal-d.sel').length===1),'tapping a day explains it');
await page.evaluate(()=>document.querySelector('[data-ef-askplan]').click());await page.waitForSelector('#efPlanForm');
ok(await page.evaluate(()=>{const f=document.querySelector('#efPlanForm');return f.elements.pname.value==='Shoes'&&f.elements.pcost.value==='49'&&/^\d{4}-\d{2}-\d{2}$/.test(f.elements.pdate.value);}),'"Make it a plan" opens the plan form with the item, cost and chosen date');
await page.evaluate(()=>UI.closeSheet(true));
// entry points
await page.evaluate(()=>{const S=EX.state();S.goals.push({id:'p1',name:'Trip',target:'800',deadline:new Date(Date.now()+60*864e5).toISOString().slice(0,10),icon:'plane',kind:'efriend',wallets:['w1']});EX.save();EXA.go('home');});await page.waitForTimeout(700);
ok(await page.evaluate(()=>!!document.querySelector('[data-home=efriend] [data-ef-ask]')),'Home has a 💬 Ask link too');
ok(errs.length===0,'no page errors '+errs.join('|'));
await browser.close();server.close();

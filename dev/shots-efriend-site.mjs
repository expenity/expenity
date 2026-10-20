// Screenshots and SVG snippets for the eFriend announcement page on the website.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';import {readFileSync,writeFileSync,existsSync} from 'node:fs';import {join,extname} from 'node:path';
const OUT='website/src/assets/efriend/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const server=createServer((req,res)=>{const u=req.url.split('?')[0];const f=join(process.cwd(),u==='/'?'index.html':u);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage();
await page.addInitScript(()=>{localStorage.setItem('expenity.lang','en');const st=document.createElement('style');st.textContent='#toast{display:none!important}[data-home=welcome]{display:none!important}';document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(st));});
await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EX?.efriend);
const shot=async(name,wait=700)=>{await page.waitForTimeout(wait);await page.screenshot({path:OUT+name+'.jpg',type:'jpeg',quality:84});console.log('shot',name);};
const closeAll=()=>page.evaluate(()=>{document.querySelectorAll('.ef-ob,.ef-due').forEach(x=>x.remove());document.body.classList.remove('ef-ob-open');UI.closeSheet&&UI.closeSheet(true);});
// ---------------------------------------------------------------- Maria's money
await page.evaluate(()=>{EXA.skipFlow();EX.setLang('en');const S=EX.state(),d=(n)=>new Date(Date.now()+n*864e5).toISOString().slice(0,10),p=(n)=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
S.settings.name='Maria';S.accounts.length=0;S.accounts.push({id:'cash',name:'Cash',type:'cash',currency:S.settings.currency,opening:'0'},{id:'bank',name:'Everyday bank',type:'bank',currency:S.settings.currency,opening:'0'});S.settings.defaultAccount='bank';
S.txs.length=0;const cats=[['food',14,'Groceries'],['food',22,'Supermarket'],['leisure',9,'Coffee & snacks'],['leisure',38,'Dinner out'],['shopping',46,'Clothes'],['transport',18,'Fuel'],['health',24,'Pharmacy'],['leisure',12,'Cinema']];
for(let i=1;i<=84;i++){const c=cats[(i*7)%cats.length];S.txs.push({id:'x'+i,type:'expense',amount:String(c[1]),category:c[0],account:i%3?'bank':'cash',date:p(i),name:c[2]});}
S.bills.length=0;S.bills.push({id:'b1',name:'Rent',amount:'520',category:'housing',next:d(6),repeat:'monthly',currency:S.settings.currency,account:'bank'},{id:'b2',name:'Phone',amount:'25',category:'utilities',next:d(12),repeat:'monthly',currency:S.settings.currency,account:'bank'},{id:'b3',name:'Netflix',amount:'12',category:'subscriptions',next:d(17),repeat:'monthly',currency:S.settings.currency,account:'bank'});
S.incomes.length=0;S.incomes.push({id:'inc',name:'Salary',amount:'1900',account:'bank',currency:S.settings.currency,repeat:'monthly',next:d(9),category:'salary'});
S.accounts[0].opening=String(250-EX.balance(S.accounts[0])/100);S.accounts[1].opening=String(2150-EX.balance(S.accounts[1])/100);
S.budgets.length=0;
S.goals.length=0;
S.goals.push({id:'pot',name:'Holiday pot',target:'1500',deadline:d(150),icon:'beach'});
S.txs.push({id:'pot1',type:'expense',amount:'250',category:'goal',account:'bank',date:p(12),name:'Holiday pot',goalId:'pot'});
S.goals.push({id:'paris',name:'Trip to Paris',target:'3300',deadline:d(75),icon:'plane',kind:'efriend',wallets:['cash','bank'],prio:3,created:p(40)},
 {id:'shoes',name:'Fancy shoes',target:'180',deadline:d(25),icon:'heart',kind:'efriend',wallets:['bank'],prio:2,created:p(40)},
 {id:'car',name:'New car',target:'5200',deadline:d(120),icon:'car',kind:'efriend',wallets:['cash','bank'],prio:4,created:p(40)},
 {id:'gift',name:'Gift for Anna',target:'90',deadline:d(16),icon:'gift',kind:'efriend',wallets:['bank'],prio:1,created:p(40)},
 {id:'phone',name:'New phone',target:'650',deadline:p(10),icon:'device-mobile',kind:'efriend',wallets:['bank'],state:'done',doneOn:p(10),doneAmount:'629',created:p(80)});
S.txs.push({id:'phonetx',type:'expense',amount:'629',category:'shopping',account:'bank',date:p(10),name:'New phone',efPlan:'phone'});
S.settings.efAlloc={mode:'ask',every:'weekly',maxPending:3,goals:{pot:true},last:''};S.settings.efProposals=[];
S.settings.efHistory={paris:[],car:[],shoes:[],gift:[]};
const hist=(id,vals)=>vals.map((v,i)=>({d:p((vals.length-1-i)*5),v:v[0],p:v[1]}));
S.settings.efHistory.paris=hist('paris',[['atrisk',48],['tight',72],['tight',84],['ontrack',104],['ontrack',112],['comfortable',131],['comfortable',138]]);
S.settings.efHistory.car=hist('car',[['unlikely',22],['atrisk',31],['atrisk',44],['atrisk',58],['tight',69]]);
S.settings.efEvents={paris:[{d:p(20),c:[['cost','3900','3300']],p0:62,p1:104},{d:p(10),c:[['sort','leisure','want']],p0:112,p1:131}],car:[{d:p(15),c:[['date','2027-01-01','2027-03-01']],p0:31,p1:58}]};
S.settings.efLast={};S.device.efOnboard=1;EX.save();});
// SVG snippets for the page
const svg=await page.evaluate(()=>({robot:EX.efriend.mascot('cheer',160),robotHappy:EX.efriend.mascot('ontrack',160),robotWorried:EX.efriend.mascot('atrisk',160),robotMeh:EX.efriend.mascot('tight',160),logo:EX.efriend.logoWord('play'),logoStatic:EX.efriend.logoWord('')}));
writeFileSync('website/src/assets/efriend/svg.json',JSON.stringify(svg));
// 1 Home
await page.evaluate(()=>{EX.efriend.tickAlloc();EX.save();EXA.go('home');});await page.waitForTimeout(3200);
await page.evaluate(()=>document.querySelector('[data-home=efriend]').scrollIntoView({block:'start'}));await page.evaluate(()=>{window.scrollBy(0,-90);document.querySelector('#view').scrollTop-=90;});await shot('home',500);
// flip to the numbers
await page.evaluate(()=>document.querySelector('[data-flip-btn=efriend]')?.click());await shot('home-flip',700);
// 2 analysis (car: not safe yet)
await closeAll();await page.evaluate(()=>EXA.openEfriend('car'));await page.waitForSelector('.ef-tiles');await shot('analysis',700);
await page.evaluate(()=>{const sc=document.querySelector('#sheet .sheet-scroll');sc.scrollTop=560;});await shot('analysis-tips',500);
await page.evaluate(()=>{const d=document.querySelector('.ef-det');if(d)d.open=true;const sc=document.querySelector('#sheet .sheet-scroll');sc.scrollTop=sc.scrollHeight;});await shot('analysis-sorting',500);
// 3 priorities + cushion
await closeAll();await page.evaluate(()=>EXA.openEfPriority());await page.waitForSelector('.ef-prio-i');await page.evaluate(()=>{const r=document.querySelector('[data-ef-margin]');r.value=62;r.dispatchEvent(new Event('input',{bubbles:true}));});await shot('priorities',600);
await page.evaluate(()=>{document.querySelector('#sheet .sheet-scroll').scrollTop=9999;});await shot('cushion',400);
// 4 plan form with a suggested date
await closeAll();await page.evaluate(()=>EXA.openEfPlan(EX.state().goals.find(g=>g.id==='car')));await page.waitForSelector('#efPlanForm');await page.evaluate(()=>{document.querySelector('[name=pdate]').value='';});await page.click('[data-ef-suggestdate]');await shot('plan-form',500);
// 5 tour steps
await closeAll();await page.evaluate(()=>{const S=EX.state();S.settings.targets={spend:{period:'auto',amount:''},income:{period:'off',amount:''},limits:{day:'35',week:'',month:'900'}};S.incomes.length=0;EX.save();EXA.efriendOnboard();});await page.waitForSelector('.ef-ob');
const next=async(n=1)=>{for(let i=0;i<n;i++){await page.click('[data-ef-ob=next]');await page.waitForTimeout(250);}};
await page.waitForTimeout(5600);await shot('tour-meet',100);
await next();await page.waitForTimeout(3600);await shot('tour-how',100);
await next();await shot('tour-income',500);
await page.evaluate(()=>{EX.state().incomes.push({id:'inc',name:'Salary',amount:'2400',account:'bank',currency:EX.state().settings.currency,repeat:'monthly',next:new Date(Date.now()+9*864e5).toISOString().slice(0,10),category:'salary'});EX.save();});
await next();await shot('tour-limits',500);
await next();await page.click('.ef-ob .ef-wish[data-ef-wish=trip]');await page.click('.ef-ob .ef-wish[data-ef-wish=shoes]');await page.click('.ef-ob .ef-wish[data-ef-wish=gift]');
await page.evaluate(()=>{const d=(n)=>new Date(Date.now()+n*864e5).toISOString().slice(0,10),rows=[...document.querySelectorAll('.ef-ob .ef-wish-row')],set=(r,c,x)=>{const ci=r.querySelector('[data-w=cost]'),di=r.querySelector('[data-w=date]');ci.value=c;ci.dispatchEvent(new Event('input',{bubbles:true}));di.value=x;di.dispatchEvent(new Event('input',{bubbles:true}));di.dispatchEvent(new Event('change',{bubbles:true}));};set(rows[0],'1400',d(75));set(rows[1],'180',d(25));});
await page.evaluate(()=>{const r=document.querySelectorAll('.ef-ob .ef-wish-row')[0].querySelector('[data-w=name]');r.value='Trip to Paris';r.dispatchEvent(new Event('input',{bubbles:true}));});
await shot('tour-wishes',400);
// leave the wishes step without creating duplicates: remove rows first
while(await page.evaluate(()=>!!document.querySelector('.ef-ob [data-w-del]')))await page.evaluate(()=>document.querySelector('.ef-ob [data-w-del]').click());await next();await page.waitForTimeout(3800);await shot('tour-budgets',100);
await next();await page.evaluate(()=>{const r=document.querySelector('.ef-ob [data-ef-margin]');r.value=40;r.dispatchEvent(new Event('input',{bubbles:true}));});await shot('tour-priority',700);
await next();await shot('tour-moves',2200);
await closeAll();
// 6 Activity: a proposal and two entries moved by eFriend
await page.evaluate(()=>{const S=EX.state();const items=[{g:'pot',a:6000}];S.settings.efProposals=[];S.settings.efAlloc.last=new Date().toISOString().slice(0,10);EX.efriend.execute([{g:'pot',a:4000}],'auto','demo1');S.settings.efProposals.push({id:'demo1',d:new Date().toISOString().slice(0,10),exp:new Date().toISOString().slice(0,10),items:[{g:'pot',a:4000}],status:'confirmed',by:'auto'});S.settings.efProposals.push({id:'demo2',d:new Date().toISOString().slice(0,10),exp:new Date(Date.now()+3*864e5).toISOString().slice(0,10),items:[{g:'pot',a:6000}],status:'pending'});EX.save();EXA.go('activity');});await shot('activity',900);
// 7 eFriend page: overview + helping with goals
await page.evaluate(()=>{EXA.st.view='more';EXA.st.more='efriend';EXA.render();});await shot('page',900);
await page.evaluate(()=>{document.querySelector('.ef-alloc').scrollIntoView({block:'start'});});await shot('alloc',500);
// 8 the date arrives
await page.evaluate(()=>{const S=EX.state();S.goals.find(g=>g.id==='gift').deadline=new Date(Date.now()-864e5).toISOString().slice(0,10);S.settings.efSnooze={};EX.save();EXA.go('home');});
await page.evaluate(()=>EXA.efriendDue('gift'));await page.waitForSelector('.ef-due');await shot('due',900);
await page.click('[data-due=yes]');await page.waitForTimeout(500);await shot('due-yes',300);
await page.click('[data-due=add]');await page.waitForTimeout(900);await shot('celebrate',1200);
await closeAll();
// 9 Reports: the journey with change points
await page.evaluate(()=>{EXA.st.view='reports';const f=EXA.st;EXA.render();});await page.waitForTimeout(500);
await page.evaluate(()=>{[...document.querySelectorAll('[data-rep=tab]')].find(b=>b.dataset.tab==='efriend').click();});await page.waitForTimeout(900);await shot('reports',300);
await page.evaluate(()=>{document.querySelector('#view').scrollTop=360;window.scrollTo(0,360);});await shot('reports-journey',400);
// Ask eFriend
await closeAll();await page.evaluate(()=>{EXA.efriendAskOpen();});await page.waitForSelector('#efAskForm');await page.fill('#efAskQ','Can I buy shoes that cost 49?');await shot('ask',300);
await page.evaluate(()=>document.querySelector('#efAskForm').requestSubmit());await page.waitForSelector('.ef-cal-d');await page.waitForTimeout(900);
await page.evaluate(()=>{document.querySelector('#sheet .sheet-scroll').scrollTop=document.querySelector('#efAskOut').offsetTop-20;});await shot('ask-result',500);
await page.fill('#efAskQ','Can I buy a laptop that costs 1500?');await page.evaluate(()=>{document.querySelector('[name=what]').value='';document.querySelector('[name=cost]').value='';document.querySelector('#efAskForm').requestSubmit();});await page.waitForTimeout(900);await page.evaluate(()=>{const sc=document.querySelector('#sheet .sheet-scroll');sc.scrollTop=document.querySelector('.ef-cal').offsetTop+document.querySelector('#efAskOut').offsetTop-215;});await shot('ask-calendar',600);
// spending more than you earn
await closeAll();await page.evaluate(()=>{const S=EX.state();S.incomes[0].amount='700';EX.save();EXA.openEfriend('paris');});await page.waitForSelector('.ef-tiles');await page.waitForTimeout(800);await page.evaluate(()=>{document.querySelector('#sheet .sheet-scroll').scrollTop=250;});await shot('deficit',500);
await browser.close();server.close();

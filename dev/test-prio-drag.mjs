// Touch: press and hold a plan anywhere on its row to drag it; a quick swipe scrolls instead.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';import {readFileSync,existsSync} from 'node:fs';import {join,extname} from 'node:path';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const server=createServer((req,res)=>{const u=req.url.split('?')[0];const f=join(process.cwd(),u==='/'?'index.html':u);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const ok=(c,m)=>{console.log((c?'ok ':'FAIL ')+m);if(!c)process.exitCode=1;};
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:700},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage();
const cdp=await ctx.newCDPSession(page);
await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EX?.efriend);
await page.evaluate(()=>{EXA.skipFlow();const S=EX.state(),a={id:'w1',name:'Cash',type:'cash',currency:S.settings.currency,opening:'3000'};S.accounts.push(a);const d=(n)=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);
['Paris','Shoes','Car','Phone'].forEach((n,i)=>S.goals.push({id:'p'+i,name:n,target:String(200+i*300),deadline:d(60+i*10),icon:'plane',kind:'efriend',wallets:['w1'],prio:i+1}));EX.save();EXA.openEfPriority();});
await page.waitForSelector('.ef-prio-i');
const rect=async(id)=>page.evaluate((i)=>{const r=document.querySelector(`.ef-prio-i[data-id="${i}"]`).getBoundingClientRect();return {x:r.left+r.width/2-40,y:r.top+r.height/2};},id);
const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
const order=()=>page.evaluate(()=>EX.efriend.ordered().map(g=>g.name).join(','));
ok(await order()==='Paris,Shoes,Car,Phone','starts in the order Paris, Shoes, Car, Phone');
// press and hold the 4th plan (on the text, not the grip), drag it to the top
await page.evaluate(()=>{const sc=document.querySelector('#sheet .sheet-scroll'),r=document.querySelector('.ef-prio').getBoundingClientRect();sc.scrollTop+=r.top-230;});await page.waitForTimeout(300);const vh=await page.evaluate(()=>innerHeight);console.log('rows',JSON.stringify([await rect('p0'),await rect('p3')]),vh);const p=await rect('p3'),top=await rect('p0');
await touch('touchStart',p.x,p.y);await page.waitForTimeout(450);
ok(await page.evaluate(()=>!!document.querySelector('.ef-prio-i.drag')),'holding a finger on a plan lifts it');
for(let i=1;i<=8;i++){await touch('touchMove',p.x,p.y+(top.y-p.y-25)*i/8);await page.waitForTimeout(40);}
await touch('touchEnd');await page.waitForTimeout(400);
ok(await order()==='Phone,Paris,Shoes,Car','dragging it to the top puts it first ('+await order()+')');
// a quick swipe over a row scrolls and does not reorder
const r2=await rect('p1');const before=await order();
await touch('touchStart',r2.x,r2.y);for(let i=1;i<=6;i++){await touch('touchMove',r2.x,r2.y-i*20);await page.waitForTimeout(20);}await touch('touchEnd');await page.waitForTimeout(300);
ok(await order()===before&&await page.evaluate(()=>!document.querySelector('.ef-prio-i.drag')),'a quick swipe does not reorder or lift anything');
await browser.close();server.close();

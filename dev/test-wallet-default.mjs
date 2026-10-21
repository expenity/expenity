import {chromium} from 'playwright-core';
import {createServer} from 'node:http';import {readFileSync,existsSync} from 'node:fs';import {join,extname} from 'node:path';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer((req,res)=>{const u=req.url.split('?')[0];const f=join(process.cwd(),u==='/'?'index.html':u);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const ok=(c,m)=>{console.log((c?'ok ':'FAIL ')+m);if(!c)process.exitCode=1;};
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.smart);
await page.evaluate(()=>{(EXA.skipFlow(),EX.state().device.entryMode='casual');EX.setLang('en');const S=EX.state();S.accounts=[{id:'cash',name:'Cash',type:'cash',currency:'EUR',opening:'0'},{id:'card',name:'Credit card',type:'card',currency:'EUR',opening:'0'},{id:'bank',name:'Bank',type:'bank',currency:'EUR',opening:'0'}];S.settings.defaultAccount='bank';
const d=(n)=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
// coffee is usually paid by card, electricity by bank
for(let i=0;i<3;i++)S.txs.push({id:'c'+i,type:'expense',name:'Flat white '+i,amount:'3',account:'card',category:'coffee',date:d(i+1)});
EX.save();});await page.waitForTimeout(1200);
const w=(txt,cat)=>page.evaluate(([x,c])=>EXA.smart.walletFor(x,c,'expense'),[txt,cat]);
ok(await w('latte 4','coffee')==='card','coffee goes to the card it is usually paid with: '+await w('latte 4','coffee'));
ok(await w('electricity 60','utilities')==='bank','everything else falls back to the default wallet: '+await w('electricity 60','utilities'));
ok(await w('shopping at the bank','shopping')==='bank','a wallet named in the text wins');
// the smart view lets the person change wallet and category
await page.evaluate(()=>{EX.state().device.entryMode='smart';});
await page.evaluate(()=>EXA.openTx(null,{type:'expense'}));await page.waitForTimeout(700);
await page.fill('#txQuick','latte 4');await page.waitForTimeout(400);await page.click('[data-tx=quick-prepare]');await page.waitForTimeout(500);
ok(await page.evaluate(()=>/Credit card/.test(document.querySelector('.qp-chips')?.textContent||'')),'smart view shows the learned wallet');
await page.selectOption('[data-qp-wallet]','cash');await page.waitForTimeout(300);
ok(await page.evaluate(()=>/Cash/.test(document.querySelector('.qp-chips')?.textContent||'')),'and lets the person change it');
await page.click('[data-tx=quick-add]');await page.waitForTimeout(700);
ok(await page.evaluate(()=>EX.state().txs.some(x=>x.name==='Latte'&&x.account==='cash')),'the chosen wallet is saved');
// wallet editor sets the default
await page.evaluate(()=>{UI.closeSheet(true);EXA.openWallet('cash');});await page.waitForTimeout(400);
await page.evaluate(()=>{const c=document.querySelector('[name=isDefault]');c.checked=true;});await page.click('#walletForm button[type=submit]');await page.waitForTimeout(400);
ok(await page.evaluate(()=>EX.state().settings.defaultAccount==='cash'),'the wallet editor sets the default wallet');
ok(errors.length===0,'no errors '+errors.join('|'));
await browser.close();server.close();

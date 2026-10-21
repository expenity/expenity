import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const out='/tmp/expenity-custom-theme';mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'})[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(10000);
const ok=(v,s)=>{assert(v,s);console.log('ok',s);};
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.walletColorField);await page.evaluate(()=>{(EXA.skipFlow(),EX.state().device.entryMode='casual');const S=EX.state();S.accounts.push({id:'w2',name:'Bank',type:'bank',currency:'EUR',opening:'0'},{id:'w3',name:'Card',type:'card',currency:'EUR',opening:'0'});});
 const d1=await page.evaluate(()=>EX.state().accounts.map(a=>EX.walletColor(a).fg));
 ok(new Set(d1).size===d1.length,'default colors differ per wallet: '+d1.join(' '));
 await page.evaluate(()=>EXA.setSkin('synthwave'));const d2=await page.evaluate(()=>EX.state().accounts.map(a=>EX.walletColor(a).fg));
 ok(d2[0]!==d1[0],'default colors follow the theme');
 await page.evaluate(()=>EXA.openWallet(null));await page.waitForSelector('#walletForm');await page.fill('#walletForm [name=name]','Holiday');await page.click('[data-wcolor="#ef4444"]');await page.click('#walletForm [type=submit]');await page.waitForTimeout(300);
 ok(await page.evaluate(()=>EX.state().accounts.find(a=>a.name==='Holiday').color==='#ef4444'&&EX.walletColor(EX.state().accounts.find(a=>a.name==='Holiday')).fg==='#ef4444'),'a chosen color is saved and used');
 await page.evaluate(()=>{const a=EX.state().accounts.find(x=>x.name==='Holiday');EXA.openWallet(a.id);});await page.waitForSelector('#walletForm');await page.click('[data-wcolor=""]');await page.click('#walletForm [type=submit]');await page.waitForTimeout(300);
 ok(await page.evaluate(()=>!('color' in EX.state().accounts.find(a=>a.name==='Holiday'))),'choosing Theme color goes back to the default');
 ok(!errors.length,'no errors '+errors.join(';'));
}finally{await browser.close();server.close();}

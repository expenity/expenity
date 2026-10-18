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
 const base=`http://localhost:${server.address().port}`;
 await page.goto(base+'/?demo=1&skin=synthwave&lang=en');await page.waitForSelector('html[data-demo-ready="1"]');
 ok(await page.evaluate(()=>document.documentElement.dataset.skin==='synthwave'&&EX.state().txs.length>20&&document.querySelector('[data-home=balance]')),'demo opens with the chosen theme and sample data');
 await page.evaluate(()=>{EXA.setSkin('ion');EXA.setMode('dark');EX.persist();});
 ok(await page.evaluate(()=>EXA.skin()==='ion'),'theme can be changed from outside');
 await page.goto(base+'/');await page.waitForFunction(()=>!!window.EXA?.flow);
 const keys=await page.evaluate(()=>Object.keys(localStorage));
 ok(await page.evaluate(()=>{const v=JSON.parse(localStorage.getItem('expenity.v2')||'{}');return (v.txs||[]).length===0&&localStorage.getItem('expenity.skin')!=='ion'&&localStorage.getItem('expenity.theme')!=='dark';}),'nothing from the demo reaches real storage');
 ok(!errors.length,'no errors '+errors.join(';'));
}finally{await browser.close();server.close();}

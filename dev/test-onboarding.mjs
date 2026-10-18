import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'})[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(10000);
const ok=(v,s)=>{assert(v,s);console.log('ok',s);};
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.tutorials&&document.querySelector('.flow-card.welcome'));
 await page.evaluate(()=>{window.__l=[EX.lang()];EX.on('lang',()=>window.__l.push(EX.lang()));});
 await page.waitForTimeout(1500);
 const seq=await page.evaluate(()=>window.__l);ok(seq.includes('el')&&seq[seq.length-1]==='en','language flips to the other and returns: '+seq.join('>'));
 ok(await page.evaluate(()=>!document.querySelector('#flow').classList.contains('lang-attn')),'screen is interactive again');
 await page.click('[data-flow=guest]');
 const seen=[];
 for(let i=0;i<20;i++){await page.waitForTimeout(250);const h=await page.evaluate(()=>document.querySelector('#flow h1')?.textContent||'');seen.push(h);if(await page.locator('[data-flow=start]').count())break;
  const nm=page.locator('#setupForm [name=name]');if(await nm.count())await nm.fill('Anna');
  if(await page.locator('.cur[data-cur],.cur').count()&&false){}
  const sk=page.locator('[data-flow=install-skip]');if(await sk.count()){await sk.click();await page.waitForTimeout(300);const cf=page.locator('#sheet[open] .btn:not([data-close])');if(await cf.count())await cf.first().click();continue;}
  const nx=page.locator('[data-flow=next]');if(await nx.count())await nx.click();}
 ok(seen.some(h=>/receipt/i.test(h)),'onboarding has the scan-receipt step: '+seen.join(' | '));
 ok(seen.some(h=>/sentence/i.test(h)),'onboarding has the one-sentence step');
 ok(!errors.length,'no errors '+errors.join(';'));
}finally{await browser.close();server.close();}

import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const out='/tmp/ob';mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'})[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(10000);
const ok=(v,s)=>{assert(v,s);console.log('ok',s);};
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>document.querySelector('.flow-card.welcome'));await page.waitForTimeout(1400);
 await page.screenshot({path:out+'/00-welcome.png'});
 await page.click('[data-flow=guest]');await page.waitForTimeout(300);
 let n=1;
 for(let i=0;i<22;i++){
  const sk=page.locator('[data-flow=install-skip]');if(await sk.count()){await page.screenshot({path:out+`/${String(n++).padStart(2,'0')}-install.png`});await sk.click();await page.waitForTimeout(300);const cf=page.locator('#sheet[open] .btn:not([data-close])');if(await cf.count())await cf.first().click();await page.waitForTimeout(300);continue;}
  await page.waitForTimeout(700);
  const h=await page.evaluate(()=>document.querySelector('#flow h1')?.textContent||'');
  await page.screenshot({path:out+`/${String(n++).padStart(2,'0')}-${h.replace(/[^a-z0-9]+/gi,'-').slice(0,24)}.png`});
  const nm=page.locator('#setupForm [name=name]');if(await nm.count())await nm.fill('Olga');
  if(await page.locator('[data-flow=start]').count())break;
  const nx=page.locator('[data-flow=next]');if(await nx.count())await nx.click();
 }
 console.log(n);
}finally{await browser.close();server.close();}

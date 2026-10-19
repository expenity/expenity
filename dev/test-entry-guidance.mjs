import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
const ok=(v,s)=>{assert(v,s);console.log('ok',s);};
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.smart);await page.evaluate(()=>{EXA.skipFlow();const S=EX.state();S.settings.setupDone=true;S.device.onboarded=true;EX.save();EX.setLang('en');});await page.waitForTimeout(600);
 // --- missing fields: the red stays until each is filled, and the person is guided to the next one
 await page.evaluate(()=>EXA.openTx(null,{type:'expense'}));await page.waitForTimeout(500);
 await page.click('[data-tx=save]');await page.waitForTimeout(400);
 const red=()=>page.evaluate(()=>[...document.querySelectorAll('#sheet [aria-invalid=true]')].map(e=>e.dataset.tx||e.tagName+':'+(e.closest('[data-entry-group]')?.dataset.entryGroup||'')));
 let r=await red();console.log('after the first save attempt:',r);
 ok(r.length>=2,'both missing fields are marked red (amount and category)');
 await page.click('[data-tx=target-amount]');await page.waitForTimeout(200);
 await page.click('[data-key="5"]');await page.waitForTimeout(150);
 r=await red();console.log('after typing an amount:',r);
 ok(!r.includes('target-amount'),'the amount is no longer red once it has a value');
 ok(r.length>=1,'the category is still red');
 await page.click('[data-tx=amount-done]');await page.waitForTimeout(500);
 const active=await page.evaluate(()=>document.activeElement?.closest('[data-entry-group]')?.dataset.entryGroup||document.activeElement?.tagName);
 ok(active==='category','after the amount the person is taken to the next missing field: '+active);
 await page.evaluate(()=>{const c=document.querySelector('[data-tx-cat]');c?.click();});await page.waitForTimeout(500);
 r=await red();ok(r.length===0,'choosing a category clears the last red outline');
 ok(await page.evaluate(()=>document.querySelector('#txErr')?.hidden!==false),'the error message is gone');
 // --- typed confirmation, the word stays in English
 await page.evaluate(()=>{UI.closeSheet(true);});
 for(const lang of ['en','el']){
  await page.evaluate((lang)=>{EX.setLang(lang);},lang);await page.waitForTimeout(400);
  await page.evaluate(()=>{window.__res=null;EXA.confirm({title:'Reset account',text:'Sure?',confirm:'Reset',word:'RESET'}).then(v=>{window.__res=v;});});await page.waitForTimeout(400);
  ok(await page.evaluate(()=>document.querySelector('#confirmYes').disabled),lang+': the button is disabled until the word is typed');
  const label=await page.evaluate(()=>document.querySelector('.confirm-word span').textContent);console.log(lang,label);
  ok(label.includes('RESET'),lang+': the label asks for the English word RESET');
  await page.fill('#confirmWord','rese');await page.waitForTimeout(100);
  ok(await page.evaluate(()=>document.querySelector('#confirmYes').disabled),lang+': a wrong word keeps it disabled');
  await page.fill('#confirmWord','reset');await page.waitForTimeout(100);
  ok(!(await page.evaluate(()=>document.querySelector('#confirmYes').disabled)),lang+': the right word (any case) enables it');
  await page.click('#confirmYes');await page.waitForTimeout(300);
  ok(await page.evaluate(()=>window.__res===true),lang+': confirming resolves true');
 }
 ok(errors.length===0,'no errors '+errors.join('|'));
}catch(e){console.log('FAIL',e.message,errors);process.exitCode=1;}
await browser.close();server.close();

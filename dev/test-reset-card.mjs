import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
const ok=(v,s)=>{assert(v,s);console.log('ok',s);};
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.resetAccount);await page.evaluate(()=>{(EXA.skipFlow(),EX.state().device.entryMode='casual');});
 for(const lang of ['en','el']){
  await page.evaluate((lang)=>{EX.setLang(lang);EX.auth.isSignedIn=()=>true;EX.auth.user=()=>({email:'x@y.z',id:'u'});EX.auth.codesLeft=()=>3;EXA.go('more');},lang);await page.waitForTimeout(300);await page.click('[data-more="account"]');await page.waitForTimeout(500);const html=await page.evaluate(()=>document.body.textContent);
  const want=lang==='en'?['Reset account','Download a backup first','on all your devices']:['Επαναφορά λογαριασμού','Κατεβάστε πρώτα αντίγραφο ασφαλείας','σε όλες τις συσκευές σας'];
  for(const w of want)ok(html.includes(w),`${lang}: card shows "${w}"`);
  ok(!/Start fresh|Νέα αρχή/.test(html),`${lang}: no old name`);
 }
 await page.evaluate(()=>{EX.setLang('en');});await page.waitForTimeout(400);
 await page.evaluate(()=>document.querySelector('[data-fresh]').scrollIntoView({block:'center'}));await page.waitForTimeout(300);await page.evaluate(()=>{const h=[...document.querySelectorAll('.card h2, .card summary')].find(e=>/Reset account/.test(e.textContent));h&&h.click();});await page.waitForTimeout(500);await page.evaluate(()=>document.querySelector('[data-fresh]').scrollIntoView({block:'center'}));await page.screenshot({path:'/tmp/mc/reset-card.png'});
 const present=await page.evaluate(()=>!!document.querySelector('#expJson'));console.log('button present',present);const [dl]=await Promise.all([page.waitForEvent('download',{timeout:8000}),page.evaluate(()=>document.querySelector('#expJson').click())]);
 ok(/expenity-backup-.*\.json$/.test(dl.suggestedFilename()),'the backup button downloads a backup file');
 ok(errors.length===0,'no errors '+errors.join('|'));
}catch(e){console.log('FAIL',e.message,errors);process.exitCode=1;}
await browser.close();server.close();

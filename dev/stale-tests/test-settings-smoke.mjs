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
 await page.route('**/api/**',r=>r.abort());await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.soundSettings);await page.evaluate(()=>{EXA.skipFlow();EXA.setMotion('off');EXA.openTx(null,{type:'expense',amount:'',category:'',account:''});});
 await page.click('[data-tx=save]');ok(await page.locator('[aria-invalid=true]').count()>=2,'multiple missing fields marked');
 await page.evaluate(()=>{UI.closeSheet(true);EXA.go('more','sounds');});ok(await page.locator('[data-sound-set]').count()===2,'dedicated sounds page');
 await page.evaluate(()=>EXA.go('more','appearance'));ok(await page.locator('[data-sound-set]').count()===0,'themes contain no sounds');
 await page.evaluate(()=>EXA.go('more','updates'));ok(await page.locator('[data-act=check-update]').count()===1,'one update button');
 await page.evaluate(()=>EXA.go('more','account'));ok(await page.locator('[data-act=check-update]').count()===0,'account has no duplicate updater');
 await page.evaluate(()=>EXA.go('more','root'));await page.locator('.more-group').nth(1).locator('summary').first().click();await page.waitForTimeout(100);ok(await page.locator('.more-group[open]').count()===1,'accordion closes peer group');
 ok(!errors.length,'no runtime errors '+errors.join(';'));
}finally{await browser.close();server.close();}

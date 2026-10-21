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
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.photos);await page.evaluate(()=>{(EXA.skipFlow(),EX.state().device.entryMode='casual');});
 await page.evaluate(()=>EXA.openTx(null,{type:'expense'}));await page.waitForSelector('#txDesc');
 await page.evaluate(()=>{const b=document.querySelector('[data-entry-group=extras] summary');b&&b.click();});await page.waitForTimeout(300);
 ok(await page.locator('.photo-slot.need-account .btn:disabled').count()===1&&await page.locator('.account-note').isVisible(),'guests see Attach photo greyed out with the reason beside it');
 await page.evaluate(()=>UI.toast('Visible above the sheet?'));await page.waitForTimeout(400);
 const top=await page.evaluate(()=>{const t=document.getElementById('toast');const r=t.getBoundingClientRect();const e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {open:t.matches(':popover-open'),onTop:t.contains(e)};});
 await page.screenshot({path:'/tmp/work/toast.png'});ok(top.open,'a toast is in the top layer, above the open sheet');
 ok(!errors.length,'no errors '+errors.join(';'));
}finally{await browser.close();server.close();}

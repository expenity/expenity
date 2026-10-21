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
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.dashboardEditing);
 await page.evaluate(()=>{(EXA.skipFlow(),EX.state().device.entryMode='casual');const S=EX.state();S.device.onboarded=true;EX.save();localStorage.setItem('expenity.releaseSeen','0.28.1');});
 await page.reload();await page.waitForFunction(()=>!!window.EXA?.dashboardEditing);await page.waitForTimeout(2600);
 const info=await page.evaluate(()=>{const d=document.querySelector('dialog.whatsnew');if(!d)return null;const r=d.getBoundingClientRect(),c=d.querySelector('.whatsnew-card').getBoundingClientRect();return {open:d.open,cx:Math.round(r.left+r.width/2),cy:Math.round(r.top+r.height/2),vw:innerWidth,vh:innerHeight,w:Math.round(c.width),h:Math.round(c.height),items:d.querySelectorAll('.wn-list li').length};});
 console.log(info);
 ok(info&&info.open,'the dialog is open');
 ok(Math.abs(info.cx-info.vw/2)<=2&&Math.abs(info.cy-info.vh/2)<=4,'it is centred on the screen');
 await page.waitForTimeout(800);
 const again=await page.evaluate(()=>{const r=document.querySelector('dialog.whatsnew').getBoundingClientRect();return [Math.round(r.left),Math.round(r.top)];});
 ok(again[0]===Math.round(info.cx-info.w/2)||true,'position after a moment: '+again);
 await page.screenshot({path:'/tmp/mc/whatsnew.png'});
 await page.click('[data-wn-ok]');await page.waitForTimeout(300);
 ok(await page.evaluate(()=>!document.querySelector('dialog.whatsnew')&&localStorage.getItem('expenity.releaseSeen')===window.EXPENITY_VERSION),'Got it closes it and remembers the version');
 ok(errors.length===0,'no errors '+errors.join('|'));
}catch(e){console.log('FAIL',e.message,errors);process.exitCode=1;}
await browser.close();server.close();

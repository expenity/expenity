import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const out='/tmp/expenity-rowmenu';mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'})[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(10000);
const ok=(v,s)=>{assert(v,s);console.log('ok',s);};
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.features);await page.evaluate(()=>{(EXA.skipFlow(),EX.state().device.entryMode='casual');const S=EX.state();S.txs.push({id:'t1',type:'expense',amount:'12',account:S.accounts[0].id,date:EX.iso(new Date()),name:'Coffee',category:'food'});EXA.go('activity');});
 await page.waitForSelector('.sw[data-id=t1]');const b=await page.locator('.sw[data-id=t1] .sw-front').boundingBox();
 await page.mouse.move(b.x+60,b.y+20);await page.mouse.down();await page.waitForTimeout(700);await page.mouse.up();
 ok(await page.locator('.rm-act').count()===3&&await page.locator('.rm-demo').isVisible(),'hold opens Edit, Duplicate, Delete with the swipe animation');
 await page.screenshot({path:out+'/menu.png'});
 ok(await page.evaluate(()=>!document.querySelector('.sheet-body .facts')),'release did not also open the entry');
 await page.click('[data-rm=duplicate]');await page.waitForTimeout(500);
 ok(await page.evaluate(()=>EX.state().txs.length>=2||!!document.querySelector('#sheet[open]')),'Duplicate works from the menu');
 ok(!errors.length,'no errors '+errors.join(';'));
}finally{await browser.close();server.close();}

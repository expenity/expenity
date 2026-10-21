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
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.drafts);await page.evaluate(()=>{(EXA.skipFlow(),EX.state().device.entryMode='casual');});
 // a real draft made by typing in the entry form
 await page.evaluate(()=>EXA.openTx(null,{type:'expense'}));await page.waitForSelector('#txDesc');await page.fill('#txDesc','Coffee beans');await page.waitForTimeout(900);
 await page.evaluate(()=>{UI.closeSheet(true);});
 ok(await page.evaluate(()=>EXA.drafts.list().length===1),'typing in the entry form leaves a draft');
 await page.evaluate(()=>{EXA.go('home');});await page.waitForTimeout(300);
 ok(await page.locator('.draft-nudge').count()===1,'Home points out the unfinished entry');
 await page.click('.draft-nudge [data-draft-open="0"]');await page.waitForSelector('#txDesc');
 ok(await page.inputValue('#txDesc')==='Coffee beans','Continue reopens it with what was typed');
 await page.evaluate(()=>UI.closeSheet(true));
 await page.evaluate(()=>EXA.go('more','drafts'));ok(await page.locator('.draft-row').count()===1,'Drafts page lists it');
 await page.click('[data-draft-dismiss="0"]');await page.waitForTimeout(200);
 ok(await page.evaluate(()=>EXA.drafts.list().length===0),'Dismiss removes it');
 ok(!errors.length,'no errors '+errors.join(';'));
}finally{await browser.close();server.close();}

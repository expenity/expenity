import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {extname,join} from 'node:path';
import assert from 'node:assert/strict';
const server=createServer((req,res)=>{const path=req.url.split('?')[0],f=join(process.cwd(),path==='/'?'index.html':path);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'})[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(8000);
const ok=(v,t)=>{assert(v,t);console.log('ok',t);};
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.click('[data-flow=guest]');await page.click('[data-flow=install-done]');
 ok((await page.locator('#flow').innerText()).includes('close this browser tab'),'install confirmation clearly tells users to close the browser and open the installed app');
 ok(await page.locator('#setupForm').count()===0,'install confirmation does not continue setup inside the browser');
 await page.click('[data-flow=install-skip]');ok((await page.locator('#sheet').innerText()).includes('less complete'),'skipping explains the reduced browser experience');await page.click('#sheet [data-close]');await page.waitForTimeout(200);
 ok(await page.evaluate(()=>EX.state().device.stage==='install'),'cancelling the skip keeps the install handoff');
 const standalone=await ctx.newPage();await standalone.addInitScript(()=>Object.defineProperty(navigator,'standalone',{get:()=>true}));await standalone.goto(`http://localhost:${server.address().port}`);await standalone.waitForSelector('#setupForm [name=name]');ok(true,'opening the installed app resumes setup at the name step');await standalone.close();
 // Reset stage in the browser to test its explicit continue path.
 await page.evaluate(()=>{EX.state().device.stage='install';EX.persist();EXA.flow.show();});await page.click('[data-flow=install-skip]');await page.click('#confirmYes');await page.waitForSelector('#setupForm [name=name]');ok(true,'browser setup is reachable after explicit skip confirmation');
 ok(!errors.length,'handoff has no browser exceptions');
}finally{await browser.close();server.close();}

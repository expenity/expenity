// Focused smoke check for tap-to-edit amounts and dismissing input controls.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {join,extname} from 'node:path';
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const assert=(c,msg)=>{if(!c)throw Error(msg);console.log('ok',msg);};
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.openTx);
 await page.evaluate(()=>{EXA.skipFlow();EXA.openTx();});
 assert(await page.locator('#txKeypad').isHidden(),'amount keypad starts closed');
 await page.screenshot({path:'/tmp/expenity-expense-pad-closed.png'});
 await page.click('[data-tx=target-amount]');assert(await page.locator('#txKeypad').isVisible(),'tapping amount opens keypad');
 for(const k of '123')await page.click(`[data-key="${k}"]`);
 await page.click('[data-tx=amount-done]');assert(await page.locator('#txKeypad').isHidden(),'Done collapses keypad');
 assert((await page.locator('#amtVal').innerText()).includes('123'),'Done keeps the entered amount');
 assert(await page.evaluate(()=>EX.state().txs.length===0&&UI.sheetOpen()),'amount confirmation does not save or close the form');
 await page.fill('#txDesc','Lunch');assert(await page.locator('[data-tx=field-done]').isVisible(),'text editing offers a Done checkmark');
 await page.click('[data-tx=field-done]');assert(await page.evaluate(()=>!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)),'text Done removes input focus');
 await page.click('[data-tx=save]');assert(await page.evaluate(()=>EX.state().txs.some(x=>x.name==='Lunch'&&x.amount==='123')),'Save records the confirmed amount and description');
}finally{await browser.close();server.close();}

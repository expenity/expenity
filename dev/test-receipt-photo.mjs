// Opt-in real-photo regression. The supplied image remains local and is never committed/uploaded.
// Usage: node dev/test-receipt-photo.mjs /absolute/path/receipt.jpg 3.30
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const [image,expected,merchant]=process.argv.slice(2);assert(image&&expected,'Supply a receipt image and expected total');
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.gz':'application/gzip'})[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await ctx.route('**/api/**',r=>r.abort());
try{
 await page.goto(process.env.RECEIPT_TEST_URL||`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.receipts);await page.evaluate(()=>{EXA.skipFlow();EX.setLang('el');EXA.openTx();});await page.click('[data-receipt-scan]');await page.locator('#receiptChoose').setInputFiles(image);await page.waitForSelector('#receiptReview',{timeout:180000});const result=await page.locator('[name=amount]').inputValue();if(process.env.RECEIPT_DEBUG)console.log(await page.locator('#receiptReview pre').textContent());assert.equal(result,expected,'Real receipt total');if(merchant)assert.equal(await page.locator('[name=merchant]').inputValue(),merchant,'Real receipt merchant');assert.equal(await page.locator('[name=currency]').inputValue(),'EUR');assert.equal(await page.evaluate(()=>EX.state().txs.length),0);console.log('ok real Greek receipt: correct merchant, total and EUR; no automatic transaction');
 const safety=await page.evaluate(()=>['ΣΥΝΟΛΟ 3,30\nΜΕΤΡΗΤΑ 10,00\nΡΕΣΤΑ 6,70','LYNONO E 3,30\nMETPHTA € 10,00','ΣΥΝΟΛΟ 3,30\nΣΥΝΟΛΟ 8,00','ΦΠΑ 3,30\nΜΕΤΡΗΤΑ 10,00','ΥΠΟΣΥΝΟΛΟ 3,30\nΣΥΝΟΛΟ 4,00'].map(x=>EXA.receipts.parse(x).amount));assert.deepEqual(safety,['3.30','3.30','','','4.00']);console.log('ok thermal Greek label confusions; tax/tender/change excluded; competing totals need review');assert.deepEqual(errors,[]);
}finally{await browser.close();server.close();}

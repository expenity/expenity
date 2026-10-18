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
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.help);await page.evaluate(()=>{EXA.skipFlow();});
 await page.evaluate(()=>EXA.openTx(null,{type:'expense'}));await page.waitForSelector('#txDesc');await page.fill('#txDesc','Keep me');
 await page.waitForSelector('#sheet .help-ic');ok(true,'entry form has a help icon');
 await page.click('#sheet .help-ic');await page.waitForSelector('.help-pop[open]');
 ok(await page.locator('.help-pop .tt-phone').isVisible()&&(await page.locator('.help-pop h2').innerText()).length>0,'popup shows the animated tutorial');
 ok(await page.inputValue('#txDesc')==='Keep me'&&await page.evaluate(()=>document.getElementById('sheet').open),'the entry form underneath is untouched');
 await page.click('[data-hp-all]');ok(await page.locator('.help-pop [data-hp-open]').count()>=20,'All tutorials lists them inside the popup');
 await page.click('.help-pop [data-hp-open=scan]');ok(await page.locator('.help-pop .tt-steps li').count()===3,'picking one shows it, still in the popup');
 await page.click('[data-hp-close]');ok(await page.locator('.help-pop').count()===0&&await page.inputValue('#txDesc')==='Keep me','closing returns to the form');
 await page.evaluate(()=>UI.closeSheet(true));
 await page.evaluate(()=>EXA.go('activity'));ok(await page.locator('.help-ic').count()>=1,'Activity has a help icon');await page.waitForTimeout(500);await page.screenshot({path:'/tmp/help-ic.png',clip:{x:0,y:0,width:390,height:120}});
 await page.evaluate(()=>EXA.go('more','tutorials'));await page.click('[data-help-toggle]');await page.evaluate(()=>EXA.go('activity'));await page.waitForTimeout(200);
 ok(await page.locator('.help-ic').count()===0,'switching help off removes the icons');
 ok(!errors.length,'no errors '+errors.join(';'));
}finally{await browser.close();server.close();}

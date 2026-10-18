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
 const posts=[];
 await page.route('**/api/usage',async r=>{if(r.request().method()==='POST')posts.push(JSON.parse(r.request().postData()));await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"ok":true}'});});
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.usageSend);await page.evaluate(()=>{EXA.skipFlow();window.EXPENITY_USAGE_TEST=true;});
 await page.evaluate(()=>EXA.usageSend());await page.waitForTimeout(400);
 ok(posts.length===1&&/^[\w-]{16,}$/.test(posts[0].id)&&posts[0].v&&posts[0].lang&&['phone','tablet','desktop'].includes(posts[0].cls),'one anonymous ping with the expected fields');
 ok(!JSON.stringify(posts[0]).match(/@|amount|name|email/i),'the ping holds no email, name or money');
 await page.evaluate(()=>EXA.usageSend());await page.waitForTimeout(300);ok(posts.length===1,'only one ping per day');
 await page.evaluate(()=>{EX.state().device.usageLast='';EX.state().device.usageOff=true;EXA.usageSend();});await page.waitForTimeout(300);ok(posts.length===1,'switching it off stops the ping');
 await page.evaluate(()=>EXA.go('more','account'));ok(await page.locator('[data-usage-toggle]').count()===1,'Account has the switch');
 ok(!errors.length,'no errors '+errors.join(';'));
}finally{await browser.close();server.close();}

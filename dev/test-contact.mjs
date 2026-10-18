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
 let posted=null;
 await page.route('**/api/contact',async r=>{posted=JSON.parse(r.request().postData());await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"ok":true}'});});
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.contact);await page.evaluate(()=>{EXA.skipFlow();EXA.go('more','root');});
 await page.click('.more-group:has([data-contact-open]) summary');await page.click('[data-contact-open]');
 ok(await page.locator('#ctEditor[contenteditable=true]').isVisible()&&await page.locator('.rt-btn').count()>=8,'rich text editor with toolbar');
 await page.click('[data-ct-cat=bug]');await page.fill('[name=subject]','Crash on save');
 await page.click('#ctEditor');await page.keyboard.type('Hello world, it crashed');await page.evaluate(()=>document.execCommand('selectAll'));await page.click('[data-rt=bold]');
 ok((await page.locator('#ctEditor').innerHTML()).includes('<b>')||(await page.locator('#ctEditor').innerHTML()).includes('<strong>'),'bold works');
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=3000;c.height=2000;const g=c.getContext('2d');g.fillStyle='#e33';g.fillRect(0,0,3000,2000);for(let i=0;i<4000;i++){g.fillStyle=`hsl(${i%360},70%,50%)`;g.fillRect(Math.random()*3000,Math.random()*2000,30,30);}return c.toDataURL('image/png').split(',')[1];});
 await page.setInputFiles('#ctFile',{name:'big.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await page.waitForSelector('.ct-thumb');
 await page.fill('[name=email]','me@example.com');await page.click('#ctSend');await page.waitForTimeout(800);
 ok(posted&&posted.category==='bug'&&posted.subject==='Crash on save'&&posted.email==='me@example.com','payload has type, subject and email');
 ok(posted&&posted.photos.length===1&&posted.photos[0].startsWith('data:image/jpeg')&&posted.photos[0].length<=420000,'photo was shrunk to a small JPEG: '+(posted&&Math.round(posted.photos[0].length/1024))+' KB');
 ok(posted&&/<(b|strong)>/.test(posted.html)&&posted.meta.version,'formatting and app info are sent');
 ok(await page.evaluate(()=>!document.querySelector('#sheet[open]')),'sheet closes after sending');
 ok(!errors.length,'no errors '+errors.join(';'));
}finally{await browser.close();server.close();}

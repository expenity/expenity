import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const out='/tmp/expenity-tut';mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'})[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(10000);
const ok=(v,s)=>{assert(v,s);console.log('ok',s);};
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.tutorials&&!!EXA.resetAccount);await page.evaluate(()=>{EXA.skipFlow();});
 await page.evaluate(()=>EXA.go('more','tutorials'));
 const n=await page.locator('[data-tut]').count();ok(n===25,'twenty-five tutorials listed: '+n);
 const ids=await page.evaluate(()=>EXA.tutorials.list().map(x=>x.id));
 for(const id of ids){await page.evaluate(id=>EXA.tutorials.open(id),id);ok(await page.locator('.tt-phone *').count()>5&&await page.locator('.tt-steps li').count()===3,'tutorial '+id+' renders with three steps');await page.evaluate(()=>UI.closeSheet(true));}
 await page.evaluate(()=>EXA.tutorials.open('scan'));await page.click('[data-tut-nav=next]');ok(await page.evaluate(()=>EXA.tutorials.current==='swipe'),'next arrow goes to the next tutorial');await page.click('[data-tut-nav=prev]');ok(await page.evaluate(()=>EXA.tutorials.current==='scan'),'previous arrow goes back');ok(await page.locator('[data-tut-nav=prev]').isDisabled(),'previous is disabled on the first');await page.evaluate(()=>UI.closeSheet(true));
 await page.evaluate(()=>EXA.tutorials.start());await page.waitForSelector('[data-tour=next]');
 ok(await page.locator('.tt-count').count()===1,'tour shows step count');
 await page.click('[data-tour=skip]');ok(await page.evaluate(()=>EX.state().device.tourDone===true),'skipping ends the tour');
 await page.screenshot({path:out+'/t.png'});
 // reset account
 await page.evaluate(()=>{const S=EX.state();S.txs.push({id:'a',type:'expense',amount:'5',account:S.accounts[0].id,date:EX.iso(new Date()),name:'x',category:'food'});S.settings.name='Anna';});
 await page.evaluate(()=>{EXA.confirm=()=>Promise.resolve(true);});
 await page.evaluate(()=>EXA.resetAccount());await page.waitForTimeout(400);
 ok(await page.evaluate(()=>{const S=EX.state();return S.txs.length===0&&S.settings.name===''&&S.settings.setupDone===false&&S.device.stage==='setup'&&S.device.tourDone===false;}),'Reset account clears everything and returns to setup');
 ok(await page.locator('#setupForm [name=name]').count()===1,'the first screen asks for the name');
 ok(await page.evaluate(()=>{EXA.go('more','appearance');return document.querySelector('#view .card h2').textContent.length>0&&document.querySelector('#view [data-lang]').closest('.card')===document.querySelector('#view .card');}),'Language is the first card in Appearance');
 ok(!errors.length,'no errors '+errors.join(';'));
}finally{await browser.close();server.close();}

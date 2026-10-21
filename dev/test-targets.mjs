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
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.targetSheet);await page.evaluate(()=>{(EXA.skipFlow(),EX.state().device.entryMode='casual');const S=EX.state(),a=S.accounts[0].id,td=EX.today();S.txs.push({id:'e1',type:'expense',amount:'40',account:a,date:td,name:'Shop',category:'food'},{id:'i1',type:'income',amount:'500',account:a,date:td,name:'Gig',category:'salary'});EXA.go('home');});
 await page.waitForSelector('[data-target-edit]');await page.click('[data-target-edit]');await page.waitForSelector('#targetForm');
 await page.click('[data-tg="spend:week"]');await page.fill('[name=spend]','300');await page.click('[data-tg="income:month"]');await page.fill('[name=income]','2000');
 await page.click('#targetForm [type=submit]');await page.waitForTimeout(500);
 const txt=await page.locator('[data-home=daily]').innerText();
 ok(/260/.test(txt)&&/week/i.test(txt),'weekly target shows what is left: '+txt.replace(/\n/g,' | '));
 ok(/500/.test(txt)&&/1[.,]?500/.test(txt),'income target shows progress toward the goal');
 await page.click('[data-target-edit]');await page.click('[data-tg="spend:day"]');await page.fill('[name=spend]','30');await page.click('#targetForm [type=submit]');await page.waitForTimeout(400);
 ok(/Over/i.test(await page.locator('[data-home=daily] .daily-card').innerText()),'daily target of 30 is exceeded by 40 spent today');
 await page.click('[data-target-edit]');await page.click('[data-tg="spend:auto"]');await page.click('[data-tg="income:off"]');await page.click('#targetForm [type=submit]');await page.waitForTimeout(300);
 ok(!await page.locator('.income-target').count(),'Automatic and income off go back to the default');
 ok(!errors.length,'no errors '+errors.join(';'));
}finally{await browser.close();server.close();}

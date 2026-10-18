import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'})[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(10000);
const ok=(v,s)=>{assert(v,s);console.log('ok',s);};
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.settleIncome);await page.evaluate(()=>{EXA.skipFlow();});
 const r=await page.evaluate(()=>{const S=EX.state(),acc=S.accounts[0].id,d=new Date();d.setDate(d.getDate()-40);const iso=EX.iso(d);const before=S.txs.length;const inc={id:'i1',name:'Salary',amount:'1500',account:acc,category:'salary',repeat:'monthly',next:iso,day:d.getDate()};S.incomes.push(inc);const n=EXA.settleIncome(inc);return {n,added:S.txs.length-before,next:inc.next,future:inc.next>EX.iso(new Date())};});
 ok(r.n>=1&&r.added===r.n&&r.future,'past income is recorded as received and the next one is in the future: '+JSON.stringify(r));
 ok(await page.evaluate(()=>document.documentElement.dataset.skin==='sunset'),'first visit uses Sunset');
 ok(await page.evaluate(()=>{EXA.go('plan');return !!document.querySelector('[data-act=plan-back]');}),'Plan has a back button');
 ok(!errors.length,'no errors '+errors.join(';'));
}finally{await browser.close();server.close();}

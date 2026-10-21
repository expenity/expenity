import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'})[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(10000);
const ok=(v,s)=>{assert(v,s);console.log('ok',s);};
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.dupFind);await page.evaluate(()=>{(EXA.skipFlow(),EX.state().device.entryMode='casual');});
 const r=await page.evaluate(()=>{const S=EX.state(),a=S.accounts[0].id,td=EX.today();
  S.txs.push({id:'d1',type:'expense',amount:'3.50',account:a,date:EX.addDays(td,-1),name:'Coffee',category:'food'});
  const dup=!!EXA.dupFind({type:'expense',amount:'3.5',account:a,date:td,name:' coffee ',category:'food'});
  const no1=!!EXA.dupFind({type:'expense',amount:'3.60',account:a,date:td,name:'Coffee',category:'food'});
  const no2=!!EXA.dupFind({type:'expense',amount:'3.50',account:a,date:EX.addDays(td,-9),name:'Coffee',category:'food'});
  return {dup,no1,no2};});
 ok(r.dup&&!r.no1&&!r.no2,'duplicate guard finds same name, amount and wallet within days only');
 // trash
 await page.evaluate(()=>{const S=EX.state();S.txs.push({id:'t9',type:'expense',amount:'9',account:S.accounts[0].id,date:EX.today(),name:'Lunch',category:'food'});EXA.removeTx('t9');});
 ok(await page.evaluate(()=>EX.state().device.trash.length===1&&!EX.state().txs.some(x=>x.id==='t9')),'deleted entry lands in Recently deleted');
 await page.evaluate(()=>EXA.go('more','trash'));await page.click('[data-trash-restore="0"]');
 ok(await page.evaluate(()=>EX.state().txs.some(x=>x.name==='Lunch')),'Restore brings it back');
 // filters
 const f=await page.evaluate(()=>{const S=EX.state(),a=S.accounts[0].id;S.txs.push({id:'f1',type:'expense',amount:'100',account:a,date:'2026-03-02',name:'Big',category:'food'});EXA.st.txFilter.min='50';EXA.st.txFilter.from='2026-03-01';EXA.st.txFilter.to='2026-03-31';const l=EXA.applyFilters(EXA.rangeTxs());return l.map(x=>x.id);});
 ok(f.length===1&&f[0]==='f1','amount and date-range filters work across months');
 await page.evaluate(()=>{Object.assign(EXA.st.txFilter,{min:'',max:'',from:'',to:''});});
 // streak
 const s=await page.evaluate(()=>EXA.streak());ok(typeof s.cur==='number'&&s.week.length===7,'streak computes: '+JSON.stringify({cur:s.cur,best:s.best}));
 // price change
 const p=await page.evaluate(()=>{const S=EX.state(),a=S.accounts[0].id;S.bills.push({id:'b1',name:'Power',amount:'60',account:a,category:'bills',repeat:'monthly',next:EX.today(),day:1});S.txs.push({id:'p1',type:'expense',amount:'55',account:a,date:EX.addDays(EX.today(),-30),name:'Power',category:'bills',billId:'b1'},{id:'p2',type:'expense',amount:'62',account:a,date:EX.today(),name:'Power',category:'bills',billId:'b1'});return EXA.priceChange(S.bills.find(b=>b.id==='b1'));});
 ok(p&&p.pct===13,'price rise detected: '+JSON.stringify(p));
 // home cards + feature gating
 await page.evaluate(()=>EXA.go('home'));await page.waitForTimeout(300);
 ok(await page.locator('[data-home=streak]').count()===1,'streak card on Home');
 await page.evaluate(()=>EXA.features.choose('basic'));await page.waitForTimeout(200);
 ok(await page.evaluate(()=>!EX.feature('dupGuard')&&!EXA.dupFind({type:'expense',amount:'3.50',account:EX.state().accounts[0].id,date:EX.today(),name:'Coffee',category:'food'})&&!document.querySelector('[data-home=streak]')),'Basic plan turns all six off');
 await page.evaluate(()=>EXA.features.choose('advanced'));
 ok(!errors.length,'no errors '+errors.join(';'));
}finally{await browser.close();server.close();}

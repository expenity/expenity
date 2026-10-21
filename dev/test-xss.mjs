setTimeout(()=>{console.log('TIMEOUT');process.exit(2)},110000).unref();
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
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.features);
 await page.evaluate(()=>{window.__xss=0;(EXA.skipFlow(),EX.state().device.entryMode='casual');const X=EX,S=X.state(),td=X.today();
  const P='"><img src=x onerror=window.__xss=1><svg onload=window.__xss=2>';
  S.settings.name=P;S.accounts.length=0;S.accounts.push({id:'w1',name:P,type:'bank',currency:'EUR',opening:'10',tags:[P],color:'#ef4444'});
  S.categories.push({key:'c1',name:P,type:'expense',icon:'tag',color:'teal',custom:true});
  S.txs.push({id:'t1',type:'expense',amount:'5',account:'w1',date:td,name:P,note:P,category:'food',tags:[P]},{id:'t2',type:'income',amount:'9',account:'w1',date:td,name:P,category:'salary'});
  S.bills.push({id:'b1',name:P,amount:'9',account:'w1',category:'bills',repeat:'monthly',next:td,day:1,notes:P,reference:P,payUrl:'javascript:window.__xss=3'});
  S.incomes.push({id:'i1',name:P,amount:'9',account:'w1',category:'salary',repeat:'monthly',next:X.addDays(td,5),day:1,note:P});
  S.goals.push({id:'g1',name:P,target:'100',icon:'target'});S.budgets.push({id:'bg1',category:'all',amount:'100',period:'monthly'});
  S.settings.savedNames=[{type:'expense',name:P,category:'food'}];S.settings.aims=['save'];
  S.device.trash=[{kind:'tx',rec:{id:'zz',name:P,amount:'1',category:'food',date:td,type:'expense',account:'w1'},at:Date.now()}];
  localStorage.setItem('expenity.entryDraft.v1:guest:expense',JSON.stringify({saved:Date.now(),data:{type:'expense',amount:'3',name:P,editId:null,account:'w1',tags:[],category:'food',date:td}}));
  EX.persist();});
 const views=[['home','root'],['activity','root'],['bills','root'],['plan','root'],['reports','root'],['more','root'],['more','wallets'],['more','categories'],['more','tags'],['more','trash'],['more','drafts'],['more','features'],['more','tutorials'],['more','helpicons'],['more','account'],['more','appearance'],['more','data'],['more','reminders']];
 for(const [v,m] of views){await page.evaluate(([v,m])=>EXA.go(v,m),[v,m]);await page.waitForTimeout(120);}
 // sheets
 for(const f of ["EXA.openDetail('tx','t1')","EXA.openDetail('bill','b1')","EXA.openTx(null,{type:'expense'})","EXA.openTx(EX.state().txs[0])","EXA.openBill(EX.state().bills[0])","EXA.openWallet('w1')","EXA.openIncome(EX.state().incomes[0])","EXA.dupWarn({name:'\"><img src=x onerror=window.__xss=1>',amount:'1',category:'food',date:EX.today(),account:'w1'})","EXA.targetSheet()","EXA.avatar.open()","EXA.help.open('scan')","EXA.contact.open()","EXA.tutorials.open('scan')"]){await page.evaluate(`(()=>{try{void(${f})}catch(e){}})()`);await page.waitForTimeout(200);await page.evaluate(()=>{try{UI.closeSheet(true)}catch(e){}document.querySelectorAll('.help-pop').forEach(x=>x.remove());});}
 const r=await page.evaluate(()=>({x:window.__xss,imgs:document.querySelectorAll('img[src=x],svg[onload]').length}));
 ok(r.x===0&&r.imgs===0,'hostile names and notes are shown as text everywhere: '+JSON.stringify(r));
 ok(!errors.length,'no errors '+errors.join(';'));
}finally{await browser.close();server.close();}

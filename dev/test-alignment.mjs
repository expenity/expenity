// Fields that sit side by side must have the same top and the same height, in every form, on a phone and on a computer.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';import {readFileSync,existsSync} from 'node:fs';import {join,extname} from 'node:path';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const server=createServer((req,res)=>{const u=req.url.split('?')[0];const f=join(process.cwd(),u==='/'?'index.html':u);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const ok=(c,m)=>{console.log((c?'ok ':'FAIL ')+m);if(!c)process.exitCode=1;};
const browser=await chromium.launch({channel:'chrome'});
const sheets={goal:'EXA.openGoal()',budget:'EXA.openBudget()',plan:'EXA.openEfPlan()',bill:'EXA.openBill&&EXA.openBill()',income:'EXA.openIncome()',wallet:'EXA.openWallet&&EXA.openWallet()',entry:'EXA.openAdd&&EXA.openAdd()'};
for(const [name,ctxOpts] of [['phone',{viewport:{width:430,height:932},isMobile:true,hasTouch:true}],['computer',{viewport:{width:1100,height:800}}]]){
 const page=await (await browser.newContext({...ctxOpts,serviceWorkers:'block'})).newPage();
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EX?.efriend);
 await page.evaluate(()=>{EXA.skipFlow();const S=EX.state();S.accounts.push({id:'w1',name:'Cash',type:'cash',currency:S.settings.currency,opening:'100'});S.goals.push({id:'sg',name:'Pot',target:'10'});EX.save();});
 for(const [k,call] of Object.entries(sheets)){
  await page.evaluate(c=>{UI.closeSheet&&UI.closeSheet();eval(c);},call);await page.waitForTimeout(450);
  const bad=await page.evaluate(()=>{const sh=document.getElementById('sheet');if(!sh.open)return ['(sheet not open)'];const els=[...sh.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]),select,textarea')].filter(e=>e.offsetParent&&e.getBoundingClientRect().height>0);const out=[];
   for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const a=els[i].getBoundingClientRect(),b=els[j].getBoundingClientRect();const ov=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(ov<Math.min(a.height,b.height)*.5)continue;if(a.right<=b.left+1||b.right<=a.left+1){if(Math.abs(a.top-b.top)>1||Math.abs(a.height-b.height)>1)out.push((els[i].name||els[i].id||els[i].type)+' vs '+(els[j].name||els[j].id||els[j].type)+' top '+Math.round(a.top-b.top)+' h '+Math.round(a.height-b.height));}}return out;});
  ok(bad.length===0,`${name}: ${k} form fields line up`+(bad.length?' -> '+bad.join('; '):''));
 }
}
await browser.close();server.close();

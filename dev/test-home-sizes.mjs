import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {join,extname} from 'node:path';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.dashboardEditing);
await page.evaluate(()=>{EXA.skipFlow();});
await page.evaluate(()=>{const S=EX.state();const d=new Date();const iso=x=>x.toISOString().slice(0,10);const acc=S.accounts[0]||(S.accounts.push({id:'a1',name:'Cash',type:'cash',currency:'EUR',opening:'0'}),S.accounts[0]);
 for(let i=0;i<12;i++){S.txs.push({id:'t'+i,type:i%5===0?'income':'expense',amount:String(10+i*3),account:acc.id,name:'Item '+i,category:'food',date:iso(new Date(Date.now()-i*864e5))});}
 S.bills.push({id:'b1',name:'Power',amount:'60',day:5,repeat:'monthly',next:iso(new Date(Date.now()-4*864e5)),account:acc.id,category:'utilities'});
 S.settings.targets={spend:{period:'day',amount:'15'},income:{period:'month',amount:'2000'}};S.settings.features={tier:'advanced'};EX.save();EXA.go('home');});
await page.waitForTimeout(500);
const report=await page.evaluate(async()=>{
 const out={};document.querySelector('[data-home-settings]')?.click();
 // open the editor programmatically through a hold on a card
 return out;});
await page.evaluate(()=>{ const c=document.querySelector('#homeGrid>[data-home]'); if(!c) throw new Error('no home grid'); });
// start editing via the public path used by the app
await page.evaluate(()=>{ EXA.go('home'); const el=document.querySelector('#homeGrid>[data-home]'); el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',button:0,clientX:50,clientY:300})); });
await page.waitForTimeout(900);
const ids=await page.evaluate(()=>[...document.querySelectorAll('#homeGrid>[data-home]')].map(x=>x.dataset.home));
console.log('editing:',await page.evaluate(()=>EXA.dashboardEditing()),'cards:',ids.join(','));
const rows=[];
for(const id of ids){
 const res={};
 const handle=await page.$(`[data-dash-resize="${id}"]`);
 if(!handle){rows.push([id,'single size (no resize handle)']);continue;}
 for(const size of ['small','medium','full']){
  await page.evaluate((id)=>document.querySelector(`[data-dash-resize="${id}"]`)?.scrollIntoView({block:'center'}),id);
  await page.waitForTimeout(150);
  await page.click(`[data-dash-resize="${id}"]`,{force:true});await page.waitForTimeout(250);
  const pick=await page.$(`[data-dash-size="${size}"]`);
  if(!pick){res[size]='-';await page.evaluate(()=>document.querySelector('#sheet [data-close]')?.click());await page.waitForTimeout(150);continue;}
  await pick.click();await page.waitForTimeout(300);
  res[size]=await page.evaluate((id)=>{const w=document.querySelector(`#homeGrid>[data-home="${id}"]`);const r=w.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height);},id);
  await page.evaluate(()=>document.querySelector('#sheet [data-close]')?.click());await page.waitForTimeout(150);
 }
 rows.push([id,JSON.stringify(res)]);
}
rows.forEach(r=>console.log(r[0].padEnd(9),r[1]));
for(const id of ['daily','streak','safe']){await page.evaluate((id)=>document.querySelector(`[data-dash-resize="${id}"]`)?.scrollIntoView({block:'center'}),id);await page.click(`[data-dash-resize="${id}"]`,{force:true});await page.waitForTimeout(200);await (await page.$('[data-dash-size="small"]')).click();await page.waitForTimeout(250);await page.evaluate(()=>document.querySelector('#sheet [data-close]')?.click());await page.waitForTimeout(150);}
await page.evaluate(()=>document.querySelector('#homeGrid>[data-home=daily]')?.scrollIntoView({block:'center'}));await page.evaluate(()=>{document.querySelector('#view').scrollTop-=140;});await page.waitForTimeout(300);await page.screenshot({path:'/tmp/mc/home-sizes.png'});
console.log('errors:',errors);
await browser.close();server.close();

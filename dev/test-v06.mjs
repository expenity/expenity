// Isolated browser regressions for 0.6. Never creates production accounts.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),out='/tmp/expenity-v06';mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{const path=req.url.split('?')[0];const f=join(root,path==='/'?'index.html':path);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),errors=[];
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'en-US',serviceWorkers:'block'});
const page=await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(String(e)));
const ok=(cond,name)=>{assert(cond,name);console.log('ok',name);};
const close=async()=>{await page.evaluate(()=>UI.closeSheet());await page.waitForTimeout(180);};
const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(EX.state())));
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.enhancementsInit);
 await page.evaluate(()=>{EXA.skipFlow();EXA.setMotion('off');});
 await page.screenshot({path:join(out,'home-before-fixes.png'),fullPage:true});
 ok(await page.locator('[data-home=balance]').count()===1,'Home has its balance widget');
 await page.evaluate(()=>EXA.openBill());ok(await page.locator('.reminder-notice').isVisible(),'bill warns when notifications are off');
 ok(!await page.locator('#tpls').isVisible(),'predefined bill names are collapsed');
 await page.locator('.name-suggestions summary').click();ok(await page.locator('#tpls').isVisible(),'suggested names expand explicitly');
 await page.locator('#billForm [name=name]').fill('Custom rent');ok(!await page.locator('#tpls').isVisible(),'typing collapses suggestions');
 await page.locator('#billForm [name=tags]').fill('Home, Regular');await page.locator('#billForm [name=amount]').fill('80');await page.locator('#billForm [type=submit]').click();
 ok((await state()).bills.some(x=>x.name==='Custom rent'&&x.tags.includes('Home')),'bill saves reusable tags');
 await page.evaluate(()=>EXA.openTx(null,{amount:'12.50',name:'Lunch'}));await page.locator('#sheet [name=tags]').fill('Food, Work');
 await page.click('[data-tx=save]');ok((await state()).txs.some(x=>x.name==='Lunch'&&x.tags.join(',')==='Food,Work'),'expense saves tags');
 await page.evaluate(()=>EXA.openTx(EX.state().txs.find(x=>x.name==='Lunch')));await page.click('[data-tx-wallet]');ok(await page.locator('#sheet [name=tags]').inputValue()==='Food, Work','tags survive a transaction sheet redraw');await close();
 await page.evaluate(()=>EXA.go('more','tags'));await page.locator('#tagCreate [name=tagName]').fill('Holiday');await page.locator('#tagCreate [type=submit]').click();
 ok((await state()).settings.tags.includes('Holiday'),'tag library creates reusable tag');
 await page.locator('[data-tag-results=Work]').click();ok(await page.locator('[data-tag-tx]').count()===1,'tag library finds matching transactions');
 const index=await page.locator('[data-tag-edit]').evaluateAll(xs=>xs.findIndex(e=>e.closest('.tag-library-row').textContent.includes('Work')));await page.locator('[data-tag-edit]').nth(index).click();await page.locator('#tagRename [name=tagName]').fill('Business');await page.locator('#tagRename [type=submit]').click();await page.waitForTimeout(200);
 ok((await state()).txs.find(x=>x.name==='Lunch').tags.includes('Business'),'renaming a tag updates existing records');
 await page.evaluate(()=>{EXA.go('activity');});await page.selectOption('#tagFilter','Business');ok(await page.locator('#view [data-kind=tx]').count()===1,'Activity can filter by tag');
 await page.evaluate(()=>{const s=EX.state();s.bills=[{id:'rent',name:'Rent',amount:'10',currency:'EUR',account:s.accounts[0].id,category:'housing',next:'2026-10-01',day:1,repeat:'monthly'}];EXA.markPaid('rent','10','2026-10-01');EXA.markPaid('rent','10','2026-11-01');EXA.openDetail('tx',s.txs.find(x=>x.billId==='rent'&&x.due==='2026-10-01').id);});
 await page.locator('[data-reverse-tx]').click();await page.click('#confirmYes');await page.waitForTimeout(200);
 let s=await state();ok(s.bills[0].next==='2026-10-01'&&!s.bills[0].done&&s.txs.filter(x=>x.billId==='rent').length===1,'history reversal reopens the earlier bill and preserves later payment');
 ok((await page.locator('#toast').innerText()).trim()==='Undo','reversal toast contains only Undo');
 await page.evaluate(()=>EXA.markPaid('rent','10','2026-10-01'));s=await state();ok(s.bills[0].next==='2026-12-01','paying reopened bill skips the already recorded next occurrence');
 await page.evaluate(()=>{const s=EX.state();s.incomes=[{id:'salary',name:'Salary',amount:'100',currency:'EUR',account:s.accounts[0].id,next:'2026-10-01',day:1,repeat:'monthly',tags:['Business']}];EX.plan.receive(s.incomes[0],'100');EXA.openDetail('tx',s.txs.find(x=>x.incomeId==='salary').id);});
 await page.click('[data-reverse-tx]');await page.click('#confirmYes');await page.waitForTimeout(200);s=await state();ok(s.incomes[0].next==='2026-10-01'&&!s.txs.some(x=>x.incomeId==='salary'),'history reversal reopens recurring income');
 await page.evaluate(()=>{const s=EX.state();s.goals=[{id:'trip',name:'Trip',target:'1000',tags:['Travel']}];EXA.go('plan');});await page.evaluate(()=>{const b=document.createElement('button');b.dataset.plan='goal-money';b.dataset.id='trip';EXA.planClick({target:b});});await page.locator('#contribForm [name=amount]').fill('5');await page.locator('#contribForm [name=tags]').fill('Travel, Holiday');await page.locator('#contribForm [type=submit]').click();ok((await state()).txs.find(x=>x.goalId==='trip').tags.includes('Holiday'),'goal contributions save the tags entered in their form');
 await page.evaluate(()=>EXA.go('home'));await page.click('[data-home-edit]');ok(await page.locator('.home-editor').isVisible(),'dashboard editing opens');
 await page.click('[data-home-hide=ideas]');await page.selectOption('[data-home-size=balance]','compact');await page.click('[data-home-up=recent]');await page.click('[data-home-done]');
 s=await state();ok(s.settings.homeLayout.find(x=>x.id==='ideas').hidden&&s.settings.homeLayout.find(x=>x.id==='balance').size==='compact','dashboard hide and resize are saved');
 ok(await page.locator('[data-home=ideas]').count()===0,'hidden widget is not displayed');
 await page.reload();await page.waitForFunction(()=>!!window.EXA?.enhancementsInit);ok(await page.locator('[data-home=ideas]').count()===0,'dashboard layout survives reload');
 await page.evaluate(()=>EXA.go('home'));await page.click('[data-home-edit]');await page.click('[data-home-reset]');await page.click('[data-home-done]');
 ok((await state()).settings.homeLayout.length===0,'reset restores automatic default dashboard order');
 const holdBox=await page.locator('[data-home=balance]').boundingBox();await page.mouse.move(holdBox.x+25,holdBox.y+40);await page.mouse.down();await page.waitForTimeout(750);await page.mouse.up();await page.waitForTimeout(350);
 ok(await page.locator('.home-editor').isVisible(),'long hold on a dashboard card enters edit mode');
 const first=await page.locator('#homeGrid > [data-home]').first().getAttribute('data-home');
 const handle=page.locator(`[data-home-drag=${first}]`),target=page.locator('[data-home=wallets] .widget-controls');await handle.scrollIntoViewIfNeeded();const hb=await handle.boundingBox();await page.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2);await page.mouse.down();await target.scrollIntoViewIfNeeded();const tb=await target.boundingBox();await page.mouse.move(tb.x+20,tb.y+20,{steps:10});await page.mouse.up();await page.waitForTimeout(350);
 ok(await page.locator('#homeGrid > [data-home]').first().getAttribute('data-home')!==first,'drag handle reorders dashboard widgets');await page.click('[data-home-cancel]');
 await page.evaluate(()=>EXA.go('more','account'));await page.click('[data-release-notes]');await page.waitForSelector('.release-notes details');ok(await page.locator('.release-notes details').count()>=2,'retained changelog shows current and previous releases');await close();
 for(const lang of ['en','el']){
  for(const [width,height] of [[320,568],[390,844],[744,1133],[834,1194],[1024,768],[1440,900]]){
   await page.setViewportSize({width,height});await page.evaluate(lang=>{EX.setLang(lang);},lang);
   for(const view of ['home','activity','bills','plan','reports','more']){
    await page.evaluate(view=>EXA.go(view),view);
    const issues=await page.evaluate(()=>{const v=document.querySelector('#view');return {page:document.documentElement.scrollWidth>innerWidth+1,view:v.scrollWidth>v.clientWidth+1,empty:v.textContent.trim().length<20};});
    ok(!issues.page&&!issues.view&&!issues.empty,`${lang} ${width}px ${view} fits screen`);
   }
   await page.evaluate(()=>{EXA.openTx();});const overflow=await page.evaluate(()=>{const b=document.querySelector('.sheet-body');return b.scrollWidth>b.clientWidth+1;});ok(!overflow,`${lang} ${width}px expense sheet fits`);await close();
   await page.evaluate(()=>{EXA.go('more','account');EX.auth.isSignedIn=()=>true;EXA.render();});const photoBounds=await page.locator('[data-act=delete-photos]').boundingBox();ok(photoBounds&&photoBounds.x>=0&&photoBounds.x+photoBounds.width<=width+1,`${lang} ${width}px photo-delete button fits`);await page.evaluate(()=>{EX.auth.isSignedIn=()=>false;EXA.go('home');});await page.screenshot({path:join(out,`home-${lang}-${width}.png`)});
  }
 }
 ok(!errors.length,'no browser exceptions: '+errors.join('; '));
}finally{await browser.close();server.close();}
console.log('Screenshots:',out);

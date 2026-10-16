// Local-only regression coverage for grouped entry and the daily-use changes.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'})[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});
page.setDefaultTimeout(5000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const ok=(c,m)=>{assert(c,m);console.log('ok',m);};
const group=id=>page.locator(`[data-entry-group=${id}]`);
const expand=async id=>{if(!await group(id).evaluate(d=>d.open))await group(id).locator(':scope > summary').click();};
const close=()=>page.evaluate(()=>UI.closeSheet(true));
const open=async preset=>{await page.evaluate(p=>EXA.openTx(null,p),preset||{});};
try{
 await page.route('**/api/**',r=>r.abort());
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.skipFlow);await page.evaluate(()=>EXA.skipFlow());
 await open({amount:'24.50',name:'Market'});
 ok(await page.locator('[data-entry-group]').count()===4,'four labeled expandable rows');
 ok(await group('payment').evaluate(d=>d.open),'Payment starts expanded');
 ok(await page.locator('#txKeypad').isHidden()&&await page.evaluate(()=>document.activeElement.tagName!=='INPUT'),'no automatic keypad or keyboard');
 await expand('category');await page.click('[data-tx-catsmore]');await page.click('[data-tx-cat=food]');await page.fill('#sheet [name=tags]','Work, Lunch');await page.click('[data-tx=field-done]');
 await expand('extras');ok(!await group('category').evaluate(d=>d.open),'only one group is open');await page.fill('#txNote','Remember this');await page.click('[data-tx=field-done]');
 await expand('repeat');await page.selectOption('#entryRepeat','monthly');
 ok(await page.locator('#txDesc').inputValue()==='Market'&&await page.locator('#amtVal').innerText()==='24.50','redrawing retains amount and description');
 await expand('category');ok(await page.locator('#sheet [name=tags]').inputValue()==='Work, Lunch','collapsed tags retained');
 await expand('extras');ok(await page.locator('#txNote').inputValue()==='Remember this','collapsed notes retained');
 await page.locator('[data-tx=save]').click();
 ok(await page.evaluate(()=>EX.state().bills.some(b=>b.name==='Market'&&b.repeat==='monthly'&&b.tags.length===2&&b.notes==='Remember this')&&!EX.state().txs.length),'same-form repeat saves schedule with details and no completed payment');
 await open({amount:'8',name:'Lunch'});await page.click('[data-tx=save]');ok(await group('category').evaluate(d=>d.open),'validation reveals missing category');await page.click('[data-tx-cat=food]');await page.click('[data-tx-catsmore]');await page.click('[data-entry=new-category]');
 await page.fill('#taxonomyCategory [name=name]','New category');await page.click('[data-tax-icon=coffee]');await page.click('[data-tax-color=amber]');await page.locator('#taxonomyCategory [type=submit]').click();
 ok(await page.locator('#txDesc').inputValue()==='Lunch','category creation retains entry');await page.click('[data-tx=save]');
 const original=await page.evaluate(()=>EX.state().txs.find(x=>x.name==='Lunch'));
 ok(!!original,'custom-category expense saves');
 await page.evaluate(id=>EXA.duplicateRecord('tx',id),original.id);
 ok(await page.locator('#txDesc').inputValue()==='Lunch','Duplicate opens populated draft');await page.click('[data-tx=save]');
 ok(await page.evaluate(id=>EX.state().txs.filter(x=>x.name==='Lunch').length===2&&EX.state().txs.find(x=>x.id===id).amount==='8',original.id),'Duplicate saves a separate record');
 for(const lang of ['en','el'])for(const width of [320,390,834,1440]){
  await page.setViewportSize({width,height:900});await page.evaluate(l=>EX.setLang(l),lang);await open({name:'',amount:'',category:null});
  for(const id of ['payment','category','repeat','extras']){
   await expand(id);if(id==='extras'){const sizes=await page.evaluate(()=>{const a=document.querySelector('[data-receipt-scan]').getBoundingClientRect(),b=document.querySelector('[data-photo-add]').getBoundingClientRect();return [a.width,b.width,a.height,b.height];});ok(Math.abs(sizes[0]-sizes[1])<1&&Math.abs(sizes[2]-sizes[3])<1,`${lang} ${width}px receipt actions have equal dimensions`);}ok(await page.evaluate(()=>{const d=document.querySelector('#sheet'),s=document.querySelector('.entry-scroll');return document.documentElement.scrollWidth<=innerWidth+1&&d.scrollWidth<=d.clientWidth+1&&s.scrollWidth<=s.clientWidth+1;}),`${lang} ${width}px ${id} fits`);
  }
  if(lang==='el'&&width===390)await page.screenshot({path:'/tmp/expenity-grouped-entry-el.png'});
  await close();
 }
 await page.evaluate(()=>{EX.setLang('el');const s=EX.state();s.accounts.push({id:'greek-bank',type:'bank',name:'Τραπεζικός λογαριασμός',currency:'EUR',opening:'0'});EX.save();});await open({account:'greek-bank'});
 ok(await page.locator('[data-group-summary=payment]').innerText().then(t=>t.includes('Τράπεζα')),'default Greek bank label is compact');await close();
 await page.evaluate(()=>EXA.go('more'));ok(await page.locator('.more-group').count()===4,'More is organized into four groups');

 await page.evaluate(()=>{EX.setLang('en');EX.rememberName('expense','Coffee','food',{amount:'3'});EX.savedNames('expense')[0].pinned=true;EX.save();});await open();ok(await page.locator('.entry-pins [data-tx-saved]').count()===1,'pinned shortcut is prominent');await page.click('.entry-pins [data-tx-saved]');ok(await page.locator('#txDesc').inputValue()==='Coffee','pinned shortcut fills draft without saving');await close();
 await page.evaluate(()=>{EX.rememberName('expense','Coffee','food',{amount:'4'});});ok(await page.evaluate(()=>EX.savedNames('expense').find(x=>x.name==='Coffee').pinned),'updating shortcut keeps its pin');
 await page.evaluate(()=>{EXA.go('more');EXA.st.more='tags';EXA.render();});await page.locator('#tagCreate details summary').click();await page.fill('#tagCreate [name=tagName]','Travel');await page.click('[data-tax-icon=plane]');await page.locator('#tagCreate [type=submit]').click();ok(await page.evaluate(()=>EXA.tagStyle('Travel').iconName==='plane'),'tags retain selected icons');
 await page.evaluate(()=>{const s=EX.state(),account=s.accounts[0].id,td=EX.today();s.budgets=[];s.txs=[0,1,30,31].map((n,i)=>({id:'evidence-'+i,type:'expense',category:'food',amount:i<2?'50':'10',date:EX.addDays(td,-n),account}));s.txs.push({id:'exclude-transfer',type:'transfer',category:'food',amount:'900',date:td,account});});
 ok(await page.evaluate(()=>{const idea=EX.ideas.list().find(x=>x.id==='grow:food');return idea&&idea.evidence.rows.length===2&&idea.evidence.older.length===2;}),'spending insight compares equal windows and excludes transfers');
 await page.evaluate(()=>{const s=EX.state();s.accounts[0].currency='USD';EX.rates={date:'2000-01-01',rates:{EUR:1,USD:1.1}};});ok(await page.evaluate(()=>!EX.ideas.list().some(x=>x.id==='grow:food')),'stale FX suppresses comparison');
 // Only a fake local credential; all API traffic is blocked above.
 await page.evaluate(()=>localStorage.setItem('expenity.auth',JSON.stringify({token:'local-test-only',user:{id:'test',email:'local@example.invalid'}})));await page.reload();await page.waitForFunction(()=>!!window.EXA?.openTx);
 await page.waitForFunction(()=>EX.auth.isSignedIn());ok(await page.evaluate(()=>EX.sync.pendingChanges().length>0),'sync exposes pending personal changes');
 await page.evaluate(()=>{const s=EX.state();s.sync.spaces['test-space']={role:'editor',base:{gone:{k:'tx',h:'old'}},rev:0};s.accounts.push({id:'shared-test',space:'test-space',name:'Shared',currency:'EUR',type:'cash'});s.txs.push({id:'shared-tx',account:'shared-test',type:'expense',amount:'1',date:EX.today(),category:'food'});});
 ok(await page.evaluate(()=>{const changes=EX.sync.pendingChanges();return changes.some(x=>x.id==='shared-tx'&&x.scope==='test-space')&&changes.some(x=>x.id==='gone'&&x.deleted);}), 'sync includes shared changes and pending deletions');
 ok(!errors.length,'no runtime exceptions: '+errors.join('; '));
}finally{await browser.close();server.close();}

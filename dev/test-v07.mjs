// UI, media and responsive regressions for installation guides and focused dashboard editing.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const out='/tmp/expenity-v07';mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{const path=req.url.split('?')[0],f=join(process.cwd(),path==='/'?'index.html':path);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.mp4':'video/mp4','.json':'application/json'})[extname(f)]||'application/octet-stream');const body=readFileSync(f);if(extname(f)==='.mp4'){res.setHeader('Accept-Ranges','bytes');const match=/bytes=(\d+)-(\d*)/.exec(req.headers.range||'');if(match){const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),body.length-1):body.length-1;res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${body.length}`);res.setHeader('Content-Length',end-start+1);res.end(body.subarray(start,end+1));return;}}res.end(body);}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(10000);
const ok=(v,s)=>{assert(v,s);console.log('ok',s);};
const close=async()=>{await page.evaluate(()=>UI.closeSheet());await page.waitForTimeout(200);};
const home=async()=>page.evaluate(()=>EXA.go('home'));
const holdCard=async()=>{const target=page.locator('#homeGrid>[data-home]').first();await target.scrollIntoViewIfNeeded();const b=await target.boundingBox(),cdp=await ctx.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+30,y:b.y+50}]});await page.waitForTimeout(750);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await page.waitForTimeout(350);};
const edit=async()=>{await home();await holdCard();await page.click('[data-home-start]');};
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.enhancementsInit);await page.evaluate(()=>{EXA.skipFlow();EXA.setMotion('full');const s=EX.state(),w=s.accounts[0];w.opening='1234.56';s.txs=[{id:'expense',name:'Lunch',amount:'12',type:'expense',date:EX.today(),category:'food',account:w.id,tags:['Business','Team']},{id:'income',name:'Salary',amount:'100',type:'income',date:EX.today(),category:'salary',account:w.id,tags:['Work']}];s.incomes=[{id:'salary',name:'Monthly salary',amount:'100',account:w.id,repeat:'monthly',next:EX.today(),tags:['Work']}];s.bills=[{id:'rent',name:'Rent',amount:'50',category:'housing',currency:'EUR',account:w.id,repeat:'monthly',next:EX.today(),tags:['Home']}];EX.save();});
 ok(await page.locator('[data-home-edit]').count()===0,'there is no pencil shortcut for layout editing');const mouseBox=await page.locator('[data-home=balance]').boundingBox();await page.mouse.move(mouseBox.x+30,mouseBox.y+40);await page.mouse.down();await page.waitForTimeout(750);await page.mouse.up();ok(await page.locator('.edit-demo').count()===0,'holding with a mouse does not open layout editing');
 const cdp=await ctx.newCDPSession(page),holdBox=await page.locator('[data-home=balance]').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:holdBox.x+35,y:holdBox.y+45}]});await page.waitForTimeout(750);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(350);ok(await page.locator('.edit-demo').isVisible(),'editing opens animated instructions before editing the dashboard');await page.screenshot({path:out+'/editor-tutorial-phone.png'});await page.click('[data-home-start]');
 ok(await page.locator('.widget-selected').count()===0,'no card is silently selected');ok(await page.locator('.widget-muted').count()>=5,'cards are grey until explicitly selected');
 await page.click('[data-home-select=balance]');ok(await page.locator('.widget-selected[data-home=balance]').count()===1,'tapping selects exactly that card');
 ok(await page.locator('.widget-selected').evaluate(el=>getComputedStyle(el).animationName.includes('widget-focus-pulse')),'selected card pulses in full motion mode');
 ok(await page.locator('[data-home=wallets]').evaluate(el=>getComputedStyle(el).filter.includes('grayscale')),'unselected cards are greyscale');
 ok(await page.locator('[data-home-size=balance] option').allTextContents().then(x=>x.join(',')==='Small,Medium,Full'),'exactly Small, Medium and Full size choices');
 await page.evaluate(()=>EXA.setSkin('synthwave'));ok(await page.locator('.widget-selected').evaluate(el=>getComputedStyle(el).borderColor==='rgb(255, 62, 165)'),'selection accent follows the chosen theme');await page.screenshot({path:out+'/editor-selected-phone.png'});await page.evaluate(()=>EXA.setSkin('emerald'));
 const widths={};for(const size of ['full','medium','small']){await page.selectOption('[data-home-size=balance]',size);widths[size]=(await page.locator('[data-home=balance]').boundingBox()).width;}
 ok(widths.small<=widths.full*.52&&widths.medium>widths.small*1.2&&widths.medium<widths.full*.8,'phone sizes have clear full, two-thirds and half widths');
 await page.click('[data-home-done]');ok(await page.locator('.balance-summary').isVisible(),'small balance uses a readable compact summary');
 await page.screenshot({path:out+'/small-card-phone.png'});
 await edit();await page.click('[data-home-select=wallets]');const before=await page.locator('#homeGrid>[data-home]').evaluateAll(xs=>xs.findIndex(x=>x.dataset.home==='wallets'));await page.click('[data-home-up=wallets]');const after=await page.locator('#homeGrid>[data-home]').evaluateAll(xs=>xs.findIndex(x=>x.dataset.home==='wallets'));ok(after===before-1,'arrows move the selected card');ok(await page.locator('.selected-widget-name').innerText().then(x=>x.includes('Wallets')),'the control panel clearly names the selected card');ok(await page.locator('.widget-selected[data-home=wallets]').count()===1,'selection stays on the moved card');
 await page.evaluate(()=>EXA.setMotion('off'));ok(await page.locator('.widget-selected').evaluate(el=>getComputedStyle(el).animationName==='none'),'motion off disables selection pulse while keeping selection');await page.click('[data-home-cancel]');
 await page.evaluate(()=>EXA.go('activity'));ok(await page.locator('[data-id=expense] .row-tag svg').count()>=2,'expense tags are visible with icons');ok(await page.locator('[data-id=income] .row-tag').innerText().then(x=>x.includes('Work')),'income tag is visible');
 await page.evaluate(()=>EXA.go('bills'));ok(await page.locator('[data-id=rent] .row-tag').count()>=1,'bill tag is visible');
 await page.evaluate(()=>{EXA.st.txFilter.type='income';EXA.st.incomeMode='recurring';EXA.go('activity');});ok(await page.locator('.irow .row-tag').count()===1,'recurring income shows its tag');
 for(const lang of ['en','el']){
  await page.evaluate(lang=>{EX.setLang(lang);EXA.go('more','account');},lang);await page.click('[data-install-guide-entry]');ok(await page.locator('#installGuidePanel').isVisible(),'Account settings opens the installation guides');
  for(const platform of ['ios','android','desktop']){
   await page.click(`[data-guide-platform=${platform}]`);const source=await page.locator('video source').getAttribute('src');ok(source===`installation/${platform}-${lang}.mp4`,`${platform} guide uses ${lang} video`);
   const playback=await page.locator('video').evaluate(async v=>{v.muted=true;v.preload='auto';v.load();await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=()=>reject(Error('video decode'));});await v.play();await new Promise(r=>setTimeout(r,250));v.pause();return {time:v.currentTime,duration:v.duration,width:v.videoWidth,height:v.videoHeight};});
   ok(playback.time>0&&playback.width===600&&playback.height===700,`${platform} ${lang} MP4 decodes and plays`);ok(playback.duration>=11&&playback.duration<=14,`${platform} ${lang} is a short 12-second guide`);
   await page.locator('video').evaluate(v=>new Promise(resolve=>{v.onseeked=resolve;v.currentTime=10;}));ok(await page.locator('video').evaluate(v=>v.currentTime>=9.9),'guide can seek to the final open-app step');
   await page.screenshot({path:`${out}/install-${platform}-${lang}.png`});
  }
 }
 for(const [width,height] of [[320,760],[390,844],[744,1133],[834,1194],[1024,768],[1440,900]]){
  await page.setViewportSize({width,height});
  for(const lang of ['en','el']){
   await page.evaluate(lang=>{EX.setLang(lang);EXA.go('home');},lang);await holdCard();await page.click('[data-home-start]');await page.click('[data-home-select=balance]');
   for(const size of ['small','medium','full']){await page.selectOption('[data-home-size=balance]',size);const overflow=await page.evaluate(()=>{const v=document.querySelector('#view');return v.scrollWidth>v.clientWidth+1||document.documentElement.scrollWidth>innerWidth+1;});ok(!overflow,`${lang} ${width}px ${size} edit layout fits`);}
   await page.click('[data-home-done]');await page.screenshot({path:`${out}/home-${lang}-${width}.png`});
   await page.evaluate(()=>EXA.go('more','install'));ok(await page.evaluate(()=>{const v=document.querySelector('#view');return v.scrollWidth<=v.clientWidth+1;}),`${lang} ${width}px installation guide fits`);
  }
 }
 await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>{EX.setLang('en');EXA.go('more');});await page.click('[data-home-settings]');ok(await page.locator('.edit-demo').isVisible(),'desktop Settings offers the layout editor fallback');await page.click('[data-home-start]');ok(await page.locator('.home-editor').isVisible(),'desktop fallback opens the same Home editor');await page.click('[data-home-cancel]');
 ok(!errors.length,'no browser exceptions: '+errors.join('; '));
}finally{await browser.close();server.close();}

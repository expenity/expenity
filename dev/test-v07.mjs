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
const holdCard=async()=>{const target=page.locator('#homeGrid>[data-home]').first();await target.scrollIntoViewIfNeeded();const b=await target.boundingBox();const cdp=await ctx.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+30,y:b.y+50}]});await page.waitForTimeout(750);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await page.waitForTimeout(350);};
const edit=async()=>{await home();await holdCard();};
const size=async(id,value)=>{await page.locator(`[data-dash-resize=${id}]`).click();await page.click(`[data-dash-size=${value}]`);await page.waitForTimeout(400);};
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.enhancementsInit);await page.evaluate(()=>{EXA.skipFlow();EXA.setMotion('full');const s=EX.state(),w=s.accounts[0];w.opening='1234.56';s.txs=[{id:'expense',name:'Lunch',amount:'12',type:'expense',date:EX.today(),category:'food',account:w.id,tags:['Business','Team']},{id:'income',name:'Salary',amount:'100',type:'income',date:EX.today(),category:'salary',account:w.id,tags:['Work']}];s.incomes=[{id:'salary',name:'Monthly salary',amount:'100',account:w.id,repeat:'monthly',next:EX.today(),tags:['Work']}];s.bills=[{id:'rent',name:'Rent',amount:'50',category:'housing',currency:'EUR',account:w.id,repeat:'monthly',next:EX.today(),tags:['Home']}];EX.save();});
 ok(await page.locator('[data-home-edit]').count()===0,'there is no pencil shortcut for layout editing');const mouseBox=await page.locator('[data-home=balance]').boundingBox();await page.mouse.move(mouseBox.x+30,mouseBox.y+40);await page.mouse.down();await page.waitForTimeout(750);await page.mouse.up();await page.waitForTimeout(700);ok(await page.locator('.dash-editbar').count()===0,'holding with a mouse does not open layout editing');
 await holdCard();ok(await page.locator('.dash-editbar').isVisible(),'touch hold enters editing immediately');ok(await page.locator('.edit-demo,.home-editor').count()===0,'no large control panel or mandatory tutorial');
 ok((await page.locator('.dash-editbar').boundingBox()).height<80,'editor toolbar stays compact');
 ok(await page.locator('.dashboard-editing .dash-content').first().evaluate(el=>getComputedStyle(el).animationName.includes('dash-jiggle')),'cards gently jiggle in edit mode');
 const widths={};for(const value of ['full','medium','small']){await size('balance',value);widths[value]=(await page.locator('[data-home=balance]').boundingBox()).width;}
 ok(widths.small<=widths.full*.52&&Math.abs(widths.medium-widths.full)<2,'phone Medium is full-width and Small is half-width');
 await page.click('[data-dash-done]');ok(await page.locator('.dash-summary-balance').isVisible(),'small balance has a readable summary');
 await edit();await size('wallets','medium');const tiles=await page.locator('[data-home=wallets] .wc').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().top));ok(tiles.length<2||Math.abs(tiles[0]-tiles[1])<2,'Medium wallets stay horizontal');
 await page.evaluate(()=>EXA.setMotion('off'));ok(await page.locator('.dashboard-editing .dash-content').first().evaluate(el=>getComputedStyle(el).animationName==='none'),'motion off disables jiggle');await page.click('[data-dash-cancel]');
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
   await page.evaluate(lang=>{EX.setLang(lang);EXA.go('home');},lang);await holdCard();
   for(const value of ['small','medium','full']){await size('balance',value);const overflow=await page.evaluate(()=>{const v=document.querySelector('#view');return v.scrollWidth>v.clientWidth+1||document.documentElement.scrollWidth>innerWidth+1;});ok(!overflow,`${lang} ${width}px ${value} edit layout fits`);}
   await page.click('[data-dash-done]');await page.screenshot({path:`${out}/home-${lang}-${width}.png`});
   await page.evaluate(()=>EXA.go('more','install'));ok(await page.evaluate(()=>{const v=document.querySelector('#view');return v.scrollWidth<=v.clientWidth+1;}),`${lang} ${width}px installation guide fits`);
  }
 }
 await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>{EX.setLang('en');EXA.go('more');});await page.click('[data-home-settings]');ok(await page.locator('.dash-editbar').isVisible(),'desktop Settings opens the same direct editor');await page.click('[data-dash-cancel]');
 ok(!errors.length,'no browser exceptions: '+errors.join('; '));
}finally{await browser.close();server.close();}

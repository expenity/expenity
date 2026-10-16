// Read-only deployment smoke test. Guest-only browser state; production accounts are never created.
import {chromium} from 'playwright-core';
import {mkdirSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const expected=JSON.parse(readFileSync('package.json','utf8')).version,url='https://expenity.github.io/expenity/app/',out='/tmp/expenity-deployed';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(10000);
await ctx.route('**/api/**',route=>route.request().method()==='GET'?route.continue():route.abort());
const ok=(v,label)=>{assert(v,label);console.log('ok',label);};
try{
 let ready=false;for(let i=0;i<30;i++){const r=await ctx.request.get(url+'releases.json?check='+Date.now());if(r.ok()&&(await r.json()).version===expected){ready=true;break;}await new Promise(r=>setTimeout(r,2500));}ok(ready,'Pages serves release '+expected);
 await page.goto(url);await page.waitForFunction(v=>window.EXPENITY_VERSION===v,expected);await page.evaluate(()=>{EXA.skipFlow();EXA.setMotion('off');});
 ok(await page.locator('#homeGrid.dashboard-grid').count()===1,'deployed Home uses the separate dashboard grid');
 await page.click('.ab-avatar .avatar:visible');ok(await page.locator('[data-more=account]').isVisible(),'deployed account button is clickable');
 await page.click('[data-more=account]');await page.click('[data-release-notes]');await page.waitForSelector('.release-notes');ok((await page.locator('.release-notes').innerText()).includes(expected),'deployed changelog includes the fix release');await page.evaluate(()=>UI.closeSheet());await page.waitForTimeout(200);
 await page.evaluate(()=>EXA.go('more','account'));await page.click('[data-install-guide-entry]');await page.waitForSelector('#installGuidePanel video');await page.click('[data-guide-platform=ios]');const media=await page.locator('video').evaluate(async v=>{v.preload='auto';v.load();await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=()=>reject(Error('video'));});return {duration:v.duration,width:v.videoWidth};});ok(media.duration>11&&media.duration<14&&media.width===600,'deployed Account guide loads the short MP4');
 await page.evaluate(()=>EXA.go('more','appearance'));ok(await page.locator('.custom-theme-section [data-custom-edit]').isVisible()&&await page.locator('.theme-grid [data-skin-set=custom]').count()===0,'deployed custom theme is separate and editable');
 await page.evaluate(()=>EXA.go('more'));await page.click('[data-home-settings]');await page.waitForSelector('.edit-demo');await page.click('[data-home-start]');await page.click('[data-home-select=balance]');ok(await page.locator('[data-home-size=balance] option').count()===3,'deployed Settings fallback has all three sizes');await page.click('[data-home-cancel]');
 for(const lang of ['en','el'])for(const [width,height] of [[390,844],[834,1194],[1440,900]]){
  await page.setViewportSize({width,height});await page.evaluate(lang=>{EX.setLang(lang);EXA.go('home');},lang);
  ok(await page.evaluate(()=>{const v=document.querySelector('#view');return document.documentElement.scrollWidth<=innerWidth+1&&v.scrollWidth<=v.clientWidth+1;}),`deployed ${lang} ${width}px Home fits`);
  await page.screenshot({path:`${out}/home-${lang}-${width}.png`});
 }
 ok(!errors.length,'deployed app has no browser exceptions: '+errors.join('; '));
}finally{await browser.close();}

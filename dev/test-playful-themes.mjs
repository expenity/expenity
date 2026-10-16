import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'})[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const ok=(value,label)=>{assert(value,label);console.log('ok',label);};
try{
 await page.route('**/api/**',r=>r.abort());await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.skipFlow);await page.evaluate(()=>{EXA.skipFlow();EX.setLang('el');EXA.setMotion('full');EX.state().accounts[0].opening='1250';EX.save();EXA.go('home');});
 for(const skin of ['mario','bricks','minnie']){
  await page.evaluate(s=>EXA.setSkin(s),skin);
  ok(await page.locator('.fun-scene').count()===1,`${skin}: one decorative scene`);
  ok(await page.evaluate(()=>getComputedStyle(document.querySelector('.fun-scene')).pointerEvents==='none'),`${skin}: scenery never intercepts taps`);
  ok(await page.evaluate(()=>document.querySelector('.fun-scene i').getAnimations().some(a=>a.playState==='running')),`${skin}: background animates`);
  if(skin!=='bricks')ok(await page.evaluate(()=>getComputedStyle(document.querySelector('.tabbar'),'::before').backgroundImage.includes('svg')),`${skin}: vector character cameo`);
  await page.evaluate(()=>document.querySelectorAll('.tabbar').forEach(el=>{const a=el.getAnimations({subtree:true}).find(a=>a.animationName==='fun-peek');if(a){a.pause();a.currentTime=10000;}}));
  await page.waitForTimeout(900);await page.screenshot({path:`/tmp/expenity-${skin}-phone.png`});
  for(const width of [320,834,1440]){await page.setViewportSize({width,height:900});ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${skin}: ${width}px no horizontal overflow`);}
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>EXA.setMotion('off'));ok(await page.evaluate(()=>!document.querySelector('.fun-scene i').getAnimations().length&&getComputedStyle(document.querySelector('.tabbar'),'::before').display==='none'),`${skin}: motion off stops scenery and hides cameos`);
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>EXA.setMotion('auto'));ok(await page.evaluate(()=>document.documentElement.dataset.funMotion==='still'),`${skin}: system reduced motion respected`);await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>EXA.setMotion('full'));
  await page.reload();await page.waitForFunction(s=>window.EXA?.skin()===s,skin);ok(await page.locator('.fun-scene').count()===1,`${skin}: theme survives reload`);
 }
 await page.evaluate(()=>EXA.setSkin('emerald'));ok(await page.locator('.fun-scene').count()===0,'switching away cleans up scenery');
 await page.evaluate(()=>EXA.go('more','appearance'));for(const id of ['mario','bricks','minnie'])ok(await page.locator(`[data-skin-set=${id}]`).innerText().then(t=>!t.includes('theme_')),'localized picker label: '+id);
 ok(!errors.length,'no browser exceptions');
}finally{await browser.close();server.close();}

// Regression coverage for bounded counters, launch motion, neon/custom themes and photo controls.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,extname} from 'node:path';
const root=process.cwd(), out='/tmp/expenity-enhancements';mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{const file=join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'en-US'}),page=await ctx.newPage();let fails=0;const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const ok=(v,label)=>{console.log(v?'ok':'FAIL',label);if(!v)fails++;};
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.skipFlow);
 ok(await page.evaluate(()=>EX.state().settings.currency==='EUR'),'fresh accounts default to EUR even with a US browser locale');
 await page.evaluate(()=>{EXA.skipFlow();EXA.setMotion('full');EX.state().accounts[0].opening='4';EX.save();});
 for(const kind of ['expense','bill','wallet']){
 await page.evaluate(kind=>{if(kind==='expense')EXA.openTx();else if(kind==='bill')EXA.openBill();else EXA.openWallet();},kind);
 ok(await page.evaluate(()=>!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)),kind+' does not focus an input on mobile');
 await page.keyboard.press('Escape');await page.waitForTimeout(100);
 }
 for(const target of [4,-4,.01,1250.43]){
 const samples=await page.evaluate(async target=>{EX.state().accounts[0].opening=String(target);EX.save();EXA.go('home');const vals=[];for(let i=0;i<65;i++){await new Promise(requestAnimationFrame);const b=document.querySelector('.hero-front>b');vals.push(Number(b.textContent.replace(/[^\d.-]/g,'').replace('−','-')));}return vals;},target);
 ok(samples.every(n=>Math.abs(n)<=Math.abs(target)+.00001),'counter stays within '+target);
 ok(samples.every((n,i)=>i===0||Math.abs(n)>=Math.abs(samples[i-1])),'counter is monotonic for '+target);
 }
 await page.addInitScript(()=>{window.launchAnimated=false;const ob=new MutationObserver(()=>{if(document.querySelector('#view.enter'))window.launchAnimated=true;});ob.observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});});await page.reload();await page.waitForFunction(()=>!!window.EXA?.enter);ok(await page.evaluate(()=>window.launchAnimated),'app launch triggers entrance');
 for(const skin of ['amberwave','ion']){
  await page.evaluate(s=>{EXA.setMotion('full');EXA.setSkin(s);EXA.go('home');},skin);await page.waitForTimeout(1000);
  ok(await page.locator('.neon-trails i').count()===22,skin+' has a sparse trail background');
  ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('#view').scrollWidth<=document.querySelector('#view').clientWidth+1),skin+' fits phone width');
  await page.screenshot({path:join(out,skin+'-phone.png')});
 }
 await page.evaluate(()=>EXA.setMotion('off'));ok(await page.locator('.neon-trails').isHidden(),'motion off hides trails');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>EXA.setMotion('auto'));ok(await page.locator('.neon-trails').isHidden(),'device reduced motion hides trails');
 await page.evaluate(()=>{EXA.setSkin('custom');EXA.go('more','appearance');});await page.click('[data-custom-edit]');
 await page.locator('#customThemeForm [name=accent]').fill('#ffba52');await page.locator('#customThemeForm [name=trails]').check();await page.locator('#customThemeForm [type=submit]').click();
 ok(await page.evaluate(()=>EXA.customPalette().accent==='#ffba52'),'custom palette saves');await page.reload();await page.waitForFunction(()=>!!window.EXA?.customPalette);ok(await page.evaluate(()=>EXA.skin()==='custom'&&EXA.customPalette().accent==='#ffba52'),'custom palette survives reload');
 await page.evaluate(()=>{localStorage.setItem('expenity.custom',JSON.stringify({accent:'red;display:none',round:'999',ink:'#ffffff'}));EXA.applyCustomTheme();});ok(await page.evaluate(()=>EXA.customPalette().accent==='#89baff'&&EXA.customPalette().round==='1'),'custom colours and values are validated');
 const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=2400;c.height=1800;const g=c.getContext('2d');g.fillStyle='#efcc89';g.fillRect(0,0,c.width,c.height);g.fillStyle='#222';g.font='90px sans-serif';g.fillText('Expenity — reference receipt',120,180);return c.toDataURL('image/png');});
 const compressed=await page.evaluate(async data=>{const blob=new Blob([Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0))],{type:'image/png'});const jpg=await EXA.photos.compress(new File([blob],'receipt.png',{type:'image/png'}));const b=new Blob([Uint8Array.from(atob(jpg.split(',')[1]),c=>c.charCodeAt(0))],{type:'image/jpeg'});const img=await createImageBitmap(b);return {data:jpg,bytes:b.size,w:img.width,h:img.height};},image);
 ok(compressed.bytes<=96*1024&&compressed.w<=1280&&compressed.h<=1280,'large photo is resized and compressed');
 const id='ph_'+'A'.repeat(24);let uploads=0;
 await page.route('**/api/photos',async route=>{uploads++;await route.fulfill({json:{id,bytes:compressed.bytes},headers:{'Access-Control-Allow-Origin':'*'}});});
 await page.route('**/api/photos/'+id,route=>route.fulfill({json:{data:compressed.data,bytes:compressed.bytes},headers:{'Access-Control-Allow-Origin':'*'}}));
 await page.evaluate(()=>{EX.auth.isSignedIn=()=>true;EXA.setSkin('amberwave');EXA.setMotion('full');EXA.openTx(null,{amount:'12.50',name:'Receipt test'});});
 await page.locator('.photo-file').setInputFiles({name:'receipt.png',mimeType:'image/png',buffer:Buffer.from(image.split(',')[1],'base64')});
 await page.waitForFunction(()=>document.querySelector('.photo-slot [name=photo]')?.value.startsWith('ph_'));
 await page.click('[data-tx=save]');
 ok(uploads===1&&await page.evaluate(id=>EX.state().txs.some(x=>x.name==='Receipt test'&&x.photo===id),id),'transaction saves the uploaded photo ID');
 await page.evaluate(()=>EXA.openTx(EX.state().txs.find(x=>x.name==='Receipt test')));
 await page.click('[data-photo-view]');await page.waitForSelector('.photo-viewer img');ok(await page.locator('#sheet').isVisible(),'viewing a photo preserves the unfinished edit sheet');await page.screenshot({path:join(out,'photo-viewer-phone.png')});await page.locator('.photo-viewer button').click();await page.click('[data-photo-remove]');await page.click('[data-tx=save]');ok(await page.evaluate(()=>!EX.state().txs.find(x=>x.name==='Receipt test').photo),'removing a photo clears the reference');
 await page.setViewportSize({width:834,height:1194});await page.evaluate(()=>{EXA.setSkin('ion');EXA.go('home');});await page.waitForTimeout(1100);await page.screenshot({path:join(out,'ion-tablet.png')});
 ok(await page.evaluate(()=>document.querySelector('#view').scrollWidth<=document.querySelector('#view').clientWidth+1),'neon tablet layout has no sideways scrolling');
 ok(!errors.length,'no browser errors: '+errors.join('; '));
}finally{await browser.close();server.close();}
console.log('Screenshots: '+out);process.exit(fails?1:0);

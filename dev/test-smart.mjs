import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
const ok=(v,s)=>{assert(v,s);console.log('ok',s);};
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.smart);await page.evaluate(()=>{EXA.skipFlow();});
 await page.evaluate(()=>{const S=EX.state();S.settings.features={tier:'advanced'};S.settings.setupDone=true;S.device.onboarded=true;EX.save();EX.setLang('en');});await page.waitForTimeout(600);
 // 1. detection itself
 const det=await page.evaluate(()=>{const o={};for(const s of ['Coffee with Anna','Σούπερ μάρκετ Σκλαβενίτης','Taxi to airport','Netflix subscription','Pharmacy','gym membership','Electricity bill','Rent']){const d=EXA.smart.detect(s,{type:'expense',keepType:true});o[s]=[d.category,d.tags.join('+'),d.account?'wallet':''].join(' | ');}return o;});
 console.log(det);
 ok(det['Coffee with Anna'].startsWith('coffee'),'coffee is detected');
 ok(det['Taxi to airport'].startsWith('transport'),'a taxi is transport');
 ok(det['Electricity bill'].startsWith('utilities'),'electricity is utilities');
 // 2. in the entry form: type a description, category, tag and wallet follow
 await page.evaluate(()=>{EXA.openTx(null,{type:'expense'});});await page.waitForTimeout(500);
 await page.fill('#txDesc','Coffee with Anna');await page.waitForTimeout(900);
 const st=await page.evaluate(()=>({cat:document.querySelector('.catchip.on')?.dataset.txCat,note:document.querySelector('#smartNote')?.innerText||'',tags:document.querySelector('input[name=tags]')?.value}));
 console.log(st);
 ok(st.cat==='coffee','the category is filled in: '+st.cat);
 ok(/Coffee/.test(st.tags||''),'a generic tag is added: '+st.tags);
 ok(/Filled in for you/.test(st.note),'the note says what was filled in');
 // 3. a hand-picked category is not overwritten
 await page.fill('#txDesc','Coffee with Anna and cake');await page.waitForTimeout(900);
 ok(await page.evaluate(()=>document.querySelector('.catchip.on')?.dataset.txCat)==='coffee','still the same category after more typing');
 // 4. Undo
 await page.click('[data-smart-undo]');await page.waitForTimeout(400);
 ok(await page.evaluate(()=>!document.querySelector('.catchip.on')&&!document.querySelector('input[name=tags]').value),'Undo clears what was filled in');
 await page.fill('#txDesc','Coffee again');await page.waitForTimeout(900);
 ok(await page.evaluate(()=>!document.querySelector('.catchip.on')),'after Undo it does not fill again for this entry');
 // 5. off when the feature is off
 await page.evaluate(()=>{EXA.closeSheetForTest?.();UI.closeSheet(true);const S=EX.state();S.settings.features={tier:'basic'};EX.save();EXA.features.apply();});
 await page.evaluate(()=>{EXA.openTx(null,{type:'expense'});});await page.waitForTimeout(500);
 await page.fill('#txDesc','Coffee with Anna');await page.waitForTimeout(900);
 ok(await page.evaluate(()=>!document.querySelector('.catchip.on')&&!document.querySelector('#smartNote')),'nothing is filled in on the Basic plan');
 // 6. an income description switches a new entry to income, and Undo switches back
 await page.evaluate(()=>{const S=EX.state();S.settings.features={tier:'advanced'};EX.save();EXA.features.apply();UI.closeSheet(true);for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k.startsWith('expenity.entryDraft.v1:'))localStorage.removeItem(k);}});
 await page.evaluate(()=>{EXA.openTx(null,{type:'expense'});});await page.waitForTimeout(500);
 await page.fill('#txDesc','Salary for October');await page.waitForTimeout(1100);
 const inc=await page.evaluate(()=>({title:document.querySelector('#sheetTitle')?.textContent,cat:document.querySelector('.catchip.on')?.dataset.txCat,note:document.querySelector('#smartNote')?.innerText||'',desc:document.querySelector('#txDesc')?.value}));
 console.log(inc);
 ok(/income/i.test(inc.title||'')&&inc.cat==='salary','"Salary for October" switches to income with the Salary category: '+inc.title+' / '+inc.cat);
 ok(inc.desc==='Salary for October','the description is kept');
 await page.click('[data-smart-undo]');await page.waitForTimeout(500);
 ok(await page.evaluate(()=>!/income/i.test(document.querySelector('#sheetTitle')?.textContent||'')),'Undo switches back to an expense');
 // a hand-chosen type is never switched
 await page.evaluate(()=>UI.closeSheet(true));
 await page.evaluate(()=>{EXA.openTx(null,{type:'expense'});});await page.waitForTimeout(500);
 await page.click('[data-entry=type]').catch(()=>{});await page.waitForTimeout(200);
 await page.click('[data-tx-type=expense]').catch(()=>{});await page.waitForTimeout(300);
 await page.fill('#txDesc','Refund from the shop');await page.waitForTimeout(1100);
 ok(await page.evaluate(()=>!/income/i.test(document.querySelector('#sheetTitle')?.textContent||'')),'a type chosen by hand is left alone');
 ok(errors.length===0,'no errors '+errors.join('|'));
}catch(e){console.log('FAIL',e.message,errors);process.exitCode=1;}
await browser.close();server.close();

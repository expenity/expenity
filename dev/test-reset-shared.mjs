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
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.resetAccount);
 await page.evaluate(()=>{EXA.skipFlow();const S=EX.state();S.device.onboarded=true;S.settings.setupDone=true;EX.setLang('en');
  S.accounts.length||S.accounts.push({id:'a1',name:'Cash',type:'cash',currency:'EUR',opening:'0'});
  S.accounts.push({id:'w2',name:'Family',type:'bank',currency:'EUR',opening:'0',space:'sp1'},{id:'w3',name:'Trip',type:'bank',currency:'EUR',opening:'0',space:'sp2'});
  S.sync.spaces={sp1:{name:'Family',role:'owner',owner:true,members:2,rev:0,base:{}},sp2:{name:'Trip',role:'editor',owner:false,members:2,rev:0,base:{}}};
  window.__calls=[];EX.spaces.stop=async id=>{window.__calls.push('stop '+id);return {ok:true};};EX.spaces.leave=async id=>{window.__calls.push('leave '+id);return {ok:true};};
  EX.auth.isSignedIn=()=>true;EX.auth.stepUp=async()=>({ok:true,token:'t'});EX.api=async()=>({ok:true,json:{}});EX.sync.run=async()=>{};EX.save();window.__done=null;EXA.resetAccount().then(()=>{window.__done=true;});});
 await page.waitForTimeout(500);
 const first=await page.evaluate(()=>document.querySelector('#sheet')?.innerText||'');console.log(first.replace(/\n+/g,' | ').slice(0,260));
 ok(/Shared wallets/.test(first)&&/Family/.test(first)&&/Trip/.test(first),'a reset with shared wallets shows them instead of refusing');
 ok(/sharing stops/.test(first)&&/leave this wallet/.test(first),'it says what happens to each one');
 await page.click('#confirmYes');await page.waitForTimeout(500);
 ok(await page.evaluate(()=>JSON.stringify(window.__calls))==='["stop sp1","leave sp2"]','the owner stops sharing and the member leaves: '+await page.evaluate(()=>JSON.stringify(window.__calls)));
 ok(await page.evaluate(()=>!!document.querySelector('#confirmWord')),'then the normal RESET confirmation follows');
 await page.fill('#confirmWord','RESET');await page.click('#confirmYes');await page.waitForTimeout(800);
 ok(await page.evaluate(()=>EX.state().accounts.every(a=>!a.space)&&EX.state().settings.setupDone===false),'the reset completes');
 ok(errors.length===0,'no errors '+errors.join('|'));
}catch(e){console.log('FAIL',e.message,errors);process.exitCode=1;}
await browser.close();server.close();

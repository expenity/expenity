// Real service-worker upgrade using a local server, with no production API calls.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),current=/EXPENITY_VERSION = '([^']+)'/.exec(readFileSync('app.js','utf8'))[1],next='99.0.0';let upgraded=false;
const server=createServer((req,res)=>{const path=req.url.split('?')[0],file=join(root,path==='/'?'index.html':path);if(!existsSync(file)){res.writeHead(404).end();return;}let body=readFileSync(file);if(path==='/releases.json'&&upgraded){const json=JSON.parse(body);json.version=next;json.releases.unshift({version:next,en:['Upgrade regression fixture'],el:['Δοκιμή ενημέρωσης']});body=Buffer.from(JSON.stringify(json));}if(path==='/app.js'&&upgraded)body=Buffer.from(body.toString().replace(`EXPENITY_VERSION = '${current}'`,`EXPENITY_VERSION = '${next}'`));if(path==='/sw.js'&&upgraded)body=Buffer.from(body.toString().replace(/const CACHE = '[^']+'/,'const CACHE = \'expenity-v-upgrade-fixture\''));res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.mp4':'video/mp4','.webmanifest':'application/manifest+json'})[extname(file)]||'application/octet-stream');res.end(body);}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(15000);
const ok=(condition,label)=>{assert(condition,label);console.log('ok',label);};
try{
 await page.goto(`http://localhost:${server.address().port}/`);await page.waitForFunction(()=>!!window.EXA?.skipFlow);await page.evaluate(()=>{EXA.skipFlow();EXA.setMotion('off');});await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await context.setOffline(true);const ranges=await page.evaluate(async()=>{const first=await fetch('installation/ios-en.mp4',{headers:{Range:'bytes=0-31'}}),suffix=await fetch('installation/ios-en.mp4',{headers:{Range:'bytes=-64'}}),bad=await fetch('installation/ios-en.mp4',{headers:{Range:'bytes=999999999-'}});return {first:first.status,len:(await first.arrayBuffer()).byteLength,range:first.headers.get('content-range'),suffix:suffix.status,suffixLen:(await suffix.arrayBuffer()).byteLength,bad:bad.status};});ok(ranges.first===206&&ranges.len===32&&ranges.range.startsWith('bytes 0-31/')&&ranges.suffix===206&&ranges.suffixLen===64&&ranges.bad===416,'offline video supports normal, suffix and invalid byte ranges');await context.setOffline(false);
 await page.evaluate(()=>{localStorage.setItem('expenity.releaseSeen','0.9.0');return EXA.showReleases(true);});
 const catchup=await page.locator('.release-notes').innerText();ok(catchup.includes('0.10.0')&&catchup.includes('Scan a receipt')&&catchup.includes('Safe to spend')&&!catchup.includes('0.9.0'),'popup includes all missed features and excludes previously viewed releases');await page.click('[data-close]');await page.waitForTimeout(350);
 await page.evaluate(()=>EXA.go('more','account'));upgraded=true;await page.click('[data-act=check-update]');await page.waitForSelector('[data-act=apply-update]');
 ok((await page.locator('#updLine').innerText()).includes('downloaded'),'check update downloads a new worker before offering restart');
 await page.click('[data-act=apply-update]');await page.waitForFunction(next=>window.EXPENITY_VERSION===next,next);await page.waitForSelector('.release-notes');
 ok((await page.locator('.release-notes').innerText()).includes('Upgrade regression fixture'),'update displays release notes after restart');
 await page.click('[data-close]');await page.waitForTimeout(350);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.EXA?.enhancementsInit);await page.waitForTimeout(2100);
 ok(await page.locator('.release-notes').count()===0,'release popup is shown only once');
 await page.evaluate(()=>EXA.go('more','account'));await page.click('[data-release-notes]');await page.waitForSelector('.release-notes details');ok(await page.locator('.release-notes details').count()>=3,'past release notes remain available on demand');
 ok(!errors.length,'update cycle has no browser exceptions: '+errors.join('; '));
}finally{await browser.close();server.close();}

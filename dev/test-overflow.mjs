import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const out='/tmp/expenity-overflow';mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'})[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(10000);
const ok=(v,s)=>{assert(v,s);console.log('ok',s);};
const bad=[];
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.features);await page.evaluate(()=>{(EXA.skipFlow(),EX.state().device.entryMode='casual');});
 for(const lang of ['en','el'])for(const skin of ['sunset','mario','synthwave'])for(const w of [320,360,412]){
  await page.setViewportSize({width:w,height:800});await page.evaluate(([l,s])=>{EX.setLang?EX.setLang(l):0;EXA.setSkin(s);},[lang,skin]);
  for(const [v,m] of [['home','root'],['more','root'],['more','features'],['more','appearance'],['more','sounds'],['more','reminders'],['more','data'],['plan','root'],['bills','root'],['reports','root'],['activity','root']]){
   await page.evaluate(([v,m])=>EXA.go(v,m),[v,m]);await page.waitForTimeout(150);
   const r=await page.evaluate(()=>{const W=document.documentElement.clientWidth,out=[];document.querySelectorAll('#view *').forEach(e=>{const b=e.getBoundingClientRect();if(b.width&&b.right>W+1&&!e.closest('.fx-table-wrap,.chips,.chip-scroll,.sw-actions,.swiper'))out.push(e.tagName+'.'+String(e.className).slice(0,30)+' '+Math.round(b.right));});return {sw:document.querySelector('#view').scrollWidth>W+1,out:out.slice(0,3)};});
   if(r.sw||r.out.length)bad.push(`${lang} ${skin} ${w} ${v}/${m}: ${JSON.stringify(r)}`);
  }}
 console.log(bad.length?bad.slice(0,25).join('\n'):'no overflow found');console.log('total',bad.length);
}finally{await browser.close();server.close();}

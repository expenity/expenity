// Every theme, light and dark, every status level: text on a tinted row must stay readable (WCAG AA, 4.5:1).
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';import {readFileSync,existsSync} from 'node:fs';import {join,extname} from 'node:path';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer((req,res)=>{const u=req.url.split('?')[0];const f=join(process.cwd(),u==='/'?'index.html':u);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.themePicker);
const all=await page.evaluate(()=>{
 EXA.skipFlow();const skins=['emerald','minimal','mobie','paper','ledger','terminal','synthwave','amberwave','ion','blueprint','candy','oled','glass','sunset','chalk','vader','mario','bricks','minnie'];
 const cv=document.createElement('canvas').getContext('2d',{willReadFrequently:true});cv.canvas.width=cv.canvas.height=1;
 const rgb=(css)=>{cv.clearRect(0,0,1,1);cv.fillStyle='#000';cv.fillStyle=css;cv.fillRect(0,0,1,1);const d=cv.getImageData(0,0,1,1).data;return [d[0],d[1],d[2]];};
 const lum=([r,g,b])=>{const f=c=>{c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b);};
 const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 const html=document.documentElement,out=[];const nt=document.createElement('style');nt.textContent='*,*::before,*::after{transition:none!important;animation:none!important}';document.head.appendChild(nt);
 for(const skin of skins){for(const mode of ['light','dark']){for(const level of ['normal','full']){for(const st of ['soon','late','paid']){
  if(skin==='emerald')delete html.dataset.skin;else html.dataset.skin=skin;html.dataset.theme=mode;html.dataset.status=level;
  EXA.pillInk();const li=document.createElement('li');li.className='bm-row '+st;li.innerHTML='<div class="bm-front"><span class="mid"><b>Name</b><small>Category</small></span></div>';document.body.appendChild(li);
  const f=li.querySelector('.bm-front'),b=li.querySelector('.mid b'),s=li.querySelector('.mid small');
  const pl=document.createElement('span');pl.className='bm-pill '+st;pl.textContent='Paid';f.appendChild(pl);const pr=ratio(rgb(getComputedStyle(pl).color),rgb(getComputedStyle(pl).backgroundColor));
  const bg=rgb(getComputedStyle(f).backgroundColor);out.push({skin,mode,level,st,pill:pr,main:ratio(rgb(getComputedStyle(b).color),bg),sub:ratio(rgb(getComputedStyle(s).color),bg)});li.remove();}}}}
 return out;});
const res=all.filter(r=>r.level==='full'||r.st!=='paid'); // untinted rows keep the theme's own text colours
const low2=res.filter(r=>r.sub<4.5);console.log('secondary text under 4.5:',low2.length,low2.slice(0,6).map(r=>[r.skin,r.mode,r.level,r.st,r.sub.toFixed(2)].join(' ')).join(' | '));
const bad=res.filter(r=>r.main<4.5||r.sub<4.5||r.pill<4.5);console.log('lowest pill text',Math.min(...res.map(r=>r.pill)).toFixed(2));
console.log('checked',res.length,'combinations; lowest main text',Math.min(...res.map(r=>r.main)).toFixed(2),'lowest secondary',Math.min(...res.map(r=>r.sub)).toFixed(2));
bad.slice(0,15).forEach(r=>console.log('LOW',r.skin,r.mode,r.level,r.st,r.main.toFixed(2),r.sub.toFixed(2)));
console.log(bad.length?'FAIL '+bad.length+' low-contrast combinations':'ok every theme stays readable');
if(bad.length)process.exitCode=1;
await browser.close();server.close();

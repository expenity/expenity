import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,extname} from 'node:path';
import assert from 'node:assert/strict';
const out='/tmp/expenity-custom-theme';mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'})[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(10000);
const ok=(v,s)=>{assert(v,s);console.log('ok',s);};
try{
 await page.route('**/api/**',r=>r.abort());await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.editHomeAppearance);await page.evaluate(()=>{EXA.skipFlow();EXA.setSkin('mario');EXA.setMotion('off');});
 const begin=()=>page.evaluate(()=>{const b=document.createElement('button');b.dataset.homeSettings='';document.body.append(b);b.click();b.remove();});
 await begin();await page.click('[data-dash-appearance]');
 ok(await page.locator('select[name=font] option').count()===13,'13 fonts including ten additions');
 await page.click('[data-palette-preset="1"]');await page.selectOption('[name=font]','comfortaa');await page.selectOption('[name=round]','0');await page.click('#customThemeForm [type=submit]');
 ok(await page.evaluate(()=>EXA.skin()==='mario'&&getComputedStyle(document.documentElement).getPropertyValue('--rk').trim()==='0'&&!EX.state().settings.themeLooks),'appearance previews without changing template or saving');
 await page.click('[data-dash-cancel]');ok(await page.evaluate(()=>!EX.state().settings.themeLooks&&getComputedStyle(document.documentElement).getPropertyValue('--rk').trim()!== '0'),'Cancel discards staged appearance');
 await begin();await page.click('[data-dash-appearance]');await page.click('[data-palette-preset="1"]');await page.selectOption('[name=font]','comfortaa');await page.selectOption('[name=round]','0');await page.click('#customThemeForm [type=submit]');await page.click('[data-dash-done]');
 ok(await page.evaluate(()=>EX.state().settings.themeLooks.mario.font==='comfortaa'&&EX.state().settings.themeLooks.mario.round==='0'),'Done saves font and corners in synced settings');
 await page.reload();await page.waitForFunction(()=>!!window.EXA?.editHomeAppearance);ok(await page.evaluate(()=>getComputedStyle(document.body).fontFamily.includes('Comfortaa')&&EXA.skin()==='mario'),'style and theme survive reload');
 const faces=await page.evaluate(async()=>{const fonts=['Noto Sans','Noto Serif','Roboto','Roboto Slab','Open Sans','Fira Sans','Comfortaa','Alegreya','Literata','Geologica'];return Promise.all(fonts.map(async f=>[f,(await document.fonts.load('400 16px "'+f+'"','Αθήνα Expenity')).length]));});ok(faces.every(x=>x[1]>0),'all ten bundled fonts load Greek and Latin');
 for(const lang of ['en','el'])for(const width of [320,834,1440]){await page.setViewportSize({width,height:1000});await page.evaluate(l=>{EX.setLang(l);EXA.go('home');},lang);await begin();await page.click('[data-dash-appearance]');ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.querySelector('#customThemeForm').scrollWidth<=document.querySelector('#customThemeForm').clientWidth+1),lang+' '+width+' editor fits');await page.click('#sheet [data-close]');await page.click('[data-dash-cancel]');}
 await begin();await page.click('[data-dash-appearance]');await page.click('[data-look-reset]');await page.click('[data-dash-done]');ok(await page.evaluate(()=>!EX.state().settings.themeLooks.mario),'reset restores template without changing layout');
 ok(!errors.length,'no runtime errors: '+errors.join('; '));
}finally{await browser.close();server.close();}

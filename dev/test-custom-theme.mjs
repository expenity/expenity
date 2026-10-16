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
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.customPalette);await page.evaluate(()=>{EXA.skipFlow();EXA.setMotion('off');EXA.go('more','appearance');});
 ok(await page.locator('.theme-grid [data-skin-set=custom]').count()===0,'custom theme is not a preset template');ok(await page.locator('.theme-grid .theme-card').count()===18,'all eighteen preset templates remain');
 ok(await page.locator('.custom-theme-section [data-custom-edit]').isVisible(),'create/edit custom theme is always visible without selecting a template first');await page.screenshot({path:out+'/appearance-phone.png'});
 await page.click('[data-custom-edit]');ok(await page.locator('[data-palette-preset]').count()===6,'six visible starting palettes');
 for(const key of ['bg','surface','accent','ink','icons']){ok(await page.locator(`#customThemeForm [name=${key}]`).isVisible()&&await page.locator(`[data-palette-hex=${key}]`).isVisible(),`${key} has colour-picker and editable hex controls`);}
 ok(await page.locator('#palettePreview svg').count()>=7,'live preview includes navigation and transaction icons');
 for(let i=0;i<6;i++){await page.click(`[data-palette-preset="${i}"]`);ok(await page.locator('#paletteError').isHidden()&&!await page.locator('#customThemeForm [type=submit]').isDisabled(),`starting palette ${i} has valid readable contrast`);}
 await page.click('[data-palette-preset="1"]');await page.locator('[data-palette-hex=accent]').fill('#FFCA70');ok(await page.locator('#customThemeForm [name=accent]').inputValue()==='#ffca70','hex control updates colour picker');
 await page.locator('#customThemeForm [name=icons]').fill('#ffe3ad');ok(await page.locator('[data-palette-hex=icons]').inputValue()==='#FFE3AD','colour picker updates hex control');
 ok(await page.locator('#palettePreview').evaluate(e=>getComputedStyle(e).getPropertyValue('--preview-icon').trim()==='#ffe3ad'),'icon colour updates live preview');
 await page.locator('[data-palette-hex=ink]').fill('#NOPE');ok(await page.locator('#paletteError').isVisible()&&await page.locator('#customThemeForm [type=submit]').isDisabled(),'invalid hex is explained and cannot be saved');
 await page.locator('[data-palette-hex=ink]').fill('#FFF2D6');await page.locator('[data-palette-hex=bg]').fill('#FFF2D6');ok(await page.locator('#paletteError').isVisible(),'unreadable text/background combinations are rejected');await page.locator('[data-palette-hex=bg]').fill('#120C07');
 await page.selectOption('#customThemeForm [name=font]','mono');await page.selectOption('#customThemeForm [name=round]','1.5');await page.screenshot({path:out+'/editor-phone.png'});await page.locator('#customThemeForm [type=submit]').click();await page.waitForTimeout(250);
 ok(await page.evaluate(()=>EXA.skin()==='custom'&&EXA.customPalette().accent==='#ffca70'&&EXA.customPalette().icons==='#ffe3ad'&&EXA.customPalette().font==='mono'),'save applies custom palette, icon colour and typography');
 await page.reload();await page.waitForFunction(()=>!!window.EXA?.customPalette);ok(await page.evaluate(()=>EXA.skin()==='custom'&&EXA.customPalette().accent==='#ffca70'),'custom theme survives reload');
 const contrast=await page.evaluate(()=>{const b=document.querySelector('.fab'),i=b.querySelector('.i');return {button:getComputedStyle(b).backgroundColor,icon:getComputedStyle(i).color};});ok(contrast.button!==contrast.icon,'custom theme keeps the Add icon distinguishable from its button');
 await page.evaluate(()=>EXA.go('more','appearance'));await page.click('[data-custom-edit]');await page.click('[data-palette-preset="3"]');await page.click('#sheet [data-close]');await page.waitForTimeout(250);ok(await page.evaluate(()=>EXA.customPalette().accent==='#ffca70'),'cancelling changes leaves the saved palette intact');
 for(const lang of ['en','el'])for(const width of [320,390,834,1440]){await page.setViewportSize({width,height:width<600?844:1100});await page.evaluate(lang=>{EX.setLang(lang);EXA.go('more','appearance');},lang);await page.click('[data-custom-edit]');ok(await page.evaluate(()=>{const s=document.querySelector('.sheet-body');return s.scrollWidth<=s.clientWidth+1;}),`${lang} ${width}px custom editor fits without sideways scrolling`);await page.screenshot({path:`${out}/editor-${lang}-${width}.png`});await page.click('#sheet [data-close]');await page.waitForTimeout(150);}
 ok(!errors.length,'custom theme has no browser errors: '+errors.join('; '));
}finally{await browser.close();server.close();}

// Captures the start screen in a few themes for the docs and the website (docs/images/splash-*.png).
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';import {readFileSync,existsSync} from 'node:fs';import {join,extname} from 'node:path';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer((req,res)=>{const u=req.url.split('?')[0];const f=join(process.cwd(),u==='/'?'index.html':u);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const b=await chromium.launch({channel:'chrome'});
for(const [skin,theme] of [['mario',''],['vader',''],['minnie',''],['synthwave','']]){
 const c=await b.newContext({viewport:{width:390,height:760},deviceScaleFactor:2,isMobile:true,serviceWorkers:'block'}),p=await c.newPage();
 await p.addInitScript(([s,t])=>{Object.defineProperty(navigator,'webdriver',{get:()=>false});localStorage.setItem('expenity.skin',s);localStorage.setItem('expenity.lang','en');},[skin,theme]);
 await p.goto(`http://localhost:${server.address().port}`,{waitUntil:'commit'});await p.waitForTimeout(1500);
 await p.screenshot({path:`docs/images/splash-${skin}.png`});await c.close();}
await b.close();server.close();

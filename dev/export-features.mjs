// Reads the real feature list and plans from the app (names in English and Greek) and writes website/features.json and the
// feature tables in docs/features-and-plans.md and docs/el/features-and-plans.md. Run by bin/publish-site.sh, so they cannot drift.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';import {readFileSync,writeFileSync,existsSync} from 'node:fs';import {join,extname} from 'node:path';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer((req,res)=>{const u=req.url.split('?')[0];const f=join(process.cwd(),u==='/'?'index.html':u);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage();
await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.features&&!!window.EXA?.smart);
const data=await page.evaluate(()=>{const out={core:[],features:[]};
 for(const lang of ['en','el']){EX.setLang(lang);
  EXA.features.core.forEach((id,i)=>{(out.core[i]=out.core[i]||{id})[lang]=EX.t('fxCore_'+id);});
  EXA.features.list.forEach((f,i)=>{const o=(out.features[i]=out.features[i]||{id:f.id,tier:f.tier});o[lang]=EX.t('fx_'+f.id);o['d_'+lang]=EX.t('fxD_'+f.id);});}
 return out;});
await browser.close();server.close();
const pro=data.features.filter(f=>f.tier==='pro'),adv=data.features.filter(f=>f.tier==='advanced');
data.counts={basic:data.core.length,pro:data.core.length+pro.length,advanced:data.core.length+pro.length+adv.length};
writeFileSync('website/features.json',JSON.stringify(data,null,1)+'\n');
const T={en:{h:'Feature',all:'Always included',pro:'Added in Pro',adv:'Added in Advanced',intro:n=>`Basic has **${n.basic}** features, Pro **${n.pro}** and Advanced **${n.advanced}**. A tick means the feature is included. In your own mix you can switch any optional feature on or off.`},
 el:{h:'Λειτουργία',all:'Πάντα συμπεριλαμβάνονται',pro:'Προστίθενται στο Pro',adv:'Προστίθενται στο Advanced',intro:n=>`Το Basic έχει **${n.basic}** λειτουργίες, το Pro **${n.pro}** και το Advanced **${n.advanced}**. Το ✓ σημαίνει ότι η λειτουργία περιλαμβάνεται. Στο δικό σας μείγμα μπορείτε να ενεργοποιήσετε ή να απενεργοποιήσετε κάθε προαιρετική λειτουργία.`}};
const rows=(list,l,a,b,c)=>list.map(f=>`| ${f[l]} | ${a} | ${b} | ${c} |`).join('\n');
for(const l of ['en','el']){const t=T[l],f=l==='en'?'docs/features-and-plans.md':'docs/el/features-and-plans.md';
 const md=`<!-- features:start -->\n${t.intro(data.counts)}\n\n| ${t.h} | Basic | Pro | Advanced |\n|---|:-:|:-:|:-:|\n| **${t.all}** | | | |\n${rows(data.core,l,'✓','✓','✓')}\n| **${t.pro}** | | | |\n${rows(pro,l,'–','✓','✓')}\n| **${t.adv}** | | | |\n${rows(adv,l,'–','–','✓')}\n<!-- features:end -->`;
 let s=readFileSync(f,'utf8');
 if(s.includes('<!-- features:start -->'))s=s.replace(/<!-- features:start -->[\s\S]*<!-- features:end -->/,md);
 else s=s.replace(l==='en'?'## Compare and customise':'## Σύγκριση και προσαρμογή',(l==='en'?'## All features by plan':'## Όλες οι λειτουργίες ανά πακέτο')+'\n\n'+md+'\n\n'+(l==='en'?'## Compare and customise':'## Σύγκριση και προσαρμογή'));
 writeFileSync(f,s);}
console.log('features:',JSON.stringify(data.counts));

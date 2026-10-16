// Focused smoke check for tap-to-edit amounts and dismissing input controls.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {join,extname} from 'node:path';
const server=createServer((req,res)=>{const f=join(process.cwd(),req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(f)]||'application/octet-stream');res.end(readFileSync(f));}).listen(0);
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const assert=(c,msg)=>{if(!c)throw Error(msg);console.log('ok',msg);};
try{
 await page.goto(`http://localhost:${server.address().port}`);await page.waitForFunction(()=>!!window.EXA?.openTx);
 await page.evaluate(()=>{EXA.skipFlow();EXA.openTx();});
 assert(await page.locator('#txKeypad').isHidden(),'amount keypad starts closed');
 await page.screenshot({path:'/tmp/expenity-expense-pad-closed.png'});
 await page.click('[data-tx=target-amount]');assert(await page.locator('#txKeypad').isVisible(),'tapping amount opens keypad');
 for(const k of '123')await page.click(`[data-key="${k}"]`);
 await page.click('[data-tx=amount-done]');assert(await page.locator('#txKeypad').isHidden(),'Done collapses keypad');
 assert((await page.locator('#amtVal').innerText()).includes('123'),'Done keeps the entered amount');
 assert(await page.evaluate(()=>EX.state().txs.length===0&&UI.sheetOpen()),'amount confirmation does not save or close the form');
 await page.fill('#txDesc','Lunch');assert(await page.locator('[data-tx=field-done]').isVisible(),'text editing offers a Done checkmark');
 await page.click('[data-tx=field-done]');assert(await page.evaluate(()=>!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)),'text Done removes input focus');
 await page.click('[data-tx=save]');assert(await page.evaluate(()=>EX.state().txs.some(x=>x.name==='Lunch'&&x.amount==='123')),'Save records the confirmed amount and description');
 await page.evaluate(()=>EXA.go('home'));
 assert(await page.locator('#view .goals-discovery').count()>0,'Home highlights Budgets & goals until discovered');
 await page.evaluate(()=>EXA.go('plan'));
 assert(await page.locator('#appbar').innerText().then(x=>x.includes('Budgets & goals')),'section has its descriptive name');
 assert(await page.locator('[data-plan=tab]').count()===2,'section contains only budgets and goals');
 await page.evaluate(()=>EXA.go('home'));
 assert(await page.locator('.goals-discovery').count()===0,'discovery dot stops after visiting');
 await page.click('[data-idea=all]');
 assert(await page.evaluate(()=>EXA.st.view==='home'&&EXA.st.ideasExpanded),'Ideas expands on Home');
 await page.evaluate(()=>EXA.go('activity'));await page.click('[data-txtype=income]');await page.click('[data-income-mode=recurring]');
 assert(await page.locator('[data-plan=add-income]').isVisible(),'Recurring income lives under Activity Income');
 await page.screenshot({path:'/tmp/expenity-income-navigation.png'});

 await page.evaluate(()=>{EXA.openTx(null,{amount:'8',name:'Coffee'});});await page.check('#rememberName');await page.click('[data-tx=save]');await page.waitForTimeout(100);
 await page.evaluate(()=>EXA.openTx());await page.locator('.saved-names summary').click();await page.click('[data-tx-saved="0"]');
 assert(await page.locator('#txDesc').inputValue()==='Coffee','saved expense names can be reused');
 await page.keyboard.press('Escape');await page.waitForTimeout(100);
 await page.evaluate(()=>{EX.state().accounts[0].name='Μετρητά';EX.setLang('en');EXA.openTx();});
 assert(await page.locator('[data-tx-wallet]').first().innerText().then(x=>x.includes('Cash')),'legacy default wallets follow English UI language');
 await page.keyboard.press('Escape');await page.waitForTimeout(100);
 await page.evaluate(()=>{EX.setLang('el');EXA.openTx();});
 assert(await page.locator('[data-tx-wallet]').first().innerText().then(x=>x.includes('Μετρητά')),'built-in wallet labels follow Greek UI language');
 await page.keyboard.press('Escape');await page.waitForTimeout(100);await page.evaluate(()=>EX.setLang('en'));
 await page.evaluate(()=>{EX.auth.isSignedIn=()=>true;EXA.go('more','account');});
 assert(await page.locator('[data-act=delete-photos]').isVisible(),'Account offers Delete all photos');

}finally{await browser.close();server.close();}

// Record original canvas animations as compact silent H.264 MP4s (not real-device recordings).
// Reference paths: Apple iPhone User Guide iphea86e5236; Chrome Help 9658361; Apple 104996.
import {chromium} from 'playwright-core';
import {mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const dir='installation';mkdirSync(dir,{recursive:true});
const icon='data:image/png;base64,'+readFileSync('icon-192.png').toString('base64');
const browser=await chromium.launch({channel:'chrome',args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const scripts={en:{ios:['Open Share in Safari','Add to Home Screen','Keep Open as Web App on · Add','Open Expenity from Home'],android:['Open the Chrome menu','Install and create shortcut','Confirm Install','Open the Expenity app'],desktop:['Find Install in Chrome','Choose Install page as app','Confirm Install','Open Expenity from your launcher'],share:'Share',home:'Add to Home Screen',install:'Install',shortcut:'Install and create shortcut',asApp:'Open as Web App',add:'Add',continue:'Continue setup',menu:'Browser menu',caption:'Illustrative guide · 12 seconds',ready:'Your app is ready'},el:{ios:['Ανοίξτε την Κοινή χρήση στο Safari','Προσθήκη στην Αρχική οθόνη','Άνοιγμα ως εφαρμογή Ιστού · Προσθήκη','Ανοίξτε το Expenity από την Αρχική'],android:['Ανοίξτε το μενού του Chrome','Εγκατάσταση και δημιουργία συντόμευσης','Επιβεβαιώστε την Εγκατάσταση','Ανοίξτε την εφαρμογή Expenity'],desktop:['Βρείτε την Εγκατάσταση στο Chrome','Εγκατάσταση σελίδας ως εφαρμογής','Επιβεβαιώστε την Εγκατάσταση','Ανοίξτε το Expenity από τις εφαρμογές'],share:'Κοινή χρήση',home:'Προσθήκη στην Αρχική οθόνη',install:'Εγκατάσταση',shortcut:'Εγκατάσταση και δημιουργία συντόμευσης',asApp:'Άνοιγμα ως εφαρμογή Ιστού',add:'Προσθήκη',continue:'Συνέχεια ρύθμισης',menu:'Μενού περιήγησης',caption:'Κινούμενος οδηγός · 12 δευτερόλεπτα',ready:'Η εφαρμογή είναι έτοιμη'}};
try{await Promise.all(['en','el'].flatMap(lang=>['ios','android','desktop'].filter(platform=>!process.argv[2]||`${platform}-${lang}`===process.argv[2]).map(async platform=>{
 const context=await browser.newContext({viewport:{width:600,height:700}}),page=await context.newPage();
 await page.setContent('<html><body style="margin:0"><canvas width="600" height="700"></canvas></body></html>');
 await page.evaluate(async({platform,lang,t,icon})=>{
  const c=document.querySelector('canvas'),g=c.getContext('2d'),img=new Image();img.src=icon;await img.decode();
  const rr=(x,y,w,h,r,color)=>{g.fillStyle=color;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();};
  const txt=(s,x,y,size=18,color='#183a32',weight=600)=>{g.fillStyle=color;g.font=`${weight} ${size}px system-ui,sans-serif`;g.fillText(s,x,y);};
  const wrap=(s,x,y,max,size=19,color='#183a32')=>{g.font=`600 ${size}px system-ui,sans-serif`;const ws=s.split(' ');let line='';for(const w of ws){if(g.measureText(line+w).width>max&&line){txt(line.trim(),x,y,size,color);y+=size*1.4;line='';}line+=w+' ';}txt(line.trim(),x,y,size,color);};
  const app=(x,y,w,h)=>{rr(x,y,w,h,18,'#f0f7f4');g.drawImage(img,x+16,y+17,32,32);txt('Expenity',x+60,y+41,20);rr(x+16,y+67,w-32,100,18,'#0a8f6a');txt('€ 1,250',x+32,y+108,28,'#fff',800);for(let i=0;i<3;i++)rr(x+16,y+184+i*48,w-32,35,10,'#fff');};
  const tap=(x,y,time)=>{const pulse=(time%800)/800;g.strokeStyle=`rgba(10,143,106,${1-pulse})`;g.lineWidth=3;g.beginPath();g.arc(x,y,12+22*pulse,0,7);g.stroke();g.fillStyle='#0a8f6a';g.beginPath();g.arc(x,y,7,0,7);g.fill();};
  const draw=ms=>{
   const step=Math.min(3,Math.floor(ms/3000)),local=ms%3000;
   g.clearRect(0,0,600,700);rr(0,0,600,700,0,'#edf7f3');rr(20,20,560,660,32,'#e0f1e9');
   txt(platform==='ios'?'iPhone · Safari':platform==='android'?'Android · Chrome':lang==='el'?'Υπολογιστής · Chrome':'Desktop · Chrome',40,53,22,'#0a6e55',800);
   const desktop=platform==='desktop',x=desktop?44:161,y=desktop?150:78,w=desktop?512:278,h=desktop?350:450;
   rr(x-6,y-6,w+12,h+12,desktop?22:35,'#102d25');rr(x,y,w,h,desktop?16:30,'#fff');
   if(step===3){
    rr(x,y,w,h,desktop?16:30,'#dceee6');for(let i=0;i<8;i++)rr(x+22+(i%4)*(w-38)/4,y+30+Math.floor(i/4)*70,38,38,11,'#c5d9d0');
    g.drawImage(img,x+22,y+30,45,45);txt('Expenity',x+18,y+96,12);tap(x+44,y+52,local);
    if(local>1400){app(x+8,y+8,w-16,h-16);rr(x+24,y+h-85,w-48,48,12,'#0a8f6a');wrap(t.continue,x+38,y+h-55,w-70,15,'#fff');}
   }else{
    app(x+7,y+46,w-14,h-54);
    rr(x+8,y+9,w-16,33,15,'#e7eeeb');txt('expenity.github.io',x+22,y+31,12,'#53675f');txt(platform==='ios'?'⋯':'⋮',x+w-30,y+32,22);
    if(platform==='ios'){
     rr(x+8,y+h-44,w-16,34,10,'#edf3f0');txt('‹',x+25,y+h-18,23);txt('↑',x+w/2-6,y+h-18,22,'#0a8f6a');g.strokeStyle='#0a8f6a';g.strokeRect(x+w/2-12,y+h-33,24,24);
     if(step===0)tap(x+w/2,y+h-23,local);
    }else if(step===0)tap(x+w-23,y+25,local);
    if(step===1){
     const mx=desktop?x+200:x+12,my=y+(platform==='ios'?h-235:51),mw=desktop?280:w-24;
     rr(mx,my,mw,210,18,'#fff');txt(platform==='ios'?t.share:t.menu,mx+16,my+32,15);
     for(let i=0;i<2;i++)rr(mx+16,my+50+i*37,mw-32,25,8,'#edf2ef');
     rr(mx+10,my+137,mw-20,58,12,'#d4f0e3');wrap(platform==='ios'?t.home:platform==='android'?t.shortcut:lang==='el'?'Εγκατάσταση σελίδας ως εφαρμογής':'Install page as app',mx+20,my+162,mw-40,14,'#07664d');tap(mx+mw-30,my+167,local);
    }
    if(step===2){
     g.fillStyle='#102d2555';g.fillRect(x+5,y+45,w-10,h-51);
     const dw=desktop?320:w-24,dx=x+(w-dw)/2,dy=y+(h-220)/2;
     rr(dx,dy,dw,220,20,'#fff');g.drawImage(img,dx+18,dy+20,45,45);txt('Expenity',dx+78,dy+48,22);
     if(platform==='ios'){wrap(t.asApp,dx+18,dy+100,dw-80,12);rr(dx+dw-57,dy+82,38,22,11,'#0a8f6a');rr(dx+dw-37,dy+85,16,16,8,'#fff');}
     rr(dx+18,dy+145,dw-36,48,12,'#0a8f6a');txt(platform==='ios'?t.add:t.install,dx+35,dy+176,18,'#fff');tap(dx+dw-38,dy+169,local);
    }
   }
   for(let i=0;i<4;i++){rr(40+i*130,558,115,5,3,i<=step?'#0a8f6a':'#c9ded3');}
   txt(`${step+1} / 4`,40,600,16,'#0a8f6a',800);wrap(t[platform][step],100,600,440,20);
   txt(t.caption,40,660,12,'#617b6f',500);
  };
  window.drawGuide=draw;draw(0);window.recordGuide=()=>new Promise((resolve,reject)=>{
   const chunks=[],stream=c.captureStream(24),rec=new MediaRecorder(stream,{mimeType:'video/mp4;codecs=avc1.42001E',videoBitsPerSecond:650000});rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.onerror=reject;
   rec.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());const bytes=new Uint8Array(await new Blob(chunks,{type:'video/mp4'}).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));resolve(btoa(binary));};
   const start=performance.now();rec.start();const tick=setInterval(()=>{const ms=performance.now()-start;draw(Math.min(ms,11999));if(ms>=12000){clearInterval(tick);rec.stop();}},1000/24);
  });
 },{platform,lang,t:scripts[lang],icon});
 await page.locator('canvas').screenshot({path:`${dir}/${platform}-${lang}.png`});const data=await page.evaluate(()=>window.recordGuide());writeFileSync(`${dir}/${platform}-${lang}.mp4`,Buffer.from(data,'base64'));if(process.platform==='darwin'){execFileSync('/usr/bin/avconvert',['--source',`${dir}/${platform}-${lang}.mp4`,'--preset','PresetPassthrough','--output',`${dir}/${platform}-${lang}-ready.mp4`,'--replace'],{stdio:'ignore'});renameSync(`${dir}/${platform}-${lang}-ready.mp4`,`${dir}/${platform}-${lang}.mp4`);}
 console.log(platform,lang,Math.round(Buffer.from(data,'base64').length/1024)+' KB');await context.close();
})));}finally{await browser.close();}

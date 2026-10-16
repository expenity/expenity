/* Local English/Greek receipt recognition. OCR text is untrusted input and only fills a reviewed draft. */
(function(){
 'use strict';
 const {EX,EXA:A,UI}=window,{t,esc}=EX,R=A.receipts={};
 const fold=s=>EX.fold(String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,''));
 function money(token){const compact=token.replace(/[\s\u00a0]/g,'');const last=Math.max(compact.lastIndexOf(','),compact.lastIndexOf('.'));let value;if(last>=0&&compact.length-last-1===2)value=compact.slice(0,last).replace(/[.,]/g,'')+'.'+compact.slice(last+1);else if(/^\d+$/.test(compact))value=compact;else return null;const n=Number(value);return n>0&&n<1e9?n.toFixed(2):null;}
 const dateISO=(y,m,d)=>{const s=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;return y>=2000&&y<=new Date().getFullYear()+1&&EX.iso(EX.parse(s))===s?s:null;};
 R.parse=(text,confidence=100)=>{
  const lines=String(text).split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,400),candidates=[],dates=new Set();
  for(const line of lines){const low=fold(line),bad=/(sub\s*total|υποσυνολ|μερικο\s*συνολ|φπα|vat\b|tax\b|ρεστα|change\b|tender|μετρητα|cash\b|εκπτωση|discount)/.test(low),total=/(grand\s*total|amount\s*due|total\s*due|balance\s*due|πληρωτε|τελικο\s*συνολ)/.test(low)?120:/(\btotal\b|συνολ)/.test(low)?100:0;
   const tokens=line.matchAll(/(?<![\p{L}\d.,-])(?:\d{1,3}(?:[., \u00a0]\d{3})+|\d+)[.,]\d{2}(?!\d)/gu);
   for(const m of tokens){const n=money(m[0]);if(n)candidates.push({amount:n,label:line.slice(0,120),score:bad?-100:total||10});}
   if(total&&!bad&&!/[.,]\d{2}/.test(line)){const m=line.match(/(?:\bTOTAL\b|ΣΥΝΟΛΟ|ΠΛΗΡΩΤΕΟ)\s*[:€$£]?\s*(\d{1,8})\s*(?:EUR|USD|GBP|€|\$|£)?\s*$/iu);if(m&&money(m[1]))candidates.push({amount:money(m[1]),label:line.slice(0,120),score:total});}
   for(const m of line.matchAll(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)){const d=dateISO(+m[1],+m[2],+m[3]);if(d)dates.add(d);}
   for(const m of line.matchAll(/(?<!\d)(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|\d{2})(?!\d)/g)){const y=m[3].length===2?2000+Number(m[3]):Number(m[3]);for(const [a,b] of [[+m[1],+m[2]],[+m[2],+m[1]]]){const d=dateISO(y,b,a);if(d)dates.add(d);}}
  }
  const byAmount=new Map();for(const c of candidates.filter(c=>c.score>0)){const prev=byAmount.get(c.amount);if(!prev||prev.score<c.score)byAmount.set(c.amount,c);}
  const totals=[...byAmount.values()].sort((a,b)=>b.score-a.score).slice(0,12),best=totals[0];
  const refund=/(refund|credit note|επιστροφ|πιστωτικ)/.test(fold(text));
  const unambiguous=!refund&&best&&best.score>=100&&!totals.some(x=>x.amount!==best.amount&&x.score>=best.score);
  const currencies=new Set();if(/€|\bEUR\b/i.test(text))currencies.add('EUR');if(/\$|\bUSD\b/i.test(text))currencies.add('USD');if(/£|\bGBP\b/i.test(text))currencies.add('GBP');
  const merchant=lines.slice(0,10).find(line=>{const l=fold(line),letters=(line.match(/\p{L}/gu)||[]).length,digits=(line.match(/\d/g)||[]).length;return letters>=3&&letters>digits&&!/(receipt|invoice|αποδειξ|παραστατικ|πελατη|customer|welcome|καλωσ|αφμ|vat|tax|τηλ|phone|tel\b|ευχαριστ|thank|www\.|https?:)/.test(l)&&!/^\d/.test(l);})||'';
  return {refund,merchant:merchant.slice(0,80),amount:unambiguous?best.amount:'',totals,dates:[...dates].sort(),currency:currencies.size===1?[...currencies][0]:'',currencies:[...currencies],confidence:Number(confidence)||0,text:String(text).slice(0,20000),ambiguous:!unambiguous};
 };
 let dialog=null,worker=null,loading=null,session=0,file=null,preview='',parsed=null,context=null,working=false;
 const $=s=>dialog?.querySelector(s);
 const frame=body=>`<div class="receipt-head"><h2 id="receiptTitle">${esc(t('scanReceipt'))}</h2><button type="button" class="btn btn-ghost receipt-done" data-receipt="done" hidden>${UI.icon('check',18)}${esc(t('entryDone'))}</button><button type="button" class="ab-btn" data-receipt="close" aria-label="${esc(t('close'))}">${UI.icon('x',24)}</button></div><div class="receipt-body">${body}</div>`;
 const fileButtons=()=>`<div class="btn-row wrap"><button type="button" class="btn btn-primary" data-receipt="camera">${UI.icon('photo',22)}${esc(t('scanCamera'))}</button><button type="button" class="btn btn-ghost" data-receipt="choose">${UI.icon('upload',22)}${esc(t('scanChoose'))}</button></div><input type="file" class="receipt-input" id="receiptCamera" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" hidden><input type="file" class="receipt-input" id="receiptChoose" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden>`;
 function setBody(html){if(dialog)dialog.innerHTML=frame(html);}
 function cleanup(){session++;if(worker){worker.terminate().catch(()=>{});worker=null;}working=false;file=null;preview='';parsed=null;context=null;dialog?.remove();dialog=null;}
 function close(){if(working&&R.uploading)return;cleanup();}
 const loadLibrary=()=>{if(window.Tesseract)return Promise.resolve();if(!loading)loading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('vendor/ocr/tesseract.min.js',location.href).href;s.onload=resolve;s.onerror=()=>{s.remove();loading=null;reject(Error('scanDownloadFail'));};document.head.append(s);});return loading;};
 async function imageData(input){if(!/^image\/(jpeg|png|webp|heic|heif)$/.test(input.type)||input.size>20*1024*1024)throw Error('photoType');let bitmap;
  try{bitmap=await createImageBitmap(input,{imageOrientation:'from-image'});}catch(e){throw Error('photoType');}
  try{const ratio=Math.min(1,2560/Math.max(bitmap.width,bitmap.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(bitmap.width*ratio));c.height=Math.max(1,Math.round(bitmap.height*ratio));const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(bitmap,0,0,c.width,c.height);return c.toDataURL('image/png');}finally{bitmap.close();}
 }
 function review(){
  const low=parsed.confidence<60,dates=parsed.dates,options=[...new Set([parsed.currency,...parsed.currencies,context.currency,'EUR','USD','GBP'].filter(Boolean))];
  setBody(`<p>${esc(t('scanOverwrite'))}</p><img class="receipt-preview" src="${preview}" alt="${esc(t('scanReceipt'))}">${parsed.refund?`<p class="safe-notice">${esc(t('scanRefund'))}</p>`:''}${low?`<p class="safe-notice">${esc(t('scanLow'))}</p>`:''}${parsed.ambiguous?`<p class="safe-notice">${esc(t('scanTotalAmbiguous'))}</p>`:''}<form id="receiptReview" novalidate>
   <label class="entry-check"><input type="checkbox" name="useName"${parsed.merchant&&!low?' checked':''}>${esc(t('scanMerchant'))}</label><input name="merchant" maxlength="80" value="${esc(parsed.merchant)}" aria-label="${esc(t('scanMerchant'))}">
   <label class="entry-check"><input type="checkbox" name="useAmount"${parsed.amount&&!low?' checked':''}>${esc(t('scanTotal'))}</label><input name="amount" inputmode="decimal" value="${esc(parsed.amount)}" aria-label="${esc(t('scanTotal'))}">
   ${parsed.totals.length>1||parsed.ambiguous&&parsed.totals.length?`<label class="f"><span>${esc(t('scanAmounts'))}</span><select id="receiptAmounts"><option value="">—</option>${parsed.totals.map(x=>`<option value="${esc(x.amount)}">${esc(x.amount)} · ${esc(x.label)}</option>`).join('')}</select></label>`:''}
   <label class="f"><span>${esc(t('scanCurrency'))}</span><select name="currency"><option value="">${esc(t('scanUnknown'))}</option>${options.map(v=>`<option value="${esc(v)}"${v===parsed.currency?' selected':''}>${esc(v)}</option>`).join('')}</select></label>
   <label class="entry-check"><input type="checkbox" name="useDate"${dates.length===1&&!low?' checked':''}>${esc(t('scanDate'))}</label>${dates.length>1?`<p class="muted small">${esc(t('scanDateAmbiguous'))}</p><select id="receiptDates"><option value="">${esc(t('scanNoDate'))}</option>${dates.map(d=>`<option value="${d}">${d}</option>`).join('')}</select>`:''}<input type="date" name="date" value="${dates.length===1?dates[0]:''}" aria-label="${esc(t('scanDate'))}">
   <label class="entry-check"><input type="checkbox" name="keepPhoto"${EX.auth.isSignedIn()?'':' disabled'}>${esc(t('scanKeepPhoto'))}</label><p class="muted small">${esc(t(EX.auth.isSignedIn()?'scanPhotoHelp':'scanPhotoLogin'))}${context.photo?' '+esc(t('scanReplacePhoto')):''}</p>
   <details><summary>${esc(t('scanText'))}</summary><pre>${esc(parsed.text)}</pre></details><p class="err" id="receiptError" role="alert" hidden></p><button type="submit" class="btn btn-primary wide">${esc(t('scanApply'))}</button></form><div class="receipt-other">${fileButtons()}</div>`);
 }
 async function scan(input){const job=++session;working=true;file=input;setBody(`<p>${esc(t('scanLoading'))}</p><progress max="100" value="0" aria-label="${esc(t('scanWorking'))}"></progress><p class="receipt-status" role="status">0%</p><p class="muted small">${esc(t('scanLocal'))}</p>`);
  let timer;
  try{preview=await imageData(input);await loadLibrary();if(job!==session)return;
   const url=p=>new URL(p,location.href).href;
   timer=setTimeout(()=>{if(job===session){worker?.terminate().catch(()=>{});working=false;setBody(`<p class="err">${esc(t('scanFail'))}</p>${fileButtons()}`);session++;}},120000);
   const w=await Tesseract.createWorker(['eng','ell'],1,{workerPath:url('vendor/ocr/worker.min.js'),corePath:url('vendor/ocr/core'),langPath:url('vendor/ocr/lang'),workerBlobURL:false,cachePath:'expenity-ocr-v7',logger:m=>{if(job!==session)return;const progress=$('progress'),status=$('.receipt-status');if(progress)progress.value=Math.round((m.progress||0)*100);if(status)status.textContent=t(m.status==='recognizing text'?'scanWorking':'scanLoading')+' '+Math.round((m.progress||0)*100)+'%';}});
   if(job!==session){await w.terminate();return;}worker=w;await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1',user_defined_dpi:'200'});const result=await worker.recognize(preview);if(job!==session)return;parsed=R.parse(result.data.text,result.data.confidence);if(!parsed.text.trim())throw Error('scanEmpty');working=false;await worker.terminate();worker=null;review();
  }catch(e){if(job!==session)return;working=false;worker?.terminate().catch(()=>{});worker=null;setBody(`<p class="err" role="alert">${esc(t(['photoType','scanEmpty'].includes(e.message)?e.message:navigator.onLine?'scanFail':'scanDownloadFail'))}</p>${fileButtons()}`);}finally{clearTimeout(timer);}
 }
 R.open=()=>{const ctx=A.receiptContext?.();if(!ctx||ctx.type!=='expense'||working)return;cleanup();context=ctx;dialog=document.createElement('dialog');dialog.className='receipt-dialog';dialog.setAttribute('aria-labelledby','receiptTitle');document.body.append(dialog);setBody(`<p>${esc(t('scanLocal'))}</p>${fileButtons()}`);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('click',e=>{const b=e.target.closest('[data-receipt]');if(!b)return;if(b.dataset.receipt==='close')close();else if(b.dataset.receipt==='done'){document.activeElement?.blur();$('[data-receipt=done]').hidden=true;$('.receipt-body')?.focus();}else if(!working)$(b.dataset.receipt==='camera'?'#receiptCamera':'#receiptChoose').click();});dialog.addEventListener('change',e=>{if(e.target.matches('.receipt-input')&&e.target.files[0])scan(e.target.files[0]);if(e.target.id==='receiptAmounts'){$('[name=amount]').value=e.target.value;$('[name=useAmount]').checked=!!e.target.value;}if(e.target.id==='receiptDates'){$('[name=date]').value=e.target.value;$('[name=useDate]').checked=!!e.target.value;}});dialog.addEventListener('focusin',e=>{if(e.target.matches('input:not([type=checkbox]):not([type=file]),select'))$('[data-receipt=done]').hidden=false;});dialog.addEventListener('input',e=>{const key={merchant:'useName',amount:'useAmount',date:'useDate'}[e.target.name];if(key&&$('#receiptReview'))$('#receiptReview').elements[key].checked=!!e.target.value.trim();});dialog.addEventListener('submit',apply);dialog.showModal();$('.receipt-body')?.setAttribute('tabindex','-1');$('.receipt-body')?.focus();receiptViewport();};
 async function apply(e){e.preventDefault();if(working||!parsed)return;const f=e.target.elements,err=k=>{const el=$('#receiptError');el.hidden=false;el.textContent=t(k);el.scrollIntoView({block:'nearest'});};
  if(!f.useName.checked&&!f.useAmount.checked&&!f.useDate.checked&&!f.keepPhoto.checked)return err('scanNoSelection');
  const value=f.amount.value.trim().replace(',','.');if(f.useAmount.checked&&(!/^\d{1,9}(\.\d{1,2})?$/.test(value)||Number(value)<=0))return err('scanBadTotal');if(f.useAmount.checked&&!f.currency.value)return err('scanCurrencyRequired');if(f.useDate.checked&&!/^\d{4}-\d{2}-\d{2}$/.test(f.date.value))return err('errDate');
  const data={id:context.id,name:f.useName.checked?f.merchant.value.trim():undefined,amount:f.useAmount.checked?value:undefined,currency:f.currency.value,date:f.useDate.checked?f.date.value:undefined};
  if(!A.receiptContext?.()||A.receiptContext().id!==context.id)return err('entryChanged');
  const job=session;working=true;R.uploading=true;const button=$('[type=submit]');button.disabled=true;
  try{if(f.keepPhoto.checked){const jpg=await A.photos.compress(file);const r=await EX.api('POST','/api/photos',{data:jpg});if(!r.ok)throw Error('photoUnavailable');data.photo=r.json.id;}
   if(job!==session)return;if(!A.applyReceipt(data))throw Error('entryChanged');working=false;R.uploading=false;cleanup();
  }catch(error){if(job===session){working=false;R.uploading=false;button.disabled=false;err(error.message==='entryChanged'?'entryChanged':'photoUnavailable');}}
 }
 function receiptViewport(){if(!dialog||!window.visualViewport)return;dialog.style.setProperty('--receipt-height',visualViewport.height+'px');dialog.style.setProperty('--receipt-top',visualViewport.offsetTop+'px');}
 window.visualViewport?.addEventListener('resize',receiptViewport);window.visualViewport?.addEventListener('scroll',receiptViewport);
 document.addEventListener('click',e=>{if(!e.target.closest('[data-receipt-scan]'))return;e.preventDefault();e.stopImmediatePropagation();R.open();},true);
 EX.on('auth',event=>{if(event?.accountChanged){R.uploading=false;cleanup();}});
})();

(function(){
 'use strict';
 const root=document.documentElement,mq=matchMedia('(prefers-reduced-motion: reduce)'),btn=document.querySelector('[data-effects]');
 let paused=mq.matches;try{paused=paused||localStorage.getItem('expenity.site.effects')==='off';}catch(e){}
 function apply(){root.classList.toggle('xp-paused',paused||mq.matches);if(btn){btn.textContent=paused||mq.matches?btn.dataset.play:btn.dataset.pause;btn.setAttribute('aria-pressed',String(paused||mq.matches));}}
 apply();mq.addEventListener('change',apply);
 btn?.addEventListener('click',()=>{paused=!paused;try{localStorage.setItem('expenity.site.effects',paused?'off':'on');}catch(e){}apply();});
 const io='IntersectionObserver'in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-on');io.unobserve(e.target);}}),{threshold:.08}):null;
 if(io){root.classList.add('xp-ready');document.querySelectorAll('.reveal').forEach(el=>io.observe(el));}
 document.querySelectorAll('[data-tone]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelector('.xp-theme-preview').dataset.preview=btn.dataset.tone;document.querySelectorAll('[data-tone]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));}));
 document.addEventListener('visibilitychange',()=>root.classList.toggle('xp-paused',document.hidden||paused||mq.matches));
})();

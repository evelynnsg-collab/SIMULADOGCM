/* A deterrent to casual copying, not DRM or an OS screenshot blocker. */
(()=>{
 'use strict';
 const editable=target=>!!target?.closest?.('input,textarea,[contenteditable="true"],[contenteditable=""]');
 let notice,timeout;
 function explain(){
  if(!notice){
   notice=document.createElement('div');
   notice.className='content-protection-notice';
   notice.setAttribute('role','status');
   document.body.appendChild(notice);
  }
  notice.textContent='Conteúdo para estudo no app. Cópia e impressão desativadas.';
  notice.hidden=false;
  clearTimeout(timeout);
  timeout=setTimeout(()=>{notice.hidden=true;},3500);
 }
 for(const type of ['copy','cut','contextmenu','dragstart','selectstart']){
  document.addEventListener(type,event=>{
   if(editable(event.target))return;
   event.preventDefault();
   if(type==='copy'||type==='cut'||type==='contextmenu')explain();
  });
 }
 document.addEventListener('keydown',event=>{
  if(!(event.ctrlKey||event.metaKey)||event.altKey)return;
  const key=event.key.toLowerCase();
  if(key==='p'||key==='s'||(!editable(event.target)&&['c','x','a'].includes(key))){
   event.preventDefault();
   explain();
  }
 });
})();

(()=>{
 if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{});
 const installed=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 if(installed())return;
 let promptEvent=null;
 const box=document.createElement('section');box.setAttribute('aria-label','Instalar aplicativo');
 box.style.cssText='margin:12px auto;padding:14px 18px;max-width:680px;box-sizing:border-box;background:#111e35;color:white;border-radius:12px;font:14px/1.5 system-ui;';
 const button=document.createElement('button');button.type='button';button.textContent='Instalar no celular';button.style.cssText='background:#d5f65b;color:#111e35;border:0;border-radius:8px;padding:10px 16px;font:600 15px system-ui;cursor:pointer;';button.setAttribute('aria-expanded','false');
 const help=document.createElement('div');help.hidden=true;help.id='install-instructions';button.setAttribute('aria-controls',help.id);
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const steps=document.createElement('p');steps.textContent=ios?'No Safari, toque em Compartilhar → Adicionar à Tela de Início → Adicionar. Se aparecer “Abrir como App”, mantenha essa opção ativada.':'No Chrome do Android, abra o menu ⋮ → Adicionar à tela inicial ou Instalar aplicativo. Confirme a instalação. Se estiver no navegador do WhatsApp, abra este link no Chrome primeiro.';
 const note=document.createElement('p');note.textContent='Instale primeiro, abra pelo novo ícone e depois use sua chave. O acesso fica vinculado ao navegador/app do primeiro login. Se sua chave já estiver vinculada e não funcionar no app instalado, peça a troca à administradora. É necessário ter internet para estudar.';
 help.append(steps,note);box.append(button,help);document.body.prepend(box);
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;});
 window.addEventListener('appinstalled',()=>{promptEvent=null;box.remove();});
 button.onclick=async()=>{
  if(promptEvent){const event=promptEvent;promptEvent=null;try{await event.prompt();const choice=await event.userChoice;if(choice.outcome==='accepted'){box.remove();return;}}catch{}}
  help.hidden=!help.hidden;button.setAttribute('aria-expanded',String(!help.hidden));
 };
})();

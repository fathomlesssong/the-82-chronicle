(()=>{
  if(!('serviceWorker' in navigator))return;
  if(location.hostname!=='kronika82.vercel.app')return;
  window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
})();

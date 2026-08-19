(()=>{
  if(!('serviceWorker' in navigator))return;
  if(location.hostname!=='the82chronicle.vercel.app')return;
  window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
})();

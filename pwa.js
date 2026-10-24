(()=>{
  if(!('serviceWorker' in navigator))return;
  const allowedHosts=new Set([
    'kronika82.vercel.app',
    'localhost',
    '127.0.0.1'
  ]);
  if(!allowedHosts.has(location.hostname))return;
  window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
})();

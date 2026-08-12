const CACHE='chronicle-shell-v1';
const SHELL=[
  '/',
  '/index.html',
  '/archive.html',
  '/styles.css?v=4',
  '/mobile.css?v=5',
  '/front-final.css?v=2',
  '/manifest.webmanifest',
  '/assets/favicon.png?v=4'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req)
        .then(res=>{
          const copy=res.clone();
          caches.open(CACHE).then(cache=>cache.put(req,copy));
          return res;
        })
        .catch(()=>caches.match(req).then(cached=>cached||caches.match('/')))
    );
    return;
  }

  if(/\.(?:css|js|png|jpe?g|webp|svg|ico|webmanifest)$/i.test(url.pathname)){
    event.respondWith(
      caches.match(req).then(cached=>cached||fetch(req).then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(cache=>cache.put(req,copy));
        return res;
      }))
    );
  }
});

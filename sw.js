const CACHE='anathazerín-v4';
self.addEventListener('install',e=>{
  // Ne pas activer immédiatement — attendre le signal de l'app
  e.waitUntil(caches.open(CACHE).then(c=>c.add('.')));
});
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    )).then(()=>clients.claim())
  );
});
self.addEventListener('fetch',e=>{
  e.respondWith(
    fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||caches.match('.')))
  );
});
// Message depuis l'app pour activer la nouvelle version
self.addEventListener('message',e=>{
  if(e.data&&e.data.type==='SKIP_WAITING') self.skipWaiting();
});

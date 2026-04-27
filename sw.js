const CACHE='anathazerín-v1';
const URL_BASE='/Tracker-anathazerine/';
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll([URL_BASE,''+URL_BASE+'index.html'])));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{e.waitUntil(clients.claim());});
self.addEventListener('fetch',e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match(URL_BASE))));
});

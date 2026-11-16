/* Scope-aware offline cache. All paths relative to this worker's directory. */
const VERSION='jarvis-ipad-offline-0.2.1';
const ROOT=new URL('./',self.location.href);
const PRECACHE=['./','./index.html','./styles.css','./manifest.webmanifest','./app.js','./db.js','./icons.js','./hologram.js','./commands.js','./voice.js','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(PRECACHE.map(path=>new URL(path,ROOT).toString()))));
  // Let active clients finish; new worker activates on restart.
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('jarvis-ipad-offline-')&&key!==VERSION)await caches.delete(key);await self.clients.claim();})());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(ROOT.pathname))return;
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{try{const response=await fetch(event.request);if(response.ok){const cache=await caches.open(VERSION);cache.put(new URL('./index.html',ROOT),response.clone());}return response;}catch{const cache=await caches.open(VERSION);return await cache.match(new URL('./index.html',ROOT))||Response.error();}})());
    return;
  }
  event.respondWith((async()=>{const cache=await caches.open(VERSION);const cached=await cache.match(event.request);if(cached)return cached;try{const response=await fetch(event.request);if(response.ok&&response.type==='basic')cache.put(event.request,response.clone());return response;}catch{return Response.error();}})());
});

self.addEventListener('message', e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});

const CACHE="828d-modes-v1";
const CORE=["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./assets/icon.svg","./assets/flange.svg","./assets/bushing.svg"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached)return cached;
      return fetch(event.request).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      }).catch(()=>{
        if(event.request.mode==="navigate")return caches.match("./index.html");
        return new Response("",{status:503,statusText:"Offline"});
      });
    })
  );
});
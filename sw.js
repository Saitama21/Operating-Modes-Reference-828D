const CACHE="828d-modes-v0.4.2";
const CORE=[
  "./","./index.html","./styles.css","./app.js","./manifest.webmanifest",
  "./assets/icon.svg","./assets/flange.svg","./assets/bushing.svg",
  "./assets/material-aisi304.svg","./assets/material-steel.svg",
  "./assets/material-polyamide.svg","./assets/material-brass.svg","./assets/chips.svg"
];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  const isShell=
    event.request.mode==="navigate" ||
    /\.(?:html|css|js|webmanifest)$/.test(url.pathname);

  if(isShell){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
          return response;
        })
        .catch(()=>caches.match(event.request).then(hit=>hit||caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      const network=fetch(event.request).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      }).catch(()=>cached);
      return cached||network;
    })
  );
});

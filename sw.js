const VERSION="2.0.0";
const CACHE="828d-modes-offline-"+VERSION;

const OFFLINE_FILES=[
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/flange.svg",
  "./assets/bushing.svg",
  "./assets/material-aisi304.svg",
  "./assets/material-steel.svg",
  "./assets/material-polyamide.svg",
  "./assets/material-brass.svg",
  "./assets/card-aisi304.webp",
  "./assets/card-steel.webp",
  "./assets/card-polyamide.webp",
  "./assets/card-brass.webp",
  "./assets/chips.svg"
];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(OFFLINE_FILES))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys
          .filter(key=>key.startsWith("828d-modes-")&&key!==CACHE)
          .map(key=>caches.delete(key))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("message",event=>{
  if(event.data&&event.data.type==="SKIP_WAITING")self.skipWaiting();
});

async function cachedOrNetwork(request,fallback=null){
  const cached=await caches.match(request,{ignoreSearch:true});
  if(cached)return cached;

  try{
    const response=await fetch(request);
    if(response&&response.ok){
      const cache=await caches.open(CACHE);
      await cache.put(request,response.clone());
    }
    return response;
  }catch(error){
    if(fallback){
      const local=await caches.match(fallback,{ignoreSearch:true});
      if(local)return local;
    }
    throw error;
  }
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;

  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==="navigate"){
    event.respondWith(cachedOrNetwork(request,"./index.html"));
    return;
  }

  event.respondWith(cachedOrNetwork(request));
});

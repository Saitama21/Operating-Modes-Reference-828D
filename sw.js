const VERSION="1.0.1";
const PRECACHE="828d-modes-precache-"+VERSION;
const RUNTIME="828d-modes-runtime-"+VERSION;

const SHELL=[
  "./",
  "./index.html",
  "./styles.css?v=1.0.1",
  "./app.js?v=1.0.1",
  "./manifest.webmanifest"
];

const STATIC_ASSETS=[
  "./assets/icon.svg",
  "./assets/flange.svg",
  "./assets/bushing.svg",
  "./assets/material-aisi304.svg",
  "./assets/material-steel.svg",
  "./assets/material-polyamide.svg",
  "./assets/material-brass.svg",
  "./assets/card-aisi304.webp?v=0.7.6",
  "./assets/card-steel.webp?v=0.7.5",
  "./assets/card-polyamide.webp?v=0.7.5",
  "./assets/card-brass.webp?v=0.7.5",
  "./assets/chips.svg?v=0.4.2"
];

async function fetchFresh(url){
  const response=await fetch(url,{cache:"reload"});
  if(!response.ok)throw new Error("precache "+url+" "+response.status);
  return response;
}

async function putFresh(cache,url){
  const response=await fetchFresh(url);
  await cache.put(url,response);
}

async function matchLocal(requestOrUrl){
  const options={ignoreSearch:true};
  const precache=await caches.open(PRECACHE);
  const precached=await precache.match(requestOrUrl,options);
  if(precached)return precached;

  const runtime=await caches.open(RUNTIME);
  return runtime.match(requestOrUrl,options);
}

async function fetchAndStore(request){
  const response=await fetch(request,{cache:"no-store"});
  if(response && response.ok){
    const runtime=await caches.open(RUNTIME);
    await runtime.put(request,response.clone());
  }
  return response;
}

async function cacheFirst(request,fallbackUrl){
  const cached=await matchLocal(request);
  if(cached)return cached;

  try{
    return await fetchAndStore(request);
  }catch(error){
    if(fallbackUrl){
      const fallback=await matchLocal(fallbackUrl);
      if(fallback)return fallback;
    }
    throw error;
  }
}

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(PRECACHE);

    // Geometry-calc style full offline install: the UI shell and every
    // bundled visual asset are cached as one atomic package. If anything
    // is missing, keep the previous worker instead of installing a partial
    // offline build with broken cards or artwork.
    await Promise.all([...SHELL,...STATIC_ASSETS].map(url=>putFresh(cache,url)));

    await self.skipWaiting();
  })());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keep=new Set([PRECACHE,RUNTIME]);
    const keys=await caches.keys();
    await Promise.all(
      keys
        .filter(key=>key.startsWith("828d-modes-")&&!keep.has(key))
        .map(key=>caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message",event=>{
  if(event.data&&event.data.type==="SKIP_WAITING")self.skipWaiting();
});

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;

  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  // Navigations never depend on the network once the shell is installed.
  if(request.mode==="navigate"){
    event.respondWith(cacheFirst("./index.html","./index.html"));
    return;
  }

  // App shell + all same-origin static assets are local-first. Network is
  // touched only when an item is absent from both current caches.
  event.respondWith(cacheFirst(request,request.destination==="document"?"./index.html":null));
});

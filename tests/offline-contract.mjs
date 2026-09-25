import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const sw=read("sw.js");
const app=read("app.js");
const index=read("index.html");
const manifest=JSON.parse(read("manifest.webmanifest"));

const assert=(condition,message)=>{
  if(!condition){
    console.error("OFFLINE CONTRACT FAILED:",message);
    process.exit(1);
  }
};

assert(sw.includes('const VERSION="2.0.0"'),"service worker version must be 2.0.0");
assert(sw.includes('const CACHE="828d-modes-offline-"+VERSION'),"single versioned offline cache is required");
assert(sw.includes("cache.addAll(OFFLINE_FILES)"),"full offline package must be installed atomically");
assert(sw.includes('if(request.mode==="navigate")'),"navigation requests need an offline fallback");
assert(sw.includes('cachedOrNetwork(request,"./index.html")'),"offline navigation must fall back to cached index.html");
assert(sw.includes("self.skipWaiting()"),"new worker must activate immediately");
assert(sw.includes("self.clients.claim()"),"active worker must claim open clients");
assert(!sw.includes("networkFirst"),"network-first is forbidden for the app shell");

for(const asset of [
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
]){
  assert(sw.includes(JSON.stringify(asset)),"offline package must include "+asset);
}

assert(index.includes('navigator.serviceWorker.register("./sw.js"'),"service worker must register from the HTML bootstrap");
assert(index.indexOf('navigator.serviceWorker.register("./sw.js"')<index.indexOf('<link rel="stylesheet"'),"service worker registration must start before app assets load");
assert(index.includes('updateViaCache: "none"'),"service worker update checks must bypass HTTP cache");
assert(index.includes('<link rel="stylesheet" href="./styles.css">'),"HTML must use stable local stylesheet URL");
assert(index.includes('<script src="./app.js" defer></script>'),"HTML must use stable local app script URL");
assert(!app.includes("serviceWorker.register"),"app startup must not own service worker registration");
assert(app.includes("navigator.storage.persist"),"persistent storage should be requested when supported");

assert(manifest.start_url==="./","manifest start_url must stay inside the GitHub Pages scope");
assert(manifest.scope==="./","manifest scope must stay relative");
assert(manifest.display==="standalone","PWA must launch standalone");

const combined=index+"\n"+app+"\n"+read("styles.css");
assert(!/https?:\/\//i.test(combined),"runtime UI must not depend on remote HTTP resources");

console.log("Offline contract OK — the whole app is local, cache-first and registered before UI startup.");

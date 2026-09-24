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

assert(sw.includes('const VERSION="1.0.1"'),"service worker version must be 1.0.1");
assert(sw.includes('const PRECACHE="828d-modes-precache-"+VERSION'),"versioned precache is required");
assert(sw.includes('const RUNTIME="828d-modes-runtime-"+VERSION'),"versioned runtime cache is required");
assert(sw.includes('"./index.html"'),"index.html must be precached");
assert(sw.includes('"./styles.css?v=1.0.1"'),"versioned CSS must be precached");
assert(sw.includes('"./app.js?v=1.0.1"'),"versioned JS must be precached");
assert(sw.includes('if(request.mode==="navigate")'),"navigation requests need an offline shell path");
assert(sw.includes('cacheFirst("./index.html","./index.html")'),"navigation must resolve from the cached app shell first");
assert(sw.includes("Promise.all([...SHELL,...STATIC_ASSETS].map(url=>putFresh(cache,url)))"),"shell and bundled artwork must be installed atomically");
assert(!sw.includes("Promise.allSettled(STATIC_ASSETS"),"bundled artwork must not be optional in the offline package");
assert(sw.includes("self.skipWaiting()"),"new offline shell must activate without a manual cache purge");
assert(sw.includes("self.clients.claim()"),"active worker must claim open clients");
assert(!sw.includes("networkFirst"),"service worker must not use a network-first shell strategy");

for(const asset of [
  "assets/icon.svg",
  "assets/card-aisi304.webp",
  "assets/card-steel.webp",
  "assets/card-polyamide.webp",
  "assets/card-brass.webp",
  "assets/material-aisi304.svg",
  "assets/material-steel.svg",
  "assets/material-polyamide.svg",
  "assets/material-brass.svg",
  "assets/chips.svg"
]){
  assert(sw.includes(asset),"offline package must include "+asset);
}

assert(app.includes('navigator.serviceWorker.register("./sw.js?v=1.0.1"'),"service worker URL must be cache-busted for this release");
assert(app.includes('updateViaCache:"none"'),"service worker update checks must bypass HTTP cache");
assert(app.includes("if(navigator.onLine)registration.update()"),"updates must only be explicitly checked while online");
assert(app.includes('window.addEventListener("online",checkForUpdate'),"returning online must trigger an update check");
assert(app.includes('window.addEventListener("load",setupOfflineRuntime,{once:true})'),"offline runtime must register independently of app data startup");
assert(app.includes("navigator.storage.persist"),"persistent storage should be requested when supported");

assert(index.includes("styles.css?v=1.0.1"),"HTML must load the v1.0.1 stylesheet");
assert(index.includes("app.js?v=1.0.1"),"HTML must load the v1.0.1 app script");

assert(manifest.start_url==="./","manifest start_url must stay inside the GitHub Pages scope");
assert(manifest.scope==="./","manifest scope must stay relative");
assert(manifest.display==="standalone","PWA must launch standalone");

console.log("Offline contract OK — full app package is cache-first and atomically available offline.");

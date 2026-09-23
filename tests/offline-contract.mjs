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

assert(sw.includes('const VERSION="1.0.0"'),"service worker version must be 1.0.0");
assert(sw.includes('const PRECACHE="828d-modes-precache-"+VERSION'),"versioned precache is required");
assert(sw.includes('const RUNTIME="828d-modes-runtime-"+VERSION'),"versioned runtime cache is required");
assert(sw.includes('"./index.html"'),"index.html must be precached");
assert(sw.includes('"./styles.css?v=1.0.0"'),"versioned CSS must be precached");
assert(sw.includes('"./app.js?v=1.0.0"'),"versioned JS must be precached");
assert(sw.includes('if(request.mode==="navigate")'),"navigation requests need an offline shell path");
assert(sw.includes('cacheFirst("./index.html","./index.html")'),"navigation must resolve from the cached app shell first");
assert(sw.includes("Promise.allSettled(STATIC_ASSETS"),"optional artwork must not block shell installation");
assert(sw.includes("self.skipWaiting()"),"new offline shell must activate without a manual cache purge");
assert(sw.includes("self.clients.claim()"),"active worker must claim open clients");
assert(!sw.includes("networkFirst"),"service worker must not use a network-first shell strategy");

assert(app.includes('updateViaCache:"none"'),"service worker update checks must bypass HTTP cache");
assert(app.includes("if(navigator.onLine)registration.update()"),"updates must only be explicitly checked while online");
assert(app.includes('window.addEventListener("online",checkForUpdate'),"returning online must trigger an update check");
assert(app.includes("navigator.storage.persist"),"persistent storage should be requested when supported");

assert(index.includes("styles.css?v=1.0.0"),"HTML must load the v1.0.0 stylesheet");
assert(index.includes("app.js?v=1.0.0"),"HTML must load the v1.0.0 app script");

assert(manifest.start_url==="./","manifest start_url must stay inside the GitHub Pages scope");
assert(manifest.scope==="./","manifest scope must stay relative");
assert(manifest.display==="standalone","PWA must launch standalone");

console.log("Offline contract OK — shell is cache-first and updates are online-only.");

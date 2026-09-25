import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync("sw.js","utf8");
const listeners={};
const stores=new Map();
let online=true;

function response(body,url=""){
  return {
    ok:true,
    url,
    body,
    clone(){ return response(body,url); }
  };
}

function normalize(input){
  if(typeof input==="string")return new URL(input,"https://example.test/Operating-Modes-Reference-828D/").href;
  return input.url;
}

function cacheFor(name){
  if(!stores.has(name))stores.set(name,new Map());
  const store=stores.get(name);
  return {
    async addAll(urls){
      for(const url of urls){
        if(!online)throw new Error("network offline");
        store.set(normalize(url),response("cached:"+url,normalize(url)));
      }
    },
    async put(request,value){ store.set(normalize(request),value); },
    async match(request){
      const key=normalize(request);
      if(store.has(key))return store.get(key);
      const stripped=key.split("?")[0];
      for(const [stored,value] of store){
        if(stored.split("?")[0]===stripped)return value;
      }
    }
  };
}

const context={
  URL,
  Promise,
  console,
  fetch:async request=>{
    if(!online)throw new Error("network offline");
    return response("network:"+normalize(request),normalize(request));
  },
  caches:{
    async open(name){ return cacheFor(name); },
    async keys(){ return [...stores.keys()]; },
    async delete(name){ return stores.delete(name); },
    async match(request){
      for(const name of stores.keys()){
        const hit=await cacheFor(name).match(request);
        if(hit)return hit;
      }
    }
  },
  self:{
    location:{origin:"https://example.test",href:"https://example.test/Operating-Modes-Reference-828D/sw.js"},
    clients:{async claim(){}},
    skipWaiting:async()=>{},
    addEventListener(type,handler){listeners[type]=handler;}
  }
};

vm.createContext(context);
vm.runInContext(source,context,{filename:"sw.js"});

async function fireWait(type,event={}){
  let pending=Promise.resolve();
  listeners[type]({...event,waitUntil(p){pending=Promise.resolve(p);}});
  await pending;
}

await fireWait("install");
await fireWait("activate");

online=false;
let responsePromise;
listeners.fetch({
  request:{
    method:"GET",
    mode:"navigate",
    url:"https://example.test/Operating-Modes-Reference-828D/"
  },
  respondWith(p){responsePromise=Promise.resolve(p);}
});
const offlineResponse=await responsePromise;

if(!offlineResponse||offlineResponse.body!=="cached:./"){
  console.error("OFFLINE RUNTIME FAILED: navigation was not served from installed cache",offlineResponse);
  process.exit(1);
}

console.log("Offline runtime OK — navigation survives a hard network failure after first install.");

const MATERIALS=[
  {id:"aisi304",code:"AISI 304",title:"AISI 304",subtitle:"Нержавеющая сталь",short:"НЕРЖАВЕЙКА",a:"#f6cf27",b:"#9e6a00",rgb:"247,190,55",art:"./assets/card-aisi304.webp?v=0.7.6"},
  {id:"steel",code:"STEEL",title:"Сталь",subtitle:"Конструкционная сталь",short:"СТАЛЬ",a:"#69717a",b:"#171b20",rgb:"130,141,154",art:"./assets/card-steel.webp?v=0.7.5"},
  {id:"polyamide",code:"PA6",title:"Полиамид",subtitle:"Технический пластик",short:"ПОЛИАМИД",a:"#47a8ff",b:"#0a4ca7",rgb:"76,154,255",art:"./assets/card-polyamide.webp?v=0.7.5"},
  {id:"brass",code:"CuZn37",title:"Латунь",subtitle:"Цветной сплав",short:"ЛАТУНЬ",a:"#e8b846",b:"#76500d",rgb:"230,165,55",art:"./assets/card-brass.webp?v=0.7.5"}
];
const SEED=[];

const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const state={view:"home",materialIndex:0,recordIndex:0,records:[],editingId:null};

const THEME_KEY="omr-theme";
const themeMedia=window.matchMedia("(prefers-color-scheme: light)");

function readThemeMode(){
  try{
    const saved=localStorage.getItem(THEME_KEY);
    return ["system","dark","light"].includes(saved)?saved:"system";
  }catch{
    return "system";
  }
}
function resolveTheme(mode){
  return mode==="system"?(themeMedia.matches?"light":"dark"):mode;
}
function syncThemeControls(mode){
  $$("[data-theme-choice]").forEach(btn=>{
    const active=btn.dataset.themeChoice===mode;
    btn.classList.toggle("is-active",active);
    btn.setAttribute("aria-pressed",active?"true":"false");
  });
}
function syncQuickThemeButton(resolved){
  const btn=$("#themeQuickBtn");
  if(!btn)return;
  const light=resolved==="light";
  btn.textContent=light?"☾":"☀︎";
  btn.setAttribute("aria-label",light?"Включить тёмную тему":"Включить светлую тему");
  btn.setAttribute("title",light?"Тёмная тема":"Светлая тема");
  btn.dataset.resolvedTheme=resolved;
}
function applyTheme(mode,{persist=false}={}){
  const safeMode=["system","dark","light"].includes(mode)?mode:"system";
  const resolved=resolveTheme(safeMode);
  document.documentElement.dataset.theme=resolved;
  document.documentElement.dataset.themeMode=safeMode;
  if(persist){
    try{localStorage.setItem(THEME_KEY,safeMode)}catch{}
  }
  const meta=$("#themeColorMeta")||document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute("content",resolved==="light"?"#f3f8fc":"#071018");
  syncThemeControls(safeMode);
  syncQuickThemeButton(resolved);
}
function initTheme(){
  applyTheme(readThemeMode());
  const onSystemChange=()=>{
    if(readThemeMode()==="system")applyTheme("system");
  };
  if(themeMedia.addEventListener)themeMedia.addEventListener("change",onSystemChange);
  else if(themeMedia.addListener)themeMedia.addListener(onSystemChange);
}

const dbp=new Promise((resolve,reject)=>{
  const req=indexedDB.open("operating-modes-828d",1);
  req.onupgradeneeded=()=>{
    const db=req.result;
    if(!db.objectStoreNames.contains("records"))db.createObjectStore("records",{keyPath:"id"});
  };
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error);
});

async function dbAll(){
  const db=await dbp;
  return new Promise((res,rej)=>{
    const r=db.transaction("records").objectStore("records").getAll();
    r.onsuccess=()=>res(r.result);
    r.onerror=()=>rej(r.error);
  });
}
async function dbPut(v){
  const db=await dbp;
  return new Promise((res,rej)=>{
    const r=db.transaction("records","readwrite").objectStore("records").put(v);
    r.onsuccess=()=>res(v);
    r.onerror=()=>rej(r.error);
  });
}
async function dbDelete(id){
  const db=await dbp;
  return new Promise((res,rej)=>{
    const r=db.transaction("records","readwrite").objectStore("records").delete(id);
    r.onsuccess=()=>res();
    r.onerror=()=>rej(r.error);
  });
}
async function initData(){
  const rows=await dbAll();
  state.records=rows.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
function mat(id){return MATERIALS.find(m=>m.id===id)||MATERIALS[0]}
function materialRecords(id){return state.records.filter(r=>r.materialId===id)}
function setAccent(m){
  document.documentElement.style.setProperty("--accent-rgb",m.rgb);
  document.documentElement.style.setProperty("--accent","rgb("+m.rgb+")");
}
function renderDeck(){
  const deck=$("#materialDeck");
  deck.innerHTML="";
  MATERIALS.forEach((m,i)=>{
    const c=document.createElement("button");
    c.className="material-card";
    c.dataset.material=m.id;
    c.style.setProperty("--card-a",m.a);
    c.style.setProperty("--card-b",m.b);
    c.style.setProperty("--card-rgb",m.rgb);
    c.style.setProperty("--card-index",i);
    const count=materialRecords(m.id).length;
    c.innerHTML=
      '<img class="material-art" src="'+m.art+'" alt="" draggable="false">'+
      '<div class="card-shade"></div>'+
      '<div class="card-main"><div class="card-title">'+m.title+'</div><div class="card-subtitle">'+m.subtitle+'</div></div>'+
      '<div class="card-bottom"><span class="card-count">'+(count===1?"1 запись":count+" записей")+'</span><span class="card-open">›</span></div>';
    const art=c.querySelector(".material-art");
    art.addEventListener("error",()=>{
      if(art.dataset.materialArtFallback)return;
      art.dataset.materialArtFallback="1";
      art.src="./assets/material-"+m.id+".svg?v=0.7.3";
    });
    c.addEventListener("pointerdown",()=>c.classList.add("is-pressed"));
    ["pointerup","pointercancel","pointerleave"].forEach(ev=>c.addEventListener(ev,()=>c.classList.remove("is-pressed")));
    c.addEventListener("click",()=>{
      state.materialIndex=i;
      setAccent(m);
      openMaterial(m.id);
    });
    deck.appendChild(c);
  });
  $("#recordTotal").textContent=state.records.length;
}
function setView(view){
  state.view=view;
  if(view==="home")requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:"auto"}));
  $("#app").dataset.view=view;
  $$(".screen").forEach(s=>s.classList.remove("is-active"));
  const target=view==="home"?$("#homeScreen"):view==="search"?$("#searchScreen"):$("#detailScreen");
  target.classList.add("is-active");
  $$(".dock-item[data-nav]").forEach(b=>b.classList.toggle("is-active",b.dataset.nav===view));
  $("#screenTitle").textContent=view==="home"?"РЕЖИМЫ":view==="search"?"ПОИСК":"РЕЖИМ";
  if(view==="search")setTimeout(()=>$("#searchInput").focus(),80);
}
function openMaterial(id,recordId){
  state.materialIndex=MATERIALS.findIndex(m=>m.id===id);
  if(state.materialIndex<0)state.materialIndex=0;
  const rows=materialRecords(id);
  state.recordIndex=recordId?Math.max(0,rows.findIndex(r=>r.id===recordId)):0;
  setAccent(mat(id));
  renderDetail();
  setView("detail");
}
function renderDetail(){
  const m=MATERIALS[state.materialIndex];
  const rows=materialRecords(m.id);
  const empty=!rows.length;
  $("#detailMaterialTag").textContent=m.title;
  $("#detailMaterialSub").textContent=m.short||m.subtitle;
  $("#emptyState").hidden=!empty;
  $(".record-card").hidden=empty;
  $("#editBtn").hidden=empty;
  if(empty)return;
  state.recordIndex=(state.recordIndex+rows.length)%rows.length;
  const r=rows[state.recordIndex];
  $("#recordTitle").textContent=r.title||"Без названия";
  $("#recordDate").textContent=r.createdAt?new Date(r.createdAt).toLocaleDateString("ru-RU",{day:"2-digit",month:"short",year:"numeric"}):"Проверенный режим";
  $("#pDia").textContent=r.dia?"Ø"+r.dia+" мм":"—";
  $("#pOperation").textContent=r.operation||"—";
  $("#pRpm").textContent=r.rpm?r.rpm+" rpm":"—";
  $("#pFeed").textContent=r.feed?r.feed+" мм/об":"—";
  $("#pDepth").textContent=r.depth?r.depth+" мм":"—";
  $("#pTool").textContent=r.tool||"—";
  $("#recordIndex").textContent=(state.recordIndex+1)+" / "+rows.length;
  $("#recordCounter").textContent=(state.recordIndex+1)+" / "+rows.length;
  const img=$("#recordImage"),fallback=$("#recordFallback");
  if(r.image){img.src=r.image;img.style.display="block";fallback.style.display="none";}
  else{img.removeAttribute("src");img.style.display="none";fallback.style.display="grid";}
  $("#noteBtn").classList.toggle("has-note",!!r.note);
  $("#notePreview").hidden=!r.note;
  $("#notePreview").textContent=r.note||"";
}
function moveRecord(dir){
  const rows=materialRecords(MATERIALS[state.materialIndex].id);
  if(!rows.length)return;
  state.recordIndex=(state.recordIndex+dir+rows.length)%rows.length;
  renderDetail();
}
function fillMaterialSelect(){
  const s=$("#fMaterial");
  s.innerHTML=MATERIALS.map(m=>'<option value="'+m.id+'">'+m.title+" — "+m.subtitle+"</option>").join("");
}
function openForm(record){
  state.editingId=record&&record.id?record.id:null;
  $("#formTitle").textContent=record?"Редактировать режим":"Новый режим";
  $("#deleteBtn").hidden=!record;
  $("#fMaterial").value=record?record.materialId:(MATERIALS[state.materialIndex]||MATERIALS[0]).id;
  $("#fTitle").value=record&&record.title?record.title:"";
  $("#fDia").value=record&&record.dia?record.dia:"";
  $("#fOperation").value=record&&record.operation?record.operation:"";
  $("#fRpm").value=record&&record.rpm?record.rpm:"";
  $("#fFeed").value=record&&record.feed?record.feed:"";
  $("#fDepth").value=record&&record.depth?record.depth:"";
  $("#fTool").value=record&&record.tool?record.tool:"";
  $("#fNote").value=record&&record.note?record.note:"";
  $("#fPhoto").value="";
  $("#recordDialog").showModal();
}
function currentRecord(){
  const rows=materialRecords(MATERIALS[state.materialIndex].id);
  return rows[state.recordIndex]||null;
}
function fileToDataURL(file){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onload=()=>res(fr.result);
    fr.onerror=()=>rej(fr.error);
    fr.readAsDataURL(file);
  });
}
async function saveForm(e){
  e.preventDefault();
  const old=state.editingId?state.records.find(r=>r.id===state.editingId):null;
  let image=old&&old.image?old.image:"";
  const file=$("#fPhoto").files[0];
  if(file)image=await fileToDataURL(file);
  const rec={
    id:old&&old.id?old.id:crypto.randomUUID(),
    materialId:$("#fMaterial").value,
    title:$("#fTitle").value.trim(),
    dia:$("#fDia").value.trim(),
    operation:$("#fOperation").value.trim(),
    rpm:$("#fRpm").value.trim(),
    feed:$("#fFeed").value.trim(),
    depth:$("#fDepth").value.trim(),
    tool:$("#fTool").value.trim(),
    note:$("#fNote").value.trim(),
    image:image,
    createdAt:old&&old.createdAt?old.createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
  await dbPut(rec);
  state.records=await dbAll();
  state.records.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  $("#recordDialog").close();
  renderDeck();
  openMaterial(rec.materialId,rec.id);
}
async function removeCurrent(){
  if(!state.editingId)return;
  if(!confirm("Удалить эту запись?"))return;
  const old=state.records.find(r=>r.id===state.editingId);
  await dbDelete(state.editingId);
  state.records=await dbAll();
  $("#recordDialog").close();
  renderDeck();
  openMaterial(old.materialId);
}
function renderSearch(){
  const q=$("#searchInput").value.trim().toLowerCase();
  const root=$("#searchResults");
  const rows=state.records.filter(r=>{
    const hay=[r.title,r.operation,r.tool,r.note,mat(r.materialId).title,mat(r.materialId).subtitle].join(" ").toLowerCase();
    return !q||hay.includes(q);
  });
  root.innerHTML=rows.length?"":'<div class="empty-state" style="position:relative;inset:auto;height:70%"><h3>Ничего не найдено</h3><p>Попробуй название детали, материал или инструмент.</p></div>';
  rows.forEach(r=>{
    const m=mat(r.materialId),b=document.createElement("button");
    b.className="search-item";
    b.style.setProperty("--item-rgb",m.rgb);
    b.innerHTML='<i class="search-accent"></i><span><strong>'+r.title+'</strong><small>'+m.title+" · "+(r.operation||"Без операции")+'</small></span><span class="search-rpm">'+(r.rpm?r.rpm+" rpm":"")+"</span>";
    b.onclick=()=>openMaterial(r.materialId,r.id);
    root.appendChild(b);
  });
}
async function exportData(){
  const data=JSON.stringify({app:"Operating Modes Reference 828D",version:1,exportedAt:new Date().toISOString(),records:state.records},null,2);
  const blob=new Blob([data],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="828d-modes-"+new Date().toISOString().slice(0,10)+".json";
  a.click();
  URL.revokeObjectURL(a.href);
}
async function importData(file){
  const txt=await file.text();
  const data=JSON.parse(txt);
  if(!Array.isArray(data.records))throw new Error("Неверный файл");
  for(const r of data.records)await dbPut(r);
  state.records=await dbAll();
  state.records.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  renderDeck();
  $("#menuDialog").close();
  alert("Импорт завершён");
}
function bind(){
  $$("[data-theme-choice]").forEach(btn=>{
    btn.onclick=()=>applyTheme(btn.dataset.themeChoice,{persist:true});
  });
  $("#themeQuickBtn")?.addEventListener("click",()=>{
    const next=document.documentElement.dataset.theme==="light"?"dark":"light";
    applyTheme(next,{persist:true});
  });
  $("#backBtn").onclick=()=>{renderDeck();setView("home");};
  $("#recordPrev").onclick=()=>moveRecord(-1);
  $("#recordNext").onclick=()=>moveRecord(1);
  $("#addBtn").onclick=()=>openForm();
  $("#topAddBtn").onclick=()=>openForm();
  $("#emptyAdd").onclick=()=>openForm();
  $("#editBtn").onclick=()=>openForm(currentRecord());
  $("#recordForm").addEventListener("submit",saveForm);
  $("#deleteBtn").onclick=removeCurrent;
  $$(".dock-item[data-nav]").forEach(b=>b.onclick=()=>{
    if(b.dataset.nav==="home"){renderDeck();setView("home");}
    else{renderSearch();setView("search");}
  });
  $("#searchInput").addEventListener("input",renderSearch);
  $("#clearSearch").onclick=()=>{$("#searchInput").value="";renderSearch();};
  $("#noteBtn").onclick=()=>{
    const r=currentRecord();
    if(!r||!r.note)return;
    $("#noteTitle").textContent=r.title;
    $("#noteFull").textContent=r.note;
    $("#noteDialog").showModal();
  };
  $("#noteClose").onclick=()=>$("#noteDialog").close();
  $("#menuBtn").onclick=()=>$("#menuDialog").showModal();
  $("#menuClose").onclick=()=>$("#menuDialog").close();
  $("#exportBtn").onclick=exportData;
  $("#importInput").onchange=async e=>{
    try{if(e.target.files[0])await importData(e.target.files[0]);}
    catch(err){alert("Не удалось импортировать файл");}
  };
  document.addEventListener("keydown",e=>{
    if(state.view==="detail"&&e.key==="ArrowLeft")moveRecord(-1);
    if(state.view==="detail"&&e.key==="ArrowRight")moveRecord(1);
  });
}
let persistenceRequested=false;
async function requestPersistentStorage(){
  if(persistenceRequested)return;
  persistenceRequested=true;
  try{
    if(navigator.storage&&navigator.storage.persist){
      await navigator.storage.persist();
    }
  }catch{}
}

async function setupOfflineRuntime(){
  requestPersistentStorage();
  if(!("serviceWorker" in navigator))return;

  try{
    const registration=await navigator.serviceWorker.register("./sw.js",{
      scope:"./",
      updateViaCache:"none"
    });

    const checkForUpdate=()=>{
      if(navigator.onLine)registration.update().catch(()=>{});
    };

    checkForUpdate();
    window.addEventListener("online",checkForUpdate,{passive:true});
  }catch{}
}

async function start(){
  initTheme();
  window.scrollTo(0,0);
  fillMaterialSelect();
  await initData();
  bind();
  renderDeck();
  renderSearch();
  setupOfflineRuntime();
}
start();

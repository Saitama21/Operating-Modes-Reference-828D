const MATERIALS=[
  {id:"aisi304",code:"INOX",title:"AISI 304",subtitle:"Нержавеющая сталь",a:"#ffd86a",b:"#a86e09",rgb:"247,190,55"},
  {id:"steel",code:"STEEL",title:"Сталь S355",subtitle:"Конструкционная сталь",a:"#5f6770",b:"#161b22",rgb:"130,141,154"},
  {id:"polyamide",code:"PA6",title:"Полиамид",subtitle:"Технический пластик",a:"#78b9ff",b:"#124a92",rgb:"76,154,255"},
  {id:"brass",code:"CuZn37",title:"Латунь",subtitle:"Цветной сплав",a:"#e2ac4d",b:"#745015",rgb:"230,165,55"},
  {id:"titanium",code:"Ti",title:"Титан",subtitle:"Ti6Al4V",a:"#9ea9b6",b:"#4f5b68",rgb:"167,180,195"},
  {id:"aluminium",code:"Al",title:"Алюминий",subtitle:"Al 6061",a:"#8bd7cb",b:"#1c746e",rgb:"94,197,184"}
];
const SEED=[];

const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const state={view:"home",materialIndex:0,recordIndex:0,records:[],editingId:null};

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
function clampOffset(d){if(d>2||d<-2)return null;return d}

function renderDeck(){
  const deck=$("#materialDeck"),dots=$("#materialDots");
  deck.innerHTML="";dots.innerHTML="";
  MATERIALS.forEach((m,i)=>{
    let raw=i-state.materialIndex;
    if(raw>MATERIALS.length/2)raw-=MATERIALS.length;
    if(raw<-MATERIALS.length/2)raw+=MATERIALS.length;
    const off=clampOffset(raw);
    const c=document.createElement("button");
    c.className="material-card"+(off===null?" is-hidden":"");
    c.dataset.offset=off===null?99:off;
    c.style.setProperty("--card-a",m.a);
    c.style.setProperty("--card-b",m.b);
    c.style.setProperty("--card-rgb",m.rgb);
    const count=materialRecords(m.id).length;
    c.innerHTML=
      '<div class="card-code">'+m.code+'</div>'+
      '<div class="card-title">'+m.title+'</div>'+
      '<div class="card-subtitle">'+m.subtitle+'</div>'+
      '<div class="card-bottom"><div class="card-count"><b>'+count+'</b><span>'+(count===1?"запись":"записей")+'</span></div><span class="card-open">›</span></div>';
    c.addEventListener("click",()=>{
      if(i===state.materialIndex)openMaterial(m.id);
      else{state.materialIndex=i;renderDeck();}
    });
    deck.appendChild(c);
    const d=document.createElement("i");
    if(i===state.materialIndex)d.className="active";
    dots.appendChild(d);
  });
  setAccent(MATERIALS[state.materialIndex]);
  $("#recordTotal").textContent=state.records.length;
}
function moveMaterial(dir){
  state.materialIndex=(state.materialIndex+dir+MATERIALS.length)%MATERIALS.length;
  renderDeck();
}
function setView(view){
  state.view=view;
  $$(".screen").forEach(s=>s.classList.remove("is-active"));
  const target=view==="home"?$("#homeScreen"):view==="search"?$("#searchScreen"):$("#detailScreen");
  target.classList.add("is-active");
  $$(".dock-item[data-nav]").forEach(b=>b.classList.toggle("is-active",b.dataset.nav===view));
  $("#screenTitle").textContent=view==="home"?"Режимы обработки":view==="search"?"Поиск":"Запись";
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
  $("#detailMaterialSub").textContent=m.subtitle;
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
  $("#materialPrev").onclick=()=>moveMaterial(-1);
  $("#materialNext").onclick=()=>moveMaterial(1);
  $("#backBtn").onclick=()=>{renderDeck();setView("home");};
  $("#recordPrev").onclick=()=>moveRecord(-1);
  $("#recordNext").onclick=()=>moveRecord(1);
  $("#addBtn").onclick=()=>openForm();
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
  let sx=0;
  $("#materialDeck").addEventListener("touchstart",e=>sx=e.changedTouches[0].clientX,{passive:true});
  $("#materialDeck").addEventListener("touchend",e=>{
    const dx=e.changedTouches[0].clientX-sx;
    if(Math.abs(dx)>45)moveMaterial(dx<0?1:-1);
  },{passive:true});
  document.addEventListener("keydown",e=>{
    if(state.view==="home"&&e.key==="ArrowLeft")moveMaterial(-1);
    if(state.view==="home"&&e.key==="ArrowRight")moveMaterial(1);
    if(state.view==="detail"&&e.key==="ArrowLeft")moveRecord(-1);
    if(state.view==="detail"&&e.key==="ArrowRight")moveRecord(1);
  });
}
async function start(){
  fillMaterialSelect();
  await initData();
  bind();
  renderDeck();
  renderSearch();
  if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
start();

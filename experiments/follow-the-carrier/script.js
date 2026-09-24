const pages=[
 {title:"The case names its people",meta:"MCR 879 · prototype binding pending",body:"The proceeding gives us people before it gives us a complete route between them.",unlock:["mcr879","robert-family","margaret","catherine"]},
 {title:"A person opens a documentary neighborhood",meta:"Catherine McKinney · prototype relation test",body:"Catherine can bring a controlled historical object into view without that object becoming evidence in this proceeding.",unlock:["catherine-patent"]},
 {title:"Names accumulate before bridges do",meta:"Bell name population · prototype relation test",body:"James and Levy can become visible as neighboring historical names. Visibility does not merge them into later Bell identities.",unlock:["james","levy","family-memory"]},
 {title:"Robert survives in another carrier",meta:"1837 add-back · Robert name-form",body:"A Robert Bell name-form appears in an earlier administrative body. A name can travel farther than a person can speak.",unlock:["robert-1837"]},
 {title:"Robin enters by witness naming",meta:"later hearing stage · Robin name-form",body:"A later witness-side object brings Robin Bell into the field. The interface may now expose the question. It may not answer it.",unlock:["robin","robert-robin"]}
];

const pieces={
 "mcr879":{type:"proceeding",title:"MCR 879",note:"active case body",x:5,y:7,kind:"admin",props:{state:"ACTIVE PROCEEDING",carrier:"case body",limit:"does not contain every historical object visible in this field"}},
 "robert-family":{type:"person occurrence",title:"Robert Bell",note:"family-side occurrence",x:32,y:7,kind:"family",props:{state:"EXISTS",voice:"family / applicant-side",limit:"do not merge with another Robert occurrence"}},
 "margaret":{type:"person occurrence",title:"Margaret McKinney",note:"family-side occurrence",x:56,y:7,kind:"family",props:{state:"EXISTS",limit:"prototype exact page binding still open"}},
 "catherine":{type:"person occurrence",title:"Catherine McKinney",note:"family-side occurrence",x:76,y:17,kind:"family",props:{state:"EXISTS",opens:"controlled documentary neighborhood",limit:"appearance does not import her records into MCR 879"}},
 "catherine-patent":{type:"historical object",title:"Article XIX patent",note:"exists · no case carrier earned",x:68,y:42,kind:"source",props:{state:"EXISTS",relation:"documentary neighborhood of Catherine McKinney",carrier_into_mcr879:"NOT EARNED",limit:"presence is not carriage"}},
 "james":{type:"name occurrence",title:"James Bell",note:"visible · identity open",x:8,y:44,kind:"unresolved",props:{state:"EXISTS",identity:"OPEN",limit:"same or similar name earns no merge"}},
 "levy":{type:"name occurrence",title:"Levy Bell",note:"visible · identity open",x:29,y:57,kind:"unresolved",props:{state:"EXISTS",identity:"OPEN",limit:"same or similar name earns no merge"}},
 "family-memory":{type:"family carrier",title:"Family voice",note:"relation remembered",x:46,y:64,kind:"family",props:{state:"CARRIED AS FAMILY MEMORY",carrier:"family testimony / memory",limit:"does not become administrative proof automatically"}},
 "robert-1837":{type:"administrative name carrier",title:"Robert Bell",note:"1837 add-back name-form",x:6,y:72,kind:"admin",props:{state:"EXISTS",carrier:"1837 administrative body",limit:"name-form continuity does not prove person identity"}},
 "robin":{type:"witness name carrier",title:"Robin Bell",note:"later hearing-stage naming",x:39,y:29,kind:"family",props:{state:"EXISTS",carrier:"witness-side naming",limit:"preserve Robin exactly where the source says Robin"}},
 "robert-robin":{type:"unresolved relation",title:"ROBERT ? ROBIN",note:"question visible · bridge not earned",x:42,y:45,kind:"unresolved",props:{state:"UNRESOLVED",relation:"person identity",needed:"an earned independent bridge",limit:"a name resemblance is not a carrier"}}
};

const relations=[
 {from:"catherine",to:"catherine-patent",label:"documentary neighborhood",kind:"family",requires:["catherine","catherine-patent"]},
 {from:"robert-family",to:"family-memory",label:"family voice carries",kind:"family",requires:["robert-family","family-memory"]},
 {from:"robert-1837",to:"robert-robin",label:"question only",kind:"family",requires:["robert-1837","robert-robin"]},
 {from:"robin",to:"robert-robin",label:"question only",kind:"family",requires:["robin","robert-robin"]}
];

let pageIndex=Number(localStorage.getItem("eh-carrier-page")||0);
if(!Number.isFinite(pageIndex)||pageIndex<0||pageIndex>=pages.length) pageIndex=0;
const unlocked=new Set();
for(let i=0;i<=pageIndex;i++) pages[i].unlock.forEach(id=>unlocked.add(id));

const passage=document.querySelector("#passage");
const stage=document.querySelector("#field-stage");
const properties=document.querySelector("#properties-body");
const next=document.querySelector("#read-next");
const state=document.querySelector("#read-state");

function renderPage(){
 const p=pages[pageIndex];
 passage.innerHTML=`<p class="meta">${p.meta}</p><h3>${p.title}</h3><p>${p.body}</p><p class="prototype">Prototype note: this reading card tests interaction. Final public wording must return to the governed source body.</p>`;
 state.textContent=`${pageIndex+1} / ${pages.length}`;
 next.disabled=pageIndex===pages.length-1;
 next.textContent=next.disabled?"Field remains open":"Read next controlled page";
 passage.focus({preventScroll:true});
}

function center(el){
 const a=el.getBoundingClientRect(),b=stage.getBoundingClientRect();
 return {x:a.left-b.left+a.width/2,y:a.top-b.top+a.height/2};
}

function drawRelation(r){
 if(!r.requires.every(id=>unlocked.has(id))) return;
 const a=stage.querySelector(`[data-piece="${r.from}"]`);
 const b=stage.querySelector(`[data-piece="${r.to}"]`);
 if(!a||!b)return;
 const A=center(a),B=center(b),dx=B.x-A.x,dy=B.y-A.y,len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx)*180/Math.PI;
 const line=document.createElement("div");
 line.className="connector "+(r.kind||"");
 line.style.left=A.x+"px";line.style.top=A.y+"px";line.style.width=len+"px";line.style.transform=`rotate(${ang}deg)`;
 const label=document.createElement("span");
 label.className="relation-label";
 label.textContent=r.label;
 label.style.left=((A.x+B.x)/2)+"px";label.style.top=((A.y+B.y)/2)+"px";
 stage.prepend(line,label);
}

function renderField(){
 stage.replaceChildren();
 Object.entries(pieces).forEach(([id,p])=>{
   if(!unlocked.has(id))return;
   const el=document.createElement("button");
   el.type="button";el.className="piece "+(p.kind||"");el.dataset.piece=id;
   el.style.left=p.x+"%";el.style.top=p.y+"%";
   el.innerHTML=`<span class="type">${p.type}</span><strong>${p.title}</strong><small>${p.note}</small>`;
   el.addEventListener("click",()=>inspect(id,el));
   stage.append(el);
 });
 requestAnimationFrame(()=>relations.forEach(drawRelation));
}

function inspect(id,el){
 stage.querySelectorAll(".piece").forEach(x=>x.classList.toggle("is-active",x===el));
 const p=pieces[id];
 const rows=Object.entries(p.props||{}).map(([k,v])=>`<div class="prop-row"><dt>${k.replaceAll("_"," ")}</dt><dd>${v}</dd></div>`).join("");
 properties.innerHTML=`<div class="prop-type">${p.type}</div><div class="prop-title">${p.title}</div><dl class="prop-list">${rows}</dl><div class="brake">Properties describes this object only. Selecting it does not create a new relation.</div>`;
}

next.addEventListener("click",()=>{
 if(pageIndex>=pages.length-1)return;
 pageIndex+=1;
 pages[pageIndex].unlock.forEach(id=>unlocked.add(id));
 localStorage.setItem("eh-carrier-page",String(pageIndex));
 renderPage();renderField();
});

window.addEventListener("resize",()=>renderField());
renderPage();renderField();
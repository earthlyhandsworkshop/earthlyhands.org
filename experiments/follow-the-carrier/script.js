const key="eh-follow-carrier-mary-william-v1";
const earned=new Set(JSON.parse(localStorage.getItem(key)||"[]"));

const pieces={
 mcr879:{kind:"recordmark",title:"MCR 879",note:"proceeding",x:8,y:8,props:{state:"EXISTS",carrier:"active proceeding",source:"Scene One register",limit:"case body is not every historical object around it"}},
 mary:{kind:"person",title:"Mary Caroline Atkinson",note:"sworn witness",x:31,y:11,props:{state:"EXISTS",voice:"direct examination",record_time:"23 Oct 1900",limit:"her statements remain her testimony"}},
 durant:{kind:"place",title:"Durant",note:"post-office address",x:65,y:9,props:{state:"EXISTS",relation:"Mary states post-office address",limit:"postal address ≠ residence point"}},
 pontotoc:{kind:"place",title:"Pontotoc",note:"prior residence",x:76,y:27,props:{state:"EXISTS",relation:"Mary states prior residence in Pontotoc County / town of Pontotoc",limit:"no route to Indian Territory earned"}},
 robert:{kind:"person",title:"Robert Bell",note:"Mary's father occurrence",x:27,y:31,props:{state:"EXISTS",relation:"Mary names Robert Bell as her father",identity:"occurrence-local",limit:"does not merge with another Robert Bell"}},
 elizabeth:{kind:"person",title:"Elizabeth D. Bell",note:"Mary's mother occurrence",x:48,y:25,props:{state:"EXISTS",relation:"Mary names Elizabeth D. Bell as her mother",limit:"this scene does not import Elizabeth's affidavit contents"}},
 "remembered-roll":{kind:"proposition",title:"“His name is on the register.”",note:"family-carried proposition",x:10,y:50,props:{state:"CARRIED AS TESTIMONY",carrier:"Mary's voice / what she has heard",object:"roll / register not yet identified here",limit:"testimony ≠ recovered historical roll occurrence"}},
 "commission-records":{kind:"recordmark",title:"Commission record searches",note:"administrative acts",x:69,y:48,props:{state:"EXISTS IN SCENE",carrier:"Commission / record statements",scope:"tribal roll, 1896 applications, U.S. court admissions",limit:"search result ≠ universal historical negative"}},
 article14:{kind:"proposition",title:"Article XIV",note:"claim / questioning frame",x:36,y:55,props:{state:"CLAIM PRESENT",carrier:"questioning + Mary's answers",limit:"claim present ≠ credential accepted"}},
 "approved-roll":{kind:"recordmark",title:"Approved roll of locations",note:"Commission-stated search target",x:82,y:62,props:{state:"ADMINISTRATIVE REPRESENTATION",carrier:"Commission recorded statement",result:"no party by name Robert Bell appears on the cited roll",limit:"do not generalize beyond the stated object / search"}},
 "knowledge-limit":{kind:"proposition",title:"“I don't know.”",note:"witness limit",x:38,y:76,props:{state:"SOURCE VOICE",function:"limits proposition strength",limit:"uncertainty is not absence of all knowledge"}},
 grandmother:{kind:"person",title:"Grandmother",note:"unnamed in this scene",x:58,y:77,props:{state:"EXISTS AS RELATION",carrier:"Mary's testimony",name:"not supplied here",limit:"do not donate a name from another source"}},
 correction:{kind:"proposition",title:"“I said not that I knew of.”",note:"Mary corrects the paraphrase",x:13,y:82,props:{state:"SOURCE VOICE",function:"correction / strength control",limit:"Commission paraphrase does not replace Mary's qualifier"}},
 children:{kind:"proposition",title:"Six minor children",note:"application population",x:72,y:86,props:{state:"EXISTS IN CASE",carrier:"Mary's answers",limit:"their later records are not opened by this mark alone"}},
 "exhibit-a":{kind:"recordmark",title:"Exhibit A",note:"petition + named affidavits",x:44,y:92,props:{state:"FILED / MADE PART OF RECORD",carrier:"record statement",contains:"petition + affidavits of Elizabeth D. Bell, W. R. Collins, F. Atkinson, Margaret Elizabeth Williams, T. E. Donaldson",limit:"filed ≠ accepted as historically true"}},
 william:{kind:"person",title:"William D. Bell",note:"second family witness",x:8,y:20,props:{state:"EXISTS",voice:"direct examination",record_time:"23 Oct 1900",limit:"second witness ≠ automatic corroboration"}},
 texas:{kind:"place",title:"Texas",note:"William says lived there since 1874",x:84,y:18,props:{state:"EXISTS",relation:"William states prior residence",limit:"no route geometry earned"}},
 "martha-jane":{kind:"person",title:"Martha Jane",note:"William's wife occurrence",x:62,y:38,props:{state:"EXISTS",relation:"William names his wife",limit:"this scene does not supply her full documentary body"}},
 "document-window":{kind:"recordmark",title:"15-day evidence window",note:"additional documentary proof",x:65,y:68,props:{state:"PROCEDURAL WINDOW",carrier:"attorney request + Commission grant",limit:"permission to file ≠ proof filed or accepted"}},
 "william-children":{kind:"proposition",title:"Four minor children",note:"application population",x:83,y:83,props:{state:"EXISTS IN CASE",carrier:"William's answers",limit:"later records not opened here"}}
};

const relations=[
 ["mary","robert","father","family"],
 ["mary","elizabeth","mother","family"],
 ["mary","durant","post-office address","family"],
 ["mary","pontotoc","prior residence","family"],
 ["mary","remembered-roll","says / heard","family"],
 ["mcr879","commission-records","record search","admin"],
 ["mcr879","approved-roll","Commission states search","admin"],
 ["mcr879","exhibit-a","filed into record","admin"],
 ["william","durant","post office / recent arrival","family","william-durant"],
 ["william","texas","prior residence","family","texas"],
 ["william","pontotoc","earlier residence","family","william-pontotoc"],
 ["william","robert","father","family","william-robert"],
 ["william","remembered-roll","told / father's name","family","william-roll"],
 ["william","martha-jane","wife","family","martha-jane"],
 ["mcr879","document-window","15-day filing window","admin","document-window"]
];

const beats=[...document.querySelectorAll(".source-beat")];
const door=document.querySelector("#field-door");
const field=document.querySelector("#carrier-field");
const stage=document.querySelector("#field-stage");
const props=document.querySelector("#properties-body");
const status=document.querySelector("#field-status");
const count=document.querySelector("#earned-count");

function persist(){localStorage.setItem(key,JSON.stringify([...earned]));}
function earn(ids){
 let changed=false;
 ids.forEach(function(id){if(id&&!earned.has(id)){earned.add(id);changed=true;}});
 if(changed){persist();renderField();updateCount();}
}
function visibleCount(){
 return Object.keys(pieces).filter(function(id){return earned.has(id);}).length;
}
function updateCount(){
 const n=visibleCount();
 door.hidden=n===0;
 count.textContent=n?(n+" reachable"):"0 reachable";
 status.textContent=n?(n+" reachable"):"";
}
const observer=new IntersectionObserver(function(entries){
 entries.forEach(function(e){
   if(e.isIntersecting){
     e.target.classList.add("is-read");
     earn((e.target.dataset.earn||"").split(","));
   }
 });
},{rootMargin:"-20% 0px -55% 0px",threshold:.01});
beats.forEach(function(b){observer.observe(b);});

function openField(){
 field.hidden=false;
 door.setAttribute("aria-expanded","true");
 door.querySelector("span").textContent="FIELD";
 door.querySelector("b").textContent="↑";
 renderField();
 requestAnimationFrame(function(){field.scrollIntoView({behavior:"smooth",block:"start"});});
}
function shutField(){
 field.hidden=true;
 door.setAttribute("aria-expanded","false");
 door.querySelector("span").textContent="FIELD";
 door.querySelector("b").textContent="↓";
 document.querySelector("#source-piece").scrollIntoView({behavior:"smooth",block:"end"});
}
door.addEventListener("click",function(){field.hidden?openField():shutField();});

function point(el){
 const r=el.getBoundingClientRect(),s=stage.getBoundingClientRect();
 return {x:r.left-s.left+r.width/2,y:r.top-s.top+r.height/2};
}
function drawLine(a,b,label,kind){
 const A=stage.querySelector('[data-id="'+a+'"]');
 const B=stage.querySelector('[data-id="'+b+'"]');
 if(!A||!B)return;
 const p=point(A),q=point(B),dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx)*180/Math.PI;
 const l=document.createElement("div");
 l.className="line "+(kind||"");
 l.style.left=p.x+"px";l.style.top=p.y+"px";l.style.width=len+"px";l.style.transform="rotate("+ang+"deg)";
 stage.prepend(l);
 const t=document.createElement("span");
 t.className="line-label";t.textContent=label;t.style.left=((p.x+q.x)/2)+"px";t.style.top=((p.y+q.y)/2)+"px";
 stage.append(t);
}
function effectiveProps(id){
 const base=Object.assign({},pieces[id].props||{});
 if(id==="remembered-roll" && earned.has("william-roll")){
   base.carrier="Mary Caroline Atkinson + William D. Bell";
   base.carrier_count="2 family witness carriers";
   base.limit="multiple family carriers ≠ recovered roll occurrence or automatic corroboration";
 }
 if(id==="robert" && earned.has("william-robert")){
   base.relation="named as father by Mary Caroline Atkinson and William D. Bell";
   base.carrier_count="2 family witness carriers";
   base.limit="shared father proposition does not merge this occurrence with another Robert Bell body";
 }
 if(id==="durant" && earned.has("william-durant")){
   base.relation="Mary: post-office address · William: post-office / recent arrival";
   base.limit="same place label carries different source-local jobs";
 }
 if(id==="pontotoc" && earned.has("william-pontotoc")){
   base.relation="Mary: prior residence · William: born there / lived until 1874";
   base.limit="shared place does not collapse the witnesses or create route geometry";
 }
 if(id==="exhibit-a" && earned.has("document-window")){
   base.additional_state="William scene: petition and affidavits filed; 15-day request granted for more documentary proof";
   base.limit="same exhibit label / repeated packet material does not duplicate historical witness acts";
 }
 return base;
}

function inspect(id,el){
 stage.querySelectorAll(".mark").forEach(function(x){x.classList.toggle("is-active",x===el);});
 const p=pieces[id];
 const rows=Object.entries(effectiveProps(id)).map(function(pair){
   return '<div class="prop-row"><b>'+pair[0].replaceAll("_"," ")+'</b><p>'+pair[1]+'</p></div>';
 }).join("");
 props.innerHTML='<div class="prop-kind">'+p.kind+'</div><div class="prop-title">'+p.title+'</div>'+rows+'<div class="brake">Looking at this mark does not create a new carrier.</div>';
}
function renderField(){
 if(field.hidden)return;
 stage.replaceChildren();
 Object.entries(pieces).forEach(function(pair){
   const id=pair[0],p=pair[1];
   if(!earned.has(id))return;
   const b=document.createElement("button");
   b.type="button";b.className="mark "+p.kind;b.dataset.id=id;b.style.left=p.x+"%";b.style.top=p.y+"%";
   const shownKind=p.kind==="recordmark"?"record":p.kind;
   let note=p.note;
   if(id==="remembered-roll" && earned.has("william-roll")) note="2 family witness carriers";
   if(id==="robert" && earned.has("william-robert")) note="father proposition · 2 carriers";
   b.innerHTML='<span class="mark-kind">'+shownKind+'</span><span class="dot"></span><strong>'+p.title+'</strong><small>'+p.note+'</small>';
   b.addEventListener("click",function(){inspect(id,b);});
   stage.append(b);
 });
 requestAnimationFrame(function(){
   relations.forEach(function(r){const condition=!r[4]||earned.has(r[4]);if(earned.has(r[0])&&earned.has(r[1])&&condition)drawLine(r[0],r[1],r[2],r[3]);});
 });
 status.textContent=visibleCount()+" reachable";
}

window.addEventListener("resize",function(){if(!field.hidden)renderField();});
updateCount();

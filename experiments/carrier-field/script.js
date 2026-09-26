const tray=document.querySelector("#tray");
const handle=document.querySelector("#tray-handle");
const status=document.querySelector("#tray-status");
const props=document.querySelector("#properties");
const pieces=[...document.querySelectorAll(".piece")];
const rows=[...document.querySelectorAll(".carrier-row")];

const copy={
  robert:{
    title:"ROBERT BELL",
    body:"The later federal comparator is substantially visible in the 1837–38 adjudicative body and is carried into later land / patent / identity machinery.",
    brake:"No free line back to 1830. The missing span stays open unless a carrier earns it."
  },
  mary:{
    title:"MARY CAROLINE ATKINSON",
    body:"Mary is a direct witness in MCR 879 on 23 October 1900. Her testimony carries propositions; it does not become an 1830 record occurrence merely because it speaks about one.",
    brake:"A witness can carry a memory or proposition farther than she can prove the underlying historical event."
  },
  mcr:{
    title:"MCR 879",
    body:"The case body begins as a live administrative carrier around 1900 and continues through later decision and rehearing states.",
    brake:"A case carrier can move propositions forward without repairing every earlier gap underneath them."
  }
};

function setOpen(open){
  tray.dataset.open=String(open);
  handle.setAttribute("aria-expanded",String(open));
  status.textContent=open?"touch a little body · the page stays put":"3 little bodies · 1 open seam";
}
handle.addEventListener("click",()=>setOpen(tray.dataset.open!=="true"));

function select(id){
  pieces.forEach(p=>p.classList.toggle("is-active",p.dataset.piece===id));
  rows.forEach(r=>r.classList.toggle("is-hidden",r.dataset.row!==id));
  const c=copy[id];
  props.innerHTML="<b>"+c.title+"</b><p>"+c.body+"</p><p class=\"brake\">"+c.brake+"</p>";
}
pieces.forEach(p=>p.addEventListener("click",()=>select(p.dataset.piece)));
setOpen(false);
select("robert");
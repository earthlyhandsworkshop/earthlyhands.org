const ui={
  wash:document.querySelector("#wash-card"),
  river:document.querySelector("#river"),
  albert:document.querySelector("#albert-card"),
  route:document.querySelector("#missing-route"),
  comparison:document.querySelector("#comparison"),
  refusal:document.querySelector("#refusal"),
  recordBody:document.querySelector("#record-body"),
  revealWash:document.querySelector("#reveal-wash"),
  revealAlbert:document.querySelector("#reveal-albert"),
  compare:document.querySelector("#compare"),
  drawRoute:document.querySelector("#draw-route"),
  openRecord:document.querySelector("#open-record"),
  state:document.querySelector("#state-label"),
  note:document.querySelector("#control-note")
};
let washOpen=false;
let albertOpen=false;

function sync(){
  ui.wash.hidden=!washOpen;
  ui.river.hidden=!washOpen;
  ui.albert.hidden=!albertOpen;
  ui.compare.disabled=!(washOpen&&albertOpen);
  ui.drawRoute.disabled=!(washOpen&&albertOpen);
  if(washOpen&&albertOpen){
    ui.state.textContent="two access states";
    ui.note.textContent="Both nonappearances are visible. Their voices, named places, and access conditions remain separate.";
  }else if(washOpen){
    ui.state.textContent="Pearl River named";
    ui.note.textContent="The river is a stated relation, not a recovered crossing point or route.";
  }else if(albertOpen){
    ui.state.textContent="water unnamed";
    ui.note.textContent="The source gives a high-water condition but does not identify the water body or obstruction place.";
  }else{
    ui.state.textContent="fixed stop";
  }
}

ui.revealWash.addEventListener("click",()=>{
  washOpen=true;
  ui.revealWash.disabled=true;
  ui.revealWash.textContent="Wash revealed";
  ui.revealAlbert.classList.add("primary");
  sync();
  ui.wash.scrollIntoView({behavior:"smooth",block:"center"});
});
ui.revealAlbert.addEventListener("click",()=>{
  albertOpen=true;
  ui.revealAlbert.disabled=true;
  ui.revealAlbert.textContent="Albert revealed";
  ui.revealAlbert.classList.remove("primary");
  sync();
  ui.albert.scrollIntoView({behavior:"smooth",block:"center"});
});
ui.compare.addEventListener("click",()=>{
  ui.comparison.hidden=false;
  ui.compare.disabled=true;
  ui.compare.textContent="access compared";
  ui.comparison.scrollIntoView({behavior:"smooth",block:"start"});
});
ui.drawRoute.addEventListener("click",()=>{
  ui.route.hidden=false;
  ui.refusal.hidden=false;
  ui.drawRoute.disabled=true;
  ui.drawRoute.textContent="route refused";
  ui.state.textContent="road remains undrawn";
  ui.refusal.scrollIntoView({behavior:"smooth",block:"start"});
});
ui.openRecord.addEventListener("click",()=>{
  ui.recordBody.hidden=false;
  ui.openRecord.disabled=true;
  ui.openRecord.textContent="record recall opened";
  ui.recordBody.scrollIntoView({behavior:"smooth",block:"center"});
});
sync();

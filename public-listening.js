(function(){
  const endpoint=String(window.EARTHLY_HANDS_LISTENING_URL||"").trim();
  if(!endpoint)return;

  const KEY="earthly-hands-public-visit-v1";
  let visitId="";
  try{
    visitId=sessionStorage.getItem(KEY)||"";
    if(!visitId){
      visitId=(crypto&&crypto.randomUUID)?crypto.randomUUID():("visit-"+Date.now()+"-"+Math.random().toString(16).slice(2));
      sessionStorage.setItem(KEY,visitId);
    }
  }catch(_){
    visitId="visit-"+Date.now()+"-"+Math.random().toString(16).slice(2);
  }

  function deviceClass(){
    const w=Math.max(document.documentElement.clientWidth||0,window.innerWidth||0);
    if(w<640)return"phone";
    if(w<1024)return"tablet";
    return"large";
  }

  function record(event,detail){
    const d=detail||{};
    const body={
      event:String(event||"").toUpperCase(),
      visit_id:visitId,
      path:location.pathname,
      ground:String(d.ground||document.body.dataset.ground||""),
      instrument:String(d.instrument||""),
      aperture:String(d.aperture||location.hash.replace(/^#/,"")),
      device_class:deviceClass()
    };
    fetch(endpoint,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(body),
      keepalive:true
    }).catch(function(){});
  }

  window.EarthlyHandsListening={record:record,visitId:visitId};

  window.addEventListener("earthlyhands:ground-event",function(event){
    const d=event?.detail||{};
    const type=String(d.type||"").toLowerCase();
    const mapped={
      ground_open:"REACHED",
      window_open:"REACHED",
      unjoined_edge:"REACHED",
      refused_road:"REACHED",
      source_descent:"OPENED_SOURCES",
      return_close:"RETURNED",
      ask:"ASKED_GROUND"
    }[type]||"";
    if(!mapped)return;
    record(mapped,{
      ground:String(d.ground||""),
      instrument:type,
      aperture:String(d.target||d.experiment||"")
    });
  });

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",function(){record("ARRIVED");},{once:true});
  }else{
    record("ARRIVED");
  }

  window.addEventListener("pagehide",function(){record("STOPPED");},{once:true});
})();
(function(){
  const destinations=[
    {id:"shared-country",label:"Shared Country",path:"/experiments/shared-country/",aliases:["shared country","home","front ground","dawson"]},
    {id:"recent",label:"Recent",path:"/recent/",aliases:["recent","/recent","recent work","what's recent","whats recent"]},
    {id:"creek-look-back",label:"Creek Look-Back",path:"/grounds/line-commons/creek-look-back/",aliases:["creek look-back","creek look back","line commons","look back from the creek"]},
    {id:"listening",label:"Public Listening",path:"/listening/",aliases:["public listening","listening","visitor listening"]}
  ];

  function norm(s){
    return String(s||"").toLowerCase().replace(/[?#].*$/,"").replace(/https?:\/\/[^/]+/,"").replace(/\s+/g," ").trim();
  }
  function explicitPath(s){
    const m=String(s||"").match(/(?:^|\s)(\/[a-z0-9][a-z0-9/_-]*\/?)(?:\s|$)/i);
    return m?m[1]:"";
  }
  function resolve(input){
    const raw=String(input||"").trim();
    const lower=norm(raw);
    const asks=/\b(take me|go to|go see|show me|open|visit|enter|walk to|bring me|bring me to|head to|navigate to|return to)\b/.test(lower);
    const path=explicitPath(raw);
    if(path){
      const clean=norm(path).replace(/\/+$/,"");
      const hit=destinations.find(d=>norm(d.path).replace(/\/+$/,"")===clean);
      if(hit && (asks || raw.trim().startsWith("/"))) return hit;
    }
    if(!asks)return null;
    return destinations.find(d=>d.aliases.some(a=>{
      const aa=norm(a);
      return aa && (lower===aa || lower.includes(" "+aa) || lower.endsWith(aa));
    }))||null;
  }
  function names(){
    return destinations.filter(d=>d.id!=="listening").map(d=>d.label);
  }
  function go(input){
    const hit=resolve(input);
    if(!hit)return null;
    window.location.assign(hit.path);
    return hit;
  }
  window.EarthlyHandsWayfinding={resolve,go,names,destinations};
})();
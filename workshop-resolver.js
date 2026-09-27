(() => {
  const REGISTRY_URL="/data/workshop/registry.shareable.v0.json";
  let registryPromise=null;
  const cache=new Map();
  async function registry(){
    if(!registryPromise) registryPromise=fetch(REGISTRY_URL,{cache:"no-store"}).then(async r=>{
      if(!r.ok) throw new Error("Workshop registry unavailable: "+r.status);
      return r.json();
    });
    return registryPromise;
  }
  async function entry(id){
    const data=await registry();
    const item=data?.objects?.[id];
    if(!item) throw new Error("Unknown Workshop object: "+id);
    return item;
  }
  async function get(id){
    if(cache.has(id)) return cache.get(id);
    const item=await entry(id);
    if(!item.object_record){const shallow={...item,registry_only:true};cache.set(id,shallow);return shallow;}
    const pending=fetch(item.object_record,{cache:"no-store"}).then(async r=>{
      if(!r.ok) throw new Error("Workshop object unavailable: "+id+" ("+r.status+")");
      const body=await r.json();
      if(body.id!==id) throw new Error("Workshop object ID mismatch: "+id);
      return {...body,registry:item};
    });
    cache.set(id,pending);
    try{const value=await pending;cache.set(id,value);return value;}catch(error){cache.delete(id);throw error;}
  }
  async function related(id,verb=""){
    const item=await entry(id);
    const relations=Array.isArray(item.relations)?item.relations:[];
    const selected=verb?relations.filter(r=>r.verb===verb):relations;
    return Promise.all(selected.map(async relation=>({...relation,object:await entry(relation.to)})));
  }
  async function face(id,name){const item=await entry(id);return item.faces?.[name]||null;}
  async function resolve(request){
    const id=typeof request==="string"?request:request?.id;
    if(!id) throw new Error("Workshop Resolver requires an object ID");
    const object=await get(id);
    if(typeof request==="string"||!request.view) return object;
    const view=request.view;
    if(!object.registry?.available_views?.includes(view)) throw new Error("View not available for "+id+": "+view);
    return {id,view,object};
  }
  window.EarthlyHandsResolver=Object.freeze({registry,entry,get,related,face,resolve});
})();
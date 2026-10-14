(()=>{'use strict';
const IDs=['OHC_2245','OHC_2280'], readings=new Map(), savedKey='earthly-hands-two-leaves-v1';
let active=IDs[0],folio=[],scanUrl=null,storageOK=true;
const $=id=>document.getElementById(id);
const getFolio=()=>{try{let x=JSON.parse(localStorage.getItem(savedKey)||'[]');return Array.isArray(x)?x.filter(r=>r&&typeof r.key==='string'&&typeof r.label==='string').slice(0,500):[]}catch{return []}};
folio=getFolio();
function persist(){try{localStorage.setItem(savedKey,JSON.stringify(folio));storageOK=true}catch{storageOK=false}}
function parse(text,id){
const start=text.indexOf('Transcription');if(start<0)throw Error('No Transcription section found.');
const lines=text.slice(start+'Transcription'.length).split(/\r?\n/);let rows=[],section='',order=0;
for(const line of lines){const s=line.trim();if(/^(LII|LIII|LXX|LXXI)$/.test(s)){section=s;rows.push({type:'section',label:section});continue}
const m=s.match(/^(\d{2,3})\s+(.+)$/);if(m)rows.push({type:'entry',page:m[1],name:m[2],key:id+':r'+(++order),section})}
if(!order)throw Error('No index rows found: expected a page number followed by a name.');
return rows;
}
function open(id,scroll=false){if(!IDs.includes(id))return;active=id;for(const x of IDs){$('leaf-'+x).hidden=x!==id}
document.querySelectorAll('[data-leaf]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.leaf===id)));
$('keep-page').textContent=folio.some(x=>x.key===id+':page')?'Leaf kept ✓':'Keep this leaf';
if(scroll)$('reader').scrollIntoView({block:'start'});
}
function node(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e}
function label(id,entry){return entry? id+' · '+entry.name+' · index p.'+entry.page:id+' · full index leaf'}
function addRemove(key,desc){const ix=folio.findIndex(x=>x.key===key);if(ix<0)folio.push({key,label:desc});else folio.splice(ix,1);persist();renderFolio();renderRows(active)}
function renderRows(id){const host=$('rows-'+id),rows=readings.get(id);if(!rows)return;
host.replaceChildren();for(const r of rows){if(r.type==='section'){host.append(node('div','roman',r.label));continue}
const div=node('div','row');div.dataset.key=r.key;div.id='entry-'+r.key.replace(':','-');div.tabIndex=-1;
const pg=node('span','page',r.page),name=node('span','name',r.name),keep=node('button','',folio.some(x=>x.key===r.key)?'✓ kept':'+ folio');keep.type='button';
keep.setAttribute('aria-label','Keep '+r.name+' from '+id);keep.addEventListener('click',()=>addRemove(r.key,label(id,r)));div.append(pg,name,keep);host.append(div)}
}
function find(key){const [id]=key.split(':');open(id,true);let e=document.getElementById('entry-'+key.replace(':','-'));
if(e){e.scrollIntoView({block:'center'});e.focus()}else{$('folio-status').textContent='Load the matching Markdown to reopen this occurrence.'}}
function renderFolio(){const host=$('folio');host.replaceChildren();$('folio-count').textContent=String(folio.length);
for(const r of folio){const li=node('li'),go=node('button','',r.label),remove=node('button','','Remove');go.type=remove.type='button';
go.addEventListener('click',()=>find(r.key));remove.setAttribute('aria-label','Remove '+r.label);remove.addEventListener('click',()=>addRemove(r.key,r.label));li.append(go,remove);host.append(li)}
$('folio-status').textContent=storageOK?'Folio stays in this browser until exported or cleared.':'Browser storage refused the save. Export your folio to keep it.';
$('keep-page').textContent=folio.some(x=>x.key===active+':page')?'Leaf kept ✓':'Keep this leaf';
}
function search(){const q=$('query').value.trim().toLocaleLowerCase(),host=$('results');host.replaceChildren();
if(!q){host.append(node('p','','Search the loaded index leaves.'));return}
const hits=[];for(const [id,rows] of readings){for(const r of rows){if(r.type==='entry'&&(r.name.toLocaleLowerCase().includes(q)||r.page===q))hits.push({id,r})}}
host.append(node('p','',hits.length+' occurrence'+(hits.length===1?'':'s')));
for(const {id,r} of hits.slice(0,70)){const b=node('button','',label(id,r));b.type='button';b.addEventListener('click',()=>find(r.key));host.append(b)}
if(hits.length>70)host.append(node('p','','First 70 shown. Narrow your search.'));
}
$('md-input').addEventListener('change',async ev=>{const file=ev.target.files?.[0];if(!file)return;
if(file.size>2000000){$('load-status').textContent='This prototype limits a local text reading to 2 MB.';return}
try{const text=await file.text();const m=(file.name+'\n'+text.slice(0,80)).match(/OHC[_ -]?(2245|2280)/i);
if(!m)throw Error('This specimen accepts OHC_2245 or OHC_2280. Name the file accordingly or include its ID in the first line.');
const id='OHC_'+m[1],rows=parse(text,id);readings.set(id,rows);renderRows(id);open(id,true);
$('load-status').textContent='Loaded '+file.name+' locally: '+rows.filter(x=>x.type==='entry').length+' name occurrences. No file left your browser.';
search()}catch(e){$('load-status').textContent=e.message}finally{ev.target.value=''}});
$('pdf-input').addEventListener('change',ev=>{const f=ev.target.files?.[0];if(!f)return;
if(f.type!=='application/pdf'&&!f.name.toLowerCase().endsWith('.pdf')){$('scan-status').textContent='Choose a PDF source scan.';return}
if(scanUrl)URL.revokeObjectURL(scanUrl);scanUrl=URL.createObjectURL(f);$('scan-open').href=scanUrl;$('scan-open').hidden=false;
$('scan-status').textContent=f.name+' available locally. Check the scan identity yourself; the file is not uploaded.'});
document.querySelectorAll('[data-leaf]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.leaf,true)));
document.querySelectorAll('[data-theme]').forEach(b=>b.addEventListener('click',()=>{document.body.dataset.theme=b.dataset.theme;document.querySelectorAll('[data-theme]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))}));
$('query').addEventListener('input',search);$('keep-page').addEventListener('click',()=>addRemove(active+':page',label(active)));
$('clear').addEventListener('click',()=>{if(!folio.length||confirm('Empty your browser folio?')){folio=[];persist();renderFolio();renderRows(active)}});
$('export').addEventListener('click',()=>{const data={format:'Earthly Hands local folio v1',items:folio,exported:new Date().toISOString()};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='earthly-hands-folio.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)});
open(active);renderFolio();
})();

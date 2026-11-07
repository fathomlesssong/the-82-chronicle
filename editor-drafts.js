/* Local editorial data only. No auth/session objects belong in this database. */
(function(root){
  'use strict';
  const MAX_BYTES=180*1024*1024;
  function database(indexedDB){
    return new Promise((resolve,reject)=>{
      if(!indexedDB)return reject(new Error('Pamięć szkiców jest niedostępna.'));
      const request=indexedDB.open('ch82-editor-drafts',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('drafts',{keyPath:'key'});
      request.onerror=()=>reject(request.error);
      request.onblocked=()=>reject(new Error('Inna karta blokuje pamięć szkiców.'));
      request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};
    });
  }
  function store(indexedDB){
    const ready=database(indexedDB);
    // Attach a handler immediately, including when storage is disabled at startup.
    ready.catch(()=>{});
    async function transaction(mode,run){
      const db=await ready;
      return new Promise((resolve,reject)=>{
        const tx=db.transaction('drafts',mode);let result;
        tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||new Error('Nie udało się zapisać szkicu.'));
        run(tx.objectStore('drafts'),value=>{result=value;});
      });
    }
    return {
      list:owner=>transaction('readonly',(s,done)=>{s.getAll().onsuccess=e=>done(e.target.result.filter(r=>r.owner===owner&&!r.completed));}),
      save:record=>transaction('readwrite',(s,done)=>{
        s.get(record.key).onsuccess=e=>{
          const previous=e.target.result;
          const conflict=previous&&(previous.completed||previous.revision!==record.revision);
          const next={...record,key:conflict?`${record.owner}:${crypto.randomUUID()}`:record.key,revision:conflict?1:record.revision+1,updated:Date.now()};
          s.put(next);done({record:next,conflict});
        };
      }),
      complete:record=>transaction('readwrite',(s,done)=>{
        s.get(record.key).onsuccess=e=>{
          const previous=e.target.result;
          if(previous&&previous.owner===record.owner&&previous.revision===record.revision){
            // Tombstone prevents a stale parallel tab from recreating the published draft.
            s.put({key:record.key,owner:record.owner,revision:record.revision+1,completed:true,updated:Date.now()});done(true);
          }else done(false);
        };
      })
    };
  }
  function fileData(file){return file&&file.size?{blob:file,name:file.name,type:file.type,lastModified:file.lastModified}:null;}
  function fileFrom(data){return data?new File([data.blob],data.name,{type:data.type,lastModified:data.lastModified}):null;}
  function controller({storage,capture,apply,notify,estimate=async()=>({}),persist=async()=>false}){
    let owner=null,record=null,dirty=false,sequence=0,queue=Promise.resolve(),timer=null;
    function fresh(){return {key:`${owner}:${crypto.randomUUID()}`,owner,revision:0};}
    function error(e){notify(`Błąd zapisu lokalnego: ${e.name==='QuotaExceededError'?'brak miejsca':e.message}. Zachowaj otwartą kartę i zapisz artykuł na serwerze.`,true);}
    function flush(){
      clearTimeout(timer);
      if(!owner||!dirty)return queue;
      const snapshot=capture(),version=sequence,context=record;
      const task=async()=>{
        if(record!==context)return false;
        try{
          const size=(snapshot.main?.blob.size||0)+(snapshot.gallery||[]).reduce((n,x)=>n+(x.file?.blob.size||0),0)+JSON.stringify(snapshot.fields).length*2;
          if(size>MAX_BYTES)throw new Error('Szkic przekracza limit 180 MB');
          const space=await estimate().catch(()=>({}));
          if(space.quota&&space.usage&&space.quota-space.usage<size)notify('Mało miejsca na urządzeniu. Próba zapisu szkicu…',true);
          const saved=await storage.save({...record,snapshot});
          Object.assign(context,saved.record);
          if(version===sequence)dirty=false;
          notify(saved.conflict?'Zapisano osobną kopię: inna karta zmieniła ten szkic.':'Zapisano lokalnie tekst i zdjęcia.');
          return true;
        }catch(e){error(e);return false;}
      };
      queue=queue.then(task,task);return queue;
    }
    return {
      async start(user,articleId='',selected=null){
        await flush();owner=user;record=fresh();dirty=false;
        try{
          const drafts=await storage.list(owner);
          const found=selected?drafts.find(r=>r.key===selected):drafts.filter(r=>articleId===''||String(r.snapshot.fields.id||'')===String(articleId)).sort((a,b)=>b.updated-a.updated)[0];
          if(found){record=found;apply(found.snapshot);notify('Odzyskano lokalny szkic wraz ze zdjęciami.');}
          else notify('Lokalny zapis szkicu jest gotowy.');
          return drafts;
        }catch(e){error(e);return [];}
      },
      change(){if(!owner)return;dirty=true;sequence++;notify('Zapisywanie szkicu…');clearTimeout(timer);timer=setTimeout(flush,250);},
      flush,
      async complete(){await flush();const ok=await storage.complete(record);if(ok){record=fresh();dirty=false;}else notify('Inna karta zmieniła szkic — zachowano jej kopię.',true);return ok;},
      async stop(){await flush();owner=null;record=null;dirty=false;},
      async protect(){try{const granted=await persist();notify(granted?'Włączono trwałą pamięć szkiców.':'Przeglądarka nie przyznała trwałej pamięci. Zapisuj także na serwerze.',!granted);}catch(e){error(e);}},
      get dirty(){return dirty;},get owner(){return owner;}
    };
  }
  const api={store,controller,fileData,fileFrom,MAX_BYTES};
  if(typeof module==='object')module.exports=api;else root.CH82Drafts=api;
})(typeof window==='undefined'?globalThis:window);

(()=>{
  let objectUrl='';let lastFile;
  window.CH82SharePreview={update(form,file,saved){
    const panel=document.querySelector('[data-share-preview]');if(!panel)return;
    const meta=window.CH82ShareMeta.metadata({title:form.elements.title.value,summary:form.elements.summary.value,image_url:saved?.image_url},window.CH82_SUPABASE?.url);
    if(file!==lastFile){if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=file?URL.createObjectURL(file):'';lastFile=file;}
    panel.querySelector('strong').textContent=meta.title;
    panel.querySelector('[data-share-description]').textContent=meta.description;
    const image=panel.querySelector('img');image.src=objectUrl||meta.image;image.alt=meta.title;
    image.onerror=()=>{image.onerror=null;image.src=window.CH82ShareMeta.fallback;};
  }};
})();

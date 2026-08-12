(()=>{
  const cfg=window.CH82_SUPABASE||{};
  const configured=Boolean(
    cfg.url&&cfg.anonKey&&
    !String(cfg.url).includes('PASTE_')&&
    !String(cfg.anonKey).includes('PASTE_')
  );
  if(!configured){
    window.CH82_SUPABASE_READY=Promise.resolve(false);
    return;
  }
  window.CH82_SUPABASE_READY=new Promise(resolve=>{
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.async=true;
    script.onload=()=>resolve(true);
    script.onerror=()=>resolve(false);
    document.head.appendChild(script);
  });
})();

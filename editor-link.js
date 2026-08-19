(async()=>{
  const link=document.querySelector('[data-editor-link]');
  if(!link)return;

  if(window.CH82_SUPABASE_READY){
    await window.CH82_SUPABASE_READY;
  }

  const cfg=window.CH82_SUPABASE||{};

  if(!cfg.url||!cfg.anonKey||!window.supabase){
    link.hidden=true;
    return;
  }

  const db=window.supabase.createClient(cfg.url,cfg.anonKey);

  const sync=async()=>{
    try{
      const {data:{session}}=await db.auth.getSession();

      if(!session){
        link.hidden=true;
        return;
      }

      const {data:profile,error}=await db
        .from('profiles')
        .select('role,active')
        .eq('id',session.user.id)
        .maybeSingle();

      link.hidden=
        !!error||
        !profile?.active||
        !['author','admin'].includes(profile.role);
    }catch(_error){
      link.hidden=true;
    }
  };

  await sync();
  db.auth.onAuthStateChange(()=>sync());
})();

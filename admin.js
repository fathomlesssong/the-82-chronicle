(()=>{
  const cfg=window.CH82_SUPABASE||{};
  const status=(el,msg,bad=false)=>{if(!el)return;el.textContent=msg;el.classList.toggle('is-error',bad)};
  const slugify=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
  const sectionSlug=s=>slugify(s);
  const fmtLocal=iso=>{const d=iso?new Date(iso):new Date();const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`};
  const loginPanel=document.querySelector('[data-login-panel]');
  const shell=document.querySelector('[data-admin-shell]');
  const loginForm=document.querySelector('[data-login-form]');
  const loginStatus=document.querySelector('[data-login-status]');
  const articleForm=document.querySelector('[data-article-form]');
  const formStatus=document.querySelector('[data-form-status]');
  const list=document.querySelector('[data-admin-list]');
  const userEmail=document.querySelector('[data-user-email]');
  const formTitle=document.querySelector('[data-form-title]');
  if(!cfg.url||!cfg.anonKey||!window.supabase){
    status(loginStatus,'Panel czeka na podłączenie projektu Supabase.',true);
    if(loginForm) [...loginForm.elements].forEach(el=>el.disabled=true);
    return;
  }
  const db=window.supabase.createClient(cfg.url,cfg.anonKey);
  const showSession=async session=>{
    const logged=!!session;
    loginPanel.hidden=logged;
    shell.hidden=!logged;
    if(logged){userEmail.textContent=session.user.email||'';await loadArticles();resetForm();}
  };
  const resetForm=()=>{
    articleForm.reset();
    articleForm.elements.id.value='';
    articleForm.elements.published_at.value=fmtLocal();
    formTitle.textContent='Nowy artykuł';
    status(formStatus,'');
  };
  const loadArticles=async()=>{
    list.innerHTML='<p class="admin-help">Wczytywanie…</p>';
    const {data,error}=await db.from('articles').select('*').order('published_at',{ascending:false});
    if(error){list.innerHTML=`<p class="admin-status is-error">${error.message}</p>`;return;}
    list.innerHTML=data.length?data.map(a=>`<article class="admin-list-item"><div><span class="section-label">${a.section} • ${a.status==='published'?'Opublikowany':'Szkic'}</span><h3>${a.title}</h3><p>${new Date(a.published_at).toLocaleString('pl-PL')}</p></div><button type="button" class="button-secondary" data-edit="${a.id}">Edytuj</button></article>`).join(''):'<p class="admin-help">Brak artykułów.</p>';
    list.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>editArticle(btn.dataset.edit,data)));
  };
  const editArticle=(id,data)=>{
    const a=data.find(x=>String(x.id)===String(id));if(!a)return;
    articleForm.elements.id.value=a.id;
    articleForm.elements.title.value=a.title||'';
    articleForm.elements.section.value=a.section||'Wydarzenia';
    articleForm.elements.summary.value=a.summary||'';
    articleForm.elements.content.value=a.content||'';
    articleForm.elements.image_alt.value=a.image_alt||'';
    articleForm.elements.published_at.value=fmtLocal(a.published_at);
    articleForm.elements.featured.checked=!!a.featured;
    articleForm.elements.status.value=a.status||'draft';
    formTitle.textContent='Edytuj artykuł';
    articleForm.scrollIntoView({behavior:'smooth',block:'start'});
  };
  loginForm.addEventListener('submit',async e=>{
    e.preventDefault();status(loginStatus,'Logowanie…');
    const fd=new FormData(loginForm);
    const {error}=await db.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});
    if(error)status(loginStatus,error.message,true);
  });
  document.querySelector('[data-logout]').addEventListener('click',()=>db.auth.signOut());
  document.querySelector('[data-reset-form]').addEventListener('click',resetForm);
  articleForm.addEventListener('submit',async e=>{
    e.preventDefault();status(formStatus,'Zapisywanie…');
    const fd=new FormData(articleForm);const id=fd.get('id')||null;let imageUrl=null;
    const image=fd.get('image');
    if(image&&image.size){
      const ext=(image.name.split('.').pop()||'jpg').toLowerCase();
      const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const up=await db.storage.from('article-images').upload(path,image,{upsert:false});
      if(up.error){status(formStatus,up.error.message,true);return;}
      imageUrl=db.storage.from('article-images').getPublicUrl(path).data.publicUrl;
    }
    const title=String(fd.get('title')).trim();
    const payload={title,slug:slugify(title),section:fd.get('section'),section_slug:sectionSlug(fd.get('section')),summary:String(fd.get('summary')).trim(),content:String(fd.get('content')).trim(),image_alt:String(fd.get('image_alt')||'').trim(),published_at:new Date(fd.get('published_at')).toISOString(),featured:fd.get('featured')==='on',status:fd.get('status')};
    if(imageUrl)payload.image_url=imageUrl;
    if(payload.featured){await db.from('articles').update({featured:false}).neq('id',id||'00000000-0000-0000-0000-000000000000');}
    const q=id?db.from('articles').update(payload).eq('id',id):db.from('articles').insert(payload);
    const {error}=await q;
    if(error){status(formStatus,error.message,true);return;}
    status(formStatus,'Zapisano.');resetForm();await loadArticles();
  });
  db.auth.onAuthStateChange((_event,session)=>showSession(session));
  db.auth.getSession().then(({data})=>showSession(data.session));
})();

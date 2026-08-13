const slugify=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
const slugForSave=(id,title)=>id?undefined:slugify(title);
const CH82_ADMIN_SLUGS=Object.freeze({slugify,slugForSave});

if(typeof module==='object'&&module.exports)module.exports=CH82_ADMIN_SLUGS;

if(typeof window!=='undefined'&&typeof document!=='undefined')(()=>{
  const {slugForSave}=CH82_ADMIN_SLUGS;
  const cfg=window.CH82_SUPABASE||{};
  const sections=Object.freeze({
    'Aktualności':'aktualnosci',
    'Infrastruktura':'infrastruktura',
    'Śledztwa':'sledztwa',
    'Kultura':'kultura',
    'Kącik kulinarny':'kacik-kulinarny'
  });
  const roleNames={author:'Autor',editor:'Redaktor',admin:'Administrator'};
  const statusNames={draft:'Szkic',review:'Do akceptacji',published:'Opublikowany',archived:'Archiwalny'};
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[c]));
  const status=(el,msg,bad=false)=>{if(!el)return;el.textContent=msg;el.classList.toggle('is-error',bad)};
  const fmtLocal=iso=>{const d=iso?new Date(iso):new Date();const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`};
  const newsletterExcerpt=(summary,content,max=440)=>{
    const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    const lead=clean(summary);const body=clean(content);
    const joined=body&&lead&&!body.toLowerCase().startsWith(lead.toLowerCase())?`${lead} ${body}`:(body||lead);
    if(joined.length<=max)return joined;
    return `${joined.slice(0,max+1).replace(/\s+\S*$/,'').replace(/[\s,;:.-]+$/,'')}…`;
  };

  const loginPanel=document.querySelector('[data-login-panel]');
  const shell=document.querySelector('[data-admin-shell]');
  const loginForm=document.querySelector('[data-login-form]');
  const loginStatus=document.querySelector('[data-login-status]');
  const articleForm=document.querySelector('[data-article-form]');
  const formStatus=document.querySelector('[data-form-status]');
  const list=document.querySelector('[data-admin-list]');
  const userEmail=document.querySelector('[data-user-email]');
  const userRole=document.querySelector('[data-user-role]');
  const formTitle=document.querySelector('[data-form-title]');
  const workflowHelp=document.querySelector('[data-workflow-help]');
  const listHelp=document.querySelector('[data-list-help]');
  const usersPanel=document.querySelector('[data-users-panel]');
  const usersList=document.querySelector('[data-users-list]');
  const inviteForm=document.querySelector('[data-invite-form]');
  const inviteStatus=document.querySelector('[data-invite-status]');
  const featuredField=document.querySelector('[data-featured-field]');
  const publishedAtField=document.querySelector('[data-published-at-field]');
  const statusSelect=document.querySelector('[data-status-select]');
  const updateToggle=document.querySelector('[data-update-toggle]');
  const updateAtField=document.querySelector('[data-update-at-field]');
  const newsletterPanel=document.querySelector('[data-newsletter-panel]');
  const sendNewsletter=document.querySelector('[data-send-newsletter]');
  const newsletterUpdateField=document.querySelector('[data-newsletter-update-field]');
  const newsletterCount=document.querySelector('[data-newsletter-count]');
  const generateNewsletter=document.querySelector('[data-generate-newsletter]');

  let db=null;
  let currentSession=null;
  let currentProfile=null;

  if(!cfg.url||!cfg.anonKey||!window.supabase){
    status(loginStatus,'Panel czeka na podłączenie projektu Supabase.',true);
    if(loginForm) [...loginForm.elements].forEach(el=>el.disabled=true);
    return;
  }
  db=window.supabase.createClient(cfg.url,cfg.anonKey);

  const fillNewsletterTeaser=(force=false)=>{
    const field=articleForm?.elements.newsletter_teaser;if(!field)return;
    if(force||!field.value.trim())field.value=newsletterExcerpt(articleForm.elements.summary.value,articleForm.elements.content.value);
  };

  const syncNewsletterUi=()=>{
    if(newsletterUpdateField)newsletterUpdateField.hidden=!updateToggle?.checked;
    const length=articleForm?.elements.newsletter_teaser?.value.length||0;
    if(newsletterCount)newsletterCount.textContent=`${length}/500 znaków`;
  };

  const syncUpdateUi=()=>{
    const checked=!!updateToggle?.checked;
    if(updateAtField)updateAtField.hidden=!checked;
    if(checked&&articleForm&&!articleForm.elements.update_at.value)articleForm.elements.update_at.value=fmtLocal();
    syncNewsletterUi();
  };

  const configureRoleUi=()=>{
    const role=currentProfile?.role;
    const canPublish=role==='editor'||role==='admin';
    featuredField.hidden=!canPublish;
    publishedAtField.hidden=!canPublish;
    newsletterPanel.hidden=!canPublish;
    if(sendNewsletter)sendNewsletter.disabled=!canPublish;
    usersPanel.hidden=role!=='admin';
    [...statusSelect.options].forEach(option=>{
      const forbidden=role==='author'&&!['draft','review'].includes(option.value);
      option.hidden=forbidden;
      option.disabled=forbidden;
    });
    workflowHelp.textContent=role==='author'
      ? 'Twórz szkice i przekazuj je do akceptacji. Publikację wykonuje Redaktor lub Administrator.'
      : 'Możesz poprawiać teksty, publikować je, oznaczać aktualizacje i wybierać główny artykuł.';
    listHelp.textContent=role==='author'?'Widoczne są Twoje teksty.':'Widoczne są wszystkie teksty redakcji.';
    syncUpdateUi();
  };

  const resetForm=()=>{
    articleForm.reset();
    articleForm.elements.id.value='';
    articleForm.elements.published_at.value=fmtLocal();
    articleForm.elements.update_at.value='';
    articleForm.elements.status.value='draft';
    formTitle.textContent='Nowy artykuł';
    status(formStatus,'');
    configureRoleUi();
  };

  const loadArticles=async()=>{
    list.innerHTML='<p class="admin-help">Wczytywanie…</p>';
    let q=db.from('articles').select('*').order('updated_at',{ascending:false});
    if(currentProfile.role==='author')q=q.eq('author_id',currentSession.user.id);
    const {data,error}=await q;
    if(error){list.innerHTML=`<p class="admin-status is-error">${esc(error.message)}</p>`;return;}
    list.innerHTML=data.length?data.map(a=>`<article class="admin-list-item"><div><span class="section-label">${esc(a.section)} • ${esc(statusNames[a.status]||a.status)}${a.is_updated?' • Aktualizacja':''}${a.newsletter_sent_at?' • Newsletter wysłany':''}${a.newsletter_update_sent_at?' • Aktualizacja wysłana':''}</span><h3>${esc(a.title)}</h3><p>${new Date(a.updated_at||a.created_at).toLocaleString('pl-PL')}</p></div><button type="button" class="button-secondary" data-edit="${esc(a.id)}">Edytuj</button></article>`).join(''):'<p class="admin-help">Brak artykułów.</p>';
    list.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>editArticle(btn.dataset.edit,data)));
  };

  const editArticle=(id,data)=>{
    const a=data.find(x=>String(x.id)===String(id));if(!a)return;
    articleForm.elements.id.value=a.id;
    articleForm.elements.title.value=a.title||'';
    articleForm.elements.section.value=sections[a.section]?a.section:'Aktualności';
    articleForm.elements.summary.value=a.summary||'';
    articleForm.elements.content.value=a.content||'';
    articleForm.elements.newsletter_teaser.value=a.newsletter_teaser||'';
    articleForm.elements.newsletter_update_excerpt.value=a.newsletter_update_excerpt||'';
    articleForm.elements.image_alt.value=a.image_alt||'';
    articleForm.elements.image_caption.value=a.image_caption||'';
    articleForm.elements.image_credit.value=a.image_credit||'';
    articleForm.elements.published_at.value=fmtLocal(a.published_at||new Date());
    articleForm.elements.is_updated.checked=!!a.is_updated;
    articleForm.elements.update_at.value=a.update_at?fmtLocal(a.update_at):'';
    articleForm.elements.featured.checked=!!a.featured;
    articleForm.elements.status.value=currentProfile.role==='author'&&a.status==='published'?'draft':(a.status||'draft');
    formTitle.textContent='Edytuj artykuł';
    configureRoleUi();
    syncUpdateUi();
    articleForm.scrollIntoView({behavior:'smooth',block:'start'});
  };

  const loadUsers=async()=>{
    if(currentProfile.role!=='admin')return;
    usersList.innerHTML='<p class="admin-help">Wczytywanie redakcji…</p>';
    const {data,error}=await db.from('profiles').select('id,email,display_name,role,active,created_at').order('created_at',{ascending:true});
    if(error){usersList.innerHTML=`<p class="admin-status is-error">${esc(error.message)}</p>`;return;}
    usersList.innerHTML=data.map(u=>`<article class="admin-list-item"><div><span class="section-label">${u.active?'Aktywny':'Zablokowany'}</span><h3>${esc(u.display_name||u.email)}</h3><p>${esc(u.email)}</p></div><div class="admin-user-actions"><select data-role-user="${esc(u.id)}" aria-label="Rola ${esc(u.email)}"><option value="author"${u.role==='author'?' selected':''}>Autor</option><option value="editor"${u.role==='editor'?' selected':''}>Redaktor</option><option value="admin"${u.role==='admin'?' selected':''}>Administrator</option></select><button type="button" class="button-secondary" data-toggle-user="${esc(u.id)}" data-active="${u.active}">${u.active?'Zablokuj':'Odblokuj'}</button></div></article>`).join('');
    usersList.querySelectorAll('[data-role-user]').forEach(select=>select.addEventListener('change',()=>updateUser(select.dataset.roleUser,{role:select.value})));
    usersList.querySelectorAll('[data-toggle-user]').forEach(btn=>btn.addEventListener('click',()=>updateUser(btn.dataset.toggleUser,{active:btn.dataset.active!=='true'})));
  };

  const authenticatedPost=async(url,body)=>{
    const token=currentSession?.access_token;
    if(!token)throw new Error('Brak aktywnej sesji.');
    const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${token}`},body:JSON.stringify(body)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Operacja nie powiodła się.');
    return data;
  };

  const updateUser=async(id,changes)=>{
    try{await authenticatedPost('/api/update-user',{id,...changes});await loadUsers();}
    catch(error){alert(error.message);}
  };

  const showSession=async session=>{
    currentSession=session||null;
    if(!session){currentProfile=null;loginPanel.hidden=false;shell.hidden=true;return;}
    const {data:profile,error}=await db.from('profiles').select('id,email,display_name,role,active').eq('id',session.user.id).maybeSingle();
    if(error||!profile||!profile.active){
      status(loginStatus,'To konto nie ma aktywnego dostępu do redakcji.',true);
      await db.auth.signOut();
      return;
    }
    currentProfile=profile;
    loginPanel.hidden=true;
    shell.hidden=false;
    userEmail.textContent=profile.display_name||session.user.email||'';
    userRole.textContent=roleNames[profile.role]||profile.role;
    configureRoleUi();
    resetForm();
    await loadArticles();
    if(profile.role==='admin')await loadUsers();
  };

  loginForm.addEventListener('submit',async e=>{
    e.preventDefault();status(loginStatus,'Logowanie…');
    const fd=new FormData(loginForm);
    const {error}=await db.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});
    if(error)status(loginStatus,error.message,true);
  });

  document.querySelector('[data-logout]').addEventListener('click',()=>db.auth.signOut());
  document.querySelector('[data-reset-form]').addEventListener('click',resetForm);
  updateToggle?.addEventListener('change',syncUpdateUi);
  sendNewsletter?.addEventListener('change',()=>{if(sendNewsletter.checked)fillNewsletterTeaser();syncNewsletterUi();});
  generateNewsletter?.addEventListener('click',()=>{fillNewsletterTeaser(true);syncNewsletterUi();});
  articleForm.elements.newsletter_teaser?.addEventListener('input',syncNewsletterUi);

  articleForm.addEventListener('submit',async e=>{
    e.preventDefault();status(formStatus,'Zapisywanie…');
    const fd=new FormData(articleForm);
    const id=fd.get('id')||null;
    const selectedSection=String(fd.get('section')||'');
    const selectedSectionSlug=sections[selectedSection];
    if(!selectedSectionSlug){status(formStatus,'Wybierz jeden z pięciu dostępnych działów.',true);return;}

    let desiredStatus=String(fd.get('status')||'draft');
    if(currentProfile.role==='author'&&!['draft','review'].includes(desiredStatus))desiredStatus='review';
    const canPublish=currentProfile.role==='editor'||currentProfile.role==='admin';
    const isUpdated=fd.get('is_updated')==='on';
    const shouldSendNewsletter=canPublish&&fd.get('send_newsletter')==='on';
    let newsletterTeaser=String(fd.get('newsletter_teaser')||'').trim();
    const newsletterUpdateExcerpt=String(fd.get('newsletter_update_excerpt')||'').trim();
    if(!newsletterTeaser)newsletterTeaser=newsletterExcerpt(fd.get('summary'),fd.get('content'));
    if(shouldSendNewsletter&&desiredStatus!=='published'){
      status(formStatus,'Newsletter można wysłać dopiero dla opublikowanego artykułu.',true);return;
    }
    const selectedNewsletterText=isUpdated?newsletterUpdateExcerpt:newsletterTeaser;
    if(shouldSendNewsletter&&selectedNewsletterText.length<100){
      status(formStatus,isUpdated?'Dodaj nowy fragment aktualizacji (najlepiej 300–500 znaków).':'Zajawka newslettera jest za krótka; celuj w około 300–500 znaków.',true);return;
    }

    let imageUrl=null;
    const image=fd.get('image');
    if(image&&image.size){
      const ext=(image.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
      const path=`${currentSession.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext||'jpg'}`;
      const up=await db.storage.from('article-images').upload(path,image,{upsert:false});
      if(up.error){status(formStatus,up.error.message,true);return;}
      imageUrl=db.storage.from('article-images').getPublicUrl(path).data.publicUrl;
    }

    const title=String(fd.get('title')).trim();
    const payload={
      title,
      slug:slugForSave(id,title),
      section:selectedSection,
      section_slug:selectedSectionSlug,
      summary:String(fd.get('summary')).trim(),
      content:String(fd.get('content')).trim(),
      newsletter_teaser:newsletterTeaser||null,
      newsletter_update_excerpt:newsletterUpdateExcerpt||null,
      image_alt:String(fd.get('image_alt')||'').trim(),
      image_caption:String(fd.get('image_caption')||'').trim()||null,
      image_credit:String(fd.get('image_credit')||'').trim()||null,
      status:desiredStatus,
      is_updated:isUpdated,
      update_at:isUpdated?(fd.get('update_at')?new Date(fd.get('update_at')).toISOString():new Date().toISOString()):null,
      featured:canPublish&&desiredStatus==='published'&&fd.get('featured')==='on',
      author_id:id?undefined:currentSession.user.id,
      created_by:id?undefined:currentSession.user.id
    };
    if(imageUrl)payload.image_url=imageUrl;
    if(canPublish&&desiredStatus==='published'&&fd.get('published_at'))payload.published_at=new Date(fd.get('published_at')).toISOString();
    Object.keys(payload).forEach(k=>payload[k]===undefined&&delete payload[k]);

    if(payload.featured){
      const clear=await db.from('articles').update({featured:false}).eq('featured',true);
      if(clear.error){status(formStatus,clear.error.message,true);return;}
    }

    const q=id?db.from('articles').update(payload).eq('id',id):db.from('articles').insert(payload);
    const {data:saved,error}=await q.select('id').single();
    if(error){status(formStatus,error.message,true);return;}
    let completion=desiredStatus==='review'?'Przekazano do akceptacji.':(isUpdated?'Zapisano jako aktualizację.':'Zapisano.');
    let completionError=false;
    if(shouldSendNewsletter){
      status(formStatus,'Artykuł zapisany. Przygotowywanie newslettera…');
      try{
        const result=await authenticatedPost('/api/newsletter-send',{article_id:saved.id,mode:isUpdated?'update':'article'});
        completion=result.message||`Newsletter wysłany do ${result.sent||0} odbiorców.`;
      }catch(error){completion=`Artykuł zapisany, ale newsletter nie został wysłany: ${error.message}`;completionError=true;}
    }
    resetForm();
    status(formStatus,completion,completionError);
    await loadArticles();
  });

  inviteForm?.addEventListener('submit',async e=>{
    e.preventDefault();status(inviteStatus,'Wysyłanie zaproszenia…');
    const fd=new FormData(inviteForm);
    try{
      await authenticatedPost('/api/invite-editor',{email:String(fd.get('email')).trim(),display_name:String(fd.get('display_name')||'').trim(),role:String(fd.get('role'))});
      status(inviteStatus,'Zaproszenie wysłane.');
      inviteForm.reset();
      await loadUsers();
    }catch(error){status(inviteStatus,error.message,true);}
  });

  db.auth.onAuthStateChange((_event,session)=>showSession(session));
  db.auth.getSession().then(({data})=>showSession(data.session));
})();

(()=>{
  const cfg=window.CH82_SUPABASE||{};
  const roleNames={admin:'Administrator'};
  const slotNames={vertical:'Pionowy',horizontal:'Poziomy'};
  const loginPanel=document.querySelector('[data-login-panel]');
  const loginForm=document.querySelector('[data-login-form]');
  const loginStatus=document.querySelector('[data-login-status]');
  const shell=document.querySelector('[data-admin-shell]');
  const userEmail=document.querySelector('[data-user-email]');
  const userRole=document.querySelector('[data-user-role]');
  const form=document.querySelector('[data-banner-form]');
  const formStatus=document.querySelector('[data-banner-status]');
  const list=document.querySelector('[data-banner-list]');
  const preview=document.querySelector('[data-banner-preview]');
  const previewImage=document.querySelector('[data-banner-preview-image]');
  const deleteButton=document.querySelector('[data-delete-banner]');
  const newButton=document.querySelector('[data-new-banner]');
  let db=null;
  let session=null;
  let profile=null;
  let banners=[];

  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[char]));
  const status=(element,message,bad=false)=>{
    if(!element)return;
    element.textContent=message;
    element.classList.toggle('is-error',bad);
  };
  const publicImageUrl=path=>db.storage.from('banner-images').getPublicUrl(path).data.publicUrl;
  const extFor=file=>({
    'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'
  }[file.type]||'');
  const validTarget=value=>{
    const raw=String(value||'').trim();
    if(!raw)return true;
    try{
      const url=new URL(raw);
      return ['http:','https:'].includes(url.protocol);
    }catch(_error){return false;}
  };

  const renderPreview=()=>{
    const file=form.elements.image.files?.[0];
    const existing=String(form.elements.image_url.value||'').trim();
    if(file){
      const url=URL.createObjectURL(file);
      previewImage.onload=()=>URL.revokeObjectURL(url);
      previewImage.src=url;
      preview.hidden=false;
      return;
    }
    if(existing){
      previewImage.src=existing;
      preview.hidden=false;
      return;
    }
    preview.hidden=true;
    previewImage.removeAttribute('src');
  };

  const resetForm=()=>{
    form.reset();
    form.elements.id.value='';
    form.elements.image_url.value='';
    form.elements.storage_path.value='';
    form.elements.sort_order.value='100';
    form.elements.active.checked=true;
    deleteButton.hidden=true;
    status(formStatus,'');
    renderPreview();
  };

  const loadBanners=async()=>{
    list.innerHTML='<p class="admin-help">Wczytywanie…</p>';
    const {data,error}=await db
      .from('banners')
      .select('id,name,slot,image_url,storage_path,target_url,active,sort_order,created_at,updated_at')
      .order('slot',{ascending:true})
      .order('sort_order',{ascending:true})
      .order('created_at',{ascending:true});
    if(error){
      list.innerHTML=`<p class="admin-status is-error">${esc(error.message)}</p>`;
      return;
    }
    banners=data||[];
    if(!banners.length){
      list.innerHTML='<p class="admin-help">Nie ma jeszcze bannerów.</p>';
      return;
    }
    list.innerHTML=banners.map(item=>`
      <article class="banner-admin-item">
        <img src="${esc(item.image_url)}" alt="" loading="lazy" decoding="async">
        <div>
          <span class="section-label">${esc(slotNames[item.slot]||item.slot)} • kolejność ${Number(item.sort_order)||0}${item.active?' • aktywny':' • wyłączony'}</span>
          <h3>${esc(item.name)}</h3>
          ${item.target_url?`<p>${esc(item.target_url)}</p>`:''}
        </div>
        <button type="button" class="button-secondary" data-edit-banner="${esc(item.id)}">Edytuj</button>
      </article>
    `).join('');
  };

  const editBanner=id=>{
    const item=banners.find(entry=>entry.id===id);
    if(!item)return;
    form.elements.id.value=item.id;
    form.elements.name.value=item.name||'';
    form.elements.slot.value=item.slot||'vertical';
    form.elements.target_url.value=item.target_url||'';
    form.elements.active.checked=!!item.active;
    form.elements.sort_order.value=String(item.sort_order??100);
    form.elements.image_url.value=item.image_url||'';
    form.elements.storage_path.value=item.storage_path||'';
    form.elements.image.value='';
    deleteButton.hidden=false;
    status(formStatus,'Edytujesz istniejący banner.');
    renderPreview();
    form.scrollIntoView({behavior:'smooth',block:'start'});
  };

  const uploadImage=async file=>{
    const ext=extFor(file);
    if(!ext)throw new Error('Dozwolone formaty: JPG, PNG, WebP i GIF.');
    if(file.size>10*1024*1024)throw new Error('Banner może mieć maksymalnie 10 MB.');
    const path=`${session.user.id}/${crypto.randomUUID()}.${ext}`;
    const {error}=await db.storage.from('banner-images').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if(error)throw error;
    return {path,url:publicImageUrl(path)};
  };

  const saveBanner=async event=>{
    event.preventDefault();
    const fd=new FormData(form);
    const id=String(fd.get('id')||'').trim();
    const name=String(fd.get('name')||'').trim();
    const slot=String(fd.get('slot')||'').trim();
    const targetUrl=String(fd.get('target_url')||'').trim();
    const sortOrder=Number.parseInt(String(fd.get('sort_order')||'100'),10);
    const active=fd.get('active')==='on';
    const file=form.elements.image.files?.[0]||null;
    const oldStoragePath=String(form.elements.storage_path.value||'').trim();
    let imageUrl=String(form.elements.image_url.value||'').trim();
    let storagePath=oldStoragePath||null;
    let uploaded=null;

    if(!name){status(formStatus,'Podaj nazwę bannera.',true);return;}
    if(!['vertical','horizontal'].includes(slot)){status(formStatus,'Wybierz slot bannera.',true);return;}
    if(!Number.isInteger(sortOrder)){status(formStatus,'Kolejność musi być liczbą całkowitą.',true);return;}
    if(!validTarget(targetUrl)){status(formStatus,'Link po kliknięciu musi zaczynać się od http:// lub https://.',true);return;}
    if(!id&&!file){status(formStatus,'Dodaj plik graficzny bannera.',true);return;}

    status(formStatus,'Zapisywanie…');
    try{
      if(file){
        uploaded=await uploadImage(file);
        imageUrl=uploaded.url;
        storagePath=uploaded.path;
      }
      const payload={
        name,
        slot,
        image_url:imageUrl,
        storage_path:storagePath,
        target_url:targetUrl||null,
        active,
        sort_order:sortOrder
      };
      let result;
      if(id){
        result=await db.from('banners').update(payload).eq('id',id).select('id').single();
      }else{
        result=await db.from('banners').insert({...payload,created_by:session.user.id}).select('id').single();
      }
      if(result.error)throw result.error;
      if(uploaded&&oldStoragePath&&oldStoragePath!==uploaded.path){
        const {error:removeError}=await db.storage.from('banner-images').remove([oldStoragePath]);
        if(removeError)console.warn('Nie udało się usunąć starego pliku bannera:',removeError.message);
      }
      form.elements.id.value=result.data.id;
      form.elements.image_url.value=imageUrl;
      form.elements.storage_path.value=storagePath||'';
      form.elements.image.value='';
      deleteButton.hidden=false;
      renderPreview();
      status(formStatus,'Banner zapisany. Rotacja użyje go przy kolejnych odświeżeniach.');
      await loadBanners();
    }catch(error){
      if(uploaded){await db.storage.from('banner-images').remove([uploaded.path]);}
      status(formStatus,error?.message||'Nie udało się zapisać bannera.',true);
    }
  };

  const deleteBanner=async()=>{
    const id=String(form.elements.id.value||'').trim();
    if(!id)return;
    if(!window.confirm('Usunąć ten banner?'))return;
    const storagePath=String(form.elements.storage_path.value||'').trim();
    status(formStatus,'Usuwanie…');
    const {error}=await db.from('banners').delete().eq('id',id);
    if(error){status(formStatus,error.message,true);return;}
    if(storagePath){
      const {error:removeError}=await db.storage.from('banner-images').remove([storagePath]);
      if(removeError)console.warn('Nie udało się usunąć pliku bannera:',removeError.message);
    }
    resetForm();
    status(formStatus,'Banner usunięty.');
    await loadBanners();
  };

  const showSession=async currentSession=>{
    session=currentSession||null;
    if(!session){
      profile=null;
      loginPanel.hidden=false;
      shell.hidden=true;
      return;
    }
    const {data,error}=await db.from('profiles').select('id,email,display_name,role,active').eq('id',session.user.id).maybeSingle();
    if(error||!data||!data.active||data.role!=='admin'){
      status(loginStatus,'Ta strona jest dostępna tylko dla Administratora.',true);
      shell.hidden=true;
      loginPanel.hidden=false;
      return;
    }
    profile=data;
    loginPanel.hidden=true;
    shell.hidden=false;
    userEmail.textContent=profile.display_name||session.user.email||'';
    userRole.textContent=roleNames[profile.role]||profile.role;
    resetForm();
    await loadBanners();
  };

  if(!cfg.url||!cfg.anonKey||!window.supabase){
    status(loginStatus,'Panel czeka na konfigurację Supabase.',true);
    return;
  }
  db=window.supabase.createClient(cfg.url,cfg.anonKey);
  loginForm.addEventListener('submit',async event=>{
    event.preventDefault();
    status(loginStatus,'Logowanie…');
    const fd=new FormData(loginForm);
    const {error}=await db.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});
    if(error)status(loginStatus,error.message,true);
  });
  document.querySelector('[data-logout]').addEventListener('click',()=>db.auth.signOut());
  newButton.addEventListener('click',resetForm);
  deleteButton.addEventListener('click',deleteBanner);
  form.addEventListener('submit',saveBanner);
  form.elements.image.addEventListener('change',renderPreview);
  list.addEventListener('click',event=>{
    const button=event.target.closest('[data-edit-banner]');
    if(button)editBanner(button.dataset.editBanner);
  });
  db.auth.onAuthStateChange((_event,currentSession)=>showSession(currentSession));
  db.auth.getSession().then(({data})=>showSession(data.session));
})();

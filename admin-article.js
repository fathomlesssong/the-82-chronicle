const slugify=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
const slugForSave=(id,title)=>id?undefined:slugify(title);
const gallerySortOrder=value=>{const raw=String(value??'').trim();const n=Number(raw);return raw&&Number.isInteger(n)&&n>=0?n:null};
const MAX_GALLERY_IMAGES=20;
const MAX_IMAGE_BYTES=8*1024*1024;
const MAX_IMAGE_EDGE=2400;
const youtubeVideoId=value=>{
  const raw=String(value||'').trim();
  if(!raw)return null;

  try{
    const url=new URL(raw);
    const host=url.hostname.replace(/^www\./,'').toLowerCase();

    if(host==='youtu.be'){
      return url.pathname.split('/').filter(Boolean)[0]||null;
    }

    if(host==='youtube.com'||host==='m.youtube.com'){
      if(url.pathname==='/watch'){
        return url.searchParams.get('v')||null;
      }

      const parts=url.pathname.split('/').filter(Boolean);

      if(['shorts','embed','live'].includes(parts[0])){
        return parts[1]||null;
      }
    }
  }catch(_error){}

  return null;
};
const CH82_ADMIN_SLUGS=Object.freeze({slugify,slugForSave,gallerySortOrder,MAX_GALLERY_IMAGES,MAX_IMAGE_BYTES,MAX_IMAGE_EDGE,youtubeVideoId});

if(typeof module==='object'&&module.exports)module.exports=CH82_ADMIN_SLUGS;

if(typeof window!=='undefined'&&typeof document!=='undefined')(()=>{
  const {slugForSave,gallerySortOrder,MAX_GALLERY_IMAGES,MAX_IMAGE_BYTES,MAX_IMAGE_EDGE,youtubeVideoId}=CH82_ADMIN_SLUGS;
  const cfg=window.CH82_SUPABASE||{};
  const sections=Object.freeze({
    'Aktualności':'aktualnosci',
    'Infrastruktura':'infrastruktura',
    'Śledztwa':'sledztwa',
    'Kultura':'kultura',
    'Na Stole':'na-stole'
  });
  const roleNames={author:'Autor',admin:'Administrator'};
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
  const updateToggle=document.querySelector('[data-update-toggle]');
  const updateAtField=document.querySelector('[data-update-at-field]');
  const newsletterPanel=document.querySelector('[data-newsletter-panel]');
  const sendNewsletter=document.querySelector('[data-send-newsletter]');
  const newsletterUpdateField=document.querySelector('[data-newsletter-update-field]');
  const newsletterCount=document.querySelector('[data-newsletter-count]');
  const generateNewsletter=document.querySelector('[data-generate-newsletter]');
  const galleryInput=document.querySelector('[data-gallery-input]');
  const galleryList=document.querySelector('[data-gallery-list]');
  const homepageVideoPanel=document.querySelector('[data-homepage-video-panel]');
  const homepageVideoForm=document.querySelector('[data-homepage-video-form]');
  const homepageVideoStatus=document.querySelector('[data-homepage-video-status]');
  const homepageVideoClear=document.querySelector('[data-homepage-video-clear]');
  const homepageVideoDelete=document.querySelector('[data-homepage-video-delete]');

  let db=null;
  let currentSession=null;
  let currentProfile=null;
  let galleryItems=[];
  let gallerySequence=0;

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

  const nextGalleryOrder=()=>galleryItems.reduce((max,item)=>Math.max(max,item.sortOrder??-1),-1)+1;

  const canvasBlob=(canvas,type,quality)=>new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Nie udało się skompresować zdjęcia.')),type,quality);
  });

  const decodeImage=async file=>{
    if(typeof createImageBitmap==='function'){
      try{return await createImageBitmap(file,{imageOrientation:'from-image'});}
      catch(_error){
        try{return await createImageBitmap(file);}
        catch(_error2){}
      }
    }

    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);
      const image=new Image();
      image.onload=()=>{
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror=()=>{
        URL.revokeObjectURL(url);
        reject(new Error(`Nie udało się odczytać zdjęcia „${file.name}”.`));
      };
      image.src=url;
    });
  };

  const prepareImageFile=async file=>{
    if(!file||!file.type?.startsWith('image/')){
      throw new Error(`Plik „${file?.name||'bez nazwy'}” nie jest obrazem.`);
    }

    const source=await decodeImage(file);

    try{
      const sourceWidth=source.width||source.naturalWidth;
      const sourceHeight=source.height||source.naturalHeight;

      if(!sourceWidth||!sourceHeight){
        throw new Error(`Nie udało się odczytać wymiarów zdjęcia „${file.name}”.`);
      }

      const longest=Math.max(sourceWidth,sourceHeight);
      const needsProcessing=longest>MAX_IMAGE_EDGE||file.size>MAX_IMAGE_BYTES;

      if(!needsProcessing){
        return {file,changed:false};
      }

      const initialScale=Math.min(1,MAX_IMAGE_EDGE/longest);
      let width=Math.max(1,Math.round(sourceWidth*initialScale));
      let height=Math.max(1,Math.round(sourceHeight*initialScale));
      let bestBlob=null;

      outer:
      for(let pass=0;pass<5;pass++){
        const canvas=document.createElement('canvas');
        canvas.width=width;
        canvas.height=height;

        const ctx=canvas.getContext('2d');
        if(!ctx)throw new Error('Przeglądarka nie może przetworzyć zdjęcia.');

        ctx.drawImage(source,0,0,width,height);

        for(const quality of [0.88,0.80,0.72,0.64]){
          const blob=await canvasBlob(canvas,'image/webp',quality);
          bestBlob=blob;

          if(blob.size<=MAX_IMAGE_BYTES)break outer;
        }

        width=Math.max(1,Math.round(width*0.82));
        height=Math.max(1,Math.round(height*0.82));
      }

      if(!bestBlob||bestBlob.size>MAX_IMAGE_BYTES){
        throw new Error(`Zdjęcia „${file.name}” nie udało się zmniejszyć poniżej 8 MB.`);
      }

      const base=file.name.replace(/\.[^.]+$/,'')||'zdjecie';
      const optimized=new File(
        [bestBlob],
        `${base}.webp`,
        {
          type:'image/webp',
          lastModified:file.lastModified||Date.now()
        }
      );

      return {file:optimized,changed:true};
    }finally{
      source.close?.();
    }
  };

  const galleryItemLabel=item=>{
    if(item.file)return item.file.name;
    const tail=String(item.imageUrl||'').split('/').pop()?.split('?')[0];
    try{return decodeURIComponent(tail||'Zapisane zdjęcie');}catch{return tail||'Zapisane zdjęcie';}
  };

  const renderGallery=()=>{
    if(!galleryList)return;
    if(!galleryItems.length){galleryList.innerHTML='<p class="admin-help">Brak dodatkowych zdjęć.</p>';return;}
    galleryList.innerHTML=galleryItems.map(item=>`
      <div class="admin-gallery-item" data-gallery-key="${esc(item.key)}">
        <div class="admin-gallery-item-head">
          <strong>${esc(galleryItemLabel(item))}</strong>
          ${item.id?'<span class="admin-help">Zapisane</span>':`<button type="button" class="button-secondary" data-gallery-remove="${esc(item.key)}">Usuń wybór</button>`}
        </div>
        <div class="admin-gallery-fields">
          <label>Opis alternatywny (ALT)
            <input type="text" maxlength="240" required value="${esc(item.alt)}" data-gallery-alt>
          </label>
          <label>Podpis
            <input type="text" maxlength="300" value="${esc(item.caption)}" data-gallery-caption>
          </label>
          <label>Autor / źródło
            <input type="text" maxlength="160" value="${esc(item.credit)}" data-gallery-credit>
          </label>
          <label>Kolejność
            <input type="number" min="0" step="1" required value="${esc(item.sortOrder)}" data-gallery-sort-order>
          </label>
        </div>
      </div>`).join('');
    galleryList.querySelectorAll('[data-gallery-remove]').forEach(button=>button.addEventListener('click',()=>{
      galleryItems=galleryItems.filter(item=>item.key!==button.dataset.galleryRemove);
      renderGallery();
    }));
  };

  const resetGallery=()=>{
    galleryItems=[];
    if(galleryInput)galleryInput.value='';
    renderGallery();
  };

  const collectGalleryItems=()=>{
    if(galleryItems.length>MAX_GALLERY_IMAGES){
      throw new Error(`Galeria może zawierać maksymalnie ${MAX_GALLERY_IMAGES} zdjęć.`);
    }
    const collected=[...galleryList.querySelectorAll('[data-gallery-key]')].map(row=>{
      const item=galleryItems.find(candidate=>candidate.key===row.dataset.galleryKey);
      if(!item)throw new Error('Nie udało się odczytać jednego ze zdjęć galerii.');
      const alt=String(row.querySelector('[data-gallery-alt]').value||'').trim();
      const sortOrder=gallerySortOrder(row.querySelector('[data-gallery-sort-order]').value);
      if(!alt)throw new Error(`Uzupełnij opis ALT dla zdjęcia „${galleryItemLabel(item)}”.`);
      if(sortOrder===null)throw new Error(`Podaj nieujemną, całkowitą kolejność dla zdjęcia „${galleryItemLabel(item)}”.`);
      return {
        ...item,
        alt,
        caption:String(row.querySelector('[data-gallery-caption]').value||'').trim(),
        credit:String(row.querySelector('[data-gallery-credit]').value||'').trim(),
        sortOrder
      };
    });
    galleryItems=collected;
    return collected;
  };

  const loadArticleGallery=async articleId=>{
    const {data,error}=await db.from('article_images')
      .select('id,image_url,image_alt,image_caption,image_credit,sort_order')
      .eq('article_id',articleId)
      .order('sort_order',{ascending:true})
      .order('created_at',{ascending:true});
    if(error)throw error;
    if(articleForm.elements.id.value!==String(articleId))return false;
    galleryItems=(data||[]).map(image=>({
      key:`saved-${image.id}`,
      id:image.id,
      imageUrl:image.image_url,
      alt:image.image_alt||'',
      caption:image.image_caption||'',
      credit:image.image_credit||'',
      sortOrder:image.sort_order??0
    }));
    renderGallery();
    return true;
  };

  const configureRoleUi=()=>{
    const role=currentProfile?.role;
    const canAdmin=role==='admin';
    featuredField.hidden=!canAdmin;
    publishedAtField.hidden=!canAdmin;
    newsletterPanel.hidden=!canAdmin;
    if(sendNewsletter)sendNewsletter.disabled=!canAdmin;
    usersPanel.hidden=role!=='admin';
    if(homepageVideoPanel)homepageVideoPanel.hidden=!canAdmin;
    workflowHelp.textContent=role==='author'
      ? 'Możesz zapisać artykuł jako szkic albo od razu go opublikować.'
      : 'Możesz zapisać artykuł jako szkic albo go opublikować.';
    listHelp.textContent=role==='author'?'Widoczne są Twoje teksty.':'Widoczne są wszystkie teksty redakcji.';
    syncUpdateUi();
  };

  const resetForm=()=>{
    articleForm.reset();
    resetGallery();
    articleForm.elements.id.value='';
    articleForm.elements.published_at.value=fmtLocal();
    articleForm.elements.update_at.value='';
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

  const editArticle=async(id,data)=>{
    const a=data.find(x=>String(x.id)===String(id));if(!a)return;
    resetGallery();
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
    articleForm.elements.video_url.value=a.video_url||'';
    articleForm.elements.video_caption.value=a.video_caption||'';
    articleForm.elements.video_show_in_article.checked=!!a.video_show_in_article;
    articleForm.elements.published_at.value=fmtLocal(a.published_at||new Date());
    articleForm.elements.is_updated.checked=!!a.is_updated;
    articleForm.elements.update_at.value=a.update_at?fmtLocal(a.update_at):'';
    articleForm.elements.featured.checked=!!a.featured;
    formTitle.textContent='Edytuj artykuł';
    configureRoleUi();
    syncUpdateUi();
    articleForm.scrollIntoView({behavior:'smooth',block:'start'});
    status(formStatus,'Wczytywanie dodatkowych zdjęć…');
    try{
      const applied=await loadArticleGallery(a.id);
      if(applied)status(formStatus,'');
    }catch(error){
      if(articleForm.elements.id.value===String(a.id))status(formStatus,`Nie udało się wczytać dodatkowych zdjęć: ${error.message}`,true);
    }
  };

  const resetHomepageVideoForm=()=>{
    if(!homepageVideoForm)return;
    homepageVideoForm.reset();
    homepageVideoForm.elements.id.value='';
    if(homepageVideoDelete)homepageVideoDelete.hidden=true;
    status(homepageVideoStatus,'');
  };

  const loadHomepageVideo=async()=>{
    if(!homepageVideoForm)return;
    if(currentProfile?.role!=='admin')return;

    status(homepageVideoStatus,'Wczytywanie…');

    const {data,error}=await db
      .from('homepage_videos')
      .select('id,title,video_url,caption,active,updated_at')
      .eq('active',true)
      .maybeSingle();

    if(error){
      status(homepageVideoStatus,error.message,true);
      return;
    }

    resetHomepageVideoForm();

    if(!data){
      status(homepageVideoStatus,'Brak aktywnego filmu na stronie głównej.');
      return;
    }

    homepageVideoForm.elements.id.value=data.id;
    homepageVideoForm.elements.title.value=data.title||'';
    homepageVideoForm.elements.video_url.value=data.video_url||'';
    homepageVideoForm.elements.caption.value=data.caption||'';
    homepageVideoForm.elements.active.checked=!!data.active;
    if(homepageVideoDelete)homepageVideoDelete.hidden=false;

    status(homepageVideoStatus,'Aktywny film wczytany.');
  };

  const saveHomepageVideo=async event=>{
    event.preventDefault();

    if(currentProfile?.role!=='admin')return;

    const fd=new FormData(homepageVideoForm);
    const id=String(fd.get('id')||'').trim();
    const title=String(fd.get('title')||'').trim();
    const videoUrl=String(fd.get('video_url')||'').trim();
    const caption=String(fd.get('caption')||'').trim();
    const active=fd.get('active')==='on';

    if(!title){
      status(homepageVideoStatus,'Podaj tytuł filmu.',true);
      return;
    }

    if(!youtubeVideoId(videoUrl)){
      status(homepageVideoStatus,'Podaj poprawny link do filmu YouTube.',true);
      return;
    }

    status(homepageVideoStatus,'Zapisywanie…');

    if(active){
      let clear=db.from('homepage_videos').update({active:false}).eq('active',true);
      if(id)clear=clear.neq('id',id);

      const {error:clearError}=await clear;
      if(clearError){
        status(homepageVideoStatus,clearError.message,true);
        return;
      }
    }

    const payload={
      title,
      video_url:videoUrl,
      caption:caption||null,
      active,
      updated_at:new Date().toISOString()
    };

    let result;

    if(id){
      result=await db
        .from('homepage_videos')
        .update(payload)
        .eq('id',id)
        .select('id')
        .single();
    }else{
      result=await db
        .from('homepage_videos')
        .insert({
          ...payload,
          created_by:currentSession.user.id
        })
        .select('id')
        .single();
    }

    if(result.error){
      status(homepageVideoStatus,result.error.message,true);
      return;
    }

    homepageVideoForm.elements.id.value=result.data.id;
    if(homepageVideoDelete)homepageVideoDelete.hidden=false;
    status(
      homepageVideoStatus,
      active
        ? 'Wideo zapisane i ustawione na stronie głównej.'
        : 'Wideo zapisane jako nieaktywne.'
    );
  };

  const deleteHomepageVideo=async()=>{
    const id=String(homepageVideoForm?.elements.id.value||'').trim();
    if(!id)return;

    if(!confirm('Usunąć wideo ze strony głównej?'))return;

    status(homepageVideoStatus,'Usuwanie…');

    const {error}=await db
      .from('homepage_videos')
      .delete()
      .eq('id',id);

    if(error){
      status(homepageVideoStatus,error.message,true);
      return;
    }

    resetHomepageVideoForm();
    status(homepageVideoStatus,'Wideo usunięte. Strona główna nie wyświetla teraz żadnego filmu.');
  };

  const loadUsers=async()=>{
    if(currentProfile.role!=='admin')return;
    usersList.innerHTML='<p class="admin-help">Wczytywanie redakcji…</p>';
    const {data,error}=await db.from('profiles').select('id,email,display_name,role,active,created_at').order('created_at',{ascending:true});
    if(error){usersList.innerHTML=`<p class="admin-status is-error">${esc(error.message)}</p>`;return;}
    usersList.innerHTML=data.map(u=>`<article class="admin-list-item"><div><span class="section-label">${u.active?'Aktywny':'Zablokowany'}</span><h3>${esc(u.display_name||u.email)}</h3><p>${esc(u.email)}</p></div><div class="admin-user-actions"><select data-role-user="${esc(u.id)}" aria-label="Rola ${esc(u.email)}"><option value="author"${u.role==='author'?' selected':''}>Autor</option><option value="admin"${u.role==='admin'?' selected':''}>Administrator</option></select><button type="button" class="button-secondary" data-toggle-user="${esc(u.id)}" data-active="${u.active}">${u.active?'Zablokuj':'Odblokuj'}</button></div></article>`).join('');
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

  const removeUploadedGalleryFiles=async paths=>{
    if(!paths.length)return;
    await db.storage.from('article-images').remove(paths);
  };

  const persistArticleGallery=async(articleId,items)=>{
    if(items.length>MAX_GALLERY_IMAGES){
      throw new Error(`Galeria może zawierać maksymalnie ${MAX_GALLERY_IMAGES} zdjęć.`);
    }

    const oversized=items.find(item=>item.file&&item.file.size>MAX_IMAGE_BYTES);
    if(oversized){
      throw new Error(`Zdjęcie „${galleryItemLabel(oversized)}” przekracza limit 8 MB.`);
    }

    const metadata=item=>({
      image_alt:item.alt,
      image_caption:item.caption||null,
      image_credit:item.credit||null,
      sort_order:item.sortOrder
    });

    for(const item of items.filter(candidate=>candidate.id)){
      const {error}=await db.from('article_images')
        .update(metadata(item))
        .eq('id',item.id)
        .eq('article_id',articleId)
        .select('id')
        .single();
      if(error)throw error;
    }

    const pending=items.filter(item=>item.file);
    if(!pending.length)return;
    const uploadedPaths=[];
    const rows=[];
    for(const [index,item] of pending.entries()){
      status(formStatus,`Artykuł zapisany. Wysyłanie dodatkowego zdjęcia ${index+1}/${pending.length}…`);
      const ext=(item.file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
      const path=`${currentSession.user.id}/${articleId}/gallery/${Date.now()}-${index}-${Math.random().toString(36).slice(2)}.${ext||'jpg'}`;
      const upload=await db.storage.from('article-images').upload(path,item.file,{upsert:false});
      if(upload.error){await removeUploadedGalleryFiles(uploadedPaths);throw upload.error;}
      uploadedPaths.push(path);
      const imageUrl=db.storage.from('article-images').getPublicUrl(path).data.publicUrl;
      rows.push({
        article_id:articleId,
        image_url:imageUrl,
        ...metadata(item),
        created_by:currentSession.user.id
      });
    }

    const {error}=await db.from('article_images').insert(rows);
    if(error){await removeUploadedGalleryFiles(uploadedPaths);throw error;}
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

    const requestedArticleId=new URLSearchParams(window.location.search).get('id');
    if(requestedArticleId){
      const editButton=list?.querySelector(`[data-edit="${requestedArticleId}"]`);
      if(editButton)editButton.click();
      else status(formStatus,'Nie znaleziono artykułu do edycji.',true);
    }
    if(profile.role==='admin')await loadHomepageVideo();
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
  galleryInput?.addEventListener('change',async()=>{
    const files=[...(galleryInput.files||[])];
    if(!files.length)return;

    const invalid=files.find(file=>!file.type?.startsWith('image/'));
    if(invalid){
      status(formStatus,`Plik „${invalid.name}” nie jest obrazem.`,true);
      galleryInput.value='';
      return;
    }

    if(galleryItems.length+files.length>MAX_GALLERY_IMAGES){
      status(
        formStatus,
        `Galeria może zawierać maksymalnie ${MAX_GALLERY_IMAGES} zdjęć. Obecnie: ${galleryItems.length}, wybrano: ${files.length}.`,
        true
      );
      galleryInput.value='';
      return;
    }

    const prepared=[];
    let optimizedCount=0;

    try{
      for(const [index,file] of files.entries()){
        status(formStatus,`Przygotowywanie zdjęcia ${index+1}/${files.length}…`);
        const result=await prepareImageFile(file);
        prepared.push(result.file);
        if(result.changed)optimizedCount+=1;
      }
    }catch(error){
      status(formStatus,error.message,true);
      galleryInput.value='';
      return;
    }

    let order=nextGalleryOrder();

    for(const file of prepared){
      gallerySequence+=1;
      galleryItems.push({
        key:`new-${gallerySequence}`,
        file,
        alt:'',
        caption:'',
        credit:'',
        sortOrder:order
      });
      order+=1;
    }

    galleryInput.value='';
    renderGallery();

    const message=optimizedCount
      ?`Dodano ${prepared.length} zdjęć. Automatycznie zmniejszono: ${optimizedCount}.`
      :`Dodano ${prepared.length} zdjęć.`;

    status(formStatus,message);
  });

  homepageVideoForm?.addEventListener('submit',saveHomepageVideo);
  homepageVideoClear?.addEventListener('click',resetHomepageVideoForm);
  homepageVideoDelete?.addEventListener('click',deleteHomepageVideo);

  articleForm.addEventListener('submit',async e=>{
    e.preventDefault();status(formStatus,'Zapisywanie…');
    const fd=new FormData(articleForm);
    const id=fd.get('id')||null;
    const selectedSection=String(fd.get('section')||'');
    const selectedSectionSlug=sections[selectedSection];
    if(!selectedSectionSlug){status(formStatus,'Wybierz jeden z pięciu dostępnych działów.',true);return;}
    let preparedGallery=[];
    try{preparedGallery=collectGalleryItems();}
    catch(error){status(formStatus,error.message,true);return;}

    const requestedSaveStatus=e.submitter?.dataset.saveStatus;
    const desiredStatus=requestedSaveStatus==='published'?'published':'draft';
    const canAdmin=currentProfile.role==='admin';
    const isUpdated=fd.get('is_updated')==='on';
    const shouldSendNewsletter=canAdmin&&fd.get('send_newsletter')==='on';
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
    let image=fd.get('image');
    if(image&&image.size){
      try{
        status(formStatus,'Przygotowywanie zdjęcia głównego…');
        image=(await prepareImageFile(image)).file;
      }catch(error){
        status(formStatus,error.message,true);
        return;
      }

      const ext=(image.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
      const path=`${currentSession.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext||'jpg'}`;
      const up=await db.storage.from('article-images').upload(path,image,{upsert:false});
      if(up.error){status(formStatus,up.error.message,true);return;}
      imageUrl=db.storage.from('article-images').getPublicUrl(path).data.publicUrl;
    }

    const videoUrl=String(fd.get('video_url')||'').trim();

    if(videoUrl&&!youtubeVideoId(videoUrl)){
      status(formStatus,'Podaj poprawny link do filmu YouTube.',true);
      return;
    }

    const videoShowInArticle=!!videoUrl&&fd.get('video_show_in_article')==='on';
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
      video_url:videoUrl||null,
      video_caption:String(fd.get('video_caption')||'').trim()||null,
      video_show_in_article:videoShowInArticle,
      status:desiredStatus,
      is_updated:isUpdated,
      update_at:isUpdated?(fd.get('update_at')?new Date(fd.get('update_at')).toISOString():new Date().toISOString()):null,
      featured:canAdmin&&desiredStatus==='published'&&fd.get('featured')==='on',
      author_id:id?undefined:currentSession.user.id,
      created_by:id?undefined:currentSession.user.id
    };
    if(imageUrl)payload.image_url=imageUrl;
    if(canAdmin&&desiredStatus==='published'&&fd.get('published_at'))payload.published_at=new Date(fd.get('published_at')).toISOString();
    Object.keys(payload).forEach(k=>payload[k]===undefined&&delete payload[k]);

    if(payload.featured){
      const clear=await db.from('articles').update({featured:false}).eq('featured',true);
      if(clear.error){status(formStatus,clear.error.message,true);return;}
    }

    const q=id?db.from('articles').update(payload).eq('id',id):db.from('articles').insert(payload);
    const {data:saved,error}=await q.select('id').single();
    if(error){status(formStatus,error.message,true);return;}
    articleForm.elements.id.value=saved.id;
    formTitle.textContent='Edytuj artykuł';
    if(imageUrl)articleForm.elements.image.value='';
    try{await persistArticleGallery(saved.id,preparedGallery);}
    catch(error){
      status(formStatus,`Artykuł zapisano, ale dodatkowe zdjęcia nie zostały zapisane w całości: ${error.message}`,true);
      await loadArticles();
      return;
    }
    let completion=isUpdated
      ? 'Zapisano jako aktualizację.'
      : (desiredStatus==='published'?'Artykuł opublikowany.':'Artykuł zapisany jako szkic.');
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
      await authenticatedPost('/api/invite-user',{email:String(fd.get('email')).trim(),display_name:String(fd.get('display_name')||'').trim(),role:String(fd.get('role'))});
      status(inviteStatus,'Zaproszenie wysłane.');
      inviteForm.reset();
      await loadUsers();
    }catch(error){status(inviteStatus,error.message,true);}
  });

  db.auth.onAuthStateChange((_event,session)=>showSession(session));
  db.auth.getSession().then(({data})=>showSession(data.session));
})();

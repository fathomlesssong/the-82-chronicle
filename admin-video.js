(()=>{
  const cfg=window.CH82_SUPABASE||{};

  const roleNames={
    admin:'Administrator'
  };

  const loginPanel=document.querySelector('[data-login-panel]');
  const loginForm=document.querySelector('[data-login-form]');
  const loginStatus=document.querySelector('[data-login-status]');
  const shell=document.querySelector('[data-admin-shell]');

  const userEmail=document.querySelector('[data-user-email]');
  const userRole=document.querySelector('[data-user-role]');

  const form=document.querySelector('[data-video-form]');
  const formStatus=document.querySelector('[data-video-status]');

  const newButton=document.querySelector('[data-new-video]');
  const deleteButton=document.querySelector('[data-delete-video]');

  const preview=document.querySelector('[data-video-preview]');
  const previewFrame=document.querySelector('[data-video-preview-frame]');

  let db=null;
  let session=null;
  let profile=null;

  const status=(element,message,bad=false)=>{
    if(!element)return;
    element.textContent=message;
    element.classList.toggle('is-error',bad);
  };

  const youtubeVideoId=value=>{
    const raw=String(value||'').trim();

    if(!raw)return null;

    try{
      const url=new URL(raw);
      const host=url.hostname
        .replace(/^www\./,'')
        .toLowerCase();

      if(host==='youtu.be'){
        return url.pathname
          .split('/')
          .filter(Boolean)[0]||null;
      }

      if(
        host==='youtube.com'||
        host==='m.youtube.com'
      ){
        if(url.pathname==='/watch'){
          return url.searchParams.get('v')||null;
        }

        const parts=url.pathname
          .split('/')
          .filter(Boolean);

        if(
          ['shorts','embed','live']
            .includes(parts[0])
        ){
          return parts[1]||null;
        }
      }
    }catch(_error){}

    return null;
  };

  const renderPreview=()=>{
    const id=youtubeVideoId(
      form.elements.video_url.value
    );

    if(!id){
      preview.hidden=true;
      previewFrame.innerHTML='';
      return;
    }

    previewFrame.innerHTML=`
      <img
        src="https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg"
        alt=""
      >
    `;

    preview.hidden=false;
  };

  const resetForm=()=>{
    form.reset();
    form.elements.id.value='';
    deleteButton.hidden=true;
    preview.hidden=true;
    previewFrame.innerHTML='';
    status(formStatus,'');
  };

  const loadActiveVideo=async()=>{
    status(formStatus,'Wczytywanie…');

    const {data,error}=await db
      .from('homepage_videos')
      .select(
        'id,title,video_url,caption,active,updated_at'
      )
      .eq('active',true)
      .maybeSingle();

    if(error){
      status(formStatus,error.message,true);
      return;
    }

    resetForm();

    if(!data){
      status(
        formStatus,
        'Obecnie strona główna nie wyświetla żadnego filmu.'
      );
      return;
    }

    form.elements.id.value=data.id;
    form.elements.title.value=data.title||'';
    form.elements.video_url.value=data.video_url||'';
    form.elements.caption.value=data.caption||'';
    form.elements.active.checked=true;

    deleteButton.hidden=false;

    renderPreview();

    status(
      formStatus,
      'Aktywny film wczytany.'
    );
  };

  const saveVideo=async event=>{
    event.preventDefault();

    const fd=new FormData(form);

    const id=String(fd.get('id')||'').trim();
    const title=String(fd.get('title')||'').trim();
    const videoUrl=String(fd.get('video_url')||'').trim();
    const caption=String(fd.get('caption')||'').trim();
    const active=fd.get('active')==='on';

    if(!title){
      status(
        formStatus,
        'Podaj tytuł filmu.',
        true
      );
      return;
    }

    if(!youtubeVideoId(videoUrl)){
      status(
        formStatus,
        'Podaj poprawny link do filmu YouTube.',
        true
      );
      return;
    }

    status(formStatus,'Zapisywanie…');

    if(active){
      let clear=db
        .from('homepage_videos')
        .update({active:false})
        .eq('active',true);

      if(id){
        clear=clear.neq('id',id);
      }

      const {error}=await clear;

      if(error){
        status(formStatus,error.message,true);
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
          created_by:session.user.id
        })
        .select('id')
        .single();
    }

    if(result.error){
      status(
        formStatus,
        result.error.message,
        true
      );
      return;
    }

    form.elements.id.value=result.data.id;
    deleteButton.hidden=false;

    renderPreview();

    status(
      formStatus,
      active
        ? 'Wideo zapisane i widoczne na stronie głównej.'
        : 'Wideo zapisane, ale nie jest wyświetlane na stronie głównej.'
    );
  };

  const deleteVideo=async()=>{
    const id=String(
      form.elements.id.value||''
    ).trim();

    if(!id)return;

    const confirmed=window.confirm(
      'Usunąć to wideo? Strona główna pozostanie bez filmu.'
    );

    if(!confirmed)return;

    status(formStatus,'Usuwanie…');

    const {error}=await db
      .from('homepage_videos')
      .delete()
      .eq('id',id);

    if(error){
      status(
        formStatus,
        error.message,
        true
      );
      return;
    }

    resetForm();

    status(
      formStatus,
      'Wideo usunięte. Strona główna nie wyświetla żadnego filmu.'
    );
  };

  const showSession=async currentSession=>{
    session=currentSession||null;

    if(!session){
      profile=null;
      loginPanel.hidden=false;
      shell.hidden=true;
      return;
    }

    const {data,error}=await db
      .from('profiles')
      .select(
        'id,email,display_name,role,active'
      )
      .eq('id',session.user.id)
      .maybeSingle();

    if(
      error||
      !data||
      !data.active||
      data.role!=='admin'
    ){
      status(
        loginStatus,
        'Ta strona jest dostępna tylko dla Administratora.',
        true
      );

      shell.hidden=true;
      loginPanel.hidden=false;
      return;
    }

    profile=data;

    loginPanel.hidden=true;
    shell.hidden=false;

    userEmail.textContent=
      profile.display_name||
      session.user.email||
      '';

    userRole.textContent=
      roleNames[profile.role]||
      profile.role;

    await loadActiveVideo();
  };

  if(
    !cfg.url||
    !cfg.anonKey||
    !window.supabase
  ){
    status(
      loginStatus,
      'Panel czeka na konfigurację Supabase.',
      true
    );
    return;
  }

  db=window.supabase.createClient(
    cfg.url,
    cfg.anonKey
  );

  loginForm.addEventListener(
    'submit',
    async event=>{
      event.preventDefault();

      status(loginStatus,'Logowanie…');

      const fd=new FormData(loginForm);

      const {error}=await db.auth.signInWithPassword({
        email:fd.get('email'),
        password:fd.get('password')
      });

      if(error){
        status(loginStatus,error.message,true);
      }
    }
  );

  document
    .querySelector('[data-logout]')
    .addEventListener(
      'click',
      ()=>db.auth.signOut()
    );

  newButton.addEventListener(
    'click',
    resetForm
  );

  deleteButton.addEventListener(
    'click',
    deleteVideo
  );

  form.addEventListener(
    'submit',
    saveVideo
  );

  form.elements.video_url.addEventListener(
    'input',
    renderPreview
  );

  db.auth.onAuthStateChange(
    (_event,currentSession)=>{
      showSession(currentSession);
    }
  );

  db.auth.getSession().then(
    ({data})=>{
      showSession(data.session);
    }
  );
})();

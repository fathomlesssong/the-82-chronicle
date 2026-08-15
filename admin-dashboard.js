(()=>{
  const cfg=window.CH82_SUPABASE||{};

  const PAGE_SIZE=15;

  const roleNames={
    author:'Autor',
    editor:'Redaktor',
    admin:'Administrator'
  };

  const statusNames={
    draft:'Szkic',
    review:'Do akceptacji',
    published:'Opublikowany',
    archived:'Archiwalny'
  };

  const esc=value=>String(value??'').replace(
    /[&<>'"]/g,
    char=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      "'":'&#39;',
      '"':'&quot;'
    }[char])
  );

  const loginPanel=document.querySelector('[data-login-panel]');
  const loginForm=document.querySelector('[data-login-form]');
  const loginStatus=document.querySelector('[data-login-status]');
  const shell=document.querySelector('[data-admin-shell]');
  const list=document.querySelector('[data-admin-list]');

  const userEmail=document.querySelector('[data-user-email]');
  const userRole=document.querySelector('[data-user-role]');

  const videoAction=document.querySelector('[data-video-action]');
  const usersAction=document.querySelector('[data-users-action]');

  const prevButton=document.querySelector('[data-page-prev]');
  const nextButton=document.querySelector('[data-page-next]');
  const pageInfo=document.querySelector('[data-page-info]');
  const articleCount=document.querySelector('[data-article-count]');

  let db=null;
  let session=null;
  let profile=null;
  let page=1;
  let total=0;

  const status=(element,message,bad=false)=>{
    if(!element)return;
    element.textContent=message;
    element.classList.toggle('is-error',bad);
  };

  if(!cfg.url||!cfg.anonKey||!window.supabase){
    status(
      loginStatus,
      'Panel czeka na konfigurację Supabase.',
      true
    );
    return;
  }

  db=window.supabase.createClient(cfg.url,cfg.anonKey);

  const loadArticles=async()=>{
    list.innerHTML='<p class="admin-help">Wczytywanie…</p>';

    const from=(page-1)*PAGE_SIZE;
    const to=from+PAGE_SIZE-1;

    let query=db
      .from('articles')
      .select(
        'id,title,section,status,is_updated,updated_at,created_at',
        {count:'exact'}
      )
      .order('updated_at',{ascending:false})
      .range(from,to);

    if(profile.role==='author'){
      query=query.eq('author_id',session.user.id);
    }

    const {data,error,count}=await query;

    if(error){
      list.innerHTML=
        `<p class="admin-status is-error">${esc(error.message)}</p>`;
      return;
    }

    total=count||0;

    const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));

    if(page>pages){
      page=pages;
      return loadArticles();
    }

    articleCount.textContent=
      `${total} ${total===1?'artykuł':'artykułów'}`;

    pageInfo.textContent=`Strona ${page} z ${pages}`;

    prevButton.disabled=page<=1;
    nextButton.disabled=page>=pages;

    if(!data?.length){
      list.innerHTML='<p class="admin-help">Brak artykułów.</p>';
      return;
    }

    list.innerHTML=data.map(article=>`
      <article class="admin-list-item">
        <div>
          <span class="section-label">
            ${esc(article.section)}
            •
            ${esc(statusNames[article.status]||article.status)}
            ${article.is_updated?' • Aktualizacja':''}
          </span>

          <h3>${esc(article.title)}</h3>

          <p>
            ${new Date(
              article.updated_at||article.created_at
            ).toLocaleString('pl-PL')}
          </p>
        </div>

        <a
          class="button-secondary"
          href="/admin-article.html?id=${encodeURIComponent(article.id)}"
        >
          Edytuj
        </a>
      </article>
    `).join('');
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
      .select('id,email,display_name,role,active')
      .eq('id',session.user.id)
      .maybeSingle();

    if(error||!data||!data.active){
      status(
        loginStatus,
        'To konto nie ma aktywnego dostępu do redakcji.',
        true
      );
      await db.auth.signOut();
      return;
    }

    profile=data;

    loginPanel.hidden=true;
    shell.hidden=false;

    userEmail.textContent=
      profile.display_name||session.user.email||'';

    userRole.textContent=
      roleNames[profile.role]||profile.role;

    videoAction.hidden=
      !['editor','admin'].includes(profile.role);

    usersAction.hidden=profile.role!=='admin';

    page=1;
    await loadArticles();
  };

  loginForm.addEventListener('submit',async event=>{
    event.preventDefault();

    status(loginStatus,'Logowanie…');

    const form=new FormData(loginForm);

    const {error}=await db.auth.signInWithPassword({
      email:form.get('email'),
      password:form.get('password')
    });

    if(error){
      status(loginStatus,error.message,true);
    }
  });

  document
    .querySelector('[data-logout]')
    .addEventListener('click',()=>db.auth.signOut());

  prevButton.addEventListener('click',async()=>{
    if(page<=1)return;
    page-=1;
    await loadArticles();
    window.scrollTo({top:0,behavior:'smooth'});
  });

  nextButton.addEventListener('click',async()=>{
    const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
    if(page>=pages)return;
    page+=1;
    await loadArticles();
    window.scrollTo({top:0,behavior:'smooth'});
  });

  db.auth.onAuthStateChange((_event,currentSession)=>{
    showSession(currentSession);
  });

  db.auth.getSession().then(({data})=>{
    showSession(data.session);
  });
})();

(()=>{
  const cfg=window.CH82_SUPABASE||{};

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
  const userEmail=document.querySelector('[data-user-email]');

  const inviteForm=document.querySelector('[data-invite-form]');
  const inviteStatus=document.querySelector('[data-invite-status]');
  const usersList=document.querySelector('[data-users-list]');

  let db=null;
  let session=null;
  let profile=null;

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

  db=window.supabase.createClient(
    cfg.url,
    cfg.anonKey
  );

  const authenticatedPost=async(url,body)=>{
    const token=session?.access_token;

    if(!token){
      throw new Error('Brak aktywnej sesji.');
    }

    const response=await fetch(
      url,
      {
        method:'POST',
        headers:{
          'content-type':'application/json',
          'authorization':`Bearer ${token}`
        },
        body:JSON.stringify(body)
      }
    );

    const data=await response
      .json()
      .catch(()=>({}));

    if(!response.ok){
      throw new Error(
        data.error||
        'Operacja nie powiodła się.'
      );
    }

    return data;
  };

  const loadUsers=async()=>{
    usersList.innerHTML=
      '<p class="admin-help">Wczytywanie Redakcji…</p>';

    const {data,error}=await db
      .from('profiles')
      .select(
        'id,email,display_name,role,active,created_at'
      )
      .order('created_at',{ascending:true});

    if(error){
      usersList.innerHTML=
        `<p class="admin-status is-error">${esc(error.message)}</p>`;
      return;
    }

    usersList.innerHTML=data.map(user=>`
      <article class="admin-list-item">

        <div>
          <span class="section-label">
            ${user.active?'Aktywny':'Zablokowany'}
          </span>

          <h3>
            ${esc(user.display_name||user.email)}
          </h3>

          <p>${esc(user.email)}</p>
        </div>

        <div class="admin-user-actions">

          <select
            data-role-user="${esc(user.id)}"
            aria-label="Rola ${esc(user.email)}"
          >
            <option
              value="author"
              ${user.role==='author'?'selected':''}
            >
              Autor
            </option>

            <option
              value="editor"
              ${user.role==='editor'?'selected':''}
            >
              Redaktor
            </option>

            <option
              value="admin"
              ${user.role==='admin'?'selected':''}
            >
              Administrator
            </option>
          </select>

          <button
            type="button"
            class="button-secondary"
            data-toggle-user="${esc(user.id)}"
            data-active="${user.active}"
          >
            ${user.active?'Zablokuj':'Odblokuj'}
          </button>

        </div>

      </article>
    `).join('');

    usersList
      .querySelectorAll('[data-role-user]')
      .forEach(select=>{
        select.addEventListener(
          'change',
          ()=>updateUser(
            select.dataset.roleUser,
            {role:select.value}
          )
        );
      });

    usersList
      .querySelectorAll('[data-toggle-user]')
      .forEach(button=>{
        button.addEventListener(
          'click',
          ()=>updateUser(
            button.dataset.toggleUser,
            {
              active:
                button.dataset.active!=='true'
            }
          )
        );
      });
  };

  const updateUser=async(id,changes)=>{
    try{
      await authenticatedPost(
        '/api/update-user',
        {id,...changes}
      );

      await loadUsers();
    }catch(error){
      window.alert(error.message);
    }
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

      loginPanel.hidden=false;
      shell.hidden=true;
      return;
    }

    profile=data;

    userEmail.textContent=
      profile.display_name||
      session.user.email||
      '';

    loginPanel.hidden=true;
    shell.hidden=false;

    await loadUsers();
  };

  loginForm.addEventListener(
    'submit',
    async event=>{
      event.preventDefault();

      status(
        loginStatus,
        'Logowanie…'
      );

      const form=new FormData(loginForm);

      const {error}=await db.auth
        .signInWithPassword({
          email:form.get('email'),
          password:form.get('password')
        });

      if(error){
        status(
          loginStatus,
          error.message,
          true
        );
      }
    }
  );

  inviteForm.addEventListener(
    'submit',
    async event=>{
      event.preventDefault();

      status(
        inviteStatus,
        'Wysyłanie zaproszenia…'
      );

      const form=new FormData(inviteForm);

      try{
        await authenticatedPost(
          '/api/invite-editor',
          {
            email:String(
              form.get('email')
            ).trim(),

            display_name:String(
              form.get('display_name')||''
            ).trim(),

            role:String(
              form.get('role')
            )
          }
        );

        inviteForm.reset();

        status(
          inviteStatus,
          'Zaproszenie wysłane.'
        );

        await loadUsers();

      }catch(error){
        status(
          inviteStatus,
          error.message,
          true
        );
      }
    }
  );

  document
    .querySelector('[data-logout]')
    .addEventListener(
      'click',
      ()=>db.auth.signOut()
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

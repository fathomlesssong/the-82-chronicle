(()=>{
  const cfg=window.CH82_SUPABASE||{};

  const form=document.querySelector('[data-reset-form]');
  const help=document.querySelector('[data-reset-help]');
  const statusElement=document.querySelector('[data-reset-status]');

  const status=(message,bad=false)=>{
    statusElement.textContent=message;
    statusElement.classList.toggle('is-error',bad);
  };

  if(!cfg.url||!cfg.anonKey||!window.supabase){
    help.textContent='';
    status(
      'Panel odzyskiwania hasła nie jest skonfigurowany.',
      true
    );
    return;
  }

  const db=window.supabase.createClient(
    cfg.url,
    cfg.anonKey
  );

  let recoveryReady=false;

  const enableRecovery=()=>{
    if(recoveryReady)return;

    recoveryReady=true;
    help.textContent=
      'Wpisz nowe hasło. Powinno mieć co najmniej 10 znaków.';
    form.hidden=false;
    status('');
  };

  const invalidRecovery=()=>{
    if(recoveryReady)return;

    help.textContent='';
    form.hidden=true;
    status(
      'Link do zmiany hasła jest nieważny albo wygasł. Wróć do logowania i poproś o nowy link.',
      true
    );
  };

  const recoveryHint=
    window.location.hash.includes('type=recovery') ||
    new URLSearchParams(window.location.search).has('code');

  db.auth.onAuthStateChange((event,currentSession)=>{
    if(event==='PASSWORD_RECOVERY'&&currentSession){
      enableRecovery();
    }
  });

  (async()=>{
    // Supabase potrzebuje chwili na przetworzenie tokenu/code z URL.
    for(let attempt=0;attempt<12;attempt+=1){
      const {data,error}=await db.auth.getSession();

      if(!error&&data?.session&&recoveryHint){
        enableRecovery();
        return;
      }

      if(recoveryReady)return;

      await new Promise(resolve=>setTimeout(resolve,150));
    }

    invalidRecovery();
  })();

  form.addEventListener('submit',async event=>{
    event.preventDefault();

    if(!recoveryReady){
      invalidRecovery();
      return;
    }

    const data=new FormData(form);
    const password=String(data.get('password')||'');
    const confirm=String(data.get('password_confirm')||'');

    if(password.length<10){
      status(
        'Hasło musi mieć co najmniej 10 znaków.',
        true
      );
      return;
    }

    if(password!==confirm){
      status('Hasła nie są identyczne.',true);
      return;
    }

    const button=form.querySelector('button[type="submit"]');
    button.disabled=true;
    status('Zapisywanie nowego hasła…');

    const {error}=await db.auth.updateUser({password});

    if(error){
      button.disabled=false;
      status(
        'Nie udało się zmienić hasła. Poproś o nowy link i spróbuj ponownie.',
        true
      );
      return;
    }

    await db.auth.signOut();

    window.location.replace(
      '/admin.html?password_reset=1'
    );
  });
})();

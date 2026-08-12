(()=>{
  const form=document.querySelector('[data-newsletter-form]');
  const status=document.querySelector('[data-newsletter-status]');
  if(!form||!status)return;
  const show=(message,bad=false)=>{status.textContent=message;status.classList.toggle('is-error',bad);};
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    const data=new FormData(form);
    const email=String(data.get('email')||'').trim();
    if(!form.elements.email.checkValidity()){form.elements.email.reportValidity();return;}
    button.disabled=true;show('Zapisywanie…');
    try{
      const response=await fetch('/api/newsletter-subscribe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,company:String(data.get('company')||'')})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Nie udało się zapisać adresu.');
      form.reset();show(result.message||'Gotowe — adres jest na liście.');
    }catch(error){show(error.message,true);}finally{button.disabled=false;}
  });
})();

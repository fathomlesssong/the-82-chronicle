(async()=>{
  const root=document.querySelector('[data-dynamic-article]');
  const cfg=window.CH82_SUPABASE||{};
  const slug=new URLSearchParams(location.search).get('slug');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[c]));
  const paras=s=>String(s||'').split(/\n{2,}/).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('');
  if(!slug||!cfg.url||!cfg.anonKey||!window.supabase){root.innerHTML='<p class="empty-state">Nie udało się wczytać artykułu.</p>';return;}
  const db=window.supabase.createClient(cfg.url,cfg.anonKey);
  const {data,error}=await db.from('articles').select('*').eq('slug',slug).eq('status','published').maybeSingle();
  if(error||!data){root.innerHTML='<p class="empty-state">Artykułu nie znaleziono.</p>';return;}
  document.title=`${data.title} • The 82 Chronicle`;
  root.innerHTML=`<article><span class="section-label">${esc(data.section)}</span><h1>${esc(data.title)}</h1><p class="article-lead">${esc(data.summary)}</p><div class="story-meta">${new Date(data.published_at).toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'})} • The 82 Chronicle</div>${data.image_url?`<figure class="article-hero"><img src="${esc(data.image_url)}" alt="${esc(data.image_alt||data.title)}">${data.image_alt?`<figcaption>${esc(data.image_alt)}</figcaption>`:''}</figure>`:''}<div class="article-body">${paras(data.content)}</div></article>`;
})();

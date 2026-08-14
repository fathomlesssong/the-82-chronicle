(async()=>{
  const root=document.querySelector('[data-dynamic-article]');
  const cfg=window.CH82_SUPABASE||{};
  const slug=new URLSearchParams(location.search).get('slug');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[c]));
  const slugify=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const legacy={'wydarzenia':'aktualnosci','spolecznosc':'aktualnosci','opinie':'aktualnosci','tajemnice':'sledztwa'};
  const sectionName={'aktualnosci':'Aktualności','infrastruktura':'Infrastruktura','sledztwa':'Śledztwa','kultura':'Kultura','kacik-kulinarny':'Kącik kulinarny'};
  const paras=s=>String(s||'').split(/\n{2,}/).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('');
  if(window.CH82_SUPABASE_READY)await window.CH82_SUPABASE_READY;
  if(!slug||!cfg.url||!cfg.anonKey||!window.supabase){root.innerHTML='<p class="empty-state">Nie udało się wczytać artykułu.</p>';return;}
  const db=window.supabase.createClient(cfg.url,cfg.anonKey);
  const {data,error}=await db.from('articles').select('*').eq('slug',slug).eq('status','published').maybeSingle();
  if(error||!data){root.innerHTML='<p class="empty-state">Artykułu nie znaleziono.</p>';return;}
  const rawSectionSlug=data.section_slug||slugify(data.section);
  const sectionSlug=legacy[rawSectionSlug]||rawSectionSlug;
  const section=sectionName[sectionSlug]||data.section;
  const author=data.author_name||data.author_display_name||'Redakcja Kroniki 82';
  const date=new Date(data.published_at).toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'});
  const updateDate=data.is_updated&&data.update_at?new Date(data.update_at).toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'}):'';
  const imageCaption=data.image_caption||'';
  const imageCredit=data.image_credit||'';
  const figcaption=imageCaption||imageCredit?`<figcaption>${imageCaption?`<span class="article-caption">${esc(imageCaption)}</span>`:''}${imageCredit?`<span class="article-credit">${esc(imageCredit)}</span>`:''}</figcaption>`:'';
  document.title=`${data.title} • The 82 Chronicle`;
  document.querySelector('meta[name="description"]')?.setAttribute('content',data.summary||'Artykuł The 82 Chronicle');
  document.querySelectorAll('.section-nav a').forEach(link=>{const target=new URL(link.href,location.href).searchParams.get('section');if(target===sectionSlug)link.setAttribute('aria-current','page');});
  root.innerHTML=`<article>
    <header class="article-header">
      <div class="article-breadcrumb"><a href="/">Strona główna</a><span>›</span><a href="/section.html?section=${encodeURIComponent(sectionSlug)}">${esc(section)}</a></div>
      <span class="section-label">${esc(section)}</span>
      ${data.is_updated?'<span class="update-badge">Aktualizacja</span>':''}
      <h1>${esc(data.title)}</h1>
      <p class="article-lead">${esc(data.summary)}</p>
      <div class="article-byline">Tekst: ${esc(author)} • ${esc(date)}</div>
      ${updateDate?`<div class="article-update-meta">Aktualizacja: ${esc(updateDate)}</div>`:''}
    </header>
    <div class="article-content${data.image_url?'':' article-content--no-image'}">
      ${data.image_url?`<figure class="article-hero"><img src="${esc(data.image_url)}" alt="${esc(data.image_alt||data.title)}" fetchpriority="high" decoding="async">${figcaption}</figure>`:''}
      <div class="article-body">${paras(data.content)}</div>
    </div>
    <aside class="article-ad" aria-label="Reklama"><p class="ad-label">Reklama</p><picture><source media="(max-width:700px)" srcset="/assets/ad-myslecki-compact.webp"><img src="/assets/ad-myslecki-landscape.webp" alt="Myślecki Archeologia — badania, nadzory, ekspertyzy i dokumentacja archeologiczna" loading="lazy" decoding="async"></picture></aside>
    <div class="article-return"><a href="/section.html?section=${encodeURIComponent(sectionSlug)}">← Wróć do działu ${esc(section)}</a></div>
  </article>`;
})();

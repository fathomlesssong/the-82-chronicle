(async()=>{
  const fallback=[...(window.CH82_ARTICLES||[])];
  const esc=s=>String(s??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const fmtDate=iso=>new Date(iso).toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'});
  const mapDb=a=>({id:a.id,title:a.title,section:a.section,sectionSlug:a.section_slug,summary:a.summary,image:a.image_url||'/assets/og-image.png',alt:a.image_alt||a.title,href:`/article.html?slug=${encodeURIComponent(a.slug)}`,featured:!!a.featured,sort:new Date(a.published_at).getTime(),date:fmtDate(a.published_at)});
  const loadArticles=async()=>{
    const cfg=window.CH82_SUPABASE||{};
    if(cfg.url&&cfg.anonKey&&window.supabase){
      try{
        const db=window.supabase.createClient(cfg.url,cfg.anonKey);
        const {data,error}=await db.from('articles').select('*').eq('status','published').order('published_at',{ascending:false});
        if(!error&&data?.length)return data.map(mapDb);
      }catch(_e){}
    }
    return fallback;
  };
  const articles=(await loadArticles()).sort((a,b)=>b.sort-a.sort);
  const storyMedia=a=>`<a class="media" href="${esc(a.href)}"><img class="story-image" src="${esc(a.image)}" alt="${esc(a.alt)}"></a>`;
  const storyText=(a,summary=true,label=a.section)=>`<div class="story-copy"><span class="section-label">${esc(label)}</span><h2 class="story-title"><a href="${esc(a.href)}">${esc(a.title)}</a></h2>${summary?`<p class="story-summary">${esc(a.summary)}</p>`:""}<div class="story-meta">${esc(a.date)} • The 82 Chronicle</div></div>`;

  const home=document.querySelector('[data-home-feed]');
  if(home){
    const top=articles.slice(0,6);
    if(!top.length){home.innerHTML='<p class="empty-state">Brak artykułów.</p>';return;}
    const latest=top[0];
    const featured=articles.find(a=>a.featured&&a.id!==latest.id)||articles.find(a=>a.id!==latest.id)||latest;
    const rest=top.filter(a=>a.id!==latest.id&&a.id!==featured.id).slice(0,4);
    home.innerHTML=`
      <section class="latest-story" aria-label="Najnowszy artykuł">
        ${storyMedia(latest)}
        ${storyText(latest,true,`Najnowsze • ${latest.section}`)}
      </section>
      <section class="featured-story" aria-label="Główny artykuł">
        <div class="featured-heading"><span class="section-label">Główny artykuł</span></div>
        <h2 class="story-title"><a href="${esc(featured.href)}">${esc(featured.title)}</a></h2>
        <div class="featured-grid">
          ${storyMedia(featured)}
          <div><span class="section-label">${esc(featured.section)}</span><p class="story-summary">${esc(featured.summary)}</p><div class="story-meta">${esc(featured.date)} • The 82 Chronicle</div></div>
        </div>
      </section>
      <section class="stories-grid" aria-label="Pozostałe wiadomości">
        ${rest.map(a=>`<article class="story-card" id="${esc(a.id)}">${storyMedia(a)}${storyText(a)}</article>`).join('')}
      </section>`;
  }

  const archive=document.querySelector('[data-archive-list]');
  if(archive){
    const params=new URLSearchParams(location.search);
    const section=(params.get('section')||'').toLowerCase();
    const filtered=section?articles.filter(a=>a.sectionSlug===section):articles;
    const heading=document.querySelector('[data-archive-title]');
    if(heading&&section){const name=articles.find(a=>a.sectionSlug===section)?.section;if(name)heading.textContent=name;}
    document.querySelectorAll('.section-nav a').forEach(link=>{
      const target=new URL(link.href,location.href).searchParams.get('section')||'';
      if(target===section&&(section||link.pathname.endsWith('/archive.html')))link.setAttribute('aria-current','page');
    });
    archive.innerHTML=filtered.length?filtered.map(a=>`<article class="archive-entry">${storyMedia(a)}${storyText(a)}</article>`).join(''):'<p class="empty-state">W tym dziale nie ma jeszcze artykułów.</p>';
  }
})();

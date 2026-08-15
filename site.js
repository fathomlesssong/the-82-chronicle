(async()=>{
  const sections={
    aktualnosci:{name:'Aktualności',intro:'Najnowsze wiadomości z numeru 82, Słotwiny i najbliższej okolicy.'},
    infrastruktura:{name:'Infrastruktura',intro:'Drogi, schody, remonty i inne sprawy, które miały być załatwione już dawno.'},
    sledztwa:{name:'Śledztwa',intro:'Tropy, dowody i pytania, których rozsądniejsi ludzie woleliby nie zadawać.'},
    kultura:{name:'Kultura',intro:'Lokalne wydarzenia, twórczość i życie kulturalne wokół numeru 82.'},
    'kacik-kulinarny':{name:'Kącik kulinarny',intro:'Smaki, przepisy i kulinarne odkrycia redakcji The 82 Chronicle.'}
  };
  const legacy={'wydarzenia':'aktualnosci','spolecznosc':'aktualnosci','opinie':'aktualnosci','tajemnice':'sledztwa'};
  const esc=s=>String(s??'').replace(/[&<>'\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[c]));
  const slugify=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const fmtDate=iso=>iso?new Date(iso).toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'}):'';
  const normalizeSection=(name,slug)=>{let sectionSlug=slug||slugify(name);sectionSlug=legacy[sectionSlug]||sectionSlug;const info=sections[sectionSlug];return {section:info?.name||name,sectionSlug};};
  const normalizeArticle=a=>({...a,...normalizeSection(a.section,a.sectionSlug)});
  const fallback=[...(window.CH82_ARTICLES||[])].map(normalizeArticle);
  const mapDb=a=>normalizeArticle({id:a.id,title:a.title,section:a.section,sectionSlug:a.section_slug,summary:a.summary,image:a.image_url||'/assets/og-image.png',alt:a.image_alt||a.title,href:`/a/${encodeURIComponent(a.slug)}`,featured:!!a.featured,updated:!!a.is_updated,updateDate:fmtDate(a.update_at),sort:new Date(a.published_at||a.created_at).getTime(),date:fmtDate(a.published_at||a.created_at)});
  const setCanonical=url=>{
    let link=document.querySelector('link[rel="canonical"]');
    if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link);}
    link.href=url;
  };

  if(window.CH82_SUPABASE_READY)await window.CH82_SUPABASE_READY;
  const cfg=window.CH82_SUPABASE||{};
  const db=cfg.url&&cfg.anonKey&&window.supabase?window.supabase.createClient(cfg.url,cfg.anonKey):null;

  const syncEditorLink=async()=>{
    const link=document.querySelector('[data-editor-link]');
    if(!link||!db)return;
    try{
      const {data:{session}}=await db.auth.getSession();
      if(!session){link.hidden=true;return;}
      const {data:profile,error}=await db.from('profiles').select('role,active').eq('id',session.user.id).maybeSingle();
      link.hidden=!!error||!profile?.active||!['author','editor','admin'].includes(profile.role);
    }catch(_e){link.hidden=true;}
  };
  await syncEditorLink();
  db?.auth.onAuthStateChange(()=>syncEditorLink());

  const loadArticles=async()=>{
    if(db){
      try{
        const {data,error}=await db.from('articles').select('*').eq('status','published').order('published_at',{ascending:false});
        if(!error&&data?.length)return data.map(mapDb);
      }catch(_e){}
    }
    return fallback;
  };
  const articles=(await loadArticles()).sort((a,b)=>b.sort-a.sort);
  const updateBadge=a=>a.updated?`<span class="update-badge">Aktualizacja</span>`:'';
  const metaText=a=>a.updated&&a.updateDate?`Aktualizacja: ${a.updateDate} • The 82 Chronicle`:`${a.date} • The 82 Chronicle`;
  const storyMedia=(a,priority='lazy')=>`<a class="media" href="${esc(a.href)}" aria-label="Czytaj: ${esc(a.title)}"><img class="story-image" src="${esc(a.image)}" alt="${esc(a.alt)}" loading="${priority==='lazy'?'lazy':'eager'}" decoding="async"${priority==='high'?' fetchpriority="high"':''}></a>`;
  const storyText=(a,summary=true,label=a.section)=>`<div class="story-copy"><span class="section-label">${esc(label)}</span>${updateBadge(a)}<h2 class="story-title"><a href="${esc(a.href)}">${esc(a.title)}</a></h2>${summary?`<p class="story-summary">${esc(a.summary)}</p>`:''}<div class="story-meta">${esc(metaText(a))}</div></div>`;
  const navCurrent=section=>document.querySelectorAll('.section-nav a').forEach(link=>{const url=new URL(link.href,location.href);const target=url.searchParams.get('section')||'';if(section&&target===section)link.setAttribute('aria-current','page');if(!section&&location.pathname.endsWith('/archive.html')&&url.pathname.endsWith('/archive.html'))link.setAttribute('aria-current','page');});

  const home=document.querySelector('[data-home-feed]');
  if(home){
    const top=articles.slice(0,6);
    if(!top.length){home.innerHTML='<p class="empty-state">Brak artykułów.</p>';return;}
    const featured=articles.find(a=>a.featured)||null;
    const latest=articles.find(a=>!featured||a.id!==featured.id)||featured||top[0];
    const main=featured||articles.find(a=>a.id!==latest.id)||latest;
    const rest=top.filter(a=>a.id!==latest.id&&a.id!==main.id).slice(0,4);
    home.innerHTML=`<section class="latest-story" aria-label="Najnowszy artykuł">${storyMedia(latest,'high')}${storyText(latest,true,`Najnowsze • ${latest.section}`)}</section><section class="featured-story" aria-label="Główny artykuł"><div class="featured-heading"><span class="section-label">Główny artykuł</span></div>${updateBadge(main)}<h2 class="story-title"><a href="${esc(main.href)}">${esc(main.title)}</a></h2><div class="featured-grid">${storyMedia(main,'eager')}<div><p class="story-summary">${esc(main.summary)}</p><div class="story-meta">${esc(metaText(main))}</div></div></div></section><aside class="home-ad home-ad-mobile" aria-label="Reklama"><p class="ad-label">Reklama</p><picture class="ad-art"><source media="(max-width:700px)" srcset="/assets/ad-myslecki-compact.webp"><img src="/assets/ad-myslecki-landscape.webp" alt="Myślecki Archeologia — badania, nadzory, ekspertyzy i dokumentacja archeologiczna" loading="lazy" decoding="async"></picture></aside>${rest.length?`<section class="more-stories" aria-label="Pozostałe wiadomości"><div class="stories-heading"><span class="section-label">Więcej wiadomości</span></div><div class="stories-grid">${rest.map((a,index)=>`<article class="story-card" id="${esc(a.id)}">${storyMedia(a,index===0?'eager':'lazy')}${storyText(a)}</article>`).join('')}</div></section>`:''}`;
  }

  const sectionList=document.querySelector('[data-section-list]');
  if(sectionList){
    const requestedSection=(new URLSearchParams(location.search).get('section')||'').toLowerCase();
    const sectionInfo=sections[requestedSection];
    if(!sectionInfo){location.replace('/');return;}
    const filtered=articles.filter(a=>a.sectionSlug===requestedSection);
    document.querySelector('[data-section-title]').textContent=sectionInfo.name;
    document.querySelector('[data-section-intro]').textContent=sectionInfo.intro;
    const count=document.querySelector('[data-list-count]');if(count)count.textContent=`${filtered.length} ${filtered.length===1?'artykuł':'artykuły'}`;
    document.title=`${sectionInfo.name} • The 82 Chronicle`;
    document.querySelector('meta[name="description"]')?.setAttribute('content',`${sectionInfo.name} — artykuły The 82 Chronicle.`);
    setCanonical(`https://the82chronicle.vercel.app/section.html?section=${encodeURIComponent(requestedSection)}`);
    sectionList.setAttribute('aria-label',`Artykuły w dziale ${sectionInfo.name}`);
    navCurrent(requestedSection);
    sectionList.innerHTML=filtered.length?filtered.map((a,i)=>`<article class="archive-entry">${storyMedia(a,i===0?'high':'lazy')}${storyText(a,true)}</article>`).join(''):`<p class="empty-state">W dziale ${esc(sectionInfo.name)} nie ma jeszcze artykułów.</p>`;
  }

  const archive=document.querySelector('[data-archive-list]');
  if(archive){
    setCanonical('https://the82chronicle.vercel.app/archive.html');
    navCurrent('');
    const count=document.querySelector('[data-list-count]');if(count)count.textContent=`${articles.length} ${articles.length===1?'artykuł':'artykuły'}`;
    archive.innerHTML=articles.length?articles.map(a=>`<article class="archive-entry">${storyMedia(a)}${storyText(a,true)}</article>`).join(''):'<p class="empty-state">Archiwum jest jeszcze puste.</p>';
  }
})();
(async()=>{
  const root=document.querySelector('[data-dynamic-article]');
  const cfg=window.CH82_SUPABASE||{};
  const slug=new URLSearchParams(location.search).get('slug');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[c]));
  const slugify=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const legacy={'wydarzenia':'aktualnosci','spolecznosc':'aktualnosci','opinie':'aktualnosci','tajemnice':'sledztwa'};
  const sectionName={'aktualnosci':'Aktualności','infrastruktura':'Infrastruktura','sledztwa':'Śledztwa','kultura':'Kultura','na-stole':'Na Stole'};
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

  const {data:galleryRows,error:galleryError}=await db
    .from('article_images')
    .select('image_url,image_alt,image_caption,image_credit,sort_order')
    .eq('article_id',data.id)
    .order('sort_order',{ascending:true});

  const gallery=galleryError||!Array.isArray(galleryRows)?[]:galleryRows;

  const galleryHtml=gallery.length?`<section class="article-gallery" aria-labelledby="article-gallery-title">
    <div class="article-gallery-heading">
      <span class="section-label">Galeria</span>
      <h2 id="article-gallery-title">Zdjęcia</h2>
    </div>
    <div class="article-gallery-grid">
      ${gallery.map((image,index)=>{
        const caption=String(image.image_caption||'').trim();
        const credit=String(image.image_credit||'').trim();
        const alt=String(image.image_alt||`Zdjęcie ${index+1}`).trim();

        const itemCaption=caption||credit
          ?`<figcaption>${caption?`<span class="article-gallery-caption">${esc(caption)}</span>`:''}${credit?`<span class="article-gallery-credit">${esc(credit)}</span>`:''}</figcaption>`
          :'';

        return `<figure class="article-gallery-item">
          <a
            href="${esc(image.image_url)}"
            class="article-gallery-link"
            data-gallery-image
            data-gallery-alt="${esc(alt)}"
            data-gallery-caption="${esc(caption)}"
            data-gallery-credit="${esc(credit)}"
          >
            <img src="${esc(image.image_url)}" alt="${esc(alt)}" loading="lazy" decoding="async">
          </a>
          ${itemCaption}
        </figure>`;
      }).join('')}
    </div>
  </section>`:'';
  document.title=`${data.title} • Kronika 82`;
  document.querySelector('meta[name="description"]')?.setAttribute('content',data.summary||'Artykuł Kroniki 82');
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
      ${data.image_url?`<figure class="article-hero"><a href="${esc(data.image_url)}" class="article-hero-link article-gallery-link" data-gallery-image data-gallery-alt="${esc(data.image_alt||data.title)}" data-gallery-caption="${esc(imageCaption)}" data-gallery-credit="${esc(imageCredit)}" aria-label="Powiększ zdjęcie"><img src="${esc(data.image_url)}" alt="${esc(data.image_alt||data.title)}" fetchpriority="high" decoding="async"></a>${figcaption}</figure>`:''}
      <div class="article-body">${paras(data.content)}</div>
    </div>
    ${galleryHtml}
    <div class="article-return"><a href="/section.html?section=${encodeURIComponent(sectionSlug)}">← Wróć do działu ${esc(section)}</a></div>
  </article>`;
})();

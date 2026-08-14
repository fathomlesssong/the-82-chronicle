const {serviceHeaders}=require('../lib/supabase-server');

const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[c]));
const paragraphs=s=>String(s||'').split(/\n{2,}/).filter(Boolean).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('');
const sectionHref=slug=>`/section.html?section=${encodeURIComponent(slug)}`;
const authorFallback='Redakcja Kroniki 82';

async function resolveGallery(url,articleId,anonKey){
  if(!articleId)return [];
  try{
    const headers={apikey:anonKey};

    if(!String(anonKey).startsWith('sb_publishable_')){
      headers.authorization=`Bearer ${anonKey}`;
    }

    const endpoint=`${url}/rest/v1/article_images?article_id=eq.${encodeURIComponent(articleId)}&select=image_url,image_alt,image_caption,image_credit,sort_order&order=sort_order.asc,created_at.asc`;
    const response=await fetch(endpoint,{headers});

    if(!response.ok){
      console.error('Gallery request failed:',response.status,await response.text());
      return [];
    }

    const rows=await response.json();
    return Array.isArray(rows)?rows:[];
  }catch(error){
    console.error('Gallery request error:',error);
    return [];
  }
}

const renderGallery=images=>{
  if(!images.length)return '';

  const items=images.map((image,index)=>{
    const caption=String(image.image_caption||'').trim();
    const credit=String(image.image_credit||'').trim();
    const alt=String(image.image_alt||`Zdjęcie ${index+1}`).trim();

    const figcaption=caption||credit
      ?`<figcaption>${caption?`<span class="article-gallery-caption">${esc(caption)}</span>`:''}${credit?`<span class="article-gallery-credit">${esc(credit)}</span>`:''}</figcaption>`
      :'';

    return `<figure class="article-gallery-item">
      <a href="${esc(image.image_url)}" class="article-gallery-link" data-gallery-image data-gallery-alt="${esc(alt)}" data-gallery-caption="${esc(caption)}" data-gallery-credit="${esc(credit)}">
        <img src="${esc(image.image_url)}" alt="${esc(alt)}" loading="lazy" decoding="async">
      </a>
      ${figcaption}
    </figure>`;
  }).join('');

  return `<section class="article-gallery" aria-labelledby="article-gallery-title">
    <div class="article-gallery-heading">
      <span class="section-label">Galeria</span>
      <h2 id="article-gallery-title">Zdjęcia</h2>
    </div>
    <div class="article-gallery-grid">${items}</div>
  </section>`;
};

async function resolveAuthorName(url,authorId){
  const serviceKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!authorId||!serviceKey)return authorFallback;
  try{
    const endpoint=`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(authorId)}&select=display_name&limit=1`;
    const response=await fetch(endpoint,{headers:serviceHeaders(serviceKey)});
    if(!response.ok)return authorFallback;
    const rows=await response.json();
    return String(rows[0]?.display_name||'').trim()||authorFallback;
  }catch(_error){
    return authorFallback;
  }
}

module.exports=async(req,res)=>{
  const slug=String(req.query?.slug||'').trim();
  const url=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const anonKey=process.env.SUPABASE_ANON_KEY||'';
  if(!slug||!url||!anonKey){
    res.statusCode=503;
    res.setHeader('content-type','text/html; charset=utf-8');
    return res.end('<!doctype html><meta charset="utf-8"><title>The 82 Chronicle</title><p>Artykuł będzie dostępny po podłączeniu Supabase.</p>');
  }

  try{
    const endpoint=`${url}/rest/v1/articles?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=id,title,slug,section,section_slug,summary,content,image_url,image_alt,image_caption,image_credit,published_at,is_updated,update_at,author_id&limit=1`;
    const headers={apikey:anonKey};
    if(!String(anonKey).startsWith('sb_publishable_'))headers.authorization=`Bearer ${anonKey}`;
    const response=await fetch(endpoint,{headers});
    if(!response.ok){
      res.statusCode=502;
      res.setHeader('content-type','text/plain; charset=utf-8');
      return res.end('Nie udało się odczytać artykułu z bazy.');
    }
    const rows=await response.json();
    const article=rows[0];
    if(!article){
      res.statusCode=404;
      res.setHeader('content-type','text/html; charset=utf-8');
      return res.end('<!doctype html><meta charset="utf-8"><title>Nie znaleziono • The 82 Chronicle</title><p>Artykułu nie znaleziono.</p>');
    }

    const production='https://the82chronicle.vercel.app';
    const canonical=`${production}/a/${encodeURIComponent(article.slug)}`;
    const image=article.image_url?(/^https?:\/\//.test(article.image_url)?article.image_url:`${production}${article.image_url}`):`${production}/assets/og-image.png`;
    const date=article.published_at?new Date(article.published_at).toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'}):'';
    const updateDate=article.is_updated&&article.update_at?new Date(article.update_at).toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'}):'';
    const updateBadge=article.is_updated?'<span class="update-badge">Aktualizacja</span>':'';
    const authorName=await resolveAuthorName(url,article.author_id);
    const gallery=await resolveGallery(url,article.id,anonKey);
    const galleryHtml=renderGallery(gallery);
    const imageCaption=article.image_caption||'';
    const imageCredit=article.image_credit||'';
    const figcaption=imageCaption||imageCredit?`<figcaption>${imageCaption?`<span class="article-caption">${esc(imageCaption)}</span>`:''}${imageCredit?`<span class="article-credit">${esc(imageCredit)}</span>`:''}</figcaption>`:'';

    const html=`<!DOCTYPE html>
<html lang="pl"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(article.title)} • The 82 Chronicle</title>
<meta name="description" content="${esc(article.summary)}">
<link rel="canonical" href="${esc(canonical)}"><link rel="icon" type="image/png" href="/assets/favicon.png?v=4">
<meta property="og:type" content="article"><meta property="og:site_name" content="The 82 Chronicle"><meta property="og:locale" content="pl_PL">
<meta property="og:url" content="${esc(canonical)}"><meta property="og:title" content="${esc(article.title)}"><meta property="og:description" content="${esc(article.summary)}"><meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(article.title)}"><meta name="twitter:description" content="${esc(article.summary)}"><meta name="twitter:image" content="${esc(image)}">
<link rel="stylesheet" href="/styles.css?v=4"><link rel="stylesheet" href="/mobile.css?v=5"><link rel="stylesheet" href="/front-final.css?v=12"><link rel="stylesheet" href="/article-gallery.css?v=2">
</head><body><div class="page">
<div class="top-strip"><span>Słotwina, Dolny Śląsk</span><span>Gazeta niezależna od rozsądku urzędowego</span><span>Nr 1 • 2026</span></div>
<header class="masthead-wrap"><a href="/" style="color:inherit;text-decoration:none"><h1 class="masthead">The 82 Chronicle</h1></a><p class="tagline">Wiadomości spod numeru 82 • Słotwina • Założono w 2026</p></header>
<nav class="section-nav" aria-label="Działy gazety"><a href="/">Strona główna</a><a href="/section.html?section=aktualnosci">Aktualności</a><a href="/section.html?section=infrastruktura">Infrastruktura</a><a href="/section.html?section=sledztwa">Śledztwa</a><a href="/section.html?section=kultura">Kultura</a><a href="/section.html?section=kacik-kulinarny">Kącik kulinarny</a><a href="/archive.html">Archiwum</a></nav>
<main class="article-page"><article><header class="article-header"><div class="article-breadcrumb"><a href="/">Strona główna</a> / <a href="${sectionHref(article.section_slug)}">${esc(article.section)}</a></div><span class="section-label">${esc(article.section)}</span>${updateBadge}<h1>${esc(article.title)}</h1><p class="article-lead">${esc(article.summary)}</p><div class="article-byline">Tekst: ${esc(authorName)}${date?` • ${esc(date)}`:''}</div>${updateDate?`<div class="article-update-meta">Aktualizacja: ${esc(updateDate)}</div>`:''}</header><div class="article-content${article.image_url?'':' article-content--no-image'}">${article.image_url?`<figure class="article-hero"><img src="${esc(article.image_url)}" alt="${esc(article.image_alt||article.title)}" fetchpriority="high" decoding="async">${figcaption}</figure>`:''}<div class="article-body">${paragraphs(article.content)}</div></div>${galleryHtml}<p class="article-return"><a href="${sectionHref(article.section_slug)}">← Więcej z działu ${esc(article.section)}</a></p></article></main>
<footer><a href="/" style="color:inherit">Strona główna</a> • The 82 Chronicle • Założono w 2026</footer></div><script src="/article-layout.js?v=1"></script><script src="/article-gallery.js?v=2"></script></body></html>`;
    res.statusCode=200;
    res.setHeader('content-type','text/html; charset=utf-8');
    res.setHeader('cache-control','public, s-maxage=60, stale-while-revalidate=300');
    return res.end(html);
  }catch(error){
    res.statusCode=500;
    res.setHeader('content-type','text/plain; charset=utf-8');
    return res.end('Nie udało się wczytać artykułu.');
  }
};

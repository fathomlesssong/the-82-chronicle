const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[c]));
const paragraphs=s=>String(s||'').split(/\n{2,}/).filter(Boolean).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('');
const sectionHref=slug=>`/section.html?section=${encodeURIComponent(slug)}`;

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
    const endpoint=`${url}/rest/v1/articles?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=title,slug,section,section_slug,summary,content,image_url,image_alt,image_caption,image_credit,published_at,is_updated,update_at&limit=1`;
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
    const imageCaption=article.image_caption||'';
    const imageCredit=article.image_credit||'';
    const figcaption=imageCaption||imageCredit?`<figcaption>${imageCaption?esc(imageCaption):''}${imageCaption&&imageCredit?' • ':''}${imageCredit?esc(imageCredit):''}</figcaption>`:'';

    const html=`<!DOCTYPE html>
<html lang="pl"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(article.title)} • The 82 Chronicle</title>
<meta name="description" content="${esc(article.summary)}">
<link rel="canonical" href="${esc(canonical)}"><link rel="icon" type="image/png" href="/assets/favicon.png?v=4">
<meta property="og:type" content="article"><meta property="og:site_name" content="The 82 Chronicle"><meta property="og:locale" content="pl_PL">
<meta property="og:url" content="${esc(canonical)}"><meta property="og:title" content="${esc(article.title)}"><meta property="og:description" content="${esc(article.summary)}"><meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(article.title)}"><meta name="twitter:description" content="${esc(article.summary)}"><meta name="twitter:image" content="${esc(image)}">
<link rel="stylesheet" href="/styles.css?v=4"><link rel="stylesheet" href="/mobile.css?v=5"><link rel="stylesheet" href="/front-final.css?v=7">
</head><body><div class="page">
<div class="top-strip"><span>Słotwina, Dolny Śląsk</span><span>Gazeta niezależna od rozsądku urzędowego</span><span>Nr 1 • 2026</span></div>
<header class="masthead-wrap"><a href="/" style="color:inherit;text-decoration:none"><h1 class="masthead">The 82 Chronicle</h1></a><p class="tagline">Wiadomości spod numeru 82 • Słotwina • Założono w 2026</p></header>
<nav class="section-nav" aria-label="Działy gazety"><a href="/">Strona główna</a><a href="/section.html?section=aktualnosci">Aktualności</a><a href="/section.html?section=infrastruktura">Infrastruktura</a><a href="/section.html?section=sledztwa">Śledztwa</a><a href="/section.html?section=kultura">Kultura</a><a href="/section.html?section=kacik-kulinarny">Kącik kulinarny</a><a href="/archive.html">Archiwum</a></nav>
<main class="article-page"><article><div class="article-breadcrumb"><a href="/">Strona główna</a> / <a href="${sectionHref(article.section_slug)}">${esc(article.section)}</a></div><span class="section-label">${esc(article.section)}</span>${updateBadge}<h1>${esc(article.title)}</h1><p class="article-lead">${esc(article.summary)}</p><div class="story-meta">Tekst: Redakcja The 82 Chronicle${date?` • ${esc(date)}`:''}</div>${updateDate?`<div class="article-update-meta">Aktualizacja: ${esc(updateDate)}</div>`:''}${article.image_url?`<figure class="article-hero"><img src="${esc(article.image_url)}" alt="${esc(article.image_alt||article.title)}">${figcaption}</figure>`:''}<div class="article-body">${paragraphs(article.content)}</div><p class="article-return"><a href="${sectionHref(article.section_slug)}">← Więcej z działu ${esc(article.section)}</a></p></article></main>
<footer><a href="/" style="color:inherit">Strona główna</a> • The 82 Chronicle • Założono w 2026</footer></div></body></html>`;
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

const {metadata}=require('../share-meta');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
module.exports=async(req,res)=>{
  res.setHeader('content-type','text/html; charset=utf-8');
  res.setHeader('cache-control','private, no-store');
  res.setHeader('cdn-cache-control','no-store');
  res.setHeader('vercel-cdn-cache-control','no-store');
  res.setHeader('x-robots-tag','noindex, nofollow, noarchive');
  res.setHeader('referrer-policy','no-referrer');
  res.setHeader('content-security-policy',"default-src 'none'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'");
  const fail=(code,message)=>{res.statusCode=code;res.end(req.method==='HEAD'?'':`<!doctype html><html lang="pl"><meta charset="utf-8"><title>Kronika 82</title><p>${message}</p></html>`);};
  if(!['GET','HEAD'].includes(req.method)){res.setHeader('allow','GET, HEAD');return fail(405,'Niedozwolona metoda.');}
  const slug=req.query?.slug;
  if(typeof slug!=='string'||!slug||slug.length>240||/[\s/\\?#\x00-\x1f]/.test(slug))return fail(404,'Podgląd niedostępny.');
  const url=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=process.env.SUPABASE_ANON_KEY;
  if(!url||!key)return fail(503,'Podgląd chwilowo niedostępny.');
  try{
    // Deliberately exclude body, gallery, profiles and all privileged credentials.
    const query=new URLSearchParams({slug:`eq.${slug}`,status:'eq.published',select:'title,summary,image_url,slug,status',limit:'1'});
    const headers={apikey:key};
    if(!key.startsWith('sb_publishable_'))headers.authorization=`Bearer ${key}`;
    const response=await fetch(`${url}/rest/v1/articles?${query}`,{headers,cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!response.ok)return fail(502,'Podgląd chwilowo niedostępny.');
    const rows=await response.json();
    const article=Array.isArray(rows)?rows[0]:null;
    if(!article||article.status!=='published'||article.slug!==slug)return fail(404,'Podgląd niedostępny.');
    const meta=metadata(article,url);
    const target='/a/'+encodeURIComponent(slug);
    res.statusCode=200;
    return res.end(req.method==='HEAD'?'':`<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(meta.title)} • Kronika 82</title>
<link rel="canonical" href="${esc(meta.url)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Kronika 82"><meta property="og:locale" content="pl_PL">
<meta property="og:title" content="${esc(meta.title)}"><meta property="og:description" content="${esc(meta.description)}"><meta property="og:image" content="${esc(meta.image)}"><meta property="og:image:alt" content="${esc(meta.title)}"><meta property="og:url" content="${esc(meta.url)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(meta.title)}"><meta name="twitter:description" content="${esc(meta.description)}"><meta name="twitter:image" content="${esc(meta.image)}">
</head><body><p><a id="read-article" href="${esc(target)}">Przejdź do artykułu w Kronice 82</a></p><script src="/share-redirect.js"></script></body></html>`);
  }catch(_error){return fail(502,'Podgląd chwilowo niedostępny.');}
};

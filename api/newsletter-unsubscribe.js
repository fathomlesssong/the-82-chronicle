const {requiredEnv,serviceHeaders}=require('../lib/supabase-server');
const {normalizeEmail,isValidEmail,validUnsubscribeToken}=require('../lib/newsletter');

const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const page=(title,content)=>`<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} • Kronika 82</title><style>body{margin:0;background:#f4f0e6;color:#171512;font-family:Georgia,serif}.box{width:min(620px,calc(100% - 32px));margin:9vh auto;padding:28px;border-top:6px double #24211d;border-bottom:6px double #24211d;text-align:center}h1{font-size:38px}p{font-size:18px;line-height:1.55}button,a{color:inherit}button{padding:12px 18px;border:1px solid #171512;background:#171512;color:#f4f0e6;font-weight:700;cursor:pointer}</style></head><body><main class="box"><p>Kronika 82</p>${content}<p><a href="/">Wróć na stronę główną</a></p></main></body></html>`;

module.exports=async(req,res)=>{
  res.setHeader('cache-control','no-store');
  res.setHeader('content-type','text/html; charset=utf-8');
  if(!['GET','POST'].includes(req.method)){
    res.setHeader('allow','GET, POST');
    return res.status(405).end(page('Nieobsługiwana metoda','<h1>Nie udało się wykonać operacji.</h1>'));
  }
  const email=normalizeEmail(req.query?.email);
  const token=String(req.query?.token||'');
  try{
    if(!isValidEmail(email)||!validUnsubscribeToken(email,token))return res.status(400).end(page('Nieprawidłowy link','<h1>Link wypisu jest nieprawidłowy lub niepełny.</h1>'));
  }catch(error){
    return res.status(503).end(page('Newsletter nieaktywny','<h1>Wypisanie będzie dostępne po dokończeniu konfiguracji newslettera.</h1>'));
  }
  if(req.method==='GET'){
    const action=`/api/newsletter-unsubscribe?${new URLSearchParams({email,token})}`;
    return res.status(200).end(page('Wypisanie z newslettera',`<h1>Wypisać ten adres?</h1><p>${esc(email)}</p><form method="post" action="${esc(action)}"><button type="submit">Wypisz mnie</button></form>`));
  }
  try{
    const {url,serviceKey}=requiredEnv();
    const response=await fetch(`${url}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}`,{
      method:'PATCH',headers:{...serviceHeaders(serviceKey),Prefer:'return=minimal'},body:JSON.stringify({active:false,unsubscribed_at:new Date().toISOString()})
    });
    if(!response.ok)throw new Error('Supabase rejected unsubscribe.');
    return res.status(200).end(page('Adres wypisany','<h1>Adres został wypisany.</h1><p>Nie otrzymasz kolejnych wydań rodzinnego newslettera.</p>'));
  }catch(error){
    return res.status(502).end(page('Nie udało się wypisać','<h1>Nie udało się teraz wypisać adresu.</h1><p>Spróbuj ponownie później.</p>'));
  }
};

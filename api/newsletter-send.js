const {requiredEnv,serviceHeaders,requireAdmin}=require('../lib/supabase-server');
const {configured,renderNewsletter,sendWithResend,deliveryKey}=require('../lib/newsletter');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports=async(req,res)=>{
  res.setHeader('cache-control','no-store');
  if(req.method!=='POST'){
    res.setHeader('allow','POST');
    return res.status(405).json({error:'Method not allowed'});
  }
  try{
    await requireAdmin(req);
    if(!configured())return res.status(503).json({error:'Wysyłka czeka na RESEND_API_KEY, NEWSLETTER_FROM i NEWSLETTER_SIGNING_SECRET. Nic nie zostało wysłane.'});
    const articleId=String(req.body?.article_id||'').trim();
    const mode=req.body?.mode==='update'?'update':'article';
    if(!UUID.test(articleId))return res.status(400).json({error:'Nieprawidłowy identyfikator artykułu.'});
    const {url,serviceKey}=requiredEnv();
    const articleResponse=await fetch(`${url}/rest/v1/articles?id=eq.${encodeURIComponent(articleId)}&select=id,title,slug,summary,content,image_url,image_alt,status,is_updated,update_at,updated_at,newsletter_teaser,newsletter_update_excerpt,newsletter_sent_at,newsletter_update_sent_at,newsletter_update_sent_for&limit=1`,{headers:serviceHeaders(serviceKey)});
    if(!articleResponse.ok)return res.status(502).json({error:'Nie udało się odczytać artykułu z Supabase.'});
    const articles=await articleResponse.json();
    const article=articles[0];
    if(!article)return res.status(404).json({error:'Artykułu nie znaleziono.'});
    if(article.status!=='published')return res.status(400).json({error:'Newsletter można wysłać tylko dla opublikowanego artykułu.'});
    if(mode==='update'&&(!article.is_updated||!article.update_at))return res.status(400).json({error:'Najpierw oznacz artykuł jako aktualizację i ustaw jej datę.'});
    if(mode==='article'&&article.newsletter_sent_at)return res.status(409).json({error:'Newsletter dla tego artykułu został już wysłany.'});
    if(mode==='update'&&article.newsletter_update_sent_for&&new Date(article.newsletter_update_sent_for).getTime()===new Date(article.update_at).getTime())return res.status(409).json({error:'Newsletter dla tej wersji aktualizacji został już wysłany.'});
    const subscriberResponse=await fetch(`${url}/rest/v1/subscribers?active=eq.true&select=email&order=created_at.asc`,{headers:serviceHeaders(serviceKey)});
    if(!subscriberResponse.ok)return res.status(502).json({error:'Nie udało się odczytać listy odbiorców.'});
    const subscribers=await subscriberResponse.json();
    if(!subscribers.length)return res.status(200).json({ok:true,sent:0,message:'Brak aktywnych odbiorców — nic nie wysłano.'});
    const failures=[];let sent=0;
    for(const subscriber of subscribers){
      try{
        const message=renderNewsletter({article,recipient:subscriber.email,mode});
        await sendWithResend({to:subscriber.email,subject:message.subject,html:message.html,text:message.text,removeUrl:message.removeUrl,idempotencyKey:deliveryKey(article,subscriber.email,mode)});
        sent+=1;
      }catch(error){failures.push({error:error.message});}
    }
    if(failures.length)return res.status(502).json({error:`Wysłano ${sent} z ${subscribers.length} wiadomości. Ponowna próba w ciągu 24 godzin jest chroniona kluczami idempotencji.`,sent,failed:failures.length});
    const now=new Date().toISOString();
    const changes=mode==='update'?{newsletter_update_sent_at:now,newsletter_update_sent_for:article.update_at}:{newsletter_sent_at:now};
    const markResponse=await fetch(`${url}/rest/v1/articles?id=eq.${encodeURIComponent(article.id)}`,{
      method:'PATCH',headers:{...serviceHeaders(serviceKey),Prefer:'return=minimal'},body:JSON.stringify(changes)
    });
    if(!markResponse.ok)return res.status(502).json({error:`Wiadomości wysłano do ${sent} odbiorców, ale nie udało się zapisać znacznika wysyłki. Nie ponawiaj ręcznie bez sprawdzenia.`,sent});
    return res.status(200).json({ok:true,sent,message:`Wysłano do ${sent} odbiorców.`});
  }catch(error){return res.status(error.status||500).json({error:error.message||'Błąd serwera.'});}
};

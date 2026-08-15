const {requiredEnv,serviceHeaders}=require('../lib/supabase-server');
const {normalizeEmail,isValidEmail}=require('../lib/newsletter');

module.exports=async(req,res)=>{
  res.setHeader('cache-control','no-store');
  if(req.method!=='POST'){
    res.setHeader('allow','POST');
    return res.status(405).json({error:'Method not allowed'});
  }
  if(String(req.headers?.['sec-fetch-site']||'')==='cross-site')return res.status(403).json({error:'Nie udało się przyjąć zapisu z innej strony.'});
  const email=normalizeEmail(req.body?.email);
  const honeypot=String(req.body?.company||'').trim();
  if(honeypot)return res.status(200).json({ok:true,message:'Dziękujemy. Sprawdź skrzynkę przy następnym wydaniu.'});
  if(!isValidEmail(email))return res.status(400).json({error:'Podaj prawidłowy adres e-mail.'});
  try{
    const {url,serviceKey}=requiredEnv();
    const response=await fetch(`${url}/rest/v1/subscribers?on_conflict=email`,{
      method:'POST',headers:{...serviceHeaders(serviceKey),Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({email,active:true,unsubscribed_at:null})
    });
    if(!response.ok){
      const details=await response.text().catch(()=>'');
      console.error('newsletter-subscribe Supabase error',{
        status:response.status,
        details:details.slice(0,500)
      });
      throw new Error('Nie udało się zapisać adresu.');
    }
    return res.status(200).json({ok:true,message:'Gotowe — adres jest na liście rodzinnego newslettera.'});
  }catch(error){
    const unavailable=/not configured/i.test(error.message||'');
    return res.status(unavailable?503:502).json({error:unavailable?'Zapisy ruszą po podłączeniu Supabase.':'Nie udało się teraz zapisać adresu. Spróbuj ponownie później.'});
  }
};

const {requiredEnv,serviceHeaders,requireAdmin}=require('../lib/supabase-server');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports=async(req,res)=>{
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    await requireAdmin(req);
    const {url,serviceKey}=requiredEnv();
    const email=String(req.body?.email||'').trim().toLowerCase();
    const displayName=String(req.body?.display_name||'').trim().slice(0,80);
    const role=String(req.body?.role||'author');
    if(!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({error:'Podaj prawidłowy adres e-mail.'});
    if(!['author','admin'].includes(role))return res.status(400).json({error:'Nieprawidłowa rola.'});

    const redirectBase=(process.env.SITE_URL||'https://the82chronicle.vercel.app').replace(/\/$/,'');
    const invite=await fetch(`${url}/auth/v1/invite?redirect_to=${encodeURIComponent(`${redirectBase}/admin.html`)}`,{
      method:'POST',
      headers:serviceHeaders(serviceKey),
      body:JSON.stringify({email,data:{display_name:displayName}})
    });
    const invited=await invite.json().catch(()=>({}));
    if(!invite.ok)return res.status(invite.status).json({error:invited.msg||invited.message||'Nie udało się wysłać zaproszenia.'});

    const userId=invited.id||invited.user?.id;
    if(!UUID.test(String(userId||'')))return res.status(502).json({error:'Supabase nie zwrócił prawidłowego identyfikatora zaproszonego użytkownika.'});

    const upsert=await fetch(`${url}/rest/v1/profiles?on_conflict=id`,{
      method:'POST',
      headers:{...serviceHeaders(serviceKey),Prefer:'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify({id:userId,email,display_name:displayName||null,role,active:true})
    });
    if(!upsert.ok)return res.status(502).json({error:'Zaproszenie wysłano, ale nie udało się przypisać roli. Sprawdź profil w Supabase.'});
    return res.status(200).json({ok:true});
  }catch(error){
    return res.status(error.status||500).json({error:error.message||'Błąd serwera.'});
  }
};

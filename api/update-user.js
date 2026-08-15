const {requiredEnv,serviceHeaders,requireAdmin}=require('../lib/supabase-server');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports=async(req,res)=>{
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    const {user}=await requireAdmin(req);
    const {url,serviceKey}=requiredEnv();
    const id=String(req.body?.id||'');
    const changes={};
    if(req.body?.role!==undefined){
      const role=String(req.body.role);
      if(!['author','admin'].includes(role))return res.status(400).json({error:'Nieprawidłowa rola.'});
      changes.role=role;
    }
    if(req.body?.active!==undefined)changes.active=Boolean(req.body.active);
    if(!UUID.test(id)||!Object.keys(changes).length)return res.status(400).json({error:'Brak prawidłowych danych do zmiany.'});
    if(id===user.id&&(changes.active===false||('role' in changes&&changes.role!=='admin'))){
      return res.status(400).json({error:'Nie możesz odebrać sobie własnych uprawnień administratora.'});
    }
    const response=await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=id`,{
      method:'PATCH',
      headers:{...serviceHeaders(serviceKey),Prefer:'return=representation'},
      body:JSON.stringify(changes)
    });
    if(!response.ok)return res.status(502).json({error:'Nie udało się zmienić uprawnień użytkownika.'});
    const rows=await response.json().catch(()=>[]);
    if(!rows.length)return res.status(404).json({error:'Nie znaleziono użytkownika redakcji.'});
    return res.status(200).json({ok:true});
  }catch(error){
    return res.status(error.status||500).json({error:error.message||'Błąd serwera.'});
  }
};

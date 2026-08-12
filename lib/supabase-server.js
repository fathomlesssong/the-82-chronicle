const requiredEnv=()=>{
  const url=process.env.SUPABASE_URL;
  const anonKey=process.env.SUPABASE_ANON_KEY;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!anonKey||!serviceKey)throw new Error('Supabase server environment is not configured.');
  return {url:url.replace(/\/$/,''),anonKey,serviceKey};
};

const bearer=req=>{
  const header=String(req.headers.authorization||'');
  return header.startsWith('Bearer ')?header.slice(7):'';
};

const serviceHeaders=serviceKey=>({
  apikey:serviceKey,
  authorization:`Bearer ${serviceKey}`,
  'content-type':'application/json'
});

async function verifyUser(req){
  const {url,anonKey}=requiredEnv();
  const token=bearer(req);
  if(!token)throw Object.assign(new Error('Brak sesji.'),{status:401});
  const response=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anonKey,authorization:`Bearer ${token}`}});
  if(!response.ok)throw Object.assign(new Error('Sesja wygasła lub jest nieprawidłowa.'),{status:401});
  return response.json();
}

async function getProfile(id){
  const {url,serviceKey}=requiredEnv();
  const response=await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=id,email,display_name,role,active`,{headers:serviceHeaders(serviceKey)});
  if(!response.ok)throw new Error('Nie udało się odczytać profilu redakcyjnego.');
  const rows=await response.json();
  return rows[0]||null;
}

async function requireAdmin(req){
  const user=await verifyUser(req);
  const profile=await getProfile(user.id);
  if(!profile||!profile.active||profile.role!=='admin')throw Object.assign(new Error('Ta operacja wymaga roli Administrator.'),{status:403});
  return {user,profile};
}

async function requireEditor(req){
  const user=await verifyUser(req);
  const profile=await getProfile(user.id);
  if(!profile||!profile.active||!['editor','admin'].includes(profile.role)){
    throw Object.assign(new Error('Ta operacja wymaga roli Redaktor lub Administrator.'),{status:403});
  }
  return {user,profile};
}

module.exports={requiredEnv,serviceHeaders,verifyUser,getProfile,requireAdmin,requireEditor};

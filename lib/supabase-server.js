const publicEnv=()=>{
  const url=process.env.SUPABASE_URL;
  const anonKey=process.env.SUPABASE_ANON_KEY;
  if(!url||!anonKey){
    throw Object.assign(new Error('Supabase public environment is not configured.'),{status:503});
  }
  return {url:url.replace(/\/$/,''),anonKey};
};

const requiredEnv=()=>{
  const {url,anonKey}=publicEnv();
  const serviceKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!serviceKey){
    throw Object.assign(new Error('Supabase server environment is not configured.'),{status:503});
  }
  return {url,anonKey,serviceKey};
};

const bearer=req=>{
  const header=String(req.headers.authorization||'');
  return header.startsWith('Bearer ')?header.slice(7):'';
};

const serviceHeaders=serviceKey=>{
  const headers={apikey:serviceKey,'content-type':'application/json'};
  // Nowe klucze sb_secret_* są kluczami API, a nie JWT. Starszy
  // service_role jest JWT i nadal wymaga nagłówka Bearer.
  if(!String(serviceKey).startsWith('sb_secret_'))headers.authorization=`Bearer ${serviceKey}`;
  return headers;
};

const anonHeaders=anonKey=>{
  const headers={apikey:anonKey};
  if(!String(anonKey).startsWith('sb_publishable_'))headers.authorization=`Bearer ${anonKey}`;
  return headers;
};

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



module.exports={publicEnv,requiredEnv,anonHeaders,serviceHeaders,verifyUser,getProfile,requireAdmin};

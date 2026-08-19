const assert=require('node:assert/strict');
const {requiredEnv,serviceHeaders}=require('../lib/supabase-server');

const original={
  SUPABASE_URL:process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY:process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_SECRET_KEY:process.env.SUPABASE_SECRET_KEY
};

try{
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SECRET_KEY;

  assert.throws(requiredEnv,error=>error.status===503&&/not configured/i.test(error.message));

  process.env.SUPABASE_URL='https://example.supabase.co/';
  process.env.SUPABASE_ANON_KEY='sb_publishable_test';
  process.env.SUPABASE_SERVICE_ROLE_KEY='legacy-service-role-jwt';
  assert.deepEqual(requiredEnv(),{
    url:'https://example.supabase.co',
    anonKey:'sb_publishable_test',
    serviceKey:'legacy-service-role-jwt'
  });
  assert.equal(serviceHeaders('legacy-service-role-jwt').authorization,'Bearer legacy-service-role-jwt');
  assert.equal(serviceHeaders('sb_secret_test').authorization,undefined);
  assert.equal(serviceHeaders('sb_secret_test').apikey,'sb_secret_test');

  process.env.SUPABASE_SECRET_KEY='sb_secret_preferred';
  assert.equal(requiredEnv().serviceKey,'sb_secret_preferred');

  console.log('OK: konfiguracja Supabase obsługuje nowe i starsze klucze bez ujawniania sekretu jako JWT.');
}finally{
  for(const [name,value] of Object.entries(original)){
    if(value===undefined)delete process.env[name];
    else process.env[name]=value;
  }
}

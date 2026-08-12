const assert=require('node:assert/strict');

const handlers={
  article:require('../api/article'),
  invite:require('../api/invite-editor'),
  send:require('../api/newsletter-send'),
  subscribe:require('../api/newsletter-subscribe'),
  updateUser:require('../api/update-user')
};

const envNames=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY','RESEND_API_KEY','NEWSLETTER_FROM','NEWSLETTER_SIGNING_SECRET'];
const original=Object.fromEntries(envNames.map(name=>[name,process.env[name]]));

function response(){
  return {
    statusCode:200,
    headers:{},
    body:undefined,
    setHeader(name,value){this.headers[String(name).toLowerCase()]=value;},
    status(code){this.statusCode=code;return this;},
    json(value){this.body=value;return this;},
    end(value){this.body=value;return this;}
  };
}

async function call(handler,req){
  const res=response();
  await handler({headers:{},query:{},body:{},...req},res);
  return res;
}

(async()=>{
  try{
    for(const name of envNames)delete process.env[name];

    let res=await call(handlers.article,{method:'GET',query:{slug:'test'}});
    assert.equal(res.statusCode,503);

    res=await call(handlers.subscribe,{method:'POST',body:{email:'reader@example.test'}});
    assert.equal(res.statusCode,503);
    assert.match(res.body.error,/Supabase/i);

    res=await call(handlers.subscribe,{method:'POST',headers:{'sec-fetch-site':'cross-site'},body:{email:'reader@example.test'}});
    assert.equal(res.statusCode,403);

    res=await call(handlers.send,{method:'POST',body:{article_id:'00000000-0000-0000-0000-000000000001'}});
    assert.equal(res.statusCode,503);

    res=await call(handlers.invite,{method:'POST',body:{email:'author@example.test'}});
    assert.equal(res.statusCode,503);

    res=await call(handlers.updateUser,{method:'POST',body:{id:'00000000-0000-0000-0000-000000000001',role:'editor'}});
    assert.equal(res.statusCode,503);

    console.log('OK: endpointy odmawiają operacji bez konfiguracji, a zapis cross-site jest blokowany.');
  }finally{
    for(const [name,value] of Object.entries(original)){
      if(value===undefined)delete process.env[name];
      else process.env[name]=value;
    }
  }
})().catch(error=>{
  console.error(error);
  process.exit(1);
});

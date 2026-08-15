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
const originalFetch=global.fetch;

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

    let captured;
    global.fetch=async(url,options)=>{
      captured={url,options};
      return {ok:true,json:async()=>[]};
    };
    process.env.SUPABASE_URL='https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY='sb_publishable_test';
    res=await call(handlers.article,{method:'GET',query:{slug:'test'}});
    assert.equal(res.statusCode,404);
    assert.equal(captured.options.headers.apikey,'sb_publishable_test');
    assert.equal(captured.options.headers.authorization,undefined);

    process.env.SUPABASE_ANON_KEY='legacy-anon-jwt';
    res=await call(handlers.article,{method:'GET',query:{slug:'test'}});
    assert.equal(res.statusCode,404);
    assert.equal(captured.options.headers.authorization,'Bearer legacy-anon-jwt');

    const article={
      title:'Test autora',
      slug:'test-autora',
      section:'Aktualności',
      section_slug:'aktualnosci',
      summary:'Lead',
      content:'Treść artykułu.',
      image_url:null,
      image_alt:null,
      image_caption:null,
      image_credit:null,
      published_at:'2026-08-13T18:00:00.000Z',
      is_updated:false,
      update_at:null,
      author_id:'11111111-1111-1111-1111-111111111111'
    };
    const calls=[];
    global.fetch=async(url,options)=>{
      calls.push({url,options});
      if(String(url).includes('/rest/v1/profiles'))return {ok:true,json:async()=>[{display_name:'Michał & Syn'}]};
      return {ok:true,json:async()=>[article]};
    };
    process.env.SUPABASE_ANON_KEY='sb_publishable_test';
    process.env.SUPABASE_SECRET_KEY='sb_secret_test';
    res=await call(handlers.article,{method:'GET',query:{slug:'test-autora'}});
    assert.equal(res.statusCode,200);
    assert.match(res.body,/Tekst: Michał &amp; Syn/);
    assert.doesNotMatch(res.body,/Redakcja Kronika 82/);
    const profileCall=calls.find(call=>String(call.url).includes('/rest/v1/profiles'));
    assert.ok(profileCall);
    assert.match(String(profileCall.url),/select=display_name/);
    assert.equal(profileCall.options.headers.apikey,'sb_secret_test');
    assert.equal(profileCall.options.headers.authorization,undefined);

    global.fetch=async(url)=>String(url).includes('/rest/v1/profiles')
      ? {ok:true,json:async()=>[]}
      : {ok:true,json:async()=>[article]};
    res=await call(handlers.article,{method:'GET',query:{slug:'test-autora'}});
    assert.equal(res.statusCode,200);
    assert.match(res.body,/Tekst: Redakcja Kroniki 82/);

    console.log('OK: endpointy mają bezpieczne guardy, a byline używa profilu autora z kontrolowanym fallbackiem.');
  }finally{
    global.fetch=originalFetch;
    for(const [name,value] of Object.entries(original)){
      if(value===undefined)delete process.env[name];
      else process.env[name]=value;
    }
  }
})().catch(error=>{
  console.error(error);
  process.exit(1);
});

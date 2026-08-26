const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const search=require('../api/search');
const root=path.resolve(__dirname,'..');
const originalFetch=global.fetch;
const originalError=console.error;
const envNames=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY'];
const originalEnv=Object.fromEntries(envNames.map(name=>[name,process.env[name]]));

const article=overrides=>({
  title:'Opublikowany artykuł',
  slug:'opublikowany-artykul',
  section:'Aktualności',
  section_slug:'aktualnosci',
  summary:'Krótki opis opublikowanej historii.',
  content:'Pełna treść opublikowanego artykułu.',
  image_url:'/assets/test.jpg',
  image_alt:'Zdjęcie testowe',
  published_at:'2026-08-20T10:00:00.000Z',
  status:'published',
  ...overrides
});

const response=()=>({
  statusCode:200,
  headers:{},
  body:'',
  setHeader(name,value){this.headers[String(name).toLowerCase()]=value;},
  end(value){this.body=value;return this;}
});

const call=async(query='',method='GET')=>{
  const res=response();
  await search({method,query:{q:query},headers:{}},res);
  return {...res,json:JSON.parse(res.body)};
};

const rowsFetch=(rows,calls=[])=>async(url,options={})=>{
  calls.push({url:String(url),options});
  const parsed=new URL(url);
  const offset=Number(parsed.searchParams.get('offset')||0);
  const limit=Number(parsed.searchParams.get('limit')||500);
  return {ok:true,status:200,json:async()=>rows.slice(offset,offset+limit)};
};

const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const hasLoneSurrogate=value=>{
  for(let index=0;index<value.length;index+=1){
    const unit=value.charCodeAt(index);
    if(unit>=0xd800&&unit<=0xdbff){
      const next=value.charCodeAt(index+1);
      if(!(next>=0xdc00&&next<=0xdfff))return true;
      index+=1;
    }else if(unit>=0xdc00&&unit<=0xdfff){
      return true;
    }
  }
  return false;
};

const clientQuery=value=>{
  const input={value:''};
  const status={textContent:''};
  const results={replaceChildren(){}};
  let requestedUrl='';
  const elements={
    '[data-search-input]':input,
    '[data-search-status]':status,
    '[data-search-results]':results
  };

  vm.runInNewContext(read('search.js'),{
    window:{location:{search:`?q=${encodeURIComponent(value)}`}},
    document:{querySelector:selector=>elements[selector]||null},
    fetch:url=>{
      requestedUrl=String(url);
      return new Promise(()=>{});
    },
    URL,
    URLSearchParams,
    encodeURIComponent
  });

  return {query:input.value,requestedUrl};
};

(async()=>{
  try{
    console.error=()=>{};
    process.env.SUPABASE_URL='https://example.supabase.co/';
    process.env.SUPABASE_ANON_KEY='sb_publishable_search_test';
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    let fetchCount=0;
    global.fetch=async()=>{fetchCount+=1;throw new Error('fetch should not run');};

    let res=await call('test','POST');
    assert.equal(res.statusCode,405);
    assert.equal(res.headers.allow,'GET');
    assert.equal(fetchCount,0);

    res=await call('');
    assert.deepEqual(res.json,{query:'',count:0,results:[]});
    res=await call('   \n\t  ');
    assert.deepEqual(res.json,{query:'',count:0,results:[]});
    assert.equal(fetchCount,0);

    const calls=[];
    global.fetch=rowsFetch([article({title:'Historia bramy',content:'Sekret znajduje się w piwnicy.'})],calls);
    res=await call('bramy');
    assert.equal(res.statusCode,200);
    assert.equal(res.json.count,1);
    assert.equal(res.json.results[0].slug,'opublikowany-artykul');
    assert.equal(Object.hasOwn(res.json.results[0],'content'),false);
    assert.equal(res.headers['cache-control'],'private, no-store');
    assert.match(res.headers['content-type'],/^application\/json/);
    assert.match(calls[0].url,/select=title,slug,section,section_slug,summary,content,image_url,image_alt,published_at,status/);
    assert.match(calls[0].url,/status=eq\.published/);
    assert.match(calls[0].url,/published_at=not\.is\.null/);
    assert.equal(new URL(calls[0].url).searchParams.get('order'),'published_at.desc,slug.asc');
    assert.match(calls[0].url,/limit=500/);
    assert.match(calls[0].url,/offset=0/);

    global.fetch=rowsFetch([
      article({title:'Szkic sekret',slug:'szkic',status:'draft'}),
      article({title:'Recenzja sekret',slug:'recenzja',status:'review'}),
      article({title:'Archiwum sekret',slug:'archiwum',status:'archived'}),
      article({title:'Bez daty sekret',slug:'bez-daty',published_at:null}),
      article({title:'Brak tytułu sekret',slug:'brak-tytulu',title:' '}),
      article({title:'Brak sluga sekret',slug:''}),
      article({title:'Jawny sekret',slug:'jawny-sekret'})
    ]);
    res=await call('sekret');
    assert.deepEqual(res.json.results.map(item=>item.slug),['jawny-sekret']);

    global.fetch=rowsFetch([
      article({title:'Latarnia',slug:'tytul',summary:'Bez frazy.',content:'Bez frazy.',published_at:'2026-08-01T10:00:00Z'}),
      article({title:'Inny tekst',slug:'opis',summary:'Latarnia w opisie.',content:'Bez frazy.',published_at:'2026-08-25T10:00:00Z'}),
      article({title:'Jeszcze inny',slug:'tresc',summary:'Bez frazy.',content:'Latarnia w treści.',published_at:'2026-08-26T10:00:00Z'})
    ]);
    res=await call('latarnia');
    assert.deepEqual(res.json.results.map(item=>item.slug),['tytul','opis','tresc']);
    assert.match(res.json.results[1].snippet,/Latarnia w opisie/);
    assert.match(res.json.results[2].snippet,/Latarnia w treści/);

    global.fetch=rowsFetch([
      article({title:'Pierwszy',slug:'starszy',content:'Wspólny motyw.',published_at:'2026-08-20T10:00:00Z'}),
      article({title:'Drugi',slug:'nowszy',content:'Wspólny motyw.',published_at:'2026-08-21T10:00:00Z'})
    ]);
    res=await call('wspólny');
    assert.deepEqual(res.json.results.map(item=>item.slug),['nowszy','starszy']);

    global.fetch=rowsFetch([
      article({title:'Remis C',slug:'remis-c',content:'Wspólny motyw.'}),
      article({title:'Remis A',slug:'remis-a',content:'Wspólny motyw.'}),
      article({title:'Remis B',slug:'remis-b',content:'Wspólny motyw.'})
    ]);
    res=await call('wspólny');
    assert.deepEqual(res.json.results.map(item=>item.slug),['remis-a','remis-b','remis-c']);

    global.fetch=rowsFetch([
      article({title:'Zażółć gęślą jaźń',slug:'polskie-znaki',summary:'Zażółć także w opisie.'}),
      article({title:'Łódź',slug:'lodz',summary:'Łódź zachowała swój charakter.'}),
      article({title:'Świdnica',slug:'swidnica',summary:'Świdnica zachowała swój charakter.'}),
      article({title:'Kamienica pod numerem 82',slug:'wielkosc-liter'}),
      article({title:'Inny tytuł',slug:'biale-znaki',summary:'Stara brama nadal stoi.'})
    ]);
    res=await call('zazolc');
    assert.equal(res.json.results[0].slug,'polskie-znaki');
    assert.match(res.json.results[0].snippet,/Zażółć/);
    res=await call('ŻÓŁĆ');
    assert.equal(res.json.results[0].slug,'polskie-znaki');
    res=await call('lodz');
    assert.equal(res.json.results[0].slug,'lodz');
    res=await call('S\u0301widnica');
    assert.equal(res.json.results[0].slug,'swidnica');
    assert.match(res.json.results[0].snippet,/Świdnica/);
    res=await call('KAMIENICA');
    assert.equal(res.json.results[0].slug,'wielkosc-liter');
    res=await call('  stara   brama  ');
    assert.equal(res.json.results[0].slug,'biale-znaki');

    const specials=['%', '(', ')', ',', '?', "'", '"'];
    for(const special of specials){
      global.fetch=rowsFetch([article({title:`Znak ${special} test`,slug:`znak-${special.charCodeAt(0)}`})]);
      res=await call(special);
      assert.equal(res.json.count,1,`special character ${JSON.stringify(special)}`);
    }

    const longQuery='a'.repeat(121);
    global.fetch=rowsFetch([article({title:'a'.repeat(120),slug:'limit-zapytania'})]);
    res=await call(longQuery);
    assert.equal(res.json.query.length,120);
    assert.equal(res.json.results[0].slug,'limit-zapytania');

    const boundary119Emoji=`${'a'.repeat(119)}😀`;
    global.fetch=rowsFetch([article({title:boundary119Emoji,slug:'emoji-na-granicy'})]);
    res=await call(boundary119Emoji);
    assert.equal(res.json.query,boundary119Emoji);
    assert.equal(Array.from(res.json.query).length,120);
    assert.equal(hasLoneSurrogate(res.json.query),false);
    assert.doesNotThrow(()=>encodeURIComponent(res.json.query));

    const boundary120Emoji=`${'a'.repeat(120)}😀`;
    global.fetch=rowsFetch([article({title:'a'.repeat(120),slug:'emoji-odciete'})]);
    res=await call(boundary120Emoji);
    assert.equal(res.json.query,'a'.repeat(120));
    assert.equal(Array.from(res.json.query).length,120);
    assert.equal(hasLoneSurrogate(res.json.query),false);

    const boundaryWithTail=`${boundary119Emoji}dalszy tekst`;
    global.fetch=rowsFetch([article({title:boundary119Emoji,slug:'emoji-przed-tekstem'})]);
    res=await call(boundaryWithTail);
    assert.equal(res.json.query,boundary119Emoji);
    assert.equal(hasLoneSurrogate(res.json.query),false);
    assert.doesNotThrow(()=>encodeURIComponent(res.json.query));

    let clientBoundary=clientQuery(boundary119Emoji);
    assert.equal(clientBoundary.query,boundary119Emoji);
    assert.equal(decodeURIComponent(clientBoundary.requestedUrl.split('q=')[1]),boundary119Emoji);
    assert.equal(hasLoneSurrogate(clientBoundary.query),false);
    clientBoundary=clientQuery(boundary120Emoji);
    assert.equal(clientBoundary.query,'a'.repeat(120));
    assert.equal(hasLoneSurrogate(clientBoundary.query),false);

    global.fetch=rowsFetch(Array.from({length:45},(_,index)=>article({
      title:`Wynik limit ${index}`,
      slug:`wynik-${index}`,
      published_at:new Date(Date.UTC(2026,7,index+1)).toISOString()
    })));
    res=await call('wynik limit');
    assert.equal(res.json.count,40);
    assert.equal(res.json.results.length,40);

    global.fetch=async()=>({ok:false,status:500,json:async()=>({})});
    res=await call('awaria');
    assert.equal(res.statusCode,502);
    assert.equal(res.headers['cache-control'],'private, no-store');

    const sameTimestamp='2026-08-20T10:00:00.000Z';
    const stableCorpus=Array.from({length:1001},(_,index)=>article({
      title:`Stabilna paginacja ${index}`,
      slug:`stabilny-${String(1000-index).padStart(4,'0')}`,
      published_at:sameTimestamp
    }));
    const stableCalls=[];
    const stablePages=[];
    global.fetch=async(url,options={})=>{
      stableCalls.push({url:String(url),options});
      const parsed=new URL(url);
      const offset=Number(parsed.searchParams.get('offset')||0);
      const limit=Number(parsed.searchParams.get('limit')||500);
      const ordered=[...stableCorpus].sort((left,right)=>left.slug<right.slug?-1:left.slug>right.slug?1:0);
      const page=ordered.slice(offset,offset+limit);
      stablePages.push(page.map(item=>item.slug));
      return {ok:true,status:200,json:async()=>page};
    };
    const stableFetched=await search._private.fetchCorpus('https://example.supabase.co','sb_publishable_search_test');
    const expectedStableSlugs=[...stableCorpus].map(item=>item.slug).sort();
    assert.deepEqual(stableFetched.map(item=>item.slug),expectedStableSlugs);
    assert.equal(new Set(stableFetched.map(item=>item.slug)).size,1001);
    assert.equal(stablePages[0].length,500);
    assert.equal(stablePages[1].length,500);
    assert.equal(new Set([...stablePages[0],...stablePages[1]]).size,1000);
    assert.ok(stableCalls.every(call=>new URL(call.url).searchParams.get('order')==='published_at.desc,slug.asc'));

    for(const size of [0,1,499,500,501,1999]){
      const boundaryCorpus=Array.from({length:size},(_,index)=>article({
        title:`Granica ${size} rekord ${index}`,
        slug:`granica-${size}-${index}`
      }));
      global.fetch=rowsFetch(boundaryCorpus);
      const fetched=await search._private.fetchCorpus('https://example.supabase.co','sb_publishable_search_test');
      assert.equal(fetched.length,size,`corpus boundary ${size}`);
    }

    const exactCorpus=Array.from({length:2000},(_,index)=>article({
      title:`Korpus ${index}`,
      slug:`korpus-${index}`
    }));
    const exactCalls=[];
    global.fetch=rowsFetch(exactCorpus,exactCalls);
    res=await call('korpus');
    assert.equal(res.statusCode,200);
    assert.equal(res.json.count,40);
    assert.deepEqual(exactCalls.map(call=>Number(new URL(call.url).searchParams.get('offset'))),[0,500,1000,1500,2000]);

    const corpusPage=Array.from({length:500},(_,index)=>article({title:`Korpus ${index}`,slug:`korpus-${index}`}));
    global.fetch=async url=>{
      const parsed=new URL(url);
      const offset=Number(parsed.searchParams.get('offset'));
      if(offset<2000)return {ok:true,json:async()=>corpusPage};
      return {ok:true,json:async()=>[article({title:'Nadmiar',slug:'nadmiar'})]};
    };
    res=await call('korpus');
    assert.equal(res.statusCode,503);
    assert.deepEqual(res.json,{error:'Wyszukiwanie jest chwilowo niedostępne.'});

    const authCalls=[];
    process.env.SUPABASE_SECRET_KEY='sb_secret_must_not_be_used';
    process.env.SUPABASE_SERVICE_ROLE_KEY='legacy-service-role-must-not-be-used';
    global.fetch=rowsFetch([article({title:'Publiczny wynik'})],authCalls);
    res=await call('publiczny');
    assert.equal(res.statusCode,200);
    assert.equal(authCalls[0].options.headers.apikey,'sb_publishable_search_test');
    assert.equal(authCalls[0].options.headers.authorization,undefined);
    assert.doesNotMatch(read('api/search.js'),/SUPABASE_(?:SECRET_KEY|SERVICE_ROLE_KEY)/);

    const html=read('search.html');
    assert.match(html,/<form[^>]+action="\/search\.html"[^>]+method="get"/i);
    assert.match(html,/<input[^>]+name="q"[^>]+type="search"[^>]+maxlength="120"/i);
    assert.match(html,/search\.css\?v=1/);
    assert.match(html,/search\.js\?v=1/);
    assert.match(html,/<meta[^>]+name="robots"[^>]+content="noindex,nofollow,noarchive"/i);
    assert.match(html,/aria-live="polite"/i);

    for(const file of ['index.html','archive.html','section.html','article.html','search.html']){
      assert.match(read(file),/href="\/search\.html"[^>]*>Szukaj<\/a>/,`${file} search nav link`);
    }
    assert.match(read('api/article.js'),/href="\/search\.html">Szukaj<\/a>/);

    const client=read('search.js');
    assert.match(client,/const truncateQuery=\(value,maxCodePoints\)=>Array\.from\(String\(value\|\|''\)\)\.slice\(0,maxCodePoints\)\.join\(''\)/);
    assert.doesNotMatch(client,/\.slice\(0,\s*120\)/);
    assert.doesNotMatch(read('api/search.js'),/\.slice\(0,\s*120\)/);
    assert.match(client,/`\/a\/\$\{encodeURIComponent\(String\(item\.slug\|\|''\)\)\}`/);
    assert.doesNotMatch(client,/innerHTML/);
    assert.match(client,/snippet\.textContent=/);
    assert.match(client,/titleLink\.textContent=/);

    const middleware=read('middleware.ts');
    assert.doesNotMatch(middleware,/['"]\/search\.html['"]/);
    assert.doesNotMatch(middleware,/['"]\/api\/search['"]/);
    assert.doesNotMatch(read('sitemap.xml'),/search\.html|api\/search/);
    assert.doesNotMatch(read('sw.js'),/search\.html|search\.js|search\.css|api\/search/);

    const audit=read('scripts/audit-site.mjs');
    assert.match(audit,/publicPages=\[[^\]]*'search\.html'/);
    assert.match(read('scripts/run-tests.mjs'),/\^test-\.\*\\\.cjs\$/);
    assert.ok(fs.readdirSync(__dirname).includes('test-search.cjs'));

    console.log('OK: gated published-only search API, relevance, Unicode, corpus guard i bezpieczny klient są pokryte testami.');
  }finally{
    global.fetch=originalFetch;
    console.error=originalError;
    for(const [name,value] of Object.entries(originalEnv)){
      if(value===undefined)delete process.env[name];
      else process.env[name]=value;
    }
  }
})().catch(error=>{
  console.error(error);
  process.exit(1);
});

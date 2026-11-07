// Read-only smoke checks; no login, cookies, editorial writes or newsletters.
const assert=require('node:assert/strict');
const origin=process.env.K82_TEST_ORIGIN||'https://kronika82.vercel.app';
(async()=>{
 for(const ua of ['Mozilla/5.0','WhatsApp/2.24.1','facebookexternalhit/1.1','Facebot']){
  for(const slug of ['schody-w-naprawie','mlodociany-wyjadacz-owocow']){
   const r=await fetch(origin+'/s/'+slug,{redirect:'manual',headers:{'user-agent':ua}});const html=await r.text();assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/text\/html/);assert.match(r.headers.get('cache-control'),/no-store/);
   for(const tag of ['title','description','image','url'])assert.match(html,new RegExp('property="og:'+tag+'" content="[^"]+"'));
   assert.match(html,/summary_large_image/);assert.ok(html.includes('https://kronika82.vercel.app/s/'+slug));assert.ok(!html.includes('article-body'));assert.ok(!/sb_secret_|service_role|SUPABASE_|kronika82_access/.test(html));assert.equal(r.headers.get('location'),null);
   const image=html.match(/property="og:image" content="([^"]+)"/)[1].replace(/&amp;/g,'&');const ir=await fetch(image,{method:'HEAD'});assert.equal(ir.status,200);assert.match(ir.headers.get('content-type'),/^image\//);
   console.log(ua,slug,'200 OG; image 200');
  }
  for(const route of ['/a/schody-w-naprawie','/a/test.png','/article.html?slug=schody-w-naprawie']){const r=await fetch(origin+route,{redirect:'manual',headers:{'user-agent':ua}});assert.equal(r.status,303);assert.match(r.headers.get('location'),/wejscie.html/);}
  for(const route of ['/api/article?slug=schody-w-naprawie','/api/search?q=schody']){const r=await fetch(origin+route,{redirect:'manual',headers:{'user-agent':ua}});assert.equal(r.status,401);}
 }
 const missing=await fetch(origin+'/s/__missing_share_audit__');assert.equal(missing.status,404);assert.ok(!(await missing.text()).includes('og:'));
 const head=await fetch(origin+'/s/schody-w-naprawie',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
 const post=await fetch(origin+'/s/schody-w-naprawie',{method:'POST'});assert.equal(post.status,405);
 const direct=await fetch(origin+'/api/share?slug=schody-w-naprawie');assert.equal(direct.status,200);
 const fallback=await fetch(origin+'/assets/og-image.png',{method:'HEAD'});assert.equal(fallback.status,200);assert.match(fallback.headers.get('content-type'),/^image\//);
 console.log('PASS: production GET/HEAD/POST, missing 404, public images, crawler parity, protected redirect/401 and no body/secret markers.');
})().catch(error=>{console.error(error);process.exitCode=1;});

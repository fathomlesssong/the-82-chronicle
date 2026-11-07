const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const handler=require('../api/share');const {metadata,fallback}=require('../share-meta');
process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_ANON_KEY='sb_publishable_test';process.env.SUPABASE_SECRET_KEY='NEVER-LEAK-SECRET';process.env.KRONIKA_ACCESS_PASSWORD='test-password';
const sample={slug:'stary-slug',title:'Tytuł " & <script>alert(1)</script>',summary:'Lead\n artykułu',image_url:'/assets/schody.png?v=1',status:'published',content:'PRIVATE-BODY'};
let rows=[sample];let called=0;let broken=false;
global.fetch=async(url,options)=>{called++;const u=new URL(url);assert.equal(u.searchParams.get('status'),'eq.published');assert.equal(u.searchParams.get('select'),'title,summary,image_url,slug,status');assert.equal(u.searchParams.get('slug'),'eq.stary-slug');assert.ok(!JSON.stringify(options).includes('NEVER-LEAK'));assert.equal(options.headers.apikey,'sb_publishable_test');return {ok:!broken,json:async()=>rows};};
async function call(method='GET',slug='stary-slug'){
 const r={headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=body;}};
 await handler({method,query:{slug}},r);return r;
}
(async()=>{
 let r=await call();assert.equal(r.statusCode,200);assert.match(r.body,/property="og:title"/);assert.match(r.body,/property="og:description" content="Lead artykułu"/);assert.match(r.body,/https:\/\/kronika82.vercel.app\/s\/stary-slug/);assert.match(r.body,/summary_large_image/);assert.match(r.body,/&lt;script&gt;/);assert.ok(!r.body.includes('PRIVATE-BODY'));assert.ok(!r.body.includes('NEVER-LEAK'));assert.equal(r.headers['cache-control'],'private, no-store');assert.ok(!r.headers.location);assert.match(r.body,/href="\/a\/stary-slug"/);
 r=await call('HEAD');assert.equal(r.statusCode,200);assert.equal(r.body,'');
 for(const status of ['draft','review','archived',null]){rows=[{...sample,status}];r=await call();assert.equal(r.statusCode,404);assert.ok(!r.body.includes('og:'));assert.ok(!r.body.includes(sample.title));}
 rows=[];assert.equal((await call()).statusCode,404);rows=[{...sample,slug:'different'}];assert.equal((await call()).statusCode,404);
 rows=[sample];broken=true;assert.equal((await call()).statusCode,502);broken=false;
 const before=called;for(const slug of ['',null,['stary-slug'], '../admin','x/y','x?select=*'])assert.equal((await call('GET',slug)).statusCode,404);assert.equal(called,before);
 assert.equal((await call('POST')).statusCode,405);
 assert.equal(metadata(sample).image,'https://kronika82.vercel.app/assets/schody.png?v=1');
 for(const image_url of ['javascript:alert(1)','https://evil.test/photo.png','//evil.test/a','/api/article','/assets/a.png?token=secret','https://example.supabase.co/storage/v1/object/sign/article-images/a?token=secret'])assert.equal(metadata({...sample,image_url},process.env.SUPABASE_URL).image,fallback);
 assert.equal(metadata({...sample,image_url:'https://example.supabase.co/storage/v1/object/public/article-images/a.webp'},process.env.SUPABASE_URL).image,'https://example.supabase.co/storage/v1/object/public/article-images/a.webp');
 const source=fs.readFileSync(require.resolve('../middleware.ts'),'utf8').replace("import { next } from '@vercel/functions';","const next=()=>new Response('NEXT');").replace('export const config=','const config=').replace('export default async function middleware','async function middleware')+'\nthis.run=middleware;';
 const context={Response,URL,TextEncoder,Uint8Array,crypto:require('node:crypto').webcrypto,process};vm.runInNewContext(source,context);
 for(const ua of ['Mozilla/5.0','WhatsApp/2.24.1','facebookexternalhit/1.1','Facebot']){
  for(const path of ['/a/stary-slug','/a/secret.png','/article.html?slug=stary-slug','/search.html']){r=await context.run(new Request('https://kronika82.vercel.app'+path,{headers:{'user-agent':ua}}));assert.equal(r.status,303);assert.match(r.headers.get('location'),/wejscie.html/);}
  for(const path of ['/api/article?slug=stary-slug','/api/search','/api/secret.js'])assert.equal((await context.run(new Request('https://kronika82.vercel.app'+path,{headers:{'user-agent':ua}}))).status,401);
  for(const path of ['/s/stary-slug','/api/share?slug=stary-slug','/assets/og-image.png'])assert.equal(await (await context.run(new Request('https://kronika82.vercel.app'+path,{headers:{'user-agent':ua}}))).text(),'NEXT');
 }
 const token=require('node:crypto').createHmac('sha256','test-password').update('kronika82-access-v1').digest('hex');assert.equal(await (await context.run(new Request('https://kronika82.vercel.app/a/stary-slug',{headers:{cookie:'kronika82_access='+token}}))).text(),'NEXT');
 console.log('OK: share metadata, draft/archived/missing denial, query allowlist, XSS, image allowlist, HTTP methods, no-store, UA-independent auth, valid reader cookie.');
})().catch(e=>{console.error(e);process.exitCode=1;});

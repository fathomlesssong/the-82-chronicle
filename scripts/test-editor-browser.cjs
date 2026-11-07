const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve(__dirname,'../node_modules/.cache/ms-playwright');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..');
const origin=process.env.K82_TEST_ORIGIN||'http://127.0.0.1';
const remote=origin!=='http://127.0.0.1';
const verifiedAssets=new Set();
const mock=`(()=>{
const session={user:{id:'test-author',email:'author@example.test'},access_token:'DO-NOT-STORE'};
let callback;window.emitAuth=()=>callback('SIGNED_IN',session);
window.uploads=[];window.saveStatus='published';window.saveSlug='test-published';
const db={auth:{onAuthStateChange:fn=>{callback=fn;},getSession:async()=>({data:{session}}),signOut:async()=>callback('SIGNED_OUT',null)},from:table=>{
 const q={select(){return q},order(){return q},eq(){return q},update(){return q},insert(){return q},single:async()=>window.failSave?{error:new Error('Test save failure')}:{data:{id:'saved-article',slug:window.saveSlug,status:window.saveStatus}},maybeSingle:async()=>({data:{id:'test-author',role:'admin',active:true}}),then(resolve){return Promise.resolve({data:[],error:null}).then(resolve)}};return q;
},storage:{from:()=>({upload:async(p,f)=>{window.uploads.push({p,name:f.name,size:f.size});return (window.failUpload||(window.failGallery&&p.includes('/gallery/')))?{error:new Error('Test upload failure')}:{error:null}},getPublicUrl:p=>({data:{publicUrl:'https://example.test/'+p}}),remove:async()=>({})})}};
window.CH82_SUPABASE={url:'https://example.test',anonKey:'public-test'};window.supabase={createClient:()=>db};
})();`;
(async()=>{
 const profile=fs.mkdtempSync(path.join(root,'node_modules/.cache/k82-test-'));let context;
 async function launch(){context=await chromium.launchPersistentContext(profile,{headless:true});await context.route('**/*',async route=>{
 const u=new URL(route.request().url());
 if(u.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'text/javascript',body:mock});
 if(u.pathname==='/supabase-config.js')return route.fulfill({contentType:'text/javascript',body:''});
 if(u.origin!==origin)return route.abort();
 if(u.pathname==='/a/test-published')return route.fulfill({contentType:'text/html',body:'<h1>Published</h1>'});
 if(u.pathname==='/api/newsletter-send')return route.fulfill({status:await route.request().frame().evaluate(()=>window.newsletterSuccess)?200:500,contentType:'application/json',body:await route.request().frame().evaluate(()=>JSON.stringify(window.newsletterSuccess?{message:'Test newsletter success'}:{error:'Test newsletter failure'}))});
 if(route.request().method()!=='GET')throw new Error('Unexpected real mutation request');
 const name=u.pathname==='/'?'admin-article.html':u.pathname.slice(1);const f=path.join(root,name);
 if(remote&&['admin-article.html','admin-article.js','editor-drafts.js'].includes(name)){
 const response=await route.fetch();assert.equal(response.status(),200);const body=await response.body();assert.deepEqual(body,fs.readFileSync(f),'Deployed asset differs: '+name);verifiedAssets.add(name);return route.fulfill({response,body});
 }
 if(!fs.existsSync(f))return route.fulfill({status:404,body:''});
 return route.fulfill({body:fs.readFileSync(f),contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.html')?'text/html':'text/css'});
 });return context.pages()[0];}
 async function ready(page){await page.goto(origin+'/admin-article.html');await page.waitForFunction(()=>!document.querySelector('[data-admin-shell]').hidden&&!document.querySelector('[data-article-form]').inert);}
 async function saved(page){await page.waitForFunction(()=>document.querySelector('[data-draft-status]').textContent.startsWith('Zapisano'));}
 try{
 let page=await launch();const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
 await page.locator('[data-article-form] [name=title]').fill('Szkic regresyjny');await page.locator('[name=content]').fill('Treść przed zmianą karty');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
 await page.locator('[name=image]').setInputFiles({name:'main.png',mimeType:'image/png',buffer:png});
 await page.locator('[data-gallery-input]').setInputFiles({name:'gallery.png',mimeType:'image/png',buffer:png});
 await page.locator('[data-gallery-caption]').fill('Podpis odzyskany');await page.locator('[data-gallery-credit]').fill('Autor zdjęcia');await saved(page);
 const other=await context.newPage();await other.goto(origin+'/');await other.bringToFront();await page.bringToFront();await page.evaluate(()=>{window.emitAuth();window.emitAuth();});
 await page.waitForTimeout(100);assert.equal(await page.locator('[name=content]').inputValue(),'Treść przed zmianą karty');assert.equal(await page.locator('[data-gallery-caption]').inputValue(),'Podpis odzyskany');
 await page.reload();await page.waitForFunction(()=>document.querySelector('[data-draft-status]').textContent.includes('Odzyskano'));
 assert.equal(await page.locator('[name=content]').inputValue(),'Treść przed zmianą karty');assert.match(await page.locator('[data-restored-main]').textContent(),/main.png/);assert.equal(await page.locator('[data-gallery-caption]').inputValue(),'Podpis odzyskany');
 const records=await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('ch82-editor-drafts',1);r.onsuccess=()=>{const q=r.result.transaction('drafts').objectStore('drafts').getAll();q.onsuccess=async()=>{resolve(await Promise.all(q.result.filter(x=>!x.completed).map(async x=>({fields:x.snapshot.fields,main:[...new Uint8Array(await x.snapshot.main.blob.arrayBuffer())],gallery:[...new Uint8Array(await x.snapshot.gallery[0].file.blob.arrayBuffer())]}))));r.result.close();};};r.onerror=()=>reject(r.error);}));
 assert.deepEqual(records[0].main,[...png]);assert.deepEqual(records[0].gallery,[...png]);assert.ok(!JSON.stringify(records).includes('DO-NOT-STORE'));
 await other.close();await context.close();page=await launch();await ready(page);await page.waitForFunction(()=>document.querySelector('[data-draft-status]').textContent.includes('Odzyskano'));assert.equal(await page.locator('[data-gallery-credit]').inputValue(),'Autor zdjęcia');
 // Two tabs editing the same loaded revision must retain both variants.
 const parallel=await context.newPage();await ready(parallel);await parallel.locator('[name=content]').fill('Wersja drugiej karty');await saved(parallel);
 await page.locator('[name=content]').fill('Wersja pierwszej karty');await page.waitForFunction(()=>document.querySelector('[data-draft-status]').textContent.includes('osobną kopię'));
 await page.locator('[data-refresh-drafts]').click();await page.waitForFunction(()=>document.querySelector('[data-draft-picker]').options.length===3);assert.equal(await page.locator('[data-draft-picker] option').count(),3);
 // Failed upload preserves current data; successful publish clears only this fork.
 await page.locator('[name=summary]').fill('Lead testowy');await saved(page);
 await page.evaluate(()=>{window.failUpload=true;});
 await page.locator('[data-save-status=published]').click();
 await page.waitForFunction(()=>document.querySelector('[data-form-status]').textContent.includes('Test upload failure'));
 assert.equal(await page.locator('[name=content]').inputValue(),'Wersja pierwszej karty');
 await page.evaluate(()=>{window.failUpload=false;window.failGallery=true;});
 await page.locator('[data-save-status=published]').click();
 await page.waitForFunction(()=>document.querySelector('[data-form-status]').textContent.includes('dodatkowe zdjęcia nie zostały zapisane'));
 await page.reload();await page.waitForFunction(()=>document.querySelector('[data-draft-status]').textContent.includes('Odzyskano'));
 assert.equal(await page.locator('[data-gallery-caption]').inputValue(),'Podpis odzyskany');
 // Server publication confirmation failure must keep the draft and editor.
 await page.evaluate(()=>{window.saveStatus='draft';});
 await page.locator('[data-save-status=published]').click();
 await page.waitForFunction(()=>document.querySelector('[data-form-status]').textContent.includes('nie potwierdzono publikacji'));
 assert.equal(await page.locator('[name=content]').inputValue(),'Wersja pierwszej karty');
 await page.evaluate(()=>{window.saveStatus='published';window.saveSlug='';});
 await page.locator('[data-save-status=published]').click();
 await page.waitForFunction(()=>document.querySelector('[data-form-status]').textContent.includes('nie potwierdzono publikacji'));
 await page.evaluate(()=>{window.saveSlug='test-published';window.failSave=true;});
 await page.locator('[data-save-status=published]').click();
 await page.waitForFunction(()=>document.querySelector('[data-form-status]').textContent.includes('Test save failure'));
 await page.evaluate(()=>{window.failSave=false;});
 await page.locator('[data-send-newsletter]').check();
 await page.locator('[data-save-status=published]').click();
 await page.waitForFunction(()=>document.querySelector('[data-form-status]').textContent.includes('newsletter nie został wysłany'));
 assert.equal(await page.locator('[name=content]').inputValue(),'Wersja pierwszej karty');
 await page.locator('[data-refresh-drafts]').click();
 await page.waitForFunction(()=>document.querySelector('[data-draft-picker]').options.length===3);
 assert.equal(await page.locator('[data-draft-picker] option').count(),3);
 await page.evaluate(()=>{window.newsletterSuccess=true;});
 // The unchanged production image pipeline must still upload 1600x1200 WebP.
 const uploaded=await page.evaluate(()=>window.uploads);
 assert.ok(uploaded.some(x=>x.name.endsWith('-1600x1200.webp')));
 await page.locator('[data-save-status=published]').click();
 await page.waitForURL('**/a/test-published');
 const remaining=await page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('ch82-editor-drafts');r.onsuccess=()=>{const q=r.result.transaction('drafts').objectStore('drafts').getAll();q.onsuccess=()=>{resolve(q.result.filter(x=>!x.completed).map(x=>x.snapshot.fields.content));r.result.close();};};}));
 assert.deepEqual(remaining,['Wersja drugiej karty']);
 // Saving as a server draft retains local recovery and does not redirect.
 await ready(page);
 await page.locator('[data-reset-form]').click();
 await page.locator('[data-article-form] [name=title]').fill('Server draft');
 await page.locator('[name=summary]').fill('Draft summary');
 await page.locator('[name=content]').fill('Server draft retained');
 await page.locator('[data-save-status=draft]').click();
 await page.waitForFunction(()=>document.querySelector('[data-form-status]').textContent==='Artykuł zapisany jako szkic.');
 await page.locator('[data-refresh-drafts]').click();
 await page.waitForFunction(()=>document.querySelector('[data-draft-picker]').options.length===3);
 assert.equal(await page.locator('[data-draft-picker] option').count(),3);
 if(remote)assert.deepEqual([...verifiedAssets].sort(),['admin-article.html','admin-article.js','editor-drafts.js']);
 assert.deepEqual(errors,[]);
 console.log('OK: real Chromium tab/auth refocus, reload, browser reopen, exact main/gallery bytes, metadata, concurrent tabs, no token persistence.');
 }finally{await context?.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});

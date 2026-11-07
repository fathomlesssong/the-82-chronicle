const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve(__dirname,'../node_modules/.cache/ms-playwright');
const {chromium}=require('@playwright/test');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext();context.setDefaultTimeout(10000);const page=await context.newPage();
  await context.route('**/*',route=>{const url=new URL(route.request().url());
   if(url.pathname==='/front-final.css')return route.fulfill({contentType:'text/css',body:fs.readFileSync(path.join(__dirname,'../front-final.css'),'utf8')});
   if(url.pathname==='/article-share.js'||url.pathname==='/share-redirect.js')return route.fulfill({contentType:'text/javascript; charset=utf-8',body:fs.readFileSync(path.join(__dirname,'..',url.pathname.slice(1)),'utf8')});
   if(url.pathname.startsWith('/s/'))return route.fulfill({contentType:'text/html; charset=utf-8',body:'<a id="read-article" href="/a/stary-slug">Czytaj</a><script src="/share-redirect.js"></script>'});
   return route.fulfill({contentType:'text/html; charset=utf-8',body:'<header class="article-header"><h1>Tytuł testowy</h1></header><script src="/article-share.js"></script>'});
  });
  await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>window.copied=value}});Object.defineProperty(navigator,'share',{value:async value=>window.shared=value});});
  for(const route of ['/a/stary-slug','/article.html?slug=stary-slug']){
   await page.goto('https://kronika82.vercel.app'+route);await page.getByRole('button',{name:'Kopiuj link'}).click();assert.equal(await page.evaluate(()=>window.copied),'https://kronika82.vercel.app/s/stary-slug');
  }
  const title='Zażółć „koty” & <img src=x onerror=alert(1)> 🐈';
  const slug='żółć & "koty"/100%?';
  const publicUrl='https://kronika82.vercel.app/s/'+encodeURIComponent(slug);
  for(const width of [390,1280]){
   await page.setViewportSize({width,height:800});
   for(const legacy of [false,true]){
    await page.goto('https://kronika82.vercel.app'+(legacy?'/article.html?slug='+encodeURIComponent(slug):'/a/'+encodeURIComponent(slug)));
    // Recreate the delayed header used by legacy article.js; mount must wait for it.
    await page.evaluate(({title,legacy})=>{
     document.body.replaceChildren();
     const css=document.createElement('link');css.rel='stylesheet';css.href='/front-final.css';document.head.append(css);
     const header=document.createElement('header');header.className='article-header';
     const h1=document.createElement('h1');h1.textContent=title;header.append(h1);
     if(!legacy)document.body.append(header);
     const script=document.createElement('script');script.src='/article-share.js';document.body.append(script);
     if(legacy)script.onload=()=>setTimeout(()=>document.body.append(header),20);
    },{title,legacy});
    const wa=page.getByRole('link',{name:'WhatsApp',exact:true});
    await wa.waitFor();
    const href=await wa.getAttribute('href');
    assert.equal(href,'https://wa.me/?text='+encodeURIComponent(title+'\n'+publicUrl));
    assert.equal(new URL(href).searchParams.get('text'),title+'\n'+publicUrl);
    assert.ok(!href.includes('/a/'));assert.equal(await wa.getAttribute('rel'),'noopener noreferrer');
    assert.equal(await wa.locator('svg[aria-hidden="true"]').count(),1);
    assert.equal(await page.locator('[data-share-actions] img').count(),0);
    assert.equal(await page.locator('[data-share-actions]').count(),1);
    assert.equal(await page.locator('[data-share-actions] a, [data-share-actions] button').count(),2);
    assert.equal(await page.getByRole('status').textContent(),'');
    const copy=page.getByRole('button',{name:'Kopiuj link'});
    await wa.focus();await page.keyboard.press('Tab');assert.equal(await copy.evaluate(el=>el===document.activeElement),true);
    const copyBox=await copy.boundingBox();assert.ok(copyBox.height>=44&&copyBox.x+copyBox.width<=width);
    await wa.focus();assert.equal(await wa.evaluate(el=>el===document.activeElement),true);
    await page.waitForFunction(()=>['flex','inline-flex'].includes(getComputedStyle(document.querySelector('.share-whatsapp')).display));
    const box=await wa.boundingBox();assert.ok(box.height>=44&&box.x>=0&&box.x+box.width<=width);
    await context.route('https://wa.me/**',route=>route.fulfill({body:'WhatsApp destination intercepted; no message sent'}));
    const popupPromise=context.waitForEvent('page');await wa.press('Enter');const popup=await popupPromise;
    await popup.waitForLoadState();assert.equal(popup.url(),href);await popup.close();
    await page.getByRole('button',{name:'Kopiuj link'}).click();assert.equal(await page.evaluate(()=>window.copied),publicUrl);
   }
  }
  for(const mode of ['missing','denied']){
   await page.evaluate(mode=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='missing'?undefined:{writeText:async()=>{throw new Error('denied')}}}),mode);
   await page.getByRole('button',{name:'Kopiuj link'}).press('Enter');
   const manual=page.getByRole('textbox',{name:'Link do ręcznego skopiowania'});
   assert.equal(await manual.inputValue(),publicUrl);
   assert.equal(await manual.evaluate(el=>el===document.activeElement&&el.selectionEnd===el.value.length),true);
  }
  await page.goto('https://kronika82.vercel.app/s/stary-slug');await page.waitForURL('**/a/stary-slug');
  const noJS=await browser.newContext({javaScriptEnabled:false});const staticPage=await noJS.newPage();await staticPage.route('**/*',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<a id="read-article" href="/a/stary-slug">Czytaj</a><script src="/share-redirect.js"></script>'}));await staticPage.goto('https://kronika82.vercel.app/s/stary-slug');assert.equal(await staticPage.locator('a').getAttribute('href'),'/a/stary-slug');
  console.log('OK: Chromium WhatsApp/copy and manual fallback use /s in both article routes; browser redirect and no-JS link.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

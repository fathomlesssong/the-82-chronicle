const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve(__dirname,'../node_modules/.cache/ms-playwright');
const {chromium}=require('@playwright/test');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext();const page=await context.newPage();
  await context.route('**/*',route=>{const url=new URL(route.request().url());
   if(url.pathname==='/article-share.js'||url.pathname==='/share-redirect.js')return route.fulfill({contentType:'text/javascript; charset=utf-8',body:fs.readFileSync(path.join(__dirname,'..',url.pathname.slice(1)),'utf8')});
   if(url.pathname.startsWith('/s/'))return route.fulfill({contentType:'text/html; charset=utf-8',body:'<a id="read-article" href="/a/stary-slug">Czytaj</a><script src="/share-redirect.js"></script>'});
   return route.fulfill({contentType:'text/html; charset=utf-8',body:'<header class="article-header"><h1>Tytuł testowy</h1></header><script src="/article-share.js"></script>'});
  });
  await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>window.copied=value}});Object.defineProperty(navigator,'share',{value:async value=>window.shared=value});});
  for(const route of ['/a/stary-slug','/article.html?slug=stary-slug']){
   await page.goto('https://kronika82.vercel.app'+route);await page.getByRole('button',{name:'Kopiuj link'}).click();assert.equal(await page.evaluate(()=>window.copied),'https://kronika82.vercel.app/s/stary-slug');
   await page.getByRole('button',{name:'Udostępnij',exact:true}).click({timeout:2000});assert.deepEqual(await page.evaluate(()=>window.shared),{title:'Tytuł testowy',url:'https://kronika82.vercel.app/s/stary-slug'});
  }
  await page.goto('https://kronika82.vercel.app/s/stary-slug');await page.waitForURL('**/a/stary-slug');
  const noJS=await browser.newContext({javaScriptEnabled:false});const staticPage=await noJS.newPage();await staticPage.route('**/*',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<a id="read-article" href="/a/stary-slug">Czytaj</a><script src="/share-redirect.js"></script>'}));await staticPage.goto('https://kronika82.vercel.app/s/stary-slug');assert.equal(await staticPage.locator('a').getAttribute('href'),'/a/stary-slug');
  console.log('OK: Chromium native share/copy use /s in both article routes; browser redirect and no-JS link.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

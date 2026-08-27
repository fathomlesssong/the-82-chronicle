const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const skipQuoted=(source,start)=>{
  const quote=source[start];
  for(let index=start+1;index<source.length;index+=1){
    if(source[index]==='\\') index+=1;
    else if(source[index]===quote) return index+1;
  }
  throw new Error('Unterminated CSS string');
};

const skipComment=(source,start)=>{
  const end=source.indexOf('*/',start+2);
  if(end===-1) throw new Error('Unterminated CSS comment');
  return end+2;
};

const findOpeningBrace=(source,start)=>{
  for(let index=start;index<source.length;index+=1){
    if(source.startsWith('/*',index)) index=skipComment(source,index)-1;
    else if(source[index]==='"'||source[index]==="'") index=skipQuoted(source,index)-1;
    else if(source[index]==='{') return index;
  }
  throw new Error('Missing opening brace for @media');
};

const findClosingBrace=(source,openingBrace)=>{
  let depth=1;
  for(let index=openingBrace+1;index<source.length;index+=1){
    if(source.startsWith('/*',index)) index=skipComment(source,index)-1;
    else if(source[index]==='"'||source[index]==="'") index=skipQuoted(source,index)-1;
    else if(source[index]==='{') depth+=1;
    else if(source[index]==='}'&&--depth===0) return index;
  }
  throw new Error('Missing closing brace for @media');
};

const mediaBlocks=source=>{
  const blocks=[];
  for(let index=0;index<source.length;index+=1){
    if(source.startsWith('/*',index)) index=skipComment(source,index)-1;
    else if(source[index]==='"'||source[index]==="'") index=skipQuoted(source,index)-1;
    else if(source.startsWith('@media',index)){
      const openingBrace=findOpeningBrace(source,index+6);
      const closingBrace=findClosingBrace(source,openingBrace);
      blocks.push({
        query:source.slice(index+6,openingBrace).replace(/\s+/g,''),
        content:source.slice(openingBrace+1,closingBrace)
      });
    }
  }
  return blocks;
};

const mediaContents=(source,query)=>mediaBlocks(source)
  .filter(block=>block.query===query.replace(/\s+/g,''))
  .map(block=>block.content);

const assertCompactArticleLayout=source=>{
  const contents=mediaContents(source,'(min-width:901px)');
  assert.ok(contents.length>0,'required compact article media query is missing');
  assert.ok(contents.some(content=>/\.article-content--compact\s*\{/.test(content)),
    'compact article rules must be inside @media(min-width:901px)');
  assert.ok(contents.some(content=>/\.article-content--compact \.article-hero\s*\{\s*float:left/.test(content)),
    'compact article float must be inside @media(min-width:901px)');
  assert.ok(contents.some(content=>/\.article-content--compact \.article-hero img\s*\{[^}]*width:100%[^}]*height:auto[^}]*object-fit:contain/.test(content)),
    'compact article image must preserve full proportions inside desktop media query');
};

const validCompactCss='@media(min-width:901px){.article-content--compact{display:flow-root}.article-content--compact .article-hero{float:left}.article-content--compact .article-hero img{width:100%;height:auto;object-fit:contain}}';
const compactOutsideRequiredMedia='@media(min-width:901px){.unrelated{display:block}}.article-content--compact{display:flow-root}.article-content--compact .article-hero{float:left}.article-content--compact .article-hero img{width:100%;height:auto;object-fit:contain}';
const compactInWrongMedia='@media(min-width:901px){.unrelated{display:block}}@media(min-width:701px){.article-content--compact{display:flow-root}.article-content--compact .article-hero{float:left}.article-content--compact .article-hero img{width:100%;height:auto;object-fit:contain}}';

assert.doesNotThrow(()=>assertCompactArticleLayout(validCompactCss));
assert.match(compactOutsideRequiredMedia,/@media\(min-width:901px\).*?\.article-content--compact/s);
assert.throws(()=>assertCompactArticleLayout(compactOutsideRequiredMedia),/compact article rules must be inside/);
assert.throws(()=>assertCompactArticleLayout(compactInWrongMedia),/compact article rules must be inside/);

const client=read('article.js');
const clientHtml=read('article.html');
const classifier=read('article-layout.js');
const css=read('front-final.css');
const layout=require('../article-layout.js');

assert.match(client,/class="article-content/);
assert.match(client,/class="article-caption"/);
assert.match(client,/class="article-credit"/);
assert.match(client,/data\.image_url\?'':' article-content--no-image'/,
  'client renderer must keep the no-image layout marker');
assert.doesNotMatch(client,/data\.image_url\?' article-content--compact'/,
  'client renderer must not assume that every article image is compact');
const sharedScriptIndex=clientHtml.indexOf('src="/article-layout.js?v=2"');
const clientScriptIndex=clientHtml.indexOf('src="/article.js?v=4"');
assert.ok(sharedScriptIndex!==-1&&clientScriptIndex!==-1&&sharedScriptIndex<clientScriptIndex,
  'article.html must load the shared classifier before article.js');
assert.match(classifier,/classifyImageDimensions\(img\.naturalWidth,img\.naturalHeight\)/);

const expectedLayouts=[
  {label:'landscape',width:1600,height:900,layout:'wide',compact:false},
  {label:'portrait',width:900,height:1600,layout:'compact',compact:true},
  {label:'square',width:1000,height:1000,layout:'compact',compact:true},
  {label:'invalid dimensions',width:0,height:0,layout:null,compact:false}
];

const createLayoutFixture=(width,height,complete=true)=>{
  const contentClasses=new Set();
  const figureClasses=new Set();
  const listeners={load:new Set(),error:new Set()};
  const classList=classes=>({
    toggle(name,enabled){
      if(enabled)classes.add(name);
      else classes.delete(name);
    }
  });
  const content={classList:classList(contentClasses)};
  const figure={
    classList:classList(figureClasses),
    dataset:{},
    closest:selector=>selector==='.article-content'?content:null
  };
  const image={
    naturalWidth:width,
    naturalHeight:height,
    complete,
    dataset:{},
    closest:selector=>selector==='.article-hero'?figure:null,
    addEventListener(type,listener){listeners[type].add(listener);},
    removeEventListener(type,listener){listeners[type].delete(listener);}
  };
  return {contentClasses,figure,image,listeners};
};

const applyClientLayout=(width,height)=>{
  const fixture=createLayoutFixture(width,height);
  const {contentClasses,figure,image}=fixture;
  const result=layout.applyImageLayout(image);
  return {result,compact:contentClasses.has('article-content--compact'),figure};
};

for(const sample of expectedLayouts){
  const sharedResult=layout.classifyImageDimensions(sample.width,sample.height);
  const clientResult=applyClientLayout(sample.width,sample.height);
  assert.equal(sharedResult,sample.layout,`${sample.label}: unexpected shared classification`);
  assert.equal(clientResult.result,sharedResult,`${sample.label}: client must use shared classification`);
  assert.equal(clientResult.compact,sample.compact,`${sample.label}: unexpected client compact class`);
}

assert.equal(layout.classifyImageDimensions(undefined,undefined),null);

const cachedFixture=createLayoutFixture(1600,900,true);
layout.bindImage(cachedFixture.image);
assert.equal(cachedFixture.figure.dataset.imageLayout,'wide','cached image must be classified immediately');
assert.equal(cachedFixture.listeners.load.size+cachedFixture.listeners.error.size,0,
  'cached image must not retain event listeners');

const loadingFixture=createLayoutFixture(900,1600,false);
layout.bindImage(loadingFixture.image);
assert.equal(loadingFixture.listeners.load.size,1,'loading image must have one load listener');
assert.equal(loadingFixture.listeners.error.size,1,'loading image must have one error listener');
[...loadingFixture.listeners.load][0]();
assert.equal(loadingFixture.figure.dataset.imageLayout,'compact','loaded image must use natural dimensions');
assert.equal(loadingFixture.listeners.load.size+loadingFixture.listeners.error.size,0,
  'image listeners must be removed after classification');
layout.bindImage(loadingFixture.image);
assert.equal(loadingFixture.listeners.load.size+loadingFixture.listeners.error.size,0,
  'bound image must not receive duplicate listeners');

const invalidFixture=createLayoutFixture(0,0,false);
layout.bindImage(invalidFixture.image);
[...invalidFixture.listeners.error][0]();
assert.equal(invalidFixture.contentClasses.has('article-content--compact'),false,
  'failed image without dimensions must not become compact');
assert.equal(invalidFixture.listeners.load.size+invalidFixture.listeners.error.size,0,
  'failed image must not retain event listeners');
assertCompactArticleLayout(css);

assert.match(
  css,
  /\.article-hero img\s*\{[^}]*background:var\(--paper\)[^}]*border:0[^}]*box-shadow:none/,
  'main article images must use page background and no decorative borders'
);

assert.match(
  css,
  /\.article-content--compact \.article-hero\{[^}]*width:clamp\(270px,28vw,340px\)[^}]*max-width:38%/,
  'compact article image column must stay deliberately reduced'
);

assert.match(
  css,
  /\.article-content--compact \.article-hero img\{[^}]*width:100%[^}]*height:auto[^}]*max-height:none[^}]*object-fit:contain/,
  'compact images must show the full image without cropping'
);

const responsiveHeroMarker='/* Article responsive hero + zoom v30 */';
const responsiveHeroIndex=css.indexOf(responsiveHeroMarker);

assert.notEqual(
  responsiveHeroIndex,
  -1,
  'responsive article hero v30 block must exist'
);

const responsiveHeroCss=css.slice(responsiveHeroIndex);
const responsiveHeroDesktop=mediaContents(
  responsiveHeroCss,
  '(min-width:901px)'
).join('\n');

const wideOnlySelector='.article-content:not(.article-content--no-image):not(.article-content--compact)';

assert.equal(
  responsiveHeroDesktop.split(wideOnlySelector).length-1,
  6,
  'new desktop hero layout must target wide articles only'
);

assert.doesNotMatch(
  responsiveHeroDesktop,
  /\.article-content:not\(\.article-content--no-image\)\s+\.article-body\s*>\s*p:nth-of-type\(4\)\s*\{/,
  'fourth-paragraph clear must not apply broadly to every article with an image'
);
assert.ok(mediaContents(css,'(max-width:700px)')
  .some(content=>/\.article-content\s*\{\s*margin-top:17px\}/.test(content)),
  'mobile article spacing must be inside @media(max-width:700px)');

process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_ANON_KEY='public-test-key';
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

global.fetch=async url=>{
  assert.match(String(url),/\/rest\/v1\/articles\?/);
  return {
    ok:true,
    json:async()=>[{
      title:'Artykuł testowy',
      slug:'artykul-testowy',
      section:'Aktualności',
      section_slug:'aktualnosci',
      summary:'Lead testowy',
      content:'Pierwszy akapit.\n\nDrugi akapit.',
      image_url:'/assets/chlopiec.png',
      image_alt:'Pionowe zdjęcie',
      image_caption:'Podpis',
      image_credit:'Fot. Redakcja',
      published_at:'2026-08-14T08:00:00Z',
      is_updated:false,
      update_at:null,
      author_id:null
    }]
  };
};

const req={query:{slug:'artykul-testowy'}};
let body='';
const res={
  statusCode:0,
  setHeader(){},
  end(value){body=String(value||'');}
};

require('../api/article')(req,res).then(()=>{
  assert.equal(res.statusCode,200);
  assert.match(body,/class="article-content"/);
  assert.match(body,/class="article-caption">Podpis<\/span>/);
  assert.match(body,/class="article-credit">Fot\. Redakcja<\/span>/);
  assert.match(body,/src="\/article-layout\.js\?v=2"/);
  assert.doesNotMatch(body,/article-content--compact/,
    'SSR markup must leave image layout classification to the shared classifier');
  assert.ok(body.indexOf('class="article-lead"')<body.indexOf('class="article-hero"'));
  assert.ok(body.indexOf('class="article-hero"')<body.indexOf('class="article-body"'));
  console.log('OK: oba widoki artykułu rozpoznają proporcje zdjęcia i zachowują kolejność mobile.');
}).catch(error=>{
  console.error(error);
  process.exitCode=1;
});

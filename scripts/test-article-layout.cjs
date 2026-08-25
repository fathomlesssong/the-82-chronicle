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
  assert.ok(contents.some(content=>/\.article-content--compact \.article-hero img\s*\{[^}]*max-height:600px/.test(content)),
    'compact article image limit must be inside @media(min-width:901px)');
};

const validCompactCss='@media(min-width:901px){.article-content--compact{display:flow-root}.article-content--compact .article-hero{float:left}.article-content--compact .article-hero img{max-height:600px}}';
const compactOutsideRequiredMedia='@media(min-width:901px){.unrelated{display:block}}.article-content--compact{display:flow-root}.article-content--compact .article-hero{float:left}.article-content--compact .article-hero img{max-height:600px}';
const compactInWrongMedia='@media(min-width:901px){.unrelated{display:block}}@media(min-width:701px){.article-content--compact{display:flow-root}.article-content--compact .article-hero{float:left}.article-content--compact .article-hero img{max-height:600px}}';

assert.doesNotThrow(()=>assertCompactArticleLayout(validCompactCss));
assert.match(compactOutsideRequiredMedia,/@media\(min-width:901px\).*?\.article-content--compact/s);
assert.throws(()=>assertCompactArticleLayout(compactOutsideRequiredMedia),/compact article rules must be inside/);
assert.throws(()=>assertCompactArticleLayout(compactInWrongMedia),/compact article rules must be inside/);

const client=read('article.js');
const classifier=read('article-layout.js');
const css=read('front-final.css');

assert.match(client,/class="article-content/);
assert.match(client,/class="article-caption"/);
assert.match(client,/class="article-credit"/);
assert.match(classifier,/naturalWidth<=img\.naturalHeight/);
assertCompactArticleLayout(css);
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
  assert.match(body,/src="\/article-layout\.js\?v=1"/);
  assert.ok(body.indexOf('class="article-lead"')<body.indexOf('class="article-hero"'));
  assert.ok(body.indexOf('class="article-hero"')<body.indexOf('class="article-body"'));
  console.log('OK: oba widoki artykułu rozpoznają proporcje zdjęcia i zachowują kolejność mobile.');
}).catch(error=>{
  console.error(error);
  process.exitCode=1;
});

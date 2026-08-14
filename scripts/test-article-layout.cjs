const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const client=read('article.js');
const classifier=read('article-layout.js');
const css=read('front-final.css');

assert.match(client,/class="article-content/);
assert.match(client,/class="article-caption"/);
assert.match(client,/class="article-credit"/);
assert.match(classifier,/naturalWidth<=img\.naturalHeight/);
assert.match(css,/@media\(min-width:901px\).*?\.article-content--compact/s);
assert.match(css,/\.article-content--compact \.article-hero\{float:left/);
assert.match(css,/max-height:600px/);
assert.match(css,/@media\(max-width:700px\).*?\.article-content\{margin-top:17px\}/s);

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

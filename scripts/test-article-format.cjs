const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const loadRenderer=(source,endMarker)=>{
  const start=source.indexOf('const esc=');
  const end=source.indexOf(endMarker,start);
  assert.notEqual(start,-1,'renderer escape function missing');
  assert.notEqual(end,-1,'renderer end marker missing');
  const context={input:'',result:''};
  vm.runInNewContext(`${source.slice(start,end)}\nresult=renderArticleContent(input);`,context);
  return input=>{
    context.input=input;
    vm.runInNewContext('result=renderArticleContent(input);',context);
    return context.result;
  };
};

const client=loadRenderer(read('article.js'),'  if(window.CH82_SUPABASE_READY)');
const server=loadRenderer(read('api/article.js'),'const sectionHref=');
const renderers=[['client',client],['server',server]];

assert.equal(client('\n\nAkapit\n\n'),'<p></p><p>Akapit</p><p></p>','client legacy empty paragraphs');
assert.equal(server('\n\nAkapit\n\n'),'<p>Akapit</p>','server legacy empty paragraphs');
const cases=[
  ['plain','Pierwszy akapit.\nDruga linia.\n\nDrugi akapit.','<p>Pierwszy akapit.<br>Druga linia.</p><p>Drugi akapit.</p>'],
  ['bold','To jest **ważne**.','<p>To jest <strong>ważne</strong>.</p>'],
  ['italic','To jest *kursywa*.','<p>To jest <em>kursywa</em>.</p>'],
  ['h2','## Składniki','<h2>Składniki</h2>'],
  ['h3','### Ciasto','<h3>Ciasto</h3>'],
  ['list','- mąka\n- masło\n- jajko','<ul><li>mąka</li><li>masło</li><li>jajko</li></ul>'],
  ['mixed','## Składniki\n\n- mąka\n- **masło**\n\n## Przygotowanie\n\nWszystko *zagniatamy*.','<h2>Składniki</h2><ul><li>mąka</li><li><strong>masło</strong></li></ul><h2>Przygotowanie</h2><p>Wszystko <em>zagniatamy</em>.</p>'],
  ['block transitions','Akapit\n## Nagłówek\n- element\nDalej','<p>Akapit</p><h2>Nagłówek</h2><ul><li>element</li></ul><p>Dalej</p>'],
  ['script','<script>alert(1)</script>','<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'],
  ['img xss','**<img src=x onerror=alert(1)>**','<p><strong>&lt;img src=x onerror=alert(1)&gt;</strong></p>'],
  ['svg xss','<svg onload=alert(1)>','<p>&lt;svg onload=alert(1)&gt;</p>'],
  ['unsupported link','[klik](javascript:alert(1))','<p>[klik](javascript:alert(1))</p>'],
  ['polish','## Żółć i gęślą jaźń','<h2>Żółć i gęślą jaźń</h2>'],
  ['raw strong','<strong>tekst</strong>','<p>&lt;strong&gt;tekst&lt;/strong&gt;</p>']
];

for(const [rendererName,render] of renderers){
  for(const [label,input,expected] of cases){
    assert.equal(render(input),expected,`${rendererName}: ${label}`);
  }
}
const admin=read('admin-article.html');
assert.match(admin,/aria-describedby="content-format-help"/);
assert.match(admin,/Formatowanie: \*\*pogrubienie\*\*, \*kursywa\*, ## nagłówek, - lista/);

console.log(`OK: ${cases.length*renderers.length} przypadków ograniczonego Markdownu i XSS.`);

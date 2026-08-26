const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

const publicSheets=['styles.css','mobile.css','front-final.css','newsletter.css'];
const forbiddenAdminCss=[/\.admin-/,/\.button-secondary\b/,/admin-delete-article/];

for(const sheet of publicSheets){
  const css=read(sheet);
  for(const pattern of forbiddenAdminCss){
    assert(!pattern.test(css),`${sheet} still contains admin-only CSS matching ${pattern}`);
  }
}

const adminCss=read('admin-dashboard.css');
for(const selector of [
  '.admin-page',
  '.admin-form',
  '.button-secondary',
  '.admin-delete-article',
  '.admin-fieldset',
  '.admin-gallery-fields'
]){
  assert(adminCss.includes(selector),`admin-dashboard.css is missing ${selector}`);
}

const adminPages=[
  'admin.html',
  'admin-article.html',
  'admin-banners.html',
  'admin-users.html',
  'admin-video.html',
  'reset-password.html'
];

for(const page of adminPages){
  const html=read(page);
  const matches=html.match(/\/admin-dashboard\.css\?v=3/g)||[];
  assert.strictEqual(matches.length,1,`${page} must load admin-dashboard.css?v=3 exactly once`);
  assert(!/\/newsletter\.css/.test(html),`${page} must not load public newsletter CSS`);

  const styles=[...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map(match=>match[1]);
  assert.strictEqual(styles.at(-1),'/admin-dashboard.css?v=3',`${page} must load admin CSS last`);
}

for(const page of ['404.html','archive.html','article.html','index.html','section.html']){
  assert(!/\/admin-dashboard\.css/.test(read(page)),`${page} must not load admin CSS`);
}

assert(!/\/admin-dashboard\.css/.test(read('api/article.js')),'SSR article output must not load admin CSS');
assert(/\/newsletter\.css\?v=2/.test(read('index.html')),'homepage must load newsletter.css?v=2');

for(const name of fs.readdirSync(root).filter(name=>/\.(?:html|js)$/.test(name))){
  if(read(name).includes('button-secondary')){
    assert(name.startsWith('admin'),`${name} uses button-secondary outside admin runtime`);
  }
}

console.log('Admin CSS ownership tests passed.');

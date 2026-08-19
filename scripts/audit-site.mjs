import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const skipDirs=new Set(['.git','node_modules']);
const files=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(skipDirs.has(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);
    else files.push(full);
  }
}
walk(root);

const rel=p=>path.relative(root,p).replaceAll('\\','/');
const htmlFiles=files.filter(f=>f.endsWith('.html'));
const existing=new Set(files.map(rel));
const errors=[];
const warnings=[];
const refs=[];

const stripQuery=s=>s.split('#')[0].split('?')[0];
const isExternal=s=>/^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(s);
const resolveLocal=(source,target)=>{
  const clean=stripQuery(target);
  if(!clean)return null;
  if(clean.startsWith('/'))return clean.slice(1)||'index.html';
  return path.posix.normalize(path.posix.join(path.posix.dirname(source),clean));
};

for(const file of htmlFiles){
  const source=rel(file);
  const text=fs.readFileSync(file,'utf8');
  const re=/(?:href|src|srcset)\s*=\s*["']([^"']+)["']/gi;
  for(const match of text.matchAll(re)){
    const raw=match[1].trim();
    for(const value of raw.split(',').map(v=>v.trim().split(/\s+/)[0]).filter(Boolean)){
      if(isExternal(value))continue;
      const target=resolveLocal(source,value);
      if(!target)continue;
      refs.push({source,value,target});
      if(target.startsWith('a/'))continue; // Vercel rewrite -> server function
      if(target.startsWith('api/'))continue; // Vercel Functions
      if(!existing.has(target))errors.push(`${source}: ${value} -> brak ${target}`);
    }
  }
  if(!/<meta\s+name=["']viewport["']/i.test(text))warnings.push(`${source}: brak meta viewport`);
  if(!/<title>[^<]+<\/title>/i.test(text))warnings.push(`${source}: brak title`);
}

const publicPages=['index.html','archive.html','section.html','404.html'];
for(const p of publicPages)if(!existing.has(p))errors.push(`Brak wymaganej strony: ${p}`);
const required=['robots.txt','sitemap.xml','manifest.webmanifest','styles.css','front-final.css','newsletter.css','site.js','article-layout.js','newsletter.js','api/article.js','api/newsletter-subscribe.js','api/newsletter-unsubscribe.js','api/newsletter-send.js','lib/newsletter.js','lib/supabase-server.js','migrations/20260812_newsletter.sql','migrations/20260814_article_images.sql','scripts/test-stable-slug.cjs','scripts/test-article-gallery.cjs','scripts/test-article-layout.cjs','scripts/test-newsletter.cjs','scripts/test-supabase-server.cjs','scripts/test-api-guards.cjs'];
for(const p of required)if(!existing.has(p))errors.push(`Brak wymaganego pliku: ${p}`);

const homepage=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(!/data-newsletter-form/.test(homepage))errors.push('index.html: brak formularza newslettera');
if(!/\/api\/newsletter-subscribe/.test(fs.readFileSync(path.join(root,'newsletter.js'),'utf8')))errors.push('newsletter.js: brak połączenia z endpointem zapisu');

console.log(`Audyt: ${htmlFiles.length} plików HTML, ${refs.length} lokalnych odwołań.`);
for(const w of warnings)console.warn(`WARN: ${w}`);
if(errors.length){
  for(const e of errors)console.error(`ERROR: ${e}`);
  process.exit(1);
}
console.log('OK: lokalne linki i wymagane pliki są spójne.');

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {gallerySortOrder,MAX_GALLERY_IMAGES,MAX_IMAGE_BYTES,MAX_IMAGE_EDGE}=require('../admin-article');

assert.equal(gallerySortOrder('0'),0);
assert.equal(gallerySortOrder('12'),12);
assert.equal(gallerySortOrder(''),null);
assert.equal(gallerySortOrder('-1'),null);
assert.equal(gallerySortOrder('1.5'),null);
assert.equal(gallerySortOrder('abc'),null);
assert.equal(MAX_GALLERY_IMAGES,20);
assert.equal(MAX_IMAGE_BYTES,8*1024*1024);
assert.equal(MAX_IMAGE_EDGE,2400);

const root=path.join(__dirname,'..');
const adminHtml=fs.readFileSync(path.join(root,'admin-article.html'),'utf8');
assert.match(adminHtml,/name="gallery_images"[^>]*multiple/);
assert.match(adminHtml,/data-gallery-list/);
assert.match(adminHtml,/Maksymalnie 20 zdjęć/);

const adminJs=fs.readFileSync(path.join(root,'admin-article.js'),'utf8');
assert.match(adminJs,/prepareImageFile/);
assert.match(adminJs,/image\/webp/);
assert.match(adminJs,/galleryItems\.length\+files\.length>MAX_GALLERY_IMAGES/);

const migration=fs.readFileSync(path.join(root,'migrations/20260814_article_images.sql'),'utf8');
for(const column of ['id','article_id','image_url','image_alt','image_caption','image_credit','sort_order','created_at','created_by']){
  assert.match(migration,new RegExp(`\\b${column}\\b`));
}
assert.match(migration,/references public\.articles\(id\) on delete cascade/);
assert.match(migration,/enable row level security/);
assert.match(migration,/public can read published article gallery/);
assert.match(migration,/staff can add permitted article gallery/);
assert.match(migration,/a\.status in \('draft','review'\)/);
assert.match(migration,/public\.is_editor_or_admin\(\)/);

console.log('OK: CMS i migracja zawierają fundament dodatkowych zdjęć oraz reguły ról.');

const assert=require('node:assert/strict');
const {slugify,slugForSave}=require('../admin');

assert.equal(slugify('Zażółć gęślą jaźń!'),'zazolc-gesla-jazn');
assert.equal(slugForSave(null,'Nowy artykuł'),'nowy-artykul');
assert.equal(slugForSave('article-id','Zmieniony tytuł'),undefined);

console.log('OK: nowy artykuł dostaje slug z tytułu, a edycja nie nadpisuje istniejącego sluga.');

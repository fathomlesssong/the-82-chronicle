const assert=require('node:assert/strict');
const {slugify,slugForSave,prepareMainImageFileName}=require('../admin-article.js');

assert.equal(slugify('Zażółć gęślą jaźń!'),'zazolc-gesla-jazn');
assert.equal(slugForSave(null,'Nowy artykuł'),'nowy-artykul');
assert.equal(slugForSave('article-id','Zmieniony tytuł'),undefined);

// Testy dla nazwy głównego zdjęcia
assert.equal(prepareMainImageFileName('photo.jpg'),'photo');
assert.equal(prepareMainImageFileName('moje.zdjecie.png'),'moje.zdjecie');
assert.equal(prepareMainImageFileName('plik bez rozszerzenia'),'plik bez rozszerzenia');
assert.equal(prepareMainImageFileName(''),'zdjecie');
assert.equal(prepareMainImageFileName('.hidden.jpg'),'.hidden');

console.log('OK: nowy artykuł dostaje slug z tytułu, a edycja nie nadpisuje istniejącego sluga.');
console.log('OK: testy nazw głównych zdjęć przejścia.');

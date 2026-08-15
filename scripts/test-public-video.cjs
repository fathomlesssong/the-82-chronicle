const assert=require('node:assert/strict');
const fs=require('node:fs');

const site=fs.readFileSync('site.js','utf8');
const article=fs.readFileSync('api/article.js','utf8');
const css=fs.readFileSync('front-final.css','utf8');

assert.match(site,/videoHomepage/);
assert.match(site,/videoArticle=articles\.find/);
assert.match(site,/data-video-launch/);
assert.match(site,/youtube-nocookie\.com\/embed/);

assert.match(article,/video_show_in_article/);
assert.match(article,/renderArticleVideo/);
assert.match(article,/youtube-nocookie\.com\/embed/);

assert.match(css,/\.home-video/);
assert.match(css,/\.article-video/);
assert.match(css,/aspect-ratio:16\/9/);

console.log('OK: publiczne wideo homepage + artykuł');

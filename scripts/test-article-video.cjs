const assert=require('node:assert/strict');
const admin=require('../admin.js');

assert.equal(
  admin.youtubeVideoId('https://youtu.be/dQw4w9WgXcQ'),
  'dQw4w9WgXcQ'
);

assert.equal(
  admin.youtubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  'dQw4w9WgXcQ'
);

assert.equal(
  admin.youtubeVideoId('https://youtube.com/shorts/dQw4w9WgXcQ'),
  'dQw4w9WgXcQ'
);

assert.equal(
  admin.youtubeVideoId('https://youtube.com/live/dQw4w9WgXcQ'),
  'dQw4w9WgXcQ'
);

assert.equal(
  admin.youtubeVideoId('https://example.com/video.mp4'),
  null
);

assert.equal(
  admin.youtubeVideoId(''),
  null
);

console.log('OK: parser linków YouTube');

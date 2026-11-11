const assert = require('node:assert/strict');

const calls = [];
global.wx = {
  request(options) {
    calls.push(options);
    if (options.url.endsWith('/api/rooms')) options.success({ statusCode: 200, data: [{ id: 4 }] });
    else if (options.url.endsWith('/bad')) options.fail(new Error('offline'));
    else options.success({ statusCode: 503, data: { message: 'unavailable' } });
  }
};
global.getApp = () => ({ globalData: { apiBase: 'https://voice.yourunshi.online/meiye' } });

const { request, mediaUrl, mapRoom } = require('../utils/backend');

(async () => {
  const rows = await request('/api/rooms');
  assert.equal(rows[0].id, 4);
  assert.equal(calls[0].url, 'https://voice.yourunshi.online/meiye/api/rooms');
  assert.equal(mediaUrl('/assets/studio-poster.svg'), 'https://voice.yourunshi.online/meiye/assets/studio-poster.svg');
  assert.equal(mediaUrl('/api/rooms/12/poster'), 'https://voice.yourunshi.online/meiye/api/rooms/12/poster');
  assert.equal(mediaUrl('/meiye/api/rooms/12/poster'), 'https://voice.yourunshi.online/meiye/api/rooms/12/poster');
  assert.equal(mediaUrl('https://media.example/video.mp4'), 'https://media.example/video.mp4');
  const room = mapRoom({ id: 3, modeLabel: '录播回放', statusLabel: '已结束', host: '老师', posterUrl: '/assets/poster.svg', streamUrl: '', mediaReady: false, likes: 12 });
  assert.equal(room.mode, '录播回放');
  assert.equal(room.status, '已结束');
  assert.equal(room.likes, 12);
  assert.equal(room.replayVideo, '');
  assert.match(room.playerMessage, /暂未配置/);
  const replayMarkedLive = mapRoom({ id: 1, mode: 'REPLAY', modeLabel: '录播回放', status: 'LIVE', statusLabel: '直播中' });
  assert.equal(replayMarkedLive.status, '回放中');
  await assert.rejects(request('/broken'), /unavailable/);
  await assert.rejects(request('/bad'), /服务器域名配置或网络/);
  console.log('PASS: backend base URL, room mapping, media URLs and explicit API errors');
})().catch(error => { console.error(error); process.exitCode = 1; });

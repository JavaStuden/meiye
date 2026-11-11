const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const calls = [];
const writes = [];
const storage = {};
let serverComments = [{ id: 8, author: '学员', content: '来自后端的评论' }];
let page;
const responses = {
  '/api/rooms/3': { id: 3, title: '回放课程', host: '美业课堂', mode: 'REPLAY', status: 'ENDED', modeLabel: '录播回放', statusLabel: '已结束', posterUrl: '/assets/poster.svg', streamUrl: '', mediaReady: false, likes: 17, commentsEnabled: true, announcement: '后台公告' },
  '/api/rooms/3/playback': { phase: 'UNCONFIGURED', source: '' },
  '/api/rooms/3/products': [{ id: 9, name: '后台商品', price: 12, originalPrice: 20, description: '商品描述' }]
};
const backendPath = require.resolve('../utils/backend');
require.cache[backendPath] = { id: backendPath, filename: backendPath, loaded: true, exports: {
  mediaUrl: value => value,
  mapRoom: value => ({ ...value, mode: value.modeLabel, status: value.statusLabel, cover: value.posterUrl }),
  request: async (route, options = {}) => {
    calls.push(route);
    if (route.endsWith('/4')) throw new Error('missing');
    if (route === '/api/rooms/3/messages') return serverComments;
    if (route === '/api/miniprogram/rooms/3/messages') {
      writes.push(options);
      serverComments = serverComments.concat([{ id: 9, author: options.data.author, content: options.data.content }]);
      return serverComments.at(-1);
    }
    return responses[route];
  }
} };
global.Page = value => { page = value; };
const mod = require('../pages/watch/watch');
const definition = page;
delete require.cache[require.resolve('../pages/watch/watch')];
const dialogs = [];
global.wx = {
  showModal: value => dialogs.push(value), showToast: value => dialogs.push(value),
  getStorageSync: key => storage[key] || '', setStorageSync: (key, value) => { storage[key] = value; }
};

async function load(id) {
  const instance = { ...definition, data: { ...definition.data }, setData(patch, callback) { Object.assign(this.data, patch); if (callback) callback(); } };
  instance.onLoad({ id: String(id) });
  instance.onShow();
  await new Promise(resolve => setImmediate(resolve));
  instance.stopMessagePolling();
  return instance;
}

(async () => {
  const room = await load(3);
  assert.equal(room.data.room.title, '回放课程');
  assert.equal(room.data.comments[0].text, '来自后端的评论');
  assert.equal(room.data.products[0].name, '后台商品');
  assert.match(room.data.room.playerMessage, /暫未配置|暂未配置/);
  assert.equal(definition.onShareAppMessage.call(room).path, '/pages/watch-share/watch-share?id=3');
  const appConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'));
  const internalConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../pages/watch/watch.json'), 'utf8'));
  const sharedConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../pages/watch-share/watch-share.json'), 'utf8'));
  assert(appConfig.pages.includes('pages/watch-share/watch-share'));
  assert.equal(internalConfig.navigationStyle, 'default');
  assert.equal(sharedConfig.navigationStyle, 'custom');
  for (const file of ['../pages/watch/watch.wxml', '../pages/watch-share/watch-share.wxml']) {
    const template = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(template, /loop="\{\{room\.mode === '录播回放'\}\}"/);
    assert.match(template, /class="floating-comments"/);
    assert.match(template, /<scroll-view class="comment-scroll"[^>]*scroll-y="\{\{true\}\}"/);
    assert.match(template, /bindscroll="onCommentsScroll"/);
    assert.match(template, /wx:key="id"/);
    assert.match(template, /class="action-bar"/);
    assert.ok(template.indexOf('class="action-bar"') < template.indexOf('class="sheet-mask"'));
  }
  assert.equal(room.data.comments.length, 1);
  const { createWatchPage } = require('../utils/watch-page');
  assert.equal(createWatchPage().onShareTimeline, undefined);
  assert.equal(typeof createWatchPage({ customNav: true }).onShareTimeline, 'function');
  room.openComment();
  room.setData({ commentText: '这是小程序真实评论', viewerName: '测试观众' });
  await room.sendComment();
  assert.equal(writes[0].method, 'POST');
  assert.equal(writes[0].data.author, '测试观众');
  assert.equal(writes[0].data.content, '这是小程序真实评论');
  assert.equal(room.data.comments.at(-1).text, '这是小程序真实评论');
  serverComments = Array.from({ length: 90 }, (_, i) => ({ id: i + 1, author: '学员', content: `历史评论 ${i + 1}` }));
  await room.loadComments();
  assert.equal(room.data.comments.length, 80);
  assert.equal(room.data.comments[0].id, '11');
  assert.equal(room.data.commentScrollTarget, 'comment-90');
  const historySnapshot = room.data.comments;
  room.onCommentsScroll({ detail: { scrollHeight: 4000, scrollTop: 800 } });
  serverComments.push({ id: 91, author: '新观众', content: '查看历史时的新消息' });
  await room.loadComments();
  assert.strictEqual(room.data.comments, historySnapshot, 'polling must preserve the history being read');
  assert.equal(room.data.newCommentCount, 1);
  room.jumpToLatestComments();
  assert.equal(room.data.comments.at(-1).id, '91');
  assert.equal(room.data.comments.at(-1).name, '新观众');
  assert.equal(room.data.commentScrollTarget, 'comment-91');
  assert.equal(room.data.newCommentCount, 0);
  room.onCommentsTouchStart();
  serverComments.push({ id: 92, author: '学员', content: '滑动期间的新消息' });
  await room.loadComments();
  assert.equal(room.data.comments.at(-1).id, '91', 'polling must not interrupt a touch gesture');
  room.onCommentsTouchEnd();
  room.onCommentsBottom();
  assert.equal(room.data.commentScrollTarget, 'comment-92');
  room.onCommentsScroll({ detail: { scrollHeight: 4000, scrollTop: 800 } });
  serverComments.push({ id: 93, author: '学员', content: '回到底部后同步' });
  await room.loadComments();
  room.onCommentsScroll({ detail: { scrollHeight: 4000, scrollTop: 4000 - room.commentViewportHeight } });
  room.onCommentsBottom();
  assert.equal(room.data.commentScrollTarget, 'comment-93');
  assert.deepEqual(calls.slice(0, 4), ['/api/rooms/3', '/api/rooms/3/playback', '/api/rooms/3/messages', '/api/rooms/3/products']);
  const missing = await load(4);
  assert.equal(missing.data.room, null);
  assert.match(missing.data.roomError, /missing/);
  assert.equal(missing.data.comments.length, 0);
  console.log('PASS: backend data, scrollable comment history, stable reading during polling, and return to latest');
})().catch(error => { console.error(error); process.exitCode = 1; });

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const project = path.resolve(__dirname, '../../..');
const {roomIdFromOptions: read} = require(path.join(project, 'miniprogram/utils/room-route'));
assert.equal(read({scene: 'id%3D3'}), 3);
assert.equal(read({scene: 'id=2'}), 2);
assert.equal(read({id: '3'}), 3);
assert.equal(read({}), 1);
for (const scene of ['id=0', 'id=-1', '%E0%A4%A', 'id=3&room=1', 'id=9007199254740992'])
  assert.equal(read({scene}), null);

const full = fs.readFileSync(path.join(project, 'src/main/resources/static/live-operations.js'), 'utf8');
assert.match(full, /function formatLiveDuration\(room, now = Date\.now\(\)\)/);
const control = full.slice(full.indexOf('function controlPage()'), full.indexOf('function commentsPage()'));
assert.match(control, /\$\{E\(formatLiveDuration\(serverRoom\)\)\}/);
assert.doesNotMatch(control, /70:46:20/);
const source = full.slice(full.indexOf('let liveShareRequest ='), full.indexOf('let selectedFolder ='));
  assert.match(full, /function copyMiniProgramPath\(id\) \{ copyH5LiveUrl\(`pages\/watch-share\/watch-share\?id=\$\{id\}`\); \}/);
const tick = () => new Promise(resolve => setImmediate(resolve));

async function scenario(mode, pathname = '/meiye/admin') {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {disabled: true, textContent: '', hidden: true, replaceChildren(image) { this.image = image; }});
    return elements.get(id);
  };
  const root = {isConnected: true, querySelector: element};
  const calls = [];
  const ctx = vm.createContext({
    db: {rooms: [{id: 3, name: '回放'}]}, E: String, modal() {}, toast() {}, closeDialog() {},
    location: {pathname}, AbortController, navigator: {},
    document: {getElementById: () => root},
    URL: {createObjectURL: () => 'blob:test', revokeObjectURL() {}},
    Image: class { constructor() { queueMicrotask(() => this.onload?.()); } },
    async fetch(url) {
      calls.push(url);
      const mini = url.endsWith('/miniprogram-code');
      return {
        ok: !(mode === 'missing' && mini), status: mode === 'redirect' ? 200 : (mode === 'missing' && mini ? 503 : 200),
        redirected: mode === 'redirect',
        headers: {get: () => mini || url.endsWith('/h5-code') ? 'image/png' : 'application/json'},
        async json() { return mode === 'missing' && mini ? {message: '尚未配置 WECHAT_APP_SECRET'} : {envVersion: 'release', h5Url: 'https://example.test/?room=3'}; },
        async blob() { return {type: 'image/png'}; }
      };
    }
  });
  vm.runInContext(source + '\nopenLiveShareModal(3);', ctx);
  await tick(); await tick();
  if (mode === 'redirect') {
    assert.match(element('#share-mini-image').textContent, /请先登录/);
    assert.equal(element('#share-mini-save').disabled, true);
    assert.match(element('#share-h5-image').textContent, /请先登录/);
    assert.equal(element('#share-h5-save').disabled, true);
    assert.equal(element('#share-admin-login').hidden, false);
  } else {
    assert.equal(element('#share-h5-save').disabled, false);
    assert.equal(element('#share-h5-open').href, 'https://example.test/?room=3');
    assert.equal(element('#share-mini-save').disabled, mode === 'missing');
    if (mode === 'missing') assert.match(element('#share-mini-image').textContent, /WECHAT_APP_SECRET/);
    else assert.ok(element('#share-mini-image').image);
  }
  assert.equal(calls[0], (pathname.startsWith('/meiye/') ? '/meiye' : '') + '/api/admin/share/rooms/3');
}

(async () => {
  await scenario('success');
  await scenario('success', '/admin');
  await scenario('missing');
  await scenario('redirect');
  console.log('PASS: scan routing, real image display, missing credentials, login redirect and both API prefixes');
})().catch(error => { console.error(error); process.exitCode = 1; });

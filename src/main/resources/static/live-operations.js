'use strict';

/**
 * 美业直播 · 现代化直播中控台、弹幕机器人、视频库与直播间设置核心逻辑
 */

const opsVideoUrls = new Map();
const opsImageUrls = new Map();
const opsImageAssetIds = new Map();
let pendingRoomId = null;
let serverRoomsLoaded = false;
let serverRoomsLoading = false;
let serverRoomsError = '';
let serverRooms = [];
let currentLccSubTab = 'tasks';
let currentLccMainTab = 'robot';
let lccTaskFilterText = '';
let lccAudienceFilterText = '';
let lccAudienceRoleFilter = '全部';
let lccGoodsFilterText = '';
let lccInviteFilterText = '';
let lccInviteStatusFilter = '全部';

function getInitialOnlineAudiences() {
  return [
    { id: '90001001', name: '向老师 (旗舰店)', role: '主播/讲师', avatar: '👩‍🏫', joinTime: '19:28:10', duration: '52分钟', chatCount: 45, likeCount: 180, muted: false, ip: '上海市' },
    { id: '90001002', name: '运营-小美', role: '中控/运营', avatar: '👩‍💻', joinTime: '19:25:00', duration: '55分钟', chatCount: 28, likeCount: 95, muted: false, ip: '杭州市' },
    { id: '90001088', name: '静静 (美甲加盟店)', role: 'VIP店长', avatar: '💅', joinTime: '19:31:40', duration: '48分钟', chatCount: 16, likeCount: 120, muted: false, ip: '广州市' },
    { id: '90001103', name: '春暖花开_美容顾问', role: '核心学员', avatar: '🌸', joinTime: '19:35:12', duration: '44分钟', chatCount: 9, likeCount: 66, muted: false, ip: '深圳市' },
    { id: '90001215', name: '雅韵美业-王总监', role: '认证合伙人', avatar: '🏢', joinTime: '19:38:20', duration: '41分钟', chatCount: 12, likeCount: 88, muted: false, ip: '成都市' },
    { id: '90001306', name: '美业新思维_晨晨', role: '普通学员', avatar: '✨', joinTime: '19:42:05', duration: '37分钟', chatCount: 5, likeCount: 42, muted: false, ip: '武汉市' },
    { id: '90001420', name: '爱美肌日式皮肤管理', role: '加盟学员', avatar: '🧖‍♀️', joinTime: '19:45:18', duration: '34分钟', chatCount: 7, likeCount: 53, muted: false, ip: '南京市' },
    { id: '90001552', name: '微光美肤中心', role: '普通观众', avatar: '🌿', joinTime: '19:50:00', duration: '29分钟', chatCount: 3, likeCount: 19, muted: false, ip: '重庆市' },
    { id: '90001608', name: '妍丽会所_李院长', role: 'VIP店长', avatar: '💆‍♀️', joinTime: '19:53:30', duration: '26分钟', chatCount: 11, likeCount: 77, muted: false, ip: '西安市' },
    { id: '90001789', name: '美业同行-阿玲', role: '普通观众', avatar: '🎀', joinTime: '20:01:15', duration: '18分钟', chatCount: 2, likeCount: 15, muted: false, ip: '郑州市' }
  ];
}

function getInitialInviteRecords() {
  return [
    { id: 'INV-1001', inviter: '静静 (美甲加盟店)', inviterUid: '90001088', channel: '微信朋友圈海报', invitee: '爱美肌日式皮肤管理', inviteeUid: '90001420', time: '19:45:18', status: '已下单', reward: '¥15.90 佣金', isSettled: true },
    { id: 'INV-1002', inviter: '雅韵美业-王总监', inviterUid: '90001215', channel: '企业微信私聊', invitee: '妍丽会所_李院长', inviteeUid: '90001608', time: '19:53:30', status: '已进房超30分', reward: '50 积分', isSettled: true },
    { id: 'INV-1003', inviter: '运营-小美', inviterUid: '90001002', channel: '美业社群推送', invitee: '微光美肤中心', inviteeUid: '90001552', time: '19:50:00', status: '已下单', reward: '¥7.95 佣金', isSettled: true },
    { id: 'INV-1004', inviter: '向老师 (旗舰店)', inviterUid: '90001001', channel: '视频号主页关联', invitee: '春暖花开_美容顾问', inviteeUid: '90001103', time: '19:35:12', status: '已进房超30分', reward: '100 积分', isSettled: true },
    { id: 'INV-1005', inviter: '美业新思维_晨晨', inviterUid: '90001306', channel: '小程序分享卡片', invitee: '美业同行-阿玲', inviteeUid: '90001789', time: '20:01:15', status: '已进房观看', reward: '30 积分', isSettled: false },
    { id: 'INV-1006', inviter: '雅韵美业-王总监', inviterUid: '90001215', channel: '线下门店台卡二维码', invitee: '琉璃光影美学空间', inviteeUid: '90001850', time: '20:05:40', status: '已预约下期', reward: '20 积分', isSettled: false },
    { id: 'INV-1007', inviter: '静静 (美甲加盟店)', inviterUid: '90001088', channel: '微信群分享', invitee: '悦颜轻医美中心', inviteeUid: '90001920', time: '20:08:22', status: '已下单', reward: '¥9.90 佣金', isSettled: false }
  ];
}

if (!db.onlineAudiences || !db.onlineAudiences.length) {
  db.onlineAudiences = getInitialOnlineAudiences();
}
if (!db.inviteRecords || !db.inviteRecords.length) {
  db.inviteRecords = getInitialInviteRecords();
}

let serverMediaLoaded = false;
let serverMediaLoading = false;
let serverMediaError = '';
const serverPlaybackByRoom = new Map();
const serverPlaybackRequests = new Set();
let liveDurationTimer = null;
if (db.configs?.cos) {
  delete db.configs.cos.secretId;
  delete db.configs.cos.secretKey;
  delete db.configs.cos;
  persist();
}

async function loadServerMedia() {
  if (serverMediaLoading) return;
  serverMediaLoading = true;
  try {
  const endpoint = location.pathname.startsWith('/meiye/') ? '/meiye/api/admin/media' : '/api/admin/media';
  const response = await fetch(endpoint, {credentials: 'same-origin', cache: 'no-store'});
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error(response.status === 401 || response.status === 403 || response.redirected ? '请先登录管理后台' : 'COS 尚未配置或素材列表暂不可用');
  const rows = await response.json();
  for (const item of db.assets.filter(asset => asset.serverId)) opsVideoUrls.delete(Number(item.id));
  const media = rows.map(item => ({
    id: 1000000000 + Number(item.id), serverId: Number(item.id), name: item.name,
    duration: '时长待解析', durationMinutes: 'COS 素材', source: '腾讯云 COS',
    date: new Date(item.createdAt).toLocaleDateString('zh-CN'), status: '可用',
    fileSize: `${(item.sizeBytes / 1048576).toFixed(1)} MB`, folder: '腾讯云 COS 存储'
  }));
  rows.forEach(item => opsVideoUrls.set(1000000000 + Number(item.id), item.url));
  db.assets = [...db.assets.filter(item => !item.serverId), ...media];
  persist();
  serverMediaLoaded = true;
  serverMediaError = '';
  } finally {
    serverMediaLoading = false;
  }
}

if (location.pathname === '/admin') loadServerMedia().then(() => render()).catch(() => {});

async function csrfHeaders() {
  const headers = new Headers();
  let token = document.querySelector('meta[name="_csrf"]')?.content;
  let name = document.querySelector('meta[name="_csrf_header"]')?.content;
  if (!token || !name) {
    const response = await fetch(adminApiPath('/api/admin/csrf'), { credentials: 'same-origin' });
    const csrf = await requireAdminJson(response, '无法初始化安全令牌');
    token = csrf.token;
    name = csrf.headerName;
  }
  if (token && name) headers.set(name, token);
  return headers;
}

// 确保素材库有完备的时长与分钟数字段
if (!db.assets || !db.assets.length) {
  db.assets = [
    { id: 1, name: '肩颈护理实操 · 精品回放.mp4', duration: '28:05', durationMinutes: '28分钟', source: '素材库', date: '2026-10-18', status: '可用', folder: '美业实操录播', fileSize: '185 MB' },
    { id: 2, name: '美业门店经营 · 客户复购课程.mp4', duration: '45:10', durationMinutes: '45分钟', source: '素材库', date: '2026-10-19', status: '可用', folder: '精品回放课程', fileSize: '320 MB' },
    { id: 3, name: '光电美容抗衰手法实操教学.mp4', duration: '35:22', durationMinutes: '35分钟', source: '素材库', date: '2026-10-20', status: '可用', folder: '美业实操录播', fileSize: '240 MB' },
    { id: 4, name: '面部微晶导入实录 · 示范课.mp4', duration: '22:18', durationMinutes: '22分钟', source: '素材库', date: '2026-10-21', status: '可用', folder: '产品讲解教学', fileSize: '160 MB' }
  ];
} else {
  db.assets.forEach(a => {
    if (!a.durationMinutes && a.duration) {
      const parts = a.duration.replace(/[^\d:]/g, '').split(':');
      if (parts.length >= 2) a.durationMinutes = `${parseInt(parts[0], 10)}分钟`;
      else a.durationMinutes = `${a.duration}分钟`;
    }
    if (!a.folder) a.folder = '美业实操录播';
    if (!a.fileSize) a.fileSize = '185 MB';
  });
}

// 确保默认机器人模板与向总互动话术存在
if (!db.robotTemplates || !db.robotTemplates.length) {
  db.robotTemplates = [
    { id: 101, name: '向总互动', robotCount: 100, scriptTemplate: '技术互动', intervalMin: 2, intervalMax: 5, loop: true, active: true },
    { id: 102, name: '气氛组跟进', robotCount: 50, scriptTemplate: '互动话术', intervalMin: 3, intervalMax: 8, loop: true, active: true },
    { id: 103, name: '催单促客', robotCount: 30, scriptTemplate: '催单话术', intervalMin: 5, intervalMax: 12, loop: true, active: true }
  ];
}

if (!db.scriptTemplates || !db.scriptTemplates.length) {
  db.scriptTemplates = [
    {
      id: 201,
      name: '技术互动',
      lines: [
        '老师，这个水光有膏的吗？',
        '轻晕冻配比是多少呀？',
        '老师这个技术手法适合零基础学吗？',
        '学到了学到了，感谢向总！',
        '我们店里刚好有顾客问这个项目，来得太及时了！',
        '请问孕妇可以做这个肩颈放松项目吗？',
        '手法好专业啊，向总讲得太细致了！',
        '已下单体验装，期待效果！'
      ]
    },
    {
      id: 202,
      name: '互动话术',
      lines: [
        '向老师晚上好，准时打卡！',
        '进来了进来了，大家晚上好！',
        '向总的声音好有磁性啊～',
        '支持美业直播，每天都在跟向总学习！',
        '打卡打卡，期待今晚的干货！'
      ]
    },
    {
      id: 203,
      name: '催单话术',
      lines: [
        '已抢！这个价格太划算了！',
        '优惠券快没了，姐妹们赶紧冲！',
        '刚抢了一套，这个实操工具包包含什么？',
        '库存还有吗？我们店要定3套！'
      ]
    }
  ];
}

if (!db.robotTasks) db.robotTasks = [];

function roomVideoUrl(asset) {
  if (!asset) return '';
  return opsVideoUrls.get(Number(asset.id)) || asset.videoUrl || asset.url || '';
}

function adminApiPath(path) {
  return `${location.pathname.startsWith('/meiye/') ? '/meiye' : ''}${path}`;
}

function adminLoginLink(label = '登录管理后台', className = 'qihui-btn search') {
  return `<a class="${className}" href="${adminApiPath('/admin')}">${label}</a>`;
}

async function requireAdminJson(response, fallback = '管理端请求失败') {
  if (response.redirected || response.status === 401 || response.status === 403) throw new Error('当前未登录管理后台');
  if (!(response.headers.get('content-type') || '').includes('application/json')) {
    throw new Error(String(response.url || '').includes('/login') ? '当前未登录管理后台' : fallback);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `${fallback} (${response.status})`);
  }
  return response.json();
}

let serverRobotState = null;
let serverRobotStateLoaded = false;
let serverRobotStateLoading = false;
let serverRobotStateError = '';

function applyServerRobotState(state) {
  serverRobotState = state;
  db.robotTemplates = Array.isArray(state.templates) ? state.templates : [];
  db.scriptTemplates = Array.isArray(state.scripts) ? state.scripts : [];
  db.robotTasks = Array.isArray(state.tasks) ? state.tasks : [];
  db.robotNames = Array.isArray(state.robotNames) ? state.robotNames : [];
  serverRobotStateLoaded = true;
  serverRobotStateError = '';
}

async function loadServerRobotState() {
  if (serverRobotStateLoading) return;
  serverRobotStateLoading = true;
  try {
    const response = await fetch(adminApiPath('/api/admin/robots'), { credentials: 'same-origin', cache: 'no-store' });
    applyServerRobotState(await requireAdminJson(response, '机器人配置读取失败'));
  } catch (error) {
    serverRobotStateError = error.message || '后台读取失败';
  } finally {
    serverRobotStateLoading = false;
    render();
  }
}

async function robotAdminMutation(path, method, body) {
  const headers = await csrfHeaders();
  headers.set('Content-Type', 'application/json');
  const response = await fetch(adminApiPath(`/api/admin/robots${path}`), {
    method, credentials: 'same-origin', headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  const result = await requireAdminJson(response, '机器人数据保存失败');
  applyServerRobotState(result);
}

function serverRobotPage(tab) {
  if (tab) currentLccSubTab = tab;
  if (!serverRoomsLoaded) {
    if (!serverRoomsLoading && !serverRoomsError) loadServerRooms();
    return `<section class="qihui-empty-state"><strong>${E(serverRoomsError || '正在读取数据库场次…')}</strong><p>${serverRoomsError ? '登录状态或网络异常，请刷新重试。' : ''}</p></section>`;
  }
  const selected = serverRooms.find(item => item.id === Number(roomId)) || serverRooms[0];
  if (!selected) return '<section class="qihui-empty-state">当前没有可配置机器人的数据库场次。</section>';
  return `<section class="qihui-server-robot"><header><div><b>${E(selected.name)}</b><span>机器人任务与话术保存到服务器数据库</span></div><select aria-label="选择直播间" onchange="roomId=Number(this.value);render()">${serverRooms.map(item => `<option value="${item.id}" ${item.id === selected.id ? 'selected' : ''}>${E(item.name)}</option>`).join('')}</select></header>${renderLccRobotTab({ id: selected.id, name: selected.name, goods: [] })}</section>`;
}

function serverCommentsPage() {
  if (!serverRoomsLoaded) {
    if (!serverRoomsLoading && !serverRoomsError) loadServerRooms();
    return `<section class="qihui-empty-state"><strong>${E(serverRoomsError || '正在读取数据库场次…')}</strong></section>`;
  }
  const selected = serverRooms.find(item => item.id === Number(roomId)) || serverRooms[0];
  if (!selected) return '<section class="qihui-empty-state">当前没有数据库场次。</section>';
  const items = adminMessagesByRoom.get(selected.id) || [];
  if (!adminMessagesByRoom.has(selected.id)) loadAdminRoomMessages(selected.id);
  return `<section class="qihui-comments-page"><header><div><h2>${E(selected.name)} · 评论流</h2><p>观众评论、管理员消息和服务器机器人评论共用数据库记录</p></div><select aria-label="选择直播间" onchange="roomId=Number(this.value);render()">${serverRooms.map(item => `<option value="${item.id}" ${item.id === selected.id ? 'selected' : ''}>${E(item.name)}</option>`).join('')}</select><button onclick="clearLccChat(${selected.id})">清空本场评论</button></header><div class="qihui-server-comments">${items.slice(-80).map(item => `<article><b>${E(item.author)}</b><span>${E(item.content)}</span><time>${E(item.createdAt || '')}</time></article>`).join('') || '<div class="empty">暂无评论</div>'}</div><form class="qihui-server-comment-form" onsubmit="submitLccChatMsg(event, ${selected.id})"><input id="lccChatInput" maxlength="300" placeholder="以管理员身份发送评论" required><button type="submit">发送</button></form></section>`;
}

function selectedServerRoomId() {
  return serverRooms.find(item => item.id === Number(roomId))?.id || serverRooms[0]?.id || 0;
}

function ensureServerPlayback(roomId) {
  const id = Number(roomId);
  const room = serverRooms.find(item => item.id === id)?._server;
  if (!room || (!room.mediaAssetId && !room.streamUrl) || serverPlaybackRequests.has(id)) return;
  const cached = serverPlaybackByRoom.get(id);
  if (cached && Date.now() - cached.loadedAt < 10 * 60 * 1000) return;
  serverPlaybackRequests.add(id);
  fetch(adminApiPath(`/api/rooms/${id}/playback`), {credentials: 'same-origin', cache: 'no-store'})
    .then(async response => {
      if (!response.ok) throw new Error(`读取播放源失败（HTTP ${response.status}）`);
      const state = await response.json();
      serverPlaybackByRoom.set(id, {...state, loadedAt: Date.now()});
    })
    .catch(error => serverPlaybackByRoom.set(id, {phase: 'ERROR', error: error.message, loadedAt: Date.now()}))
    .finally(() => {
      serverPlaybackRequests.delete(id);
      render();
    });
}

function serverMediaPage() {
  const assets = db.assets.filter(asset => asset.serverId);
  const rows = assets.map(asset => `<tr><td><b>${E(asset.name)}</b></td><td>${E(asset.duration)}</td><td>${E(asset.fileSize || '—')}</td><td>${E(asset.date)}</td><td>${badge('可用')}</td><td><button class="link" onclick="previewVideoWithMinutes(${asset.id})">预览</button></td></tr>`);
  const content = serverMediaLoading ? '<div class="empty">正在读取 COS 素材…</div>' : serverMediaError
    ? `<div class="empty">${E(serverMediaError)}</div>`
    : rows.length ? table(['素材名称', '时长', '大小', '上传日期', '状态', '操作'], rows)
      : '<div class="empty">COS 素材库暂无视频</div>';
  return title('录播视频素材', '上传到 COS 后，可在场次配置中选择并关联播放', '<button class="primary" onclick="openServerMediaUpload()">上传录播视频</button>')
    + `<section class="card">${content}</section>`;
}

function openServerVideoUpload() {
  modal('上传录播素材', `<form onsubmit="submitServerVideoUpload(event)"><div class="field"><label for="serverVideoFile">选择视频</label><input id="serverVideoFile" type="file" accept="video/*" required></div><p id="serverVideoUploadStatus" class="dialog-info" role="status">视频将上传到腾讯云 COS 并登记到素材库；再到场次配置选择该素材并保存。</p><div class="dialog-foot"><button type="button" onclick="closeDialog()">取消</button><button id="serverVideoUploadSubmit" class="primary" type="submit">上传到 COS</button></div></form>`);
}

async function submitServerVideoUpload(event) {
  event.preventDefault();
  const input = document.getElementById('serverVideoFile');
  const status = document.getElementById('serverVideoUploadStatus');
  const submit = document.getElementById('serverVideoUploadSubmit');
  const file = input?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('video/')) { status.textContent = '请选择有效的视频文件。'; return; }
  if (file.size > 2 * 1024 * 1024 * 1024) { status.textContent = '视频不能超过 2 GB。'; return; }
  submit.disabled = true;
  status.textContent = `正在上传 ${file.name}（${(file.size / 1048576).toFixed(1)} MB）…`;
  const form = new FormData();
  form.append('file', file);
  try {
    const response = await fetch(adminApiPath('/api/admin/media'), {
      method: 'POST', headers: await csrfHeaders(), credentials: 'same-origin', body: form
    });
    const asset = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(response.status === 413 ? '服务器上传限制拦截了此文件。' : asset.message || `上传失败（HTTP ${response.status}）`);
    await loadServerMedia();
    closeDialog();
    render();
    toast(`已上传到 COS 素材库：${asset.name}`);
  } catch (error) {
    status.textContent = error.message || '视频上传失败。';
    submit.disabled = false;
  }
}

window.mediaPage = serverMediaPage;
window.renderServerMediaPage = serverMediaPage;
window.openServerMediaUpload = openServerVideoUpload;
window.uploadMedia = openServerVideoUpload;
window.submitServerVideoUpload = submitServerVideoUpload;

function mapServerRoom(room) {
  const date = value => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
  return {
    id: Number(room.id), name: room.title, host: room.host,
    mode: room.modeLabel, status: room.statusLabel,
    time: date(room.scheduledAt), end: '—',
    createdAt: '—', cover: room.posterUrl || '', posterUrl: room.posterUrl || '',
    streamUrl: room.streamUrl || '', mediaAssetId: room.mediaAssetId,
    showInList: true, layout: '—',
    _server: room
  };
}

function formatLiveDuration(room, now = Date.now()) {
  const started = Date.parse(room?._server?.liveStartedAt || '');
  if (!Number.isFinite(started)) return '未记录';
  const ended = Date.parse(room._server.liveEndedAt || '');
  const seconds = Math.max(0, Math.floor(((Number.isFinite(ended) ? ended : now) - started) / 1000));
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor(seconds % 3600 / 60).toString().padStart(2, '0');
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${remainder}`;
}

function startLiveDurationTicker(room) {
  clearInterval(liveDurationTimer);
  const display = document.getElementById('lcc-timer-display');
  if (!display) return;
  display.textContent = formatLiveDuration(room);
  if (!room?._server?.liveStartedAt || room._server.liveEndedAt) return;
  liveDurationTimer = setInterval(() => {
    const target = document.getElementById('lcc-timer-display');
    if (!target) return clearInterval(liveDurationTimer);
    target.textContent = formatLiveDuration(room);
  }, 1000);
}

async function loadServerRooms() {
  if (serverRoomsLoading) return;
  serverRoomsLoading = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(adminApiPath('/api/rooms'), {
      credentials: 'same-origin', cache: 'no-store', signal: controller.signal
    });
    const rows = await requireAdminJson(response, '读取数据库场次失败');
    if (!Array.isArray(rows)) throw new Error('数据库场次接口返回格式不正确');
    serverRooms = rows.map(mapServerRoom);
    serverRoomsLoaded = true;
    serverRoomsError = '';
  } catch (error) {
    serverRoomsLoaded = false;
    serverRoomsError = error.name === 'AbortError' ? '读取数据库场次超时，请重试' : error.message || '读取数据库场次失败';
  } finally {
    clearTimeout(timeout);
    serverRoomsLoading = false;
    try {
      render();
    } catch (error) {
      console.error('Failed to render database rooms', error);
      serverRoomsLoaded = false;
      serverRoomsError = '数据库场次已返回，但页面渲染失败，请重试';
      try { render(); } catch (renderError) { console.error('Failed to render room error state', renderError); }
    }
  }
}

function roomPosterUrl(room) {
  if (!room) return 'assets/live-still.png';
  return opsImageUrls.get(`${room.id}:cover`) || room.posterUrl || room.cover || 'assets/live-still.png';
}

function roomBackgroundUrl(room) {
  if (!room) return '';
  return opsImageUrls.get(`${room.id}:background`) || room.backgroundUrl || '';
}

function fmtMinutesSeconds(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// 本地文件选取与解析
function addLocalVideo(file) {
  if (!file) return null;
  if (file.type && !file.type.startsWith('video/')) {
    toast('请选择有效的 MP4 视频文件');
    return null;
  }
  const id = uid();
  const url = URL.createObjectURL(file);
  const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
  const asset = {
    id,
    name: file.name,
    duration: '读取中...',
    durationMinutes: '读取中...',
    source: '本地上传',
    date: today,
    status: '可用',
    localOnly: true,
    fileSize: sizeMb,
    folder: '全部视频'
  };
  opsVideoUrls.set(Number(id), url);
  db.assets.unshift(asset);
  persist();

  // 探测真实视频时长
  const probe = document.createElement('video');
  probe.preload = 'metadata';
  probe.onloadedmetadata = () => {
    const totalSec = Math.floor(probe.duration || 0);
    asset.duration = fmtMinutesSeconds(totalSec);
    asset.durationMinutes = `${Math.max(1, Math.round(totalSec / 60))}分钟`;
    persist();
    render();
    toast(`视频时长已智能解析：${asset.duration} (${asset.durationMinutes})`);
  };
  probe.onerror = () => {
    asset.duration = '28:05';
    asset.durationMinutes = '28分钟';
    persist();
  };
  probe.src = url;
  return asset;
}

/* ==========================================================================
   图一、图三、图四、图五：全屏暗黑专业直播中控台 (Live Control Center)
   ========================================================================== */

function controlPage() {
  const localRoom = room() || db.rooms[0];
  const serverRoom = serverRooms.find(item => item.id === Number(localRoom.id))?._server;
  const playback = serverPlaybackByRoom.get(Number(localRoom.id));
  const r = serverRoom ? {...localRoom, name: serverRoom.title, host: serverRoom.host, mode: serverRoom.modeLabel, status: serverRoom.statusLabel, posterUrl: serverRoom.posterUrl} : localRoom;
  const asset = db.assets.find(a => a.id === r.asset) || db.assets[0];
  const videoSrc = serverRoom ? (playback?.source || '') : (asset ? roomVideoUrl(asset) : '');
  const isPlaying = serverRoom ? playback?.phase === 'PLAYING' || (serverRoom.status === 'LIVE' && !!videoSrc) : r.status === '直播中';
  const videoPlayer = videoSrc
    ? `<video id="lcc-player" src="${E(videoSrc)}" controls autoplay loop muted poster="${E(roomPosterUrl(r))}" onerror="this.insertAdjacentHTML('afterend','<p class=\"lcc-no-video\">视频无法播放，请检查 COS 权限或视频编码格式。</p>')" style="${!isPlaying ? 'filter: brightness(0.35) grayscale(0.5);' : ''}"></video>`
    : `<div class="lcc-no-video">${E(playback?.error || (serverRoom && !playback ? '正在读取数据库播放源…' : '该数据库场次尚未配置可播放视频'))}</div>`;

  return `
  <div class="live-control-center">
    <!-- 顶部状态栏 (LCC Topbar) -->
    <header class="lcc-topbar">
      <div class="lcc-topbar-left">
        <span class="lcc-badge ${isPlaying ? 'live' : 'waiting'}">${isPlaying ? '直播中' : (r.status || '已结束')}</span>
        <span class="lcc-badge replay">${isPlaying ? (r.mode === '录播' ? '录播播放中' : '实时直播中') : '直播已断开'}</span>
        <div class="lcc-room-title">
          ${E(r.name)} <small>主播 ${E(r.host || '优润诗直播')}</small>
        </div>
        <button class="lcc-btn ${isPlaying ? 'danger' : 'primary'}" onclick="${isPlaying ? `confirmCloseLiveRoom(${r.id})` : `startLiveRoom(${r.id})`}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/></svg>
          ${isPlaying ? '结束直播' : '开始直播'}
        </button>
        <button class="lcc-btn share-highlight" onclick="openLiveShareModal(${r.id})" title="分享直播间（小程序码与H5二维码直达）">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          &lt;: 分享直播间
        </button>
      </div>

      <!-- 中间数据流水 (Metrics) -->
      <div class="lcc-metrics-bar">
        <div class="lcc-metric-item"><i class="lcc-dot cyan"></i> 直播时长 <b id="lcc-timer-display">${E(formatLiveDuration(serverRoom))}</b></div>
        <div class="lcc-metric-item"><i class="lcc-dot blue"></i> 在线人数 <b>${r.onlineCount || 1}</b></div>
        <div class="lcc-metric-item"><i class="lcc-dot purple"></i> 累计人数 <b>${r.showCumulative !== false ? (r.totalAudience || 5) : '—'}</b></div>
        <div class="lcc-metric-item"><i class="lcc-dot yellow"></i> 火力值 <b>${r.likes || 0}</b></div>
        <div class="lcc-metric-item"><i class="lcc-dot green"></i> 总金额 <b>¥0.00</b></div>
      </div>

      <!-- 右侧控制工具 (Tools) -->
      <div class="lcc-topbar-right">
        <span class="lcc-chat-status"><i class="lcc-dot green"></i> 聊天服务已连接</span>
        <button class="lcc-btn robot-quick-btn" onclick="switchLccMainTab('robot'); setLccRobotSubTab('config')" title="快速配置弹幕机器人自动评论任务">
          🤖 创建机器人任务
        </button>
        <button class="lcc-tool-btn" onclick="liveSettings(${r.id})">直播设置</button>
        <button class="lcc-icon-btn" onclick="toggleDarkMode()" title="夜间模式">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
        <button class="lcc-icon-btn" onclick="toggleLccFullscreen()" title="全屏">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
        </button>
        <button class="lcc-tool-btn" onclick="go('live')" title="切换到管理后台列表">📋 切换管理后台</button>
      </div>
    </header>

    <!-- 工作台双栏布局 (Body) -->
    <div class="lcc-body">
      <!-- 左栏：大视窗视频画面与弹幕聊天室 -->
      <aside class="lcc-left-col">
        <div class="lcc-video-box">
          ${videoPlayer}
          ${isPlaying ? `
            <div class="lcc-video-tag">
              <i></i> ${r.mode === '录播' ? '录播进行中 · 观众可见' : '实时直播中 · 观众可见'}
            </div>
          ` : `
            <div class="lcc-video-ended-overlay">
              <div class="ended-status-badge">🛑 本场直播已结束</div>
              <div class="ended-status-time">关播时间：${E(r.end || '已保存')}</div>
              <p class="ended-status-tip">录播/推流信号已断开 · 观众端已同步为已结束引导态</p>
              <button class="ended-reopen-btn" onclick="startLiveRoom(${r.id})">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                重新开播
              </button>
            </div>
          `}
        </div>

        <section class="lcc-chat-section">
          <div class="lcc-chat-header">
            <div class="lcc-chat-header-title">
              <i class="lcc-dot green"></i> 弹幕聊天室
            </div>
            <div style="display:flex;gap:6px">
              <button onclick="switchLccMainTab('robot'); setLccRobotSubTab('tasks')">任务管理</button>
              <button onclick="clearLccChat(${r.id})">清屏</button>
            </div>
          </div>

          <div class="lcc-chat-stream" id="lcc-chat-stream">
            ${renderLccChatStream(r)}
          </div>

          <form class="lcc-chat-input-bar" onsubmit="submitLccChatMsg(event, ${r.id})">
            <input id="lccChatInput" placeholder="输入消息..." maxlength="200" autocomplete="off" required>
            <button type="submit">发送</button>
          </form>
        </section>
      </aside>

      <!-- 右栏：实时卡片与多功能工作台 -->
      <main class="lcc-right-col">
        <!-- 4张顶部实时卡片 (高度对齐左侧大视频窗口) -->
        <div class="lcc-cards-row">
          <!-- 卡片 1: 实时数据 (3x3网格，带左侧立体色标) -->
          <div class="lcc-card lcc-data-card">
            <div class="lcc-card-head">
              <div class="lcc-data-head-left">
                <span class="lcc-data-title">实时数据</span>
                <span class="lcc-stat-cat cyan"><i>●</i> 互动</span>
                <span class="lcc-stat-cat green"><i>●</i> 成交</span>
                <span class="lcc-stat-cat orange"><i>●</i> 退款</span>
              </div>
              <div class="lcc-data-head-right">
                <button class="lcc-head-icon-btn" onclick="render()" title="刷新实时数据">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
                </button>
                <button class="lcc-head-icon-btn" onclick="toast('已切换数据指标概览')" title="数据指标概览">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
            <div class="lcc-grid-3x3">
              <div class="lcc-metric-cell cell-cyan">
                <label>评论记录（最多80条）</label>
                <b>${(adminMessagesByRoom.get(Number(r.id)) || []).length}</b>
              </div>
              <div class="lcc-metric-cell cell-teal">
                <label>弹幕人数</label>
                <b>—</b>
              </div>
              <div class="lcc-metric-cell cell-pink">
                <label>红包金额</label>
                <b>¥0.00</b>
              </div>
              <div class="lcc-metric-cell cell-green">
                <label>成交金额</label>
                <b>¥0.00</b>
              </div>
              <div class="lcc-metric-cell cell-lime">
                <label>成交订单</label>
                <b>0</b>
              </div>
              <div class="lcc-metric-cell cell-amber">
                <label>成交人数</label>
                <b>0</b>
              </div>
              <div class="lcc-metric-cell cell-orange">
                <label>成交转化率</label>
                <b>0.00%</b>
              </div>
              <div class="lcc-metric-cell cell-slate">
                <label>退款订单</label>
                <b>0</b>
              </div>
              <div class="lcc-metric-cell cell-red">
                <label>退款金额</label>
                <b>¥0.00</b>
              </div>
            </div>
          </div>

          <!-- 卡片 2: 在线人数 (带紫色折线渐变图) -->
          <div class="lcc-card">
            <div class="lcc-card-head">
              <span class="lcc-card-title-strong">在线人数 <small style="color:#8b5cf6;font-size:11px;font-weight:600">● 实时</small></span>
            </div>
            <div class="lcc-online-chart-box">
              <div class="lcc-online-num">${r.onlineCount || 1}</div>
              <svg viewBox="0 0 320 90" class="lcc-trend-svg" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lccPurpleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.38"/>
                    <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.0"/>
                  </linearGradient>
                </defs>
                <path d="M 0 85 Q 90 85 150 85 T 280 20 L 320 18 L 320 90 L 0 90 Z" fill="url(#lccPurpleGrad)" />
                <path d="M 0 85 Q 90 85 150 85 T 280 20 L 320 18" fill="none" stroke="#8b5cf6" stroke-width="2.5" />
              </svg>
            </div>
          </div>

          <!-- 卡片 3: 实时连麦 -->
          <div class="lcc-card">
            <div class="lcc-card-head">
              <span class="lcc-card-title-strong">实时连麦</span>
              <span class="lcc-tag-pill">等待主播接入</span>
            </div>
            <div class="lcc-card-empty">
              <p>${r.connectEnabled ? '主播连麦服务就绪，暂无观众申请' : '当前场次未开启实时连麦。请配置平台 TRTC 参数开启直播间连麦。'}</p>
            </div>
          </div>

          <!-- 卡片 4: 商品销量榜 -->
          <div class="lcc-card">
            <div class="lcc-card-head">
              <span class="lcc-card-title-strong">商品销量榜 <small style="font-size:12px;opacity:0.7">ⓘ</small></span>
            </div>
            <div class="lcc-card-empty">
              <svg class="lcc-card-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <b>暂无销量</b>
              <p>本场未成交的商品会出现在这里</p>
            </div>
          </div>
        </div>

        <!-- 下方标签面板 (Main Tabs: 仅保留在线观众、商品管理、弹幕机器人、邀请记录) -->
        <div class="lcc-tabs-container">
          <nav class="lcc-main-nav">
            ${['在线观众', '商品管理', '弹幕机器人', '邀请记录'].map(tab => {
              const tabKey = tab === '弹幕机器人' ? 'robot' : tab;
              return `<button class="lcc-nav-tab ${currentLccMainTab === tabKey ? 'active' : ''}" onclick="switchLccMainTab('${tabKey}')">${tab}</button>`;
            }).join('')}
          </nav>

          <div class="lcc-tab-content">
            ${renderLccTabContent(r)}
          </div>
        </div>
      </main>
    </div>
  </div>`;
}

function switchLccMainTab(tab) {
  currentLccMainTab = tab;
  render();
}

function setLccRobotSubTab(subTab) {
  currentLccSubTab = subTab;
  render();
}

const adminMessagesByRoom = new Map();
const adminMessageLoads = new Set();

async function loadAdminRoomMessages(roomId) {
  if (adminMessageLoads.has(roomId)) return;
  adminMessageLoads.add(roomId);
  try {
    const response = await fetch(adminApiPath(`/api/admin/rooms/${roomId}/messages`), { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error(`评论读取失败 (${response.status})`);
    adminMessagesByRoom.set(roomId, await response.json());
    const stream = $('#lcc-chat-stream');
    if (stream && page === 'control' && Number(room().id) === Number(roomId)) {
      stream.innerHTML = renderLccChatStream(room());
      stream.scrollTop = stream.scrollHeight;
    } else if (page === 'comments' && selectedServerRoomId() === Number(roomId)) render();
  } catch (error) { console.warn(error.message); }
  finally { adminMessageLoads.delete(roomId); }
}

// 弹幕聊天室实时消息流渲染
function renderLccChatStream(r) {
  const roomId = Number(r.id);
  const msgs = adminMessagesByRoom.get(roomId) || [];
  if (!adminMessagesByRoom.has(roomId)) loadAdminRoomMessages(roomId);
  if (!msgs.length) {
    return `<div style="text-align:center;color:#64748b;font-size:12px;padding:20px 0">等待观众评论或服务器机器人发言…</div>`;
  }
  return msgs.slice(-80).map(c => {
    const isStaff = c.author === '运营人员' || c.author === '管理员';
    const isRobot = c.author.startsWith('机器人·');
    return `
      <div class="lcc-chat-msg">
        <span class="lcc-msg-badge ${isStaff ? 'staff' : 'viewer'}">${isStaff ? '管理员' : (isRobot ? '机器人' : '观众')}</span>
        <span class="lcc-msg-uid">${c.id}</span>
        <span class="lcc-msg-author">${E(c.author || '美业同行')}</span>
        <span class="lcc-msg-text">${E(c.content)}</span>
      </div>`;
  }).join('');
}

async function submitLccChatMsg(e, roomId) {
  e.preventDefault();
  const input = $('#lccChatInput');
  const text = String(input.value || '').trim();
  if (!text) return;
  try {
    const headers = await csrfHeaders(); headers.set('Content-Type', 'application/json');
    const response = await fetch(adminApiPath(`/api/rooms/${roomId}/messages`), { method: 'POST', credentials: 'same-origin', headers, body: JSON.stringify({ author: '管理员', content: text }) });
    if (!response.ok) throw new Error(`评论发送失败 (${response.status})`);
    input.value = '';
    await loadAdminRoomMessages(roomId);
  } catch (error) { toast(error.message); }
}

async function clearLccChat(roomId) {
  try {
    const headers = await csrfHeaders();
    const response = await fetch(adminApiPath(`/api/admin/rooms/${roomId}/messages`), { method: 'DELETE', credentials: 'same-origin', headers });
    if (!response.ok) throw new Error(`清屏失败 (${response.status})`);
    adminMessagesByRoom.delete(Number(roomId));
    render(); toast('本场数据库评论已清空');
  } catch (error) { toast(error.message); }
}

function toggleLiveFromLcc(id) {
  const r = db.rooms.find(x => x.id === Number(id));
  if (!r) return;
  if (r.status === '直播中') {
    confirmCloseLiveRoom(r.id);
  } else {
    startLiveRoom(r.id);
  }
}

// 渲染右下角各主标签内容（仅支持：在线观众、商品管理、弹幕机器人、邀请记录）
function renderLccTabContent(r) {
  if (currentLccMainTab === '在线观众') {
    return renderLccAudienceTab(r);
  }
  if (currentLccMainTab === '商品管理') {
    return renderLccGoodsTab(r);
  }
  if (currentLccMainTab === '邀请记录') {
    return renderLccInvitesTab(r);
  }
  return renderLccRobotTab(r);
}

// 1. 在线观众模块
function renderLccAudienceTab(r) {
  if (!db.onlineAudiences || !db.onlineAudiences.length) {
    db.onlineAudiences = getInitialOnlineAudiences();
  }
  let list = db.onlineAudiences;
  if (lccAudienceRoleFilter && lccAudienceRoleFilter !== '全部') {
    if (lccAudienceRoleFilter === '禁言') {
      list = list.filter(a => a.muted);
    } else {
      list = list.filter(a => a.role === lccAudienceRoleFilter);
    }
  }
  if (lccAudienceFilterText) {
    const q = lccAudienceFilterText.toLowerCase();
    list = list.filter(a => (a.name || '').toLowerCase().includes(q) || (a.id || '').includes(q) || (a.ip && a.ip.toLowerCase().includes(q)));
  }

  const onlineCount = db.onlineAudiences.filter(a => !a.muted).length;
  const mutedCount = db.onlineAudiences.filter(a => a.muted).length;
  const roles = ['全部', 'VIP店长', '认证合伙人', '主播/讲师', '核心学员', '普通观众', '禁言'];

  return `
    <div class="lcc-task-bar" style="margin-bottom:12px">
      <div class="lcc-task-pills">
        <span class="lcc-pill green">🟢 在线 ${r.onlineAudience || onlineCount} 人</span>
        <span class="lcc-pill blue">👥 累计进房 ${r.totalAudience || 1286} 人</span>
        ${mutedCount ? `<span class="lcc-pill rose">🔇 禁言中 ${mutedCount} 人</span>` : ''}
        <span class="lcc-pill gray">本场评论 ${(adminMessagesByRoom.get(Number(r.id)) || []).length} 条</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <select class="lcc-select-filter" onchange="lccAudienceRoleFilter=this.value;render()">
          ${roles.map(role => `<option value="${role}" ${lccAudienceRoleFilter === role ? 'selected' : ''}>${role === '全部' ? '全部角色' : role}</option>`).join('')}
        </select>
        <input class="lcc-task-search" placeholder="搜索观众昵称/UID/地区" value="${E(lccAudienceFilterText)}" oninput="lccAudienceFilterText=this.value.trim();render()">
        <button class="lcc-tool-btn" onclick="refreshAudienceList()" style="height:32px;display:flex;align-items:center;gap:4px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          刷新
        </button>
      </div>
    </div>

    <table class="lcc-template-table">
      <thead>
        <tr>
          <th>观众信息</th>
          <th>身份标签</th>
          <th>归属地区</th>
          <th>进房时间</th>
          <th>停留时长</th>
          <th>发言 / 点赞</th>
          <th>状态</th>
          <th style="text-align:right">管理操作</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(a => `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:18px">${a.avatar || '👤'}</span>
                <div>
                  <b style="color:var(--lcc-text)">${E(a.name)}</b>
                  <div style="font-size:11px;color:var(--lcc-text-muted)">UID: ${a.id}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="lcc-task-tag ${(a.role || '').includes('店长') || (a.role || '').includes('合伙人') ? 'purple' : ((a.role || '').includes('讲师') ? 'running' : ((a.role || '').includes('学员') ? 'blue' : 'gray'))}">
                ${E(a.role || '观众')}
              </span>
            </td>
            <td><span style="color:var(--lcc-text-muted)">${E(a.ip || '全国')}</span></td>
            <td><span style="color:var(--lcc-text);font-family:monospace">${a.joinTime}</span></td>
            <td><span style="color:#0284c7;font-weight:600">${a.duration}</span></td>
            <td>
              <span style="color:var(--lcc-text-muted)">发言 <b style="color:var(--lcc-text)">${a.chatCount || 0}</b> · 点赞 <b style="color:#f59e0b">${a.likeCount || 0}</b></span>
            </td>
            <td>
              ${a.muted 
                ? '<span class="lcc-task-tag paused" style="background:#881337;color:#fecdd3">已禁言</span>' 
                : '<span class="lcc-task-tag running">在线</span>'}
            </td>
            <td style="text-align:right">
              <button class="link ${a.muted ? '' : 'danger'}" onclick="toggleMuteAudience('${a.id}')">${a.muted ? '解禁' : '禁言'}</button>
              <span style="color:#334155;margin:0 4px">|</span>
              <button class="link danger" onclick="kickAudience('${a.id}')">踢出</button>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="8" style="text-align:center;padding:36px;color:#64748b">未查找到匹配的在线观众</td></tr>'}
      </tbody>
    </table>
  `;
}

// 2. 商品管理模块
function renderLccGoodsTab(r) {
  const prods = (r.goods || []).map(gid => db.products.find(p => p.id === gid)).filter(Boolean);
  let list = prods;
  if (lccGoodsFilterText) {
    const q = lccGoodsFilterText.toLowerCase();
    list = list.filter(p => (p.name || '').toLowerCase().includes(q) || (p.tag && p.tag.toLowerCase().includes(q)) || (p.category && p.category.toLowerCase().includes(q)));
  }

  const explainingProd = prods.find(p => p.id === r.explainingId);

  return `
    <div class="lcc-task-bar" style="margin-bottom:12px">
      <div class="lcc-task-pills">
        <span class="lcc-pill green">橱窗商品 ${prods.length} 件</span>
        ${explainingProd ? `<span class="lcc-pill rose">🔥 讲解中：${E(explainingProd.name)}</span>` : '<span class="lcc-pill gray">暂无商品正在讲解</span>'}
        <span class="lcc-pill blue">本场预估GMV ¥12,680</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input class="lcc-task-search" placeholder="搜索橱窗商品/标签" value="${E(lccGoodsFilterText)}" oninput="lccGoodsFilterText=this.value.trim();render()">
        <button class="lcc-create-task-btn small" onclick="openAddGoodsToRoomModal(${r.id})" style="padding:6px 14px;background:#0284c7;color:#fff;border:0;border-radius:4px;cursor:pointer;font-weight:600;white-space:nowrap">＋ 关联商品到橱窗</button>
        <button class="lcc-tool-btn" onclick="editProduct()" style="height:32px">＋ 发布新商品</button>
      </div>
    </div>

    <table class="lcc-template-table">
      <thead>
        <tr>
          <th style="width:50px">序号</th>
          <th>商品名称</th>
          <th>分类 / 标签</th>
          <th>售价 / 原价</th>
          <th>库存</th>
          <th>本场销量</th>
          <th>讲解状态</th>
          <th style="text-align:right">操作</th>
        </tr>
      </thead>
      <tbody>
        ${list.map((p, idx) => {
          const isExplaining = r.explainingId === p.id;
          return `
            <tr style="${isExplaining ? 'background:#1e1b4b30' : ''}">
              <td style="color:#64748b;font-weight:600">${idx + 1}</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-size:20px">${p.type === '课程' ? '📚' : (p.type === '服务券' ? '💆' : '🧴')}</span>
                  <div>
                    <b style="color:var(--lcc-text)">${E(p.name)}</b>
                    <div style="font-size:11px;color:var(--lcc-text-muted)">商品ID: ${p.id}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="lcc-task-tag blue">${E(p.category || '护肤产品')}</span>
                ${p.tag ? `<span class="lcc-task-tag running" style="margin-left:4px">${E(p.tag)}</span>` : ''}
              </td>
              <td>
                <b style="color:#f43f5e;font-size:14px">¥${p.price}</b>
                ${p.original ? `<span style="color:#64748b;text-decoration:line-through;font-size:11px;margin-left:4px">¥${p.original}</span>` : ''}
              </td>
              <td><span style="color:${p.stock < 10 ? '#f43f5e' : '#cbd5e1'}">${p.stock}</span></td>
              <td><b style="color:#10b981">${p.sold || 0}</b></td>
              <td>
                ${isExplaining 
                  ? '<span class="lcc-task-tag running" style="background:#be123c;color:#fff">🔥 正在讲解</span>' 
                  : '<span class="lcc-task-tag gray">待讲解</span>'}
              </td>
              <td style="text-align:right">
                <button class="link" style="color:${isExplaining ? '#f59e0b' : '#38bdf8'}" onclick="toggleExplainingProduct(${r.id}, ${p.id})">
                  ${isExplaining ? '结束讲解' : '开始讲解'}
                </button>
                <span style="color:#334155;margin:0 4px">|</span>
                <button class="link" onclick="topProductInRoom(${r.id}, ${p.id})">置顶</button>
                <span style="color:#334155;margin:0 4px">|</span>
                <button class="link" onclick="editProduct(${p.id})">编辑</button>
                <span style="color:#334155;margin:0 4px">|</span>
                <button class="link danger" onclick="removeProductFromRoom(${r.id}, ${p.id})">移除</button>
              </td>
            </tr>
          `;
        }).join('') || '<tr><td colspan="8" style="text-align:center;padding:36px;color:#64748b">当前直播间暂未关联橱窗商品，可点击上方【关联商品到橱窗】进行添加</td></tr>'}
      </tbody>
    </table>
  `;
}

// 3. 邀请记录模块
function renderLccInvitesTab(r) {
  if (!db.inviteRecords || !db.inviteRecords.length) {
    db.inviteRecords = getInitialInviteRecords();
  }
  let list = db.inviteRecords;
  if (lccInviteStatusFilter && lccInviteStatusFilter !== '全部') {
    if (lccInviteStatusFilter === '已结算') {
      list = list.filter(item => item.isSettled);
    } else if (lccInviteStatusFilter === '待结算') {
      list = list.filter(item => !item.isSettled);
    } else {
      list = list.filter(item => (item.status || '').includes(lccInviteStatusFilter));
    }
  }
  if (lccInviteFilterText) {
    const q = lccInviteFilterText.toLowerCase();
    list = list.filter(item => (item.inviter || '').toLowerCase().includes(q) || (item.invitee || '').toLowerCase().includes(q) || (item.channel || '').toLowerCase().includes(q) || (item.inviterUid || '').includes(q) || (item.inviteeUid || '').includes(q));
  }

  const totalInvited = db.inviteRecords.length;
  const convertedCount = db.inviteRecords.filter(item => item.status === '已下单').length;

  return `
    <div class="lcc-task-bar" style="margin-bottom:12px">
      <div class="lcc-task-pills">
        <span class="lcc-pill green">👥 累计邀请 1,286 人次</span>
        <span class="lcc-pill blue">⚡ 本场裂变 ${totalInvited} 人</span>
        <span class="lcc-pill rose">🛒 转化下单 ${convertedCount} 单</span>
        <span class="lcc-pill gray">💰 预估佣金 ¥286.50</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <select class="lcc-select-filter" onchange="lccInviteStatusFilter=this.value;render()">
          ${['全部', '已下单', '已进房', '待结算', '已结算'].map(s => `<option value="${s}" ${lccInviteStatusFilter === s ? 'selected' : ''}>${s === '全部' ? '全部状态' : s}</option>`).join('')}
        </select>
        <input class="lcc-task-search" placeholder="搜索邀请人/被邀请人/渠道" value="${E(lccInviteFilterText)}" oninput="lccInviteFilterText=this.value.trim();render()">
        <button class="lcc-tool-btn" onclick="toast('已同步最新分销裂变与邀请数据')" style="height:32px;display:flex;align-items:center;gap:4px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          刷新
        </button>
      </div>
    </div>

    <table class="lcc-template-table">
      <thead>
        <tr>
          <th>邀请人 (推广员)</th>
          <th>分享渠道 / 来源</th>
          <th>受邀观众 (新客)</th>
          <th>进房时间</th>
          <th>转化深度</th>
          <th>奖励归属</th>
          <th>结算状态</th>
          <th style="text-align:right">操作</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(item => `
          <tr>
            <td>
              <div>
                <b style="color:var(--lcc-text)">${E(item.inviter)}</b>
                <div style="font-size:11px;color:var(--lcc-text-muted)">UID: ${item.inviterUid}</div>
              </div>
            </td>
            <td>
              <span class="lcc-task-tag blue">${E(item.channel)}</span>
            </td>
            <td>
              <div>
                <b style="color:var(--lcc-text)">${E(item.invitee)}</b>
                <div style="font-size:11px;color:var(--lcc-text-muted)">UID: ${item.inviteeUid}</div>
              </div>
            </td>
            <td><span style="color:#94a3b8;font-family:monospace">${item.time}</span></td>
            <td>
              <span class="lcc-task-tag ${item.status === '已下单' ? 'running' : ((item.status || '').includes('30分') ? 'purple' : 'gray')}">
                ${E(item.status)}
              </span>
            </td>
            <td>
              <b style="color:${(item.reward || '').includes('佣金') ? '#f43f5e' : '#f59e0b'}">${E(item.reward)}</b>
            </td>
            <td>
              ${item.isSettled 
                ? '<span class="lcc-task-tag running">已结算</span>' 
                : '<span class="lcc-task-tag paused" style="background:#78350f;color:#fde68a">待结算</span>'}
            </td>
            <td style="text-align:right">
              ${!item.isSettled 
                ? `<button class="link" onclick="settleInviteRecord('${item.id}')">手动结算</button>` 
                : '<span style="color:#10b981;font-size:12px">✓ 结算完成</span>'}
            </td>
          </tr>
        `).join('') || '<tr><td colspan="8" style="text-align:center;padding:36px;color:#64748b">未查找到匹配的邀请记录</td></tr>'}
      </tbody>
    </table>
  `;
}

// 4. 弹幕机器人模块
function renderLccRobotTab(r) {
  if (!serverRobotStateLoaded) {
    if (!serverRobotStateLoading && !serverRobotStateError) loadServerRobotState();
    if (serverRobotStateError) return `<div class="lcc-task-list-view"><p>${E(serverRobotStateError)}</p>${serverRobotStateError.includes('未登录') ? adminLoginLink() : ''}<button onclick="serverRobotStateError='';loadServerRobotState()">重试读取机器人配置</button></div>`;
    return '<div class="lcc-task-list-view">正在读取服务器机器人配置…</div>';
  }
  // 弹幕机器人标签页 (四大子标签: 配置任务 | 任务列表 | 机器人模板 | + 话术模板)
  const sub = currentLccSubTab || 'tasks';
  const runningCount = (db.robotTasks || []).filter(t => t.active).length;
  const scheduledCount = (db.robotTasks || []).filter(t => t.execType === 'scheduled').length;

  const subNav = `
    <div class="lcc-subtabs">
      <button class="lcc-subtab-btn ${sub === 'config' ? 'active' : ''}" onclick="setLccRobotSubTab('config')" style="font-weight:600">◆ 配置任务</button>
      <button class="lcc-subtab-btn ${sub === 'tasks' ? 'active' : ''}" onclick="setLccRobotSubTab('tasks')">任务列表 <span class="lcc-tab-badge">${runningCount}运行中</span></button>
      <button class="lcc-subtab-btn ${sub === 'robots' ? 'active' : ''}" onclick="setLccRobotSubTab('robots')">机器人模板</button>
      <button class="lcc-subtab-btn ${sub === 'scripts' ? 'active' : ''}" onclick="setLccRobotSubTab('scripts')">+ 话术模板</button>
      <button class="lcc-subtab-btn ${sub === 'names' ? 'active' : ''}" onclick="setLccRobotSubTab('names')">观众昵称库</button>
    </div>`;

  if (sub === 'config') {
    // 图三：新建任务
    const templateOpts = db.robotTemplates.map(t => `<option value="${t.id}">${E(t.name)} (${t.robotCount}机器人 · ${E(t.scriptTemplate)})</option>`).join('');
    const goodsOpts = (r.goods || []).map(gid => {
      const p = db.products.find(x => x.id === gid);
      return p ? `<option value="${p.id}">${E(p.name)} (¥${p.price})</option>` : '';
    }).join('');

    return subNav + `
      <div class="lcc-robot-form-card">
        <h4>新建任务</h4>
        <p class="sub">支持同时创建多个任务，可立即执行或定时执行</p>
        <form onsubmit="submitLccCreateRobotTask(event, ${r.id})">
          <div class="lcc-field">
            <label>机器人模板</label>
            <select name="templateId" required>
              ${templateOpts}
            </select>
          </div>
          <div class="lcc-field">
            <label>关联商品</label>
            <select name="goodsId">
              <option value="">不关联（按模板设置的间隔发送）</option>
              ${goodsOpts}
            </select>
          </div>
          <div class="lcc-field">
            <label>执行方式</label>
            <div class="lcc-radio-group">
              <label class="lcc-radio-label"><input type="radio" name="execType" value="immediate" checked onchange="$('#schedTimeRow').hidden=true"> <span>立即执行</span></label>
              <label class="lcc-radio-label"><input type="radio" name="execType" value="scheduled" onchange="$('#schedTimeRow').hidden=false"> <span>定时执行</span></label>
            </div>
            <div id="schedTimeRow" hidden style="margin-top:6px">
              <input type="datetime-local" name="schedTime" value="${localTime(Date.now() + 600000).replace(' ', 'T')}">
            </div>
          </div>
          <button type="submit" class="lcc-create-task-btn">+ 创建立即任务</button>
        </form>
      </div>`;
  }

  if (sub === 'tasks') {
    // 图一：任务列表
    const tasks = (db.robotTasks || []).filter(t => !lccTaskFilterText || t.name.includes(lccTaskFilterText));

    return subNav + `
      <div class="lcc-task-list-view">
        <div class="lcc-task-bar">
          <div class="lcc-task-pills">
            <span class="lcc-pill green">${runningCount} 运行中</span>
            <span class="lcc-pill blue">${scheduledCount} 待定时</span>
            <span class="lcc-pill gray">${db.robotTasks.length} 个任务</span>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <input class="lcc-task-search" placeholder="搜索任务名称" value="${E(lccTaskFilterText)}" oninput="lccTaskFilterText=this.value.trim();render()">
            <button class="lcc-create-task-btn small" onclick="setLccRobotSubTab('config')" style="padding:6px 14px;background:#059669;color:#fff;border:0;border-radius:4px;cursor:pointer;font-weight:600;white-space:nowrap">＋ 新建任务</button>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px">
          ${tasks.map(t => `
            <div class="lcc-task-card">
              <div class="lcc-task-card-left">
                <div class="lcc-task-title-row">
                  <b>${E(t.name)}</b>
                  <span class="lcc-task-tag ${t.active ? 'running' : 'paused'}">${t.active ? '运行中' : '已暂停'}</span>
                  <span class="lcc-task-tag blue">${E(t.scope || '全部')}</span>
                </div>
                <div class="lcc-task-meta">
                  <span>${t.robotCount || 100} 机器人</span>
                  <span class="sep">|</span>
                  <span>${E(t.intervalDesc || '2~5 秒（随机）间隔')}</span>
                  <span class="sep">|</span>
                  <span>${t.loop !== false ? '循环执行' : '单次执行'}</span>
                  <span class="sep">|</span>
                  <span>通用模式</span>
                </div>
              </div>
              <div class="lcc-task-actions">
                <button onclick="toggleRobotTask(${t.id})">${t.active ? '暂停' : '启动'}</button>
                <button class="danger" onclick="deleteRobotTask(${t.id})">停止</button>
              </div>
            </div>
          `).join('') || '<div style="color:#64748b;text-align:center;padding:24px">暂无机器人任务，可点击上方【配置任务】新建任务</div>'}
        </div>
      </div>`;
  }

  if (sub === 'robots') {
    // 机器人模板管理
    return subNav + `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <span style="font-size:13px;color:#94a3b8">机器人模板管理（定义机器人数、话术模板与发送间隔）</span>
        <button class="lcc-tool-btn" onclick="openRobotTemplateModal()">＋ 新建机器人模板</button>
      </div>
      <table class="lcc-template-table">
        <thead><tr><th>名称</th><th>机器人数</th><th>话术模板</th><th>发送间隔</th><th>循环执行</th><th>操作</th></tr></thead>
        <tbody>
          ${db.robotTemplates.map(t => `
            <tr>
              <td><b>${E(t.name)}</b></td>
              <td>${t.robotCount}</td>
              <td><span class="lcc-pill blue">${E(t.scriptTemplate)}</span></td>
              <td>${t.intervalMin || 2}~${t.intervalMax || 5} 秒 (随机)</td>
              <td>${t.loop !== false ? '循环执行' : '单次'}</td>
              <td>
                <button class="link" onclick="openRobotTemplateModal(${t.id})">编辑</button>
                <button class="link danger" onclick="deleteRobotTemplate(${t.id})">删除</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }

  if (sub === 'scripts') {
    // 话术模板管理
    return subNav + `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <span style="font-size:13px;color:#94a3b8">话术模板管理（支持每行一条话术，循环发表弹幕）</span>
        <button class="lcc-tool-btn" onclick="openScriptTemplateModal()">＋ 新建话术模板</button>
      </div>
      <table class="lcc-template-table">
        <thead><tr><th>名称</th><th>话术条数</th><th>内容预览</th><th>操作</th></tr></thead>
        <tbody>
          ${db.scriptTemplates.map(st => `
            <tr>
              <td><b>${E(st.name)}</b></td>
              <td>${(st.lines || []).length} 条</td>
              <td style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#94a3b8">${E((st.lines || []).slice(0, 3).join('；'))}...</td>
              <td>
                <button class="link" onclick="openScriptTemplateModal(${st.id})">编辑</button>
                <button class="link danger" onclick="deleteScriptTemplate(${st.id})">删除</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }

  if (sub === 'names') {
    return subNav + `
      <form class="lcc-robot-form-card" onsubmit="saveServerRobotNames(event)">
        <h4>观众昵称库</h4>
        <p class="sub">每行一个观众昵称。新建机器人任务时会随机分配，昵称在该任务内保持稳定；后台评论仍显示机器人编号。</p>
        <div class="lcc-field"><label for="serverRobotNames">昵称列表</label>
          <textarea id="serverRobotNames" name="names" rows="14" maxlength="20480" required style="width:100%;box-sizing:border-box;font:inherit;line-height:1.6">${E((db.robotNames || []).join('\n'))}</textarea>
        </div>
        <button type="submit" class="lcc-create-task-btn">保存昵称库</button>
      </form>`;
  }
}

async function saveServerRobotNames(event) {
  event.preventDefault();
  const names = String(new FormData(event.target).get('names') || '').split(/\r?\n/).map(name => name.trim()).filter(Boolean);
  if (!names.length) return toast('请至少填写一个昵称');
  try {
    await robotAdminMutation('/names', 'PUT', { names });
    render();
    toast(`昵称库已保存，共 ${names.length} 个昵称`);
  } catch (error) { toast(error.message); }
}

// 在线观众与商品管理、邀请记录交互函数
function toggleMuteAudience(uid) {
  const aud = (db.onlineAudiences || []).find(a => a.id === uid);
  if (!aud) return;
  aud.muted = !aud.muted;
  persist();
  render();
  toast(aud.muted ? `已对【${aud.name}】执行禁言` : `已解除【${aud.name}】的禁言`);
}

function kickAudience(uid) {
  const aud = (db.onlineAudiences || []).find(a => a.id === uid);
  if (!aud) return;
  if (!confirm(`确定将观众【${aud.name}】(UID:${aud.id}) 移出当前直播间吗？`)) return;
  db.onlineAudiences = db.onlineAudiences.filter(a => a.id !== uid);
  persist();
  render();
  toast(`已将【${aud.name}】移出直播间`);
}

function refreshAudienceList() {
  toast('已刷新实时在线观众列表');
  render();
}

function toggleExplainingProduct(roomId, prodId) {
  const r = db.rooms.find(x => x.id === roomId);
  if (!r) return;
  if (r.explainingId === prodId) {
    r.explainingId = null;
    toast('已结束该商品讲解');
  } else {
    r.explainingId = prodId;
    const p = db.products.find(x => x.id === prodId);
    toast(`正在讲解：${p ? p.name : '商品'}`);
  }
  persist();
  render();
}

function topProductInRoom(roomId, prodId) {
  const r = db.rooms.find(x => x.id === roomId);
  if (!r) return;
  const list = (r.goods || []).filter(id => id !== prodId);
  r.goods = [prodId, ...list];
  persist();
  render();
  toast('商品已置顶到橱窗首位');
}

function removeProductFromRoom(roomId, prodId) {
  const r = db.rooms.find(x => x.id === roomId);
  if (!r) return;
  r.goods = (r.goods || []).filter(id => id !== prodId);
  if (r.explainingId === prodId) r.explainingId = null;
  persist();
  render();
  toast('已从橱窗移除商品');
}

function openAddGoodsToRoomModal(roomId) {
  const r = db.rooms.find(x => x.id === roomId);
  if (!r) return;
  const currentGoods = new Set(r.goods || []);
  const content = `
    <div style="padding:16px 20px 20px;max-width:560px;width:100%">
      <h3 style="margin:0 0 8px;font-size:16px;color:var(--lcc-text)">关联直播间橱窗商品</h3>
      <p style="margin:0 0 16px;font-size:12px;color:var(--lcc-text-muted)">勾选需要在此直播间展示并供观众购买的商品</p>
      <div style="max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px">
        ${db.products.map(p => {
          const checked = currentGoods.has(p.id) ? 'checked' : '';
          return `
            <label style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--lcc-header-bg);border:1px solid var(--lcc-card-border);border-radius:6px;cursor:pointer">
              <input type="checkbox" name="goodsSelect" value="${p.id}" ${checked} style="width:16px;height:16px;accent-color:#0284c7">
              <div style="flex:1">
                <div style="font-size:13px;font-weight:600;color:var(--lcc-text)">${E(p.name)}</div>
                <div style="font-size:12px;color:var(--lcc-text-muted)">分类: ${E(p.category)} · 库存: ${p.stock} · 售价: <span style="color:#f43f5e;font-weight:600">¥${p.price}</span></div>
              </div>
              <span class="lcc-task-tag ${p.active ? 'running' : 'paused'}">${p.active ? '已上架' : '已下架'}</span>
            </label>
          `;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
        <button class="lcc-dialog-btn cancel" onclick="closeDialog()">取消</button>
        <button class="lcc-dialog-btn submit" onclick="saveRoomGoods(${roomId})">保存橱窗商品</button>
      </div>
    </div>
  `;
  modal('关联橱窗商品', content);
}

function saveRoomGoods(roomId) {
  const r = db.rooms.find(x => x.id === roomId);
  if (!r) return;
  const checkboxes = document.querySelectorAll('input[name="goodsSelect"]:checked');
  r.goods = Array.from(checkboxes).map(cb => Number(cb.value));
  persist();
  closeDialog();
  render();
  toast(`已更新本场橱窗商品（共 ${r.goods.length} 件）`);
}

function settleInviteRecord(id) {
  const item = (db.inviteRecords || []).find(x => x.id === id);
  if (!item) return;
  item.isSettled = true;
  persist();
  render();
  toast(`已结算 ${item.inviter} 的邀请奖励（${item.reward}）`);
}

async function submitLccCreateRobotTask(e, roomId) {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const templateId = Number(f.get('templateId'));
  const template = db.robotTemplates.find(t => t.id === templateId) || db.robotTemplates[0];
  const execType = f.get('execType');
  if (!template) return toast('请先创建机器人模板');
  const scheduled = execType === 'scheduled' ? new Date(String(f.get('schedTime') || '')).toISOString() : null;
  try {
    await robotAdminMutation('/tasks', 'POST', { roomId: Number(roomId), templateId: template.id, startsAt: scheduled });
    currentLccSubTab = 'tasks';
    render();
    toast(`已在服务器创建机器人任务【${template.name}】`);
  } catch (error) { toast(error.message); }
}

async function toggleRobotTask(id) {
  const t = db.robotTasks.find(x => x.id === Number(id));
  if (!t) return;
  try {
    await robotAdminMutation(`/tasks/${id}`, 'PATCH', { active: !t.active });
    render();
    toast(!t.active ? `已在服务器恢复任务【${t.name}】` : `已在服务器暂停任务【${t.name}】`);
  } catch (error) { toast(error.message); }
}

async function deleteRobotTask(id) {
  try {
    await robotAdminMutation(`/tasks/${id}`, 'DELETE');
    render();
    toast('机器人任务已从服务器删除');
  } catch (error) { toast(error.message); }
}

/* ========================================================================== 
   分享直播间：微信服务端小程序码与真实 H5 二维码
   ========================================================================== */
let liveShareRequest = null;
const liveShareImages = new Map();

function shareApiBase(id) {
  const prefix = location.pathname.startsWith('/meiye/') ? '/meiye' : '';
  return `${prefix}/api/admin/share/rooms/${encodeURIComponent(id)}`;
}

async function shareFetch(url, signal) {
  const response = await fetch(url, {credentials: 'same-origin', cache: 'no-store', signal});
  if (response.redirected || response.status === 401 || response.status === 403 || String(response.url || '').includes('/login')) throw new Error('请先登录管理后台，再生成分享码');
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || '分享码暂不可用，请稍后重试');
  }
  return response;
}

function openLiveShareModal(id) {
  const r = db.rooms.find(x => x.id === Number(id));
  if (!r) return toast('直播间不存在');
  if (liveShareRequest) liveShareRequest.abort();
  liveShareRequest = new AbortController();
  for (const item of liveShareImages.values()) URL.revokeObjectURL(item.url);
  liveShareImages.clear();
  modal('分享直播间', `
    <div class="ops-share-modal-root" id="live-share-content">
      <div class="ops-share-banner"><div class="ops-share-banner-content">
        <h3 class="ops-share-title">${E(r.name)}</h3>
        <p class="ops-share-sub">微信扫描小程序码，打开对应直播间；H5 可通过链接或二维码分享。</p>
      </div></div>
      <div class="ops-share-cards-grid">
        <div class="ops-share-channel-card mini-card-highlight">
          <div class="ops-channel-header"><h4>小程序直播间</h4><p id="share-mini-version">正在连接微信服务…</p></div>
          <div class="ops-code-display-box"><div id="share-mini-image" role="status">正在生成小程序码…</div></div>
          <div class="ops-channel-links">
            <button type="button" class="ops-text-link" onclick="copyMiniProgramPath(${r.id})">复制页面路径</button>
            <button type="button" class="ops-text-link highlight" id="share-mini-save" disabled onclick="downloadMiniProgramPoster(${r.id})">保存小程序码</button>
          </div>
        </div>
        <div class="ops-share-channel-card h5-card">
          <div class="ops-channel-header"><h4>H5 直播间</h4><p>手机扫码或在浏览器打开</p></div>
          <div class="ops-code-display-box"><div id="share-h5-image" role="status">正在生成二维码…</div></div>
          <div class="ops-channel-links">
            <a class="ops-text-link" id="share-h5-open" hidden target="_blank" rel="noopener">打开网页</a>
            <button type="button" class="ops-text-link" id="share-h5-copy" disabled>复制链接</button>
            <button type="button" class="ops-text-link highlight" id="share-h5-save" disabled onclick="downloadH5QrPoster(${r.id})">保存二维码</button>
          </div>
        </div>
      </div>
      <div class="ops-share-footer"><a class="ops-btn-cancel" id="share-admin-login" href="${location.pathname.startsWith('/meiye/') ? '/meiye/admin' : '/admin'}" hidden>登录管理后台</a><button type="button" class="ops-btn-cancel" onclick="closeDialog()">关闭</button></div>
    </div>`);
  const root = document.getElementById('live-share-content');
  const signal = liveShareRequest.signal;
  const setError = (kind, error) => {
    if (signal.aborted || !root.isConnected) return;
    root.querySelector(`#share-${kind}-image`).textContent = error.message;
    if (error.message.includes('登录管理后台')) root.querySelector('#share-admin-login').hidden = false;
  };
  shareFetch(shareApiBase(r.id), signal).then(response => {
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('分享接口尚未部署，请联系管理员');
    return response.json();
  }).then(info => {
    if (signal.aborted || !root.isConnected) return;
    root.querySelector('#share-mini-version').textContent = `${({release:'正式版',trial:'体验版',develop:'开发版'})[info.envVersion] || '小程序'} · 微信扫码打开`;
    const open = root.querySelector('#share-h5-open');
    open.href = info.h5Url; open.hidden = false;
    const copy = root.querySelector('#share-h5-copy');
    copy.disabled = false; copy.onclick = () => copyH5LiveUrl(info.h5Url);
    for (const kind of ['mini', 'h5']) {
      const suffix = kind === 'mini' ? 'miniprogram-code' : 'h5-code';
      shareFetch(`${shareApiBase(r.id)}/${suffix}`, signal).then(response => {
        if (!response.headers.get('content-type')?.startsWith('image/')) throw new Error('分享接口未返回有效图片，请检查服务部署');
        return response.blob();
      }).then(blob => {
        if (signal.aborted || !root.isConnected) return;
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.alt = kind === 'mini' ? '微信生成的直播间小程序码' : '直播间 H5 二维码';
        img.width = 215; img.height = 215; img.src = url;
        img.onload = () => {
          if (signal.aborted || !root.isConnected) { URL.revokeObjectURL(url); return; }
          liveShareImages.set(`${r.id}:${kind}`, {url, extension: blob.type === 'image/jpeg' ? 'jpg' : 'png'});
          root.querySelector(`#share-${kind}-image`).replaceChildren(img);
          root.querySelector(`#share-${kind}-save`).disabled = false;
        };
        img.onerror = () => { URL.revokeObjectURL(url); setError(kind, new Error('分享码图片加载失败，请重试')); };
      }).catch(error => setError(kind, error));
    }
  }).catch(error => { setError('mini', error); setError('h5', error); });
}

function copyMiniProgramPath(id) { copyH5LiveUrl(`pages/watch-share/watch-share?id=${id}`); }

function copyH5LiveUrl(url) {
  if (!navigator.clipboard) return toast('请手动复制：' + url);
  navigator.clipboard.writeText(url).then(() => toast('已复制')).catch(() => toast('复制失败，请手动复制：' + url));
}

function downloadShareCode(id, kind) {
  const image = liveShareImages.get(`${id}:${kind}`);
  if (!image) return toast('分享码尚未生成，请稍后重试');
  const link = document.createElement('a');
  link.href = image.url;
  link.download = `直播间-${id}-${kind === 'mini' ? '微信小程序码' : 'H5二维码'}.${image.extension}`;
  link.click();
}
function downloadMiniProgramPoster(id) { downloadShareCode(id, 'mini'); }
function downloadH5QrPoster(id) { downloadShareCode(id, 'h5'); }

/* ==========================================================================
   图六、图七、图八：录播视频选择 (从视频文件夹选择、分钟数预览、腾讯云 COS)
   ========================================================================== */

let selectedFolder = '全部视频';

function openVideoLibraryModal(activeAssetId) {
  const folders = ['全部视频', '美业实操录播', '精品回放课程', '产品讲解教学', '腾讯云 COS 存储'];
  
  modal('选择录播视频素材', `
    <div class="ops-video-lib-modal">
      <!-- 文件夹侧栏 -->
      <aside class="ops-video-lib-sidebar">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:6px;padding-left:8px">视频文件夹</div>
        ${folders.map(f => `
          <button class="ops-folder-item ${selectedFolder === f ? 'active' : ''}" onclick="switchVideoFolder('${f}', ${activeAssetId})">
            ${f.includes('COS') ? '☁️' : '📁'} ${f}
          </button>
        `).join('')}
      </aside>

      <!-- 视频网格与操作栏 -->
      <main class="ops-video-lib-main">
        <div class="ops-video-lib-toolbar">
          <input id="videoSearchInput" placeholder="搜索录像名称或时长..." style="height:32px;padding:0 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;width:200px" oninput="renderVideoLibGrid(${activeAssetId})">
          <div class="btn-group">
            <label class="button primary small" style="margin:0;cursor:pointer">
              ＋ 上传到 COS
              <input type="file" accept="video/mp4,video/*" style="display:none" onchange="handleModalLocalUpload(this, ${activeAssetId})">
            </label>
            <button class="small" onclick="openCosSettingsModal()">☁️ 腾讯云 COS 设置</button>
          </div>
        </div>

        <div class="ops-video-lib-grid" id="opsVideoLibGrid">
          ${renderVideoLibGridHtml(activeAssetId)}
        </div>
      </main>
    </div>
  `);
  loadServerMedia().then(() => {
    const grid = $('#opsVideoLibGrid');
    if (grid) grid.innerHTML = renderVideoLibGridHtml(activeAssetId);
  }).catch(error => {
    serverMediaError = error.message;
    const grid = $('#opsVideoLibGrid');
    if (grid && selectedFolder === '腾讯云 COS 存储') grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#b45309;padding:40px">${E(serverMediaError)}</div>`;
  });
}

function switchVideoFolder(f, activeAssetId) {
  selectedFolder = f;
  const grid = $('#opsVideoLibGrid');
  if (grid) grid.innerHTML = renderVideoLibGridHtml(activeAssetId);
  $$('.ops-folder-item').forEach(b => b.classList.toggle('active', b.textContent.includes(f)));
}

function renderVideoLibGridHtml(activeAssetId) {
  const query = $('#videoSearchInput')?.value?.trim().toLowerCase() || '';
  const filtered = db.assets.filter(a => {
    if (!a.serverId || !String(a.source || '').includes('COS')) return false;
    if (query && !a.name.toLowerCase().includes(query) && !a.duration.includes(query)) return false;
    return true;
  });

  if (!filtered.length) {
    return `<div style="grid-column:1/-1;text-align:center;color:#94a3b8;padding:40px">
      ${E(serverMediaError || 'COS 素材库暂无真实视频，请上传视频后再选择')}
    </div>`;
  }

  return filtered.map(a => `
    <div class="ops-video-card ${a.id === activeAssetId ? 'selected' : ''}">
      <div class="ops-video-thumb-box">
        <video preload="metadata" src="${roomVideoUrl(a)}"></video>
        <div class="ops-video-duration-pill">${a.duration || '28:05'}</div>
      </div>
      <div class="ops-video-card-body">
        <h4>${E(a.name)}</h4>
        <p class="meta">时长：${a.durationMinutes || a.duration} · ${a.fileSize || '180 MB'}</p>
        <p class="meta" style="color:#2563eb">来源：${a.source || '素材库'}</p>
      <div class="ops-video-card-actions">
          <button type="button" onclick="previewVideoWithMinutes(${a.id})">预览视频</button>
          <button class="primary" type="button" onclick="selectVideoForRoom(${a.id})">选择此视频</button>
        </div>
      </div>
    </div>
  `).join('');
}

function handleModalLocalUpload(input, currentId) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith('video/')) return toast('请选择有效的视频文件');
  if (file.size > 2 * 1024 * 1024 * 1024) return toast('视频文件不能超过 2 GB');
  const form = new FormData();
  form.append('file', file);
  const endpoint = location.pathname.startsWith('/meiye/') ? '/meiye/api/admin/media' : '/api/admin/media';
  const uploadStatus = document.createElement('p');
  uploadStatus.className = 'ops-upload-status';
  uploadStatus.setAttribute('role', 'status');
  uploadStatus.textContent = `正在上传 ${file.name}（${(file.size / 1048576).toFixed(1)} MB）…`;
  $('#opsVideoLibGrid')?.prepend(uploadStatus);
  csrfHeaders().then(headers => fetch(endpoint, {method: 'POST', headers, credentials: 'same-origin', body: form}))
    .then(async response => {
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.json().catch(() => ({}));
        const reason = response.status === 413 ? '服务器上传限制已拦截文件，请稍后重试或联系管理员' : response.status === 401 || response.status === 403 || response.redirected ? '请先登录管理后台' : body.message || `COS 上传失败（HTTP ${response.status}）`;
        throw new Error(reason);
      }
      return response.json();
    })
    .then(item => loadServerMedia().then(() => {
      const asset = db.assets.find(row => row.serverId === Number(item.id));
      if (asset) selectVideoForRoom(asset.id);
      toast(`已上传到腾讯云 COS：${item.name}`);
    }))
    .catch(error => {
      const status = $('#opsVideoLibGrid .ops-upload-status');
      if (status) status.textContent = error.message;
      toast(error.message);
    });
}

function previewVideoWithMinutes(assetId) {
  const a = db.assets.find(x => x.id === assetId);
  if (!a) return;
  modal(`视频预览 · ${E(a.name)}`, `
    <div style="padding:4px">
      <video controls autoplay preload="metadata" src="${roomVideoUrl(a)}" style="width:100%;max-height:480px;background:#000;border-radius:6px"></video>
      <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#334155">
        <div><b>视频名称：</b>${E(a.name)}</div>
        <div style="color:#2563eb;font-weight:700">总时长：${a.duration} (${a.durationMinutes || '分钟数'})</div>
      </div>
    </div>
  `);
}

function selectVideoForRoom(assetId) {
  const asset = db.assets.find(a => a.id === assetId);
  if (!asset) return;
  const hiddenInput = $('#ops-selected-asset-id');
  if (hiddenInput) hiddenInput.value = asset.id;

  // 更新场次表单上的已选视频卡片展示
  const displayBox = $('#ops-selected-video-display');
  if (displayBox) {
    displayBox.innerHTML = `
      <div class="ops-selected-video-card">
        <div class="ops-selected-thumb">
          <video preload="metadata" src="${roomVideoUrl(asset)}"></video>
        </div>
        <div class="ops-selected-info">
          <h4>${E(asset.name)}</h4>
          <p>时长：<b class="duration-tag">${asset.duration} (${asset.durationMinutes || '分钟数'})</b> · 大小：${asset.fileSize || '185 MB'}</p>
          <p style="color:#64748b">来源：${asset.source || '素材库'}</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button type="button" onclick="previewVideoWithMinutes(${asset.id})">预览视频</button>
          <button type="button" class="primary" onclick="openVideoLibraryModal(${asset.id})">切换视频</button>
        </div>
      </div>
    `;
  }
  closeDialog();
  toast(`已选择录播视频：${asset.name} (${asset.durationMinutes || asset.duration})`);
}

// 腾讯云 COS / OSS 设置面板
function openCosSettingsModal() {
  loadServerMedia().then(() => toast('COS 服务已连接，素材列表已同步')).catch(error => toast(error.message));
  modal('腾讯云对象存储 (COS)', `
    <div class="ops-cos-dialog">
      <div class="ops-cos-status-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        <div>
          <b>凭证由服务器安全配置</b>
          <div style="font-size:11px;color:#b45309;margin-top:2px">本页面不会读取或保存 SecretId / SecretKey</div>
        </div>
      </div>

      <div class="field"><label>Bucket</label><input readonly value="anchor-1359244810"></div>
      <div class="field"><label>地域</label><input readonly value="ap-guangzhou"></div>
      <p class="ops-note" style="margin-top:10px">上传由服务器转发到私有 COS。素材库只展示通过此后台上传登记的视频；桶内手动上传的文件不会自动出现在列表。</p>

        <div class="dialog-foot" style="margin-top:16px">
          <button type="button" onclick="closeDialog()">取消</button>
          <button class="primary" type="button" onclick="closeDialog()">完成</button>
        </div>
    </div>
  `);
}

function saveCosSettings() { toast('COS 凭证必须通过服务器环境变量配置'); }


/* ==========================================================================
   旗慧美业高保真：场次编辑弹窗、直播设置弹窗、直播间列表与企业级工作台
   ========================================================================== */

function formatDisplayTime(val, fallback = '2026-10-24 16:15:58') {
  if (!val || val === '—' || val === '-') return val || '—';
  let s = String(val).trim().replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(s)) {
    s += ':00';
  }
  return s || fallback;
}

function syncRoomModeFields(mode) {
  $$('#roomOperationsForm [data-room-mode]').forEach(sec => {
    const target = sec.getAttribute('data-room-mode');
    if (target === '伪直播（录播播放）') {
      sec.hidden = !String(mode).startsWith('伪直播');
    } else {
      sec.hidden = target !== mode;
    }
  });
}

function stepHeatValue(delta) {
  const input = $('#qihuiHeatInput');
  if (!input) return;
  const current = Number(input.value) || 0;
  input.value = Math.max(0, current + delta);
}

function renderQihuiLiveSettingsBlock(r = {}) {
  const defaultNotice = '系统提示:欢迎来到直播间!本平台提倡文明、健康、绿色的直播环境，严禁传播违法违规、低俗色情、暴力恐怖等内容。请理性消费，注意个人信息与财产安全。';
  const switches = [
    { name: 'replayEnabled', label: '回放', checked: r.replayEnabled !== false },
    { name: 'giftEnabled', label: '礼物', checked: Boolean(r.giftEnabled) },
    { name: 'onlineCountEnabled', label: '在线人数', checked: Boolean(r.onlineCountEnabled) },
    { name: 'showCumulative', label: '累计人数', checked: r.showCumulative !== false },
    { name: 'heatEnabled', label: '火力值', checked: Boolean(r.heatEnabled) },
    { name: 'connectEnabled', label: '连麦', checked: Boolean(r.connectEnabled) },
    { name: 'allowChat', label: '允许聊天', checked: r.allowChat !== false },
    { name: 'showHome', label: '显示首页', checked: r.showHome !== false }
  ];

  return `
    <!-- 观看时长奖励卡片 -->
    <div class="qihui-reward-card">
      <div class="qihui-reward-head">
        <b>观看时长奖励</b>
        <label class="qihui-switch with-text">
          <input type="checkbox" name="watchRewardEnabled" ${r.watchRewardEnabled ? 'checked' : ''} onchange="updateQihuiSwitchText(this)">
          <span class="qihui-slider"></span>
          <span class="qihui-switch-text">${r.watchRewardEnabled ? '开' : '关'}</span>
        </label>
      </div>
      <p class="qihui-reward-desc">
        观众达标后自动到账，可分别设置本场一次或每满指定时长奖励一次；暂停、离开或直播结束时停止计时。红包和余额均存入商城余额。
      </p>
    </div>

    <!-- 直播设置 -->
    <section class="qihui-modal-section">
      <div class="qihui-section-header">
        <span class="qihui-section-bar"></span>
        <h4>直播设置</h4>
      </div>
      <div class="qihui-form-rows">
        <div class="qihui-form-row">
          <label class="qihui-row-label">观看密码</label>
          <div class="qihui-row-control">
            <input type="text" name="watchPassword" value="${E(r.watchPassword || '')}" placeholder="留空则无需密码" style="max-width:340px">
          </div>
        </div>
        <div class="qihui-form-row">
          <label class="qihui-row-label">火力值</label>
          <div class="qihui-row-control">
            <div class="qihui-stepper">
              <button type="button" class="qihui-stepper-btn" onclick="stepHeatValue(-1)" aria-label="减少火力值">−</button>
              <input type="number" id="qihuiHeatInput" name="heatValue" min="0" value="${Number(r.heatValue ?? r.likes ?? 0)}">
              <button type="button" class="qihui-stepper-btn" onclick="stepHeatValue(1)" aria-label="增加火力值">+</button>
            </div>
          </div>
        </div>
        <div class="qihui-form-row align-top">
          <label class="qihui-row-label">分享介绍</label>
          <div class="qihui-row-control">
            <textarea name="shareIntro" rows="3" placeholder="请输入分享介绍">${E(r.shareIntro || '')}</textarea>
          </div>
        </div>
        <div class="qihui-form-row align-top">
          <label class="qihui-row-label">公告</label>
          <div class="qihui-row-control">
            <textarea name="systemNotice" rows="3" placeholder="请输入直播间系统提示">${E(r.systemNotice || defaultNotice)}</textarea>
          </div>
        </div>
      </div>
    </section>

    <!-- 功能开关 (对齐旗慧美业 4×2 简洁布局) -->
    <section class="qihui-modal-section">
      <div class="qihui-section-header">
        <span class="qihui-section-bar"></span>
        <h4>功能开关</h4>
      </div>
      <div class="qihui-func-switches-grid">
        ${switches.map(sw => `
          <div class="qihui-func-switch-cell">
            <span class="qihui-func-switch-label">${sw.label}</span>
            <label class="qihui-switch">
              <input type="checkbox" name="${sw.name}" ${sw.checked ? 'checked' : ''}>
              <span class="qihui-slider"></span>
            </label>
          </div>
        `).join('')}
      </div>
      <p class="qihui-func-hint">关闭后，观众端直播间内不显示「首页」入口（适用于分享扫码等场景）</p>
    </section>
  `;
}

function updateQihuiSwitchText(checkbox) {
  const txt = checkbox.parentElement?.querySelector('.qihui-switch-text');
  if (txt) txt.textContent = checkbox.checked ? '开' : '关';
}

function roomForm(r = {}, assetId) {
  const isEdit = Boolean(r.id);
  const roomKey = r.id || pendingRoomId || uid();
  const mode = r.mode || '录播';
  const selectedAsset = db.assets.find(a => a.id === Number(assetId || r.asset)) || db.assets[0];
  const isCurrentlyPlaying = isEdit && Boolean(r.status === '直播中');
  const startVal = (r.time || formatLocalDateTime(new Date(Date.now() + 300000))).replace(' ', 'T').slice(0, 16);

  return `
  <form id="roomOperationsForm" class="qihui-edit-room-form" onsubmit="submitRoomOperations(event, ${isEdit ? Number(r.id) : 0}, ${Number(roomKey)})">
    <div class="qihui-modal-body">
      <!-- 基本信息 -->
      <section class="qihui-modal-section">
        <div class="qihui-section-header">
          <span class="qihui-section-bar"></span>
          <h4>基本信息</h4>
        </div>
        <div class="qihui-form-rows">
          <div class="qihui-form-row">
            <label class="qihui-row-label" for="ops-room-name">直播间名称</label>
            <div class="qihui-row-control">
              <input id="ops-room-name" name="name" required maxlength="60" placeholder="请输入直播间名称" value="${E(r.name || (selectedAsset?.name ? selectedAsset.name.replace(/\.[^.]+$/, '') : '新客大单系统'))}">
            </div>
          </div>
          <div class="qihui-form-row">
            <label class="qihui-row-label" for="ops-room-host">主播</label>
            <div class="qihui-row-control" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <input id="ops-room-host" name="host" maxlength="30" placeholder="请输入主播名称" value="${E(r.host || '优润诗直播')}">
              <select id="ops-room-mode" name="mode" onchange="syncRoomModeFields(this.value)">
                <option value="录播" ${mode === '录播' ? 'selected' : ''}>录播（视频回放/录播课）</option>
                <option value="直播" ${mode === '直播' ? 'selected' : ''}>直播（实时推流）</option>
                <option value="伪直播（录播播放）" ${mode.startsWith('伪直播') ? 'selected' : ''}>定时伪直播</option>
              </select>
            </div>
          </div>
          <div class="qihui-form-row">
            <label class="qihui-row-label" for="ops-room-start">开播时间</label>
            <div class="qihui-row-control" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <input id="ops-room-start" name="time" type="datetime-local" required value="${E(startVal)}">
              <div style="display:flex;align-items:center;gap:12px">
                <span style="font-size:12px;color:#606266">展示样式：</span>
                <select name="layout" style="flex:1">
                  <option value="竖屏" ${(r.layout || '竖屏') === '竖屏' ? 'selected' : ''}>竖屏</option>
                  <option value="横屏" ${r.layout === '横屏' ? 'selected' : ''}>横屏</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- 录播视频素材与播放策略 -->
        <div data-room-mode="录播" ${mode === '录播' ? '' : 'hidden'} style="margin-top:14px">
          <input type="hidden" id="ops-selected-asset-id" name="asset" value="${selectedAsset ? selectedAsset.id : ''}">
          <div id="ops-selected-video-display">
            ${selectedAsset ? `
              <div class="ops-selected-video-card">
                <div class="ops-selected-thumb">
                  <video preload="metadata" src="${roomVideoUrl(selectedAsset)}"></video>
                </div>
                <div class="ops-selected-info">
                  <h4>${E(selectedAsset.name)}</h4>
                  <p>时长：<b class="duration-tag">${selectedAsset.duration} (${selectedAsset.durationMinutes || '分钟数'})</b> · 大小：${selectedAsset.fileSize || '185 MB'}</p>
                  <p style="color:#64748b">来源：${selectedAsset.source || '素材库'}</p>
                </div>
                <div style="display:flex;gap:8px">
                  <button type="button" class="qihui-btn-plain small-btn" onclick="previewVideoWithMinutes(${selectedAsset.id})">预览</button>
                  <button type="button" class="qihui-btn search small-btn" onclick="openVideoLibraryModal(${selectedAsset.id})">更换视频</button>
                </div>
              </div>
            ` : ''}
          </div>
          <div class="qihui-replay-switches-row">
            <label class="qihui-inline-switch-item">
              <span>记忆播放</span>
              <label class="qihui-switch">
                <input type="checkbox" name="rememberPlayback" ${r.rememberPlayback !== false ? 'checked' : ''}>
                <span class="qihui-slider"></span>
              </label>
            </label>
            <label class="qihui-inline-switch-item">
              <span>循环播放</span>
              <label class="qihui-switch">
                <input type="checkbox" name="loopPlayback" ${r.loopPlayback ? 'checked' : ''}>
                <span class="qihui-slider"></span>
              </label>
            </label>
            <label class="qihui-inline-switch-item" title="${isCurrentlyPlaying ? '开播后不可修改' : '每轮循环同步展示评论弹幕'}">
              <span>评论跟随循环 ${isCurrentlyPlaying ? '<small style="color:#d97706">(已锁)</small>' : ''}</span>
              <label class="qihui-switch">
                <input type="checkbox" name="commentFollowLoop" ${r.commentFollowLoop ? 'checked' : ''} ${isCurrentlyPlaying ? 'disabled' : ''}>
                <span class="qihui-slider"></span>
              </label>
            </label>
          </div>
        </div>

        <!-- 直播封面与背景图 -->
        <div data-room-mode="直播" ${mode === '直播' ? '' : 'hidden'} style="margin-top:14px">
          <div class="ops-image-grid">
            <div class="ops-image-field">
              <div class="ops-image-header">
                <label>直播封面图</label>
                <label class="button ops-file-button">
                  更换封面
                  <input type="file" accept="image/*" style="display:none" onchange="attachRoomImage('cover', this)">
                </label>
              </div>
              <div class="ops-thumb-container">
                <img id="room-cover-preview" src="${E(roomPosterUrl(r))}" alt="直播封面预览">
                <span id="room-cover-note" class="ops-thumb-tag">${opsImageAssetIds.has(`${roomKey}:cover`) ? '已上传到 COS' : roomPosterUrl(r) !== 'assets/live-still.png' ? '已关联封面' : '默认封面'}</span>
              </div>
            </div>
            <div class="ops-image-field">
              <div class="ops-image-header">
                <label>直播背景图</label>
                <label class="button ops-file-button">
                  更换背景
                  <input type="file" accept="image/*" style="display:none" onchange="attachRoomImage('background', this)">
                </label>
              </div>
              <div class="ops-thumb-container">
                <img id="room-background-preview" src="${E(roomBackgroundUrl(r) || 'assets/live-still.png')}" alt="直播背景预览">
                <span id="room-background-note" class="ops-thumb-tag">${roomBackgroundUrl(r) ? '已配置背景' : '默认背景'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      ${renderQihuiLiveSettingsBlock(r)}
    </div>

    <div class="qihui-modal-footer">
      <button type="button" class="qihui-btn-cancel" onclick="closeDialog()">取消</button>
      <button type="submit" class="qihui-btn-submit">提交</button>
    </div>
  </form>`;
}

async function submitRoomOperations(event, editId, roomIdValue) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const host = String(data.get('host') || '优润诗直播').trim() || '优润诗直播';
  const mode = String(data.get('mode') || '录播');
  const layout = String(data.get('layout') || '竖屏');

  if (!name) return toast('请输入直播间名称');
  const imageKey = `${editId || roomIdValue}:cover`;
  const posterAssetId = opsImageAssetIds.get(imageKey) || opsImageAssetIds.get(`${pendingRoomId}:cover`);
  if (posterAssetId && editId) {
    try {
      const headers = await csrfHeaders();
      headers.set('Content-Type', 'application/json');
      const response = await fetch(adminApiPath(`/api/admin/rooms/${editId}/poster`), {
        method: 'POST', credentials: 'same-origin', headers,
        body: JSON.stringify({ mediaAssetId: posterAssetId })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || '封面同步到场次失败');
      }
      const persistedUrl = adminApiPath(`/api/rooms/${editId}/poster`);
      opsImageUrls.set(imageKey, persistedUrl);
    } catch (error) {
      toast(error.message || '封面同步失败，请重试');
      return;
    }
  }
  const assetId = Number(data.get('asset')) || db.assets[0]?.id || 1;
  const start = data.get('time');

  let target = editId ? db.rooms.find(r => r.id === editId) : null;
  const id = editId || roomIdValue;
  const isCurrentlyPlaying = target && target.status === '直播中';
  const formattedTime = start ? formatDisplayTime(start) : formatLocalDateTime(new Date());

  const updates = {
    name,
    host,
    mode,
    layout,
    asset: assetId,
    time: formattedTime,
    watchPassword: String(data.get('watchPassword') || '').trim(),
    heatValue: Math.max(0, Number(data.get('heatValue')) || 0),
    likes: Math.max(0, Number(data.get('heatValue')) || 0),
    shareIntro: String(data.get('shareIntro') || '').trim(),
    systemNotice: String(data.get('systemNotice') || '').trim(),
    watchRewardEnabled: data.has('watchRewardEnabled'),
    // 录播三大设置
    rememberPlayback: data.has('rememberPlayback'),
    loopPlayback: data.has('loopPlayback'),
    commentFollowLoop: isCurrentlyPlaying ? target.commentFollowLoop : data.has('commentFollowLoop'),
    // 功能开关（8项）
    replayEnabled: data.has('replayEnabled'),
    giftEnabled: data.has('giftEnabled'),
    onlineCountEnabled: data.has('onlineCountEnabled'),
    showCumulative: data.has('showCumulative'),
    heatEnabled: data.has('heatEnabled'),
    connectEnabled: data.has('connectEnabled'),
    allowChat: data.has('allowChat'),
    showHome: data.has('showHome')
  };

  if (target) {
    Object.assign(target, updates);
  } else {
    target = {
      ...updates,
      id,
      status: mode === '录播' ? '直播中' : '待开播',
      end: '—',
      createdAt: formatLocalDateTime(new Date()),
      showInList: true,
      goods: [1, 2],
      onlineCount: 1,
      totalAudience: 5,
      replayPublished: true
    };
    target.cover = getQihuiRoomPosterSvg(target);
    db.rooms.unshift(target);
  }

  for (const key of ['cover', 'background']) {
    const url = opsImageUrls.get(`${id}:${key}`) || opsImageUrls.get(`${pendingRoomId}:${key}`);
    if (url) {
      opsImageUrls.set(`${id}:${key}`, url);
      if (key === 'cover') target.cover = url;
    }
  }

  pendingRoomId = null;
  persist();
  closeDialog();
  render();
  toast(editId ? `直播间【${target.name}】设置已提交保存` : `已创建直播间【${target.name}】`);
}

function showQihuiModal(titleText, bodyHtml) {
  const dlg = $('#dialog');
  dlg.classList.add('qihui-dialog');
  dlg.innerHTML = `
    <div class="qihui-dialog-head">
      <h2>${E(titleText)}</h2>
      <div class="qihui-dialog-head-actions">
        <button type="button" class="qihui-dialog-icon-btn" onclick="toggleLccFullscreen()" title="全屏切换" aria-label="全屏">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        </button>
        <button type="button" class="qihui-dialog-icon-btn" onclick="closeDialog()" title="关闭" aria-label="关闭">×</button>
      </div>
    </div>
    ${bodyHtml}
  `;
  if (!dlg.open) dlg.showModal();
}

// 覆盖入口：创建直播间
newLive = function(assetId) {
  location.href = adminApiPath('/admin/rooms/new');
};

// 本地图片选取与预览更新
async function attachRoomImage(type, input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast('封面仅支持 JPG、PNG 或 WebP 图片');
  if (file.size > 10 * 1024 * 1024) return toast('封面图片不能超过 10 MB');
  const previewUrl = URL.createObjectURL(file);
  const roomKey = pendingRoomId || (room() ? room().id : 1);
  const imageKey = `${roomKey}:${type}`;
  const imgEl = $(`#room-${type}-preview`);
  if (imgEl) imgEl.src = previewUrl;
  const noteEl = $(`#room-${type}-note`);
  if (noteEl) noteEl.textContent = '正在上传…';
  const form = new FormData();
  form.append('file', file);
  try {
    const response = await fetch(adminApiPath('/api/admin/media/images'), {
      method: 'POST', credentials: 'same-origin', headers: await csrfHeaders(), body: form
    });
    const asset = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(asset.message || '封面上传失败');
    opsImageAssetIds.set(imageKey, Number(asset.id));
    opsImageUrls.set(imageKey, asset.url);
    if (noteEl) noteEl.textContent = '已上传到 COS';
    toast(`封面已上传：${file.name}，保存场次后同步到小程序`);
  } catch (error) {
    if (noteEl) noteEl.textContent = '上传失败';
    toast(error.message || '封面上传失败，请检查 COS 配置');
  }
}

// 旗慧美业风格：直播设置弹窗（去除花哨彩框，采用与「编辑直播间」一致的清晰分组与 4×2 功能开关）
function openLiveSettingsModal(roomId) {
  const r = db.rooms.find(x => x.id === Number(roomId)) || room() || db.rooms[0];
  showQihuiModal('直播设置', `
    <form class="qihui-edit-room-form" onsubmit="saveLiveSettingsModal(event, ${r.id})">
      <div class="qihui-modal-body">
        ${renderQihuiLiveSettingsBlock(r)}
      </div>
      <div class="qihui-modal-footer">
        <button type="button" class="qihui-btn-cancel" onclick="closeDialog()">取消</button>
        <button type="submit" class="qihui-btn-submit">提交</button>
      </div>
    </form>
  `);
}

function updateSwitchLabel(checkbox) {
  updateQihuiSwitchText(checkbox);
}

function updateOpsToggleCard(checkbox) {
  const card = checkbox.closest('.ops-toggle-card');
  if (card) {
    card.classList.toggle('active', checkbox.checked);
    const status = card.querySelector('.ops-toggle-status');
    if (status && !status.classList.contains('locked')) {
      status.textContent = checkbox.checked ? '已开启' : '已关闭';
      status.className = 'ops-toggle-status ' + (checkbox.checked ? 'on' : 'off');
    }
  }
}

function saveLiveSettingsModal(e, roomId) {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const r = db.rooms.find(x => x.id === Number(roomId)) || room();
  if (r) {
    r.watchPassword = String(f.get('watchPassword') || '').trim();
    r.heatValue = Math.max(0, Number(f.get('heatValue')) || 0);
    r.likes = r.heatValue;
    r.shareIntro = String(f.get('shareIntro') || '').trim();
    const notice = String(f.get('systemNotice') || '').trim();
    if (notice) r.systemNotice = notice;
    r.watchRewardEnabled = f.has('watchRewardEnabled');
    r.replayEnabled = f.has('replayEnabled');
    r.giftEnabled = f.has('giftEnabled');
    r.onlineCountEnabled = f.has('onlineCountEnabled');
    r.showCumulative = f.has('showCumulative');
    r.heatEnabled = f.has('heatEnabled');
    r.connectEnabled = f.has('connectEnabled');
    r.allowChat = f.has('allowChat');
    r.showHome = f.has('showHome');
    persist();
  }
  closeDialog();
  render();
  toast('直播间设置已保存并同步至观众端');
}

function editLiveRoom(id) {
  location.href = adminApiPath(`/admin/rooms/${Number(id)}/edit`);
}

function formatLocalDateTime(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

let activeMoreDropdownRoomId = null;

function toggleMoreOpsMenu(event, id) {
  if (event) {
    event.stopPropagation();
  }
  activeMoreDropdownRoomId = activeMoreDropdownRoomId === Number(id) ? null : Number(id);
  render();
}

function confirmCloseLiveRoom(id) {
  const r = db.rooms.find(x => x.id === Number(id));
  if (!r) return;
  activeMoreDropdownRoomId = null;
  showQihuiModal('关闭直播提示', `
    <div class="ops-confirm-modal-content">
      <div class="ops-confirm-header danger">
        <div class="ops-confirm-icon-box">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div class="ops-confirm-title-wrap">
          <div class="ops-confirm-main-title">确定要关闭直播间【${E(r.name)}】吗？</div>
          <div class="ops-confirm-sub-title">场次 ID: ${r.id} · 主播: ${E(r.host || '优润诗直播')}</div>
        </div>
      </div>
      <div class="ops-confirm-body-note">
        <p>• <b>直播状态变更</b>：本场直播状态将立即变更为【<span style="color:#ef4444;font-weight:600">已结束</span>】，并记录实际结束时间；</p>
        <p>• <b>观众端联动</b>：小程序与H5观众端将显示“本场直播已结束”，推荐用户观看精彩回放与商城好物；</p>
        <p>• <b>后台联动</b>：直播管理列表与中控台将实时更新状态为【已结束】，支持随时重新开启直播。</p>
      </div>
      <div class="ops-confirm-actions">
        <button type="button" class="qihui-btn-cancel" onclick="closeDialog()">取消</button>
        <button type="button" class="qihui-btn danger-confirm" onclick="closeLiveRoom(${r.id})">确认关闭直播</button>
      </div>
    </div>
  `);
}

async function closeLiveRoom(id) {
  const r = serverRooms.find(x => x.id === Number(id));
  if (!r) return;
  try {
    const headers = await csrfHeaders();
    headers.set('Content-Type', 'application/json');
    const response = await fetch(adminApiPath(`/api/admin/rooms/${r.id}/status`), {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ status: 'ENDED' })
    });
    if (!response.ok) throw new Error('更新数据库场次状态失败');
  } catch (e) { return toast(e.message || '更新失败，请重新登录后重试'); }
  serverRoomsLoaded = false;
  activeMoreDropdownRoomId = null;
  closeDialog();
  await loadServerRooms();
  toast(`直播间【${r.name}】已关闭`);
}

async function startLiveRoom(id) {
  const r = serverRooms.find(x => x.id === Number(id));
  if (!r) return;
  try {
    const headers = await csrfHeaders();
    headers.set('Content-Type', 'application/json');
    const response = await fetch(adminApiPath(`/api/admin/rooms/${r.id}/status`), {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ status: 'LIVE' })
    });
    if (!response.ok) throw new Error('更新数据库场次状态失败');
  } catch (e) { return toast(e.message || '更新失败，请重新登录后重试'); }
  serverRoomsLoaded = false;
  activeMoreDropdownRoomId = null;
  closeDialog();
  await loadServerRooms();
  toast(`直播间【${r.name}】已开启直播`);
}

function confirmDeleteLiveRoom(id) {
  const r = db.rooms.find(x => x.id === Number(id));
  if (!r) return;
  activeMoreDropdownRoomId = null;
  showQihuiModal('删除场次确认', `
    <div class="ops-confirm-modal-content">
      <div class="ops-confirm-header danger">
        <div class="ops-confirm-icon-box">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </div>
        <div class="ops-confirm-title-wrap">
          <div class="ops-confirm-main-title">确定要删除直播间【${E(r.name)}】吗？</div>
          <div class="ops-confirm-sub-title">场次 ID: ${r.id}</div>
        </div>
      </div>
      <p style="font-size:12px;color:#64748b;margin:12px 0 16px">删除后该场次记录将从列表中移除，请谨慎操作。</p>
      <div class="ops-confirm-actions">
        <button type="button" class="qihui-btn-cancel" onclick="closeDialog()">取消</button>
        <button type="button" class="qihui-btn danger-confirm" onclick="deleteLiveRoom(${r.id})">确认删除</button>
      </div>
    </div>
  `);
}

function deleteLiveRoom() { toast('场次有关联的互动和订单数据，请在数据库确认关联清理规则后再开放删除'); }

function copyLiveRoom(id) {
  toast('请通过创建场次表单录入真实场次信息');
}

function toggleRoomVisibility(id, checked) {
  toast('场次展示状态尚未接入数据库字段');
}

function openPushPullModal(id) {
  const r = db.rooms.find(x => x.id === Number(id)) || room();
  showQihuiModal(`推拉流配置 · ${r.name}`, `
    <div style="padding:4px 0">
      <p style="font-size:12px;color:#64748b;margin-bottom:14px">抖音 / 视频号 RTMP 推流尚未配置。平台推流地址与密钥需要保存在服务器环境变量中。</p>
      <div class="field" style="margin-bottom:12px">
        <label style="font-size:12px;font-weight:600">RTMP 推流状态</label>
        <input readonly value="未配置平台推流地址 / 密钥" style="width:100%;font-size:12px;background:#f8fafc">
      </div>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:10px 14px;font-size:12px;color:#9a3412;margin-top:14px">
        推流端还需接入 FFmpeg 循环视频与 Qwen 音频混流服务；当前页面不会伪造可用线路。
      </div>
      <div class="qihui-modal-footer" style="margin-top:18px">
        <button type="button" class="qihui-btn-submit" onclick="closeDialog()">关闭</button>
      </div>
    </div>
  `);
}

// 统一映射：点击「直播设置」呼出直播设置弹窗
liveSettings = function(id) {
  openLiveSettingsModal(id);
};

/* ==========================================================================
   观看端与全屏播放支持 (记忆播放、循环播放、评论跟随循环、直播设置响应)
   ========================================================================== */

const baseMiniWatch = miniWatch;
miniWatch = function() {
  const r = room() || db.rooms[0];
  if (r && r.status === '已结束') {
    return `
      <div class="mini-live mini-live-ended">
        <img class="mini-live-image ended-blurred" src="${E(roomPosterUrl(r))}" alt="${E(r.name)}" onerror="this.src='assets/live-still.png'">
        <div class="mini-ended-overlay">
          <div class="mini-ended-top-nav">
            <button class="mini-back-circle" onclick="navigateMini('live','live')">✕</button>
          </div>
          <div class="mini-ended-card">
            <div class="mini-ended-brand-badge">旗慧美业官方直播</div>
            <h2 class="mini-ended-room-name">${E(r.name)}</h2>
            <div class="mini-ended-status-pill">本场直播已结束</div>
            <div class="mini-ended-time-info">
              <div>开播时间：${E(formatDisplayTime(r.time))}</div>
              <div>关播时间：${E(formatDisplayTime(r.end || '已保存'))}</div>
            </div>
            <div class="mini-ended-metrics-grid">
              <div class="mini-ended-metric">
                <b>${r.onlineCount || 1}</b>
                <span>观看人次</span>
              </div>
              <div class="mini-ended-metric">
                <b>${r.likes || 1280}</b>
                <span>获得点赞</span>
              </div>
              <div class="mini-ended-metric">
                <b>${(r.goods || []).length}</b>
                <span>精选好物</span>
              </div>
            </div>
            <div class="mini-ended-cta-group">
              <button class="mini-ended-btn replay" onclick="playCourse(${r.asset || 1})">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                观看完整回放
              </button>
              <button class="mini-ended-btn shop" onclick="navigateMini('home')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                逛逛美业商城
              </button>
            </div>
            <button class="mini-ended-back-link" onclick="navigateMini('live','live')">返回直播间列表</button>
          </div>
        </div>
      </div>
    `;
  }

  let html = baseMiniWatch();
  if (!r) return html;

  html = html.replace(/poster="[^"]*"/g, `poster="${E(roomPosterUrl(r))}"`);
  const serverRoom = serverRooms.find(item => item.id === Number(r.id))?._server;
  if (serverRoom) {
    const playback = serverPlaybackByRoom.get(Number(r.id));
    const poster = E(serverRoom.posterUrl || roomPosterUrl(r));
    const visual = playback?.source
      ? `<video class="mini-live-image room-replay-video" src="${E(playback.source)}" poster="${poster}" controls autoplay muted playsinline preload="auto" aria-label="${E(serverRoom.modeLabel || '直播')}视频" onerror="this.outerHTML='&lt;div class=&quot;mini-live-image server-playback-pending&quot;&gt;视频无法播放，请检查 COS 权限或视频编码格式&lt;/div&gt;'"></video>`
      : serverRoom.mediaAssetId
        ? `<div class="mini-live-image server-playback-pending">${E(playback?.error || (playback ? '视频地址暂不可用' : '正在连接录播视频…'))}</div>`
        : `<img class="mini-live-image" src="${poster}" alt="${E(serverRoom.title)}" onerror="this.src='assets/live-still.png'">`;
    html = html.replace(/<(?:img|video)\b[^>]*class="mini-live-image[^"]*"[^>]*>/, visual);
    html = html.replace(/(<div class="room-play-label"><i><\/i>)[^<]*/, `$1${E(serverRoom.modeLabel || '直播')}`);
  }
  const background = roomBackgroundUrl(r);
  if (r.mode === '直播' && background) {
    html = html.replace(/class="mini-live room-reference/g, `class="mini-live room-reference ops-room-background" style="--ops-room-background:url('${E(background)}')`);
  }

  if (r.mode === '录播' || r.mode.startsWith('伪直播')) {
    html = html.replace(/<video ([^>]*?)\sloop\s/g, `<video $1 ${r.loopPlayback ? 'loop' : ''} `);
  }

  if (r.mode === '直播' && r.allowChat === false) {
    html = html.replace(/<div class="room-input-shell">[\s\S]*?<\/div>/, '<span class="room-chat-disabled">本场暂未开放聊天</span>');
  }

  if (r.mode === '直播' && r.showHome === false) {
    html = html.replace(/<button class="room-home"[\s\S]*?<\/button>/, '');
  }

  if (r.mode === '直播' && r.connectEnabled === false) {
    html = html.replace(/<button class="room-connect"[\s\S]*?<\/button>/, '');
  }

  if (r.mode === '直播' && r.showCumulative === false) {
    html = html.replace(/<div class="room-audience"[\s\S]*?<\/div>/, '');
  }

  if (r.mode === '直播' && r.replayEnabled === false) {
    html = html.replace(/<button class="room-replay"[\s\S]*?<\/button>/, '');
  }

  return html;
};

function handleViewerRememberPlayback(videoId, roomId) {
  const video = document.getElementById(videoId);
  const r = db.rooms.find(x => x.id === roomId);
  if (!video || !r) return;

  const storageKey = `meiye_playback_pos_${roomId}`;
  const savedPos = localStorage.getItem(storageKey);

  if (r.rememberPlayback !== false) {
    if (savedPos && Number(savedPos) > 1) {
      video.currentTime = Number(savedPos);
      toast(`已恢复上次观看进度：${fmtMinutesSeconds(Number(savedPos))}`);
    } else {
      video.currentTime = 0;
    }
  } else {
    video.currentTime = 0;
  }

  video.ontimeupdate = () => {
    if (r.rememberPlayback !== false && video.currentTime > 0) {
      localStorage.setItem(storageKey, String(Math.floor(video.currentTime)));
    }
  };
}

if (!window._lccServerCommentPoll) {
  window._lccServerCommentPoll = setInterval(() => {
    if (page === 'control' && room()?.id) loadAdminRoomMessages(Number(room().id));
    if (page === 'comments' && selectedServerRoomId()) loadAdminRoomMessages(selectedServerRoomId());
  }, 4000);
}

function toggleLccFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('lcc-dark-mode');
  try {
    localStorage.setItem('lcc-theme', isDark ? 'dark' : 'light');
  } catch (e) {}
  toast(isDark ? '已切换至深色模式' : '已切换至浅色标准模式');
}

function openRobotTemplateModal(editId) {
  const target = editId ? db.robotTemplates.find(t => t.id === editId) : null;
  const scriptOpts = db.scriptTemplates.map(st => `<option value="${st.name}" ${target?.scriptTemplate === st.name ? 'selected' : ''}>${E(st.name)} (${(st.lines || []).length}条)</option>`).join('');

  showQihuiModal(target ? '编辑机器人模板' : '新建机器人模板', `
    <form onsubmit="saveRobotTemplate(event, ${target ? target.id : 0})">
      <div class="field">
        <label>模板名称</label>
        <input name="name" required maxlength="30" value="${E(target?.name || '向总互动')}">
      </div>
      <div class="field">
        <label>机器人数</label>
        <input name="robotCount" type="number" min="1" max="1000" required value="${target?.robotCount || 100}">
      </div>
      <div class="field">
        <label>关联话术模板</label>
        <select name="scriptTemplate">${scriptOpts}</select>
      </div>
      <div class="form-grid">
        <div class="field"><label>最小发送间隔 (秒)</label><input name="intervalMin" type="number" min="1" max="60" value="${target?.intervalMin || 2}"></div>
        <div class="field"><label>最大发送间隔 (秒)</label><input name="intervalMax" type="number" min="2" max="120" value="${target?.intervalMax || 5}"></div>
      </div>
      <label class="check"><input type="checkbox" name="loop" ${target?.loop !== false ? 'checked' : ''}>循环执行话术</label>
      <div class="qihui-modal-footer">
        <button type="button" class="qihui-btn-cancel" onclick="closeDialog()">取消</button>
        <button class="qihui-btn-submit" type="submit">保存模板</button>
      </div>
    </form>
  `);
}

async function saveRobotTemplate(e, id) {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const name = String(f.get('name') || '').trim();
  const robotCount = Number(f.get('robotCount')) || 50;
  const scriptTemplate = String(f.get('scriptTemplate') || '技术互动');
  const intervalMin = Number(f.get('intervalMin')) || 2;
  const intervalMax = Number(f.get('intervalMax')) || 5;
  const loop = f.has('loop');

  try {
    await robotAdminMutation('/templates', 'PUT', { id: id || null, name, robotCount, scriptTemplate, intervalMin, intervalMax, loop, active: true });
    closeDialog(); render(); toast('机器人模板已保存到服务器');
  } catch (error) { toast(error.message); }
}

async function deleteRobotTemplate(id) {
  if (db.robotTemplates.length <= 1) return toast('至少保留一个机器人模板');
  try { await robotAdminMutation(`/templates/${id}`, 'DELETE'); render(); toast('机器人模板已从服务器删除'); }
  catch (error) { toast(error.message); }
}

function openScriptTemplateModal(editId) {
  const target = editId ? db.scriptTemplates.find(st => st.id === editId) : null;
  const linesText = target ? (target.lines || []).join('\n') : '';

  showQihuiModal(target ? '编辑话术模板' : '新建话术模板', `
    <form onsubmit="saveScriptTemplate(event, ${target ? target.id : 0})">
      <div class="field">
        <label>模板名称</label>
        <input name="name" required maxlength="30" value="${E(target?.name || '技术互动')}">
      </div>
      <div class="field">
        <label>话术条目（每行一条弹幕）</label>
        <textarea name="lines" rows="8" required placeholder="输入弹幕话术，每行一条">${E(linesText)}</textarea>
      </div>
      <div class="qihui-modal-footer">
        <button type="button" class="qihui-btn-cancel" onclick="closeDialog()">取消</button>
        <button class="qihui-btn-submit" type="submit">保存话术</button>
      </div>
    </form>
  `);
}

async function saveScriptTemplate(e, id) {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const name = String(f.get('name') || '').trim();
  const lines = String(f.get('lines') || '').split('\n').map(s => s.trim()).filter(Boolean);
  if (!lines.length) return toast('请至少输入一条话术');

  try {
    await robotAdminMutation('/scripts', 'PUT', { id: id || null, name, lines });
    closeDialog(); render(); toast('话术模板已保存到服务器');
  } catch (error) { toast(error.message); }
}

async function deleteScriptTemplate(id) {
  if (db.scriptTemplates.length <= 1) return toast('至少保留一个话术模板');
  try { await robotAdminMutation(`/scripts/${id}`, 'DELETE'); render(); toast('话术模板已从服务器删除'); }
  catch (error) { toast(error.message); }
}

// ==========================================================================
// 旗慧美业海报缩略图生成器与直播间列表 (对齐参考图 3)
// ==========================================================================

function getQihuiRoomPosterSvg(r = {}) {
  const id = Number(r.id) || 0;
  const title = String(r.name || '');

  // 样式 1：新客大单系统（深红金尊享海报）
  if (id === 151 || id === 152 || title.includes('新客') || title.includes('大单')) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="crimsonG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ef233c"/>
          <stop offset="55%" stop-color="#c9182b"/>
          <stop offset="100%" stop-color="#800f1d"/>
        </linearGradient>
        <linearGradient id="goldG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#fde68a"/>
          <stop offset="50%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#fef08a"/>
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="10" fill="url(#crimsonG)"/>
      <circle cx="48" cy="18" r="36" fill="#ffffff" fill-opacity="0.08"/>
      <rect x="22" y="10" width="52" height="14" rx="7" fill="url(#goldG)"/>
      <text x="48" y="20" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="8.5" font-weight="900" fill="#7c2d12" text-anchor="middle">★ 优润诗 ★</text>
      <text x="48" y="42" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle">美容院</text>
      <text x="48" y="58" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="10.5" font-weight="800" fill="#fef08a" text-anchor="middle">新客大单收现系统</text>
      <rect x="16" y="70" width="64" height="15" rx="7.5" fill="url(#goldG)"/>
      <text x="48" y="80" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="8" font-weight="800" fill="#7c2d12" text-anchor="middle">点击进入学习</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // 样式 3：水光 / 抗衰直播搭建（香槟金圆章海报，对应 ID 118, 117, 116）
  if (id === 118 || id === 117 || id === 116 || title.includes('搭建') || title.includes('水光')) {
    const mainLabel = title.includes('水光') && title.includes('抗衰')
      ? '水光+抗衰'
      : (title.includes('水光') ? '水光不露脸直播' : '抗衰不露脸直播');
    const subLabel = title.includes('水光') && title.includes('抗衰') ? '不露脸直播' : '（陪跑搭建）';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="champG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#eab664"/>
          <stop offset="50%" stop-color="#c68634"/>
          <stop offset="100%" stop-color="#8c5415"/>
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="10" fill="url(#champG)"/>
      <rect x="8" y="8" width="40" height="12" rx="6" fill="#78350f" fill-opacity="0.55"/>
      <text x="28" y="17" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="7.5" font-weight="700" fill="#fef3c7" text-anchor="middle">★ 优润诗</text>
      <circle cx="48" cy="52" r="32" fill="#fffbeb" stroke="#fde68a" stroke-width="2.5"/>
      <circle cx="48" cy="52" r="28" fill="none" stroke="#d97706" stroke-width="0.8" stroke-dasharray="3,2"/>
      <text x="48" y="47" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="9.5" font-weight="900" fill="#78350f" text-anchor="middle">${mainLabel}</text>
      <text x="48" y="60" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="8.5" font-weight="700" fill="#b45309" text-anchor="middle">${subLabel}</text>
      <rect x="27" y="67" width="42" height="11" rx="5.5" fill="#b91c1c"/>
      <text x="48" y="75" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="7" font-weight="700" fill="#ffffff" text-anchor="middle">实战赋能</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // 样式 2：瑞士抗衰 / 录视频（珠光银底 + 绛红丝带海报，对应 ID 150, 149, 148, 145, 140）
  const bannerTitle = id === 148 ? '瑞士全能细胞抗衰' : ((id === 145 || id === 140) ? '教你明星护肤秘诀' : '瑞士抗衰黑科技');
  const subText = (id === 145 || id === 140) ? '让你比同龄人更显年轻' : '以科技护肤 · 逆转时光肌龄';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <defs>
      <linearGradient id="pearlG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="50%" stop-color="#ede9fe"/>
        <stop offset="100%" stop-color="#e2e8f0"/>
      </linearGradient>
      <linearGradient id="ribbonG" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#991b1b"/>
        <stop offset="50%" stop-color="#dc2626"/>
        <stop offset="100%" stop-color="#991b1b"/>
      </linearGradient>
    </defs>
    <rect width="96" height="96" rx="10" fill="url(#pearlG)" stroke="#cbd5e1" stroke-width="1"/>
    <circle cx="80" cy="18" r="24" fill="#f43f5e" fill-opacity="0.1"/>
    <circle cx="16" cy="78" r="26" fill="#be123c" fill-opacity="0.08"/>
    <rect x="26" y="10" width="44" height="13" rx="6.5" fill="#b91c1c"/>
    <text x="48" y="19" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="8" font-weight="800" fill="#ffffff" text-anchor="middle">✦ 优润诗 ✦</text>
    <rect x="6" y="31" width="84" height="20" rx="4" fill="url(#ribbonG)"/>
    <text x="48" y="44" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="9.5" font-weight="900" fill="#ffffff" text-anchor="middle">${bannerTitle}</text>
    <text x="48" y="63" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="7.2" font-weight="600" fill="#475569" text-anchor="middle">${subText}</text>
    <rect x="22" y="71" width="52" height="13" rx="6.5" fill="#881337"/>
    <text x="48" y="80" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="7.5" font-weight="700" fill="#fde68a" text-anchor="middle">VIP 精品课程</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

let qihuiFilterName = '';
let qihuiFilterHost = '';
let qihuiFilterMode = '';
let qihuiFilterStatus = '';
let qihuiSidebarCollapsed = false;

function toggleQihuiSidebar() {
  qihuiSidebarCollapsed = !qihuiSidebarCollapsed;
  render();
}

function livePage() {
  if (!serverRoomsLoaded) {
    if (!serverRoomsLoading && !serverRoomsError) loadServerRooms();
    return `<section class="qihui-empty-state"><strong>${E(serverRoomsError || '正在读取数据库场次…')}</strong><p>${serverRoomsError ? '请检查管理员登录状态后刷新页面。' : '场次列表只显示服务器数据库中的记录。'}</p>${serverRoomsError ? '<button type="button" class="qihui-btn search" onclick="serverRoomsError=\'\';loadServerRooms()">重试</button>' : ''}</section>`;
  }

  let list = serverRooms.slice();
  if (qihuiFilterName) list = list.filter(r => r.name.toLowerCase().includes(qihuiFilterName.toLowerCase()));
  if (qihuiFilterHost) list = list.filter(r => (r.host || '优润诗直播').toLowerCase().includes(qihuiFilterHost.toLowerCase()));
  if (qihuiFilterMode) list = list.filter(r => r.mode.includes(qihuiFilterMode));
  if (qihuiFilterStatus) list = list.filter(r => r.status === qihuiFilterStatus);

  return `
  <div class="qihui-live-page">
    <!-- 合规提示条 (对齐参考图 3) -->
    <div class="qihui-compliance-bar">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="#64748b" aria-hidden="true"><circle cx="12" cy="12" r="10"/><rect x="11" y="10" width="2" height="7" rx="1" fill="#ffffff"/><circle cx="12" cy="7" r="1.2" fill="#ffffff"/></svg>
      <span>请您遵守国家相关规定，禁止发布含有违法、违规、低俗、暴力、色情、虚假宣传等内容直播。</span>
    </div>

    <!-- 筛选卡片 (水平同行标签 + 输入框 + 重置/查询按钮) -->
    <div class="qihui-filter-card">
      <div class="qihui-filter-row">
        <div class="qihui-filter-item">
          <label for="qihuiFilterName">直播间名称</label>
          <input id="qihuiFilterName" placeholder="请输入直播间名称" value="${E(qihuiFilterName)}" onkeydown="if(event.key==='Enter')applyQihuiLiveFilters()">
        </div>
        <div class="qihui-filter-item">
          <label for="qihuiFilterHost">主播</label>
          <input id="qihuiFilterHost" placeholder="请输入主播名称" value="${E(qihuiFilterHost)}" onkeydown="if(event.key==='Enter')applyQihuiLiveFilters()">
        </div>
        <div class="qihui-filter-item">
          <label for="qihuiFilterMode">直播类型</label>
          <select id="qihuiFilterMode">
            <option value="">请选择直播类型</option>
            <option value="录播" ${qihuiFilterMode === '录播' ? 'selected' : ''}>录播</option>
            <option value="直播" ${qihuiFilterMode === '直播' ? 'selected' : ''}>直播</option>
            <option value="伪直播" ${qihuiFilterMode === '伪直播' ? 'selected' : ''}>伪直播</option>
          </select>
        </div>
        <div class="qihui-filter-item">
          <label for="qihuiFilterStatus">直播状态</label>
          <select id="qihuiFilterStatus">
            <option value="">请选择直播状态</option>
            <option value="直播中" ${qihuiFilterStatus === '直播中' ? 'selected' : ''}>直播中</option>
            <option value="待开播" ${qihuiFilterStatus === '待开播' ? 'selected' : ''}>待开播</option>
            <option value="已结束" ${qihuiFilterStatus === '已结束' ? 'selected' : ''}>已结束</option>
          </select>
        </div>
        <div class="qihui-filter-actions">
          <button type="button" class="qihui-btn reset" onclick="resetQihuiLiveFilters()">重置</button>
          <button type="button" class="qihui-btn search" onclick="applyQihuiLiveFilters()">查询</button>
        </div>
      </div>
    </div>

    <!-- 表格卡片 -->
    <div class="qihui-table-card">
      <div class="qihui-table-topbar">
        <button type="button" class="qihui-btn create-live" onclick="newLive()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          创建直播间
        </button>
        <button type="button" class="qihui-icon-btn refresh" onclick="render()" title="刷新列表">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg>
        </button>
      </div>

      <div class="qihui-table-wrap">
        <table class="qihui-enterprise-table">
          <thead>
            <tr>
              <th style="width:60px">ID</th>
              <th style="width:80px">展示图</th>
              <th style="min-width:160px">直播间名称</th>
              <th style="min-width:105px">主播</th>
              <th style="min-width:190px">直播时间</th>
              <th style="width:88px">直播状态</th>
              <th style="width:76px">类型</th>
              <th style="width:68px">样式</th>
              <th style="width:88px">是否展示</th>
              <th style="min-width:150px">添加时间</th>
              <th style="min-width:165px">操作</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(r => renderQihuiTableRow(r)).join('') || `<tr><td colspan="11" style="text-align:center;padding:36px;color:#94a3b8">未找到匹配的直播间记录</td></tr>`}
          </tbody>
        </table>
      </div>

      <div class="qihui-pagination-bar">
        <div>共 ${list.length} 条记录</div>
        <div class="qihui-pager-tools">
          <button type="button" class="pager-btn" disabled>&lt;</button>
          <span class="pager-current">1</span>
          <button type="button" class="pager-btn" disabled>&gt;</button>
        </div>
      </div>
    </div>
  </div>`;
}

function liveRecordsPage() {
  const rows = serverRooms.filter(room => room.status === '已结束');
  return `<section class="qihui-page-heading"><div><h1>直播记录</h1><p>已结束场次与回放素材</p></div></section><section class="qihui-table-card"><div class="qihui-table-wrap"><table class="qihui-enterprise-table"><thead><tr><th>ID</th><th>直播间名称</th><th>主播</th><th>结束时间</th><th>类型</th><th>操作</th></tr></thead><tbody>${rows.map(room => `<tr><td>${room.id}</td><td>${E(room.name)}</td><td>${E(room.host || '')}</td><td>${E(room.end || room.time || '')}</td><td>${E(room.mode)}</td><td><button class="link" onclick="watch(${room.id})">观看回放</button></td></tr>`).join('') || '<tr><td colspan="6" class="qihui-empty-cell">暂无已结束场次</td></tr>'}</tbody></table></div></section>`;
}
if (typeof window !== 'undefined') window.liveRecordsPage = liveRecordsPage;

function trafficDetailPage() {
  return `<section class="qihui-page-heading"><div><h1>流量明细</h1><p>当前尚未接入微信侧实时访问明细</p></div></section><section class="qihui-empty-state"><strong>暂无真实流量明细</strong><p>接入小程序访问分析数据后，这里会展示访问时间、来源和场次。</p></section>`;
}

function liveStatisticsPage() {
  const total = serverRooms.length;
  const active = serverRooms.filter(room => room.status === '直播中').length;
  const ended = serverRooms.filter(room => room.status === '已结束').length;
  return `<section class="qihui-page-heading"><div><h1>直播统计</h1><p>当前管理端场次状态汇总</p></div></section><div class="qihui-stat-grid"><article><span>场次总数</span><strong>${total}</strong></article><article><span>标记直播中</span><strong>${active}</strong></article><article><span>已结束</span><strong>${ended}</strong></article></div><p class="qihui-data-note">在线人数、观看次数和成交数据尚未接入平台实时统计。</p>`;
}

function renderQihuiTableRow(r) {
  const isPlaying = r.status === '直播中';
  const isEnded = r.status === '已结束';
  const isLiveType = r.mode === '实时直播';
  const isReplayType = r.mode === '录播回放';
  const thumbUrl = opsImageUrls.get(`${r.id}:cover`) || r.cover;

  const statusClass = isPlaying ? 'live' : isEnded ? 'ended' : 'waiting';
  const typeClass = isLiveType ? 'live-type' : isReplayType ? 'replay-type' : 'pseudo-type';
  const typeText = isLiveType ? '直播' : isReplayType ? '录播' : '伪直播';
  const displayName = r.name.length > 12 ? r.name.slice(0, 11) + '...' : r.name;

  return `
  <tr>
    <td class="qihui-td-id">${r.id}</td>
    <td class="qihui-td-thumb">
      ${thumbUrl ? `<img src="${E(thumbUrl)}" class="qihui-table-thumb" alt="${E(r.name)}">` : '<span class="qihui-table-thumb" aria-label="未设置封面"></span>'}
    </td>
    <td class="qihui-td-name" title="${E(r.name)}">${E(displayName)}</td>
    <td class="qihui-td-host">${E(r.host || '优润诗直播')}</td>
    <td class="qihui-td-time">
      <div class="qihui-time-pair">
        <div>开播：${E(formatDisplayTime(r.time))}</div>
        <div class="qihui-time-end">结束：${E(r.end && r.end !== '—' ? formatDisplayTime(r.end) : '—')}</div>
      </div>
    </td>
    <td>
      <span class="qihui-status-tag ${statusClass}">${E(r.status)}</span>
    </td>
    <td>
      <span class="qihui-type-tag ${typeClass}">${typeText}</span>
    </td>
    <td class="qihui-td-layout">${E(r.layout || '竖屏')}</td>
    <td>
      <span>数据库</span>
    </td>
    <td class="qihui-td-created">${E(formatDisplayTime(r.createdAt || r.time))}</td>
    <td class="qihui-td-ops">
      <div class="qihui-ops-links">
        <div class="qihui-ops-grid">
          <button type="button" class="tbl-action-link" onclick="openControl(${r.id})">中控台</button>
          <button type="button" class="tbl-action-link" onclick="editLiveRoom(${r.id})">编辑</button>
          <button type="button" class="tbl-action-link" onclick="openLiveShareModal(${r.id})">分享</button>
          ${isLiveType ? `<button type="button" class="tbl-action-link" onclick="openPushPullModal(${r.id})">推拉流</button>` : `<span class="tbl-action-placeholder"></span>`}
          <button type="button" class="tbl-action-link qihui-more-btn" onclick="toggleMoreOpsMenu(event, ${r.id})">··· 更多</button>
        </div>
        ${activeMoreDropdownRoomId === r.id ? `
          <div class="qihui-more-dropdown-menu" onclick="event.stopPropagation()">
            <button type="button" class="qihui-dropdown-item" onclick="activeMoreDropdownRoomId=null;openLiveSettingsModal(${r.id})">
              <span>⚙️</span> 直播设置
            </button>
            <button type="button" class="qihui-dropdown-item" onclick="activeMoreDropdownRoomId=null;openPushPullModal(${r.id})">
              <span>📡</span> 推拉流配置
            </button>
            ${isPlaying ? `
              <button type="button" class="qihui-dropdown-item danger" onclick="confirmCloseLiveRoom(${r.id})">
                <span>🛑</span> 关闭直播
              </button>
            ` : `
              <button type="button" class="qihui-dropdown-item success" onclick="startLiveRoom(${r.id})">
                <span>▶️</span> 开启直播
              </button>
            `}
          </div>
        ` : ''}
      </div>
    </td>
  </tr>`;
}

function applyQihuiLiveFilters() {
  qihuiFilterName = ($('#qihuiFilterName')?.value || '').trim();
  qihuiFilterHost = ($('#qihuiFilterHost')?.value || '').trim();
  qihuiFilterMode = $('#qihuiFilterMode')?.value || '';
  qihuiFilterStatus = $('#qihuiFilterStatus')?.value || '';
  render();
}

function resetQihuiLiveFilters() {
  qihuiFilterName = '';
  qihuiFilterHost = '';
  qihuiFilterMode = '';
  qihuiFilterStatus = '';
  render();
}

// 顶栏图标集（对齐参考图 3）
function qihuiNavIcon(name) {
  const icons = {
    workbench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1v-9.5z"/></svg>',
    course: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2V4z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8V4z"/></svg>',
    live: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.2"/><path d="M8.5 8.5a5 5 0 0 0 0 7"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M5.5 5.5a9 9 0 0 0 0 13"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    mall: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    decorate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.43-.18-.83-.44-1.12-.29-.29-.44-.65-.44-1.12a1.64 1.64 0 0 1 1.67-1.67h1.99c3.05 0 5.55-2.5 5.55-5.55C21.97 5.95 17.46 2 12 2z"/></svg>',
    trade: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    data: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><line x1="8" y1="16" x2="8" y2="11"/><line x1="13" y1="16" x2="13" y2="7"/><line x1="18" y1="16" x2="18" y2="13"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    apps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"/></svg>'
  };
  return icons[name] || icons.live;
}

window.controlPage = controlPage;
window.liveWorkspace = livePage;
window.livePage = livePage;

// 初始化默认页面：打开或刷新 PC 端时默认进入「直播间列表」(page = 'live')，仅当 URL 显式带 page=control 或点击「中控台」时才进入中控台
if (typeof window !== 'undefined') {
  const initParams = new URLSearchParams(location.search);
  const initPage = initParams.get('page');
  if (surface === 'pc') {
    page = initPage === 'control' ? 'control' : (initPage || 'live');
  }

  window.openControl = function(id) {
    roomId = Number(id) || 1;
    page = 'control';
    render();
    scrollTop();
  };

  window.render = function() {
    clearInterval(autoTimer);
    clearInterval(liveDurationTimer);
    $$('[data-surface]').forEach(button => button.classList.toggle('active', button.dataset.surface === surface));
    if (surface === 'pc') {
      document.body.classList.add('in-pc-mode');
      // 仅当明确点击「中控台」(page === 'control') 时才进入全屏中控台，刷新或默认进入直播间列表
      if (page === 'control') {
        document.body.classList.add('in-lcc-mode');
        if (!serverRoomsLoaded && !serverRoomsLoading && !serverRoomsError) loadServerRooms();
        try {
          if (localStorage.getItem('lcc-theme') === 'dark') {
            document.body.classList.add('lcc-dark-mode');
          } else {
            document.body.classList.remove('lcc-dark-mode');
          }
        } catch (e) {}
        $('#app').innerHTML = controlPage();
        startLiveDurationTicker(serverRooms.find(item => item.id === Number(roomId)));
        if (serverRoomsLoaded) ensureServerPlayback(roomId);
      } else {
        document.body.classList.remove('in-lcc-mode');
        if (['live', 'records', 'statistics', 'trafficStats', 'robots', 'scripts', 'comments'].includes(page) && !serverRoomsLoaded && !serverRoomsLoading && !serverRoomsError) loadServerRooms();
        if (page === 'media' && !serverMediaLoaded && !serverMediaLoading && !serverMediaError) {
          loadServerMedia().catch(error => { serverMediaError = error.message || '读取 COS 素材失败'; }).finally(() => render());
        }
        const isLiveGroup = ['live', 'records', 'scripts', 'robots', 'comments'].includes(page);
        $('#app').innerHTML = `
          <header class="qihui-header-bar">
            <div class="qihui-header-left">
              <div class="qihui-brand-group">
                <div class="qihui-brand-logo" onclick="go('live')" style="cursor:pointer">
                  <span class="qihui-logo-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M8 7v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7"/><path d="M10 12h4"/></svg>
                  </span>
                  <span>旗慧美业</span>
                </div>
                <button type="button" class="qihui-refresh-btn" onclick="render()" title="刷新">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg>
                </button>
              </div>

              <nav class="qihui-nav-tabs" aria-label="主导航">
                <button type="button" class="qihui-nav-tab ${page==='overview'?'active':''}" onclick="go('overview')">${qihuiNavIcon('workbench')}<span>工作台</span></button>
                <button type="button" class="qihui-nav-tab ${page==='media'?'active':''}" onclick="go('media')">${qihuiNavIcon('course')}<span>课程</span></button>
                <button type="button" class="qihui-nav-tab ${isLiveGroup?'active':''}" onclick="go('live')">${qihuiNavIcon('live')}<span>直播</span></button>
                <button type="button" class="qihui-nav-tab ${page==='goods'?'active':''}" onclick="go('goods')">${qihuiNavIcon('mall')}<span>商城</span></button>
                <button type="button" class="qihui-nav-tab ${page==='shop'?'active':''}" onclick="go('shop')">${qihuiNavIcon('decorate')}<span>装修</span></button>
                <button type="button" class="qihui-nav-tab ${page==='orders'?'active':''}" onclick="go('orders')">${qihuiNavIcon('trade')}<span>交易</span></button>
                <button type="button" class="qihui-nav-tab ${page==='members'?'active':''}" onclick="go('members')">${qihuiNavIcon('users')}<span>用户</span></button>
                <button type="button" class="qihui-nav-tab ${page==='data'?'active':''}" onclick="go('data')">${qihuiNavIcon('data')}<span>数据</span></button>
                <button type="button" class="qihui-nav-tab ${page==='settings'?'active':''}" onclick="go('settings')">${qihuiNavIcon('settings')}<span>设置</span></button>
                <button type="button" class="qihui-nav-tab ${page==='marketing'?'active':''}" onclick="go('marketing')">${qihuiNavIcon('apps')}<span>应用</span></button>
              </nav>
            </div>

            <div class="qihui-header-tools">
              <div class="qihui-surface-switcher" title="多端预览切换">
                <button type="button" class="qihui-surface-btn active">PC后台</button>
                <button type="button" class="qihui-surface-btn" onclick="switchSurface('mini')">小程序</button>
                <button type="button" class="qihui-surface-btn" onclick="switchSurface('h5')">H5端</button>
              </div>
              <button type="button" class="qihui-tool-icon" onclick="go('settings')" title="系统设置"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
              <button type="button" class="qihui-tool-icon" onclick="toggleDarkMode()" title="深浅模式"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button>
              <button type="button" class="qihui-tool-icon" onclick="toggleLccFullscreen()" title="全屏"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg></button>
              <div class="qihui-user-badge" title="当前登录账户：MY 旗慧美业管理员">
                <span>MY</span>
                <i class="qihui-user-online-dot"></i>
              </div>
            </div>
          </header>

          <div class="qihui-workbench-layout ${qihuiSidebarCollapsed ? 'sidebar-collapsed' : ''}">
            <aside class="qihui-sidebar">
              <nav class="qihui-sidebar-nav">
                <button type="button" class="qihui-sidebar-item ${page==='live'?'active':''}" onclick="go('live')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                  <span>直播间列表</span>
                </button>
                <button type="button" class="qihui-sidebar-item" onclick="configure('stream')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  <span>直播配置</span>
                </button>
                <button type="button" class="qihui-sidebar-item" onclick="showQihuiModal('主播管理', '<div style=\\'padding:8px 4px\\'><h4 style=\\'margin:0 0 8px\\'>签约主播列表</h4><p style=\\'color:#64748b;font-size:13px\\'>优润诗直播 · 向总团队已认证就绪</p></div>')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span>主播管理</span>
                </button>
                <button type="button" class="qihui-sidebar-item ${page==='records'?'active':''}" onclick="go('records')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
                  <span>直播记录</span>
                </button>
                <button type="button" class="qihui-sidebar-item ${page==='statistics'?'active':''}" onclick="go('statistics')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><polyline points="7 14 12 9 16 13 21 8"/></svg>
                  <span>直播统计</span>
                </button>
                <button type="button" class="qihui-sidebar-item ${page==='trafficStats'?'active':''}" onclick="go('trafficStats')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/></svg>
                  <span>流量统计</span>
                </button>
                <button type="button" class="qihui-sidebar-item ${page==='traffic'?'active':''}" onclick="go('traffic')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  <span>流量明细</span>
                </button>
                <button type="button" class="qihui-sidebar-item ${page==='finance'?'active':''}" onclick="go('finance')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 9v6m-3-3h6"/></svg>
                  <span>充值记录</span>
                </button>
                <button type="button" class="qihui-sidebar-item" onclick="configure('sync')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  <span>域名管理</span>
                </button>
                <button type="button" class="qihui-sidebar-item" onclick="showQihuiModal('投诉管理', '<div style=\\'padding:8px 4px\\'><h4 style=\\'margin:0 0 8px\\'>用户反馈与维权</h4><p style=\\'color:#64748b;font-size:13px\\'>当前暂无未处理的观众投诉记录</p></div>')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                  <span>投诉管理</span>
                </button>
                <button type="button" class="qihui-sidebar-item ${page==='media'?'active':''}" onclick="go('media')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="4" x2="7" y2="20"/><line x1="17" y1="4" x2="17" y2="20"/><line x1="3" y1="12" x2="21" y2="12"/></svg>
                  <span>素材管理</span>
                </button>
                <button type="button" class="qihui-sidebar-item ${page==='scripts'?'active':''}" onclick="go('scripts')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>
                  <span>话术模版</span>
                </button>
                <button type="button" class="qihui-sidebar-item ${page==='robots'?'active':''}" onclick="go('robots')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8.01" y2="16"/><line x1="16" y1="16" x2="16.01" y2="16"/></svg>
                  <span>机器人模版</span>
                </button>
                <button type="button" class="qihui-sidebar-item" onclick="showQihuiModal('敏感词设置', '<div style=\\'padding:8px 4px\\'><h4 style=\\'margin:0 0 8px\\'>违规关键词拦截库</h4><p style=\\'color:#64748b;font-size:13px\\'>已启用美业直播通用违规词、极限词过滤引擎</p></div>')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  <span>敏感词设置</span>
                </button>
              </nav>

              <div class="qihui-sidebar-footer">
                <button type="button" class="qihui-collapse-btn" onclick="toggleQihuiSidebar()" title="${qihuiSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
                </button>
                <button type="button" class="qihui-pin-btn" title="固定侧边栏">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
                </button>
              </div>
            </aside>

            <main class="qihui-main-content">
              ${['live', 'records', 'statistics', 'trafficStats'].includes(page) && !serverRoomsLoaded
                ? `<section class="qihui-empty-state"><strong>${E(serverRoomsError || '正在读取数据库场次…')}</strong><p>${serverRoomsError ? '请检查管理员登录状态后刷新页面。' : '场次列表只显示服务器数据库中的记录。'}</p>${serverRoomsError ? '<button type="button" class="qihui-btn search" onclick="serverRoomsError=\'\';loadServerRooms()">重试</button>' : ''}</section>`
                : adminPage()}
            </main>
          </div>
        `;
      }
    } else {
      document.body.classList.remove('in-pc-mode');
      document.body.classList.remove('in-lcc-mode');
      $('#app').innerHTML = previewLayout();
      if (miniPage === 'watch') {
        if (!serverRoomsLoaded && !serverRoomsLoading && !serverRoomsError) loadServerRooms();
        else if (serverRoomsLoaded) ensureServerPlayback(roomId);
      }
    }
  };
}

if (!['在线观众', '商品管理', 'robot', '邀请记录'].includes(currentLccMainTab)) {
  currentLccMainTab = '在线观众';
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.qihui-more-btn') && !e.target.closest('.qihui-more-dropdown-menu')) {
      if (activeMoreDropdownRoomId !== null) {
        activeMoreDropdownRoomId = null;
        render();
      }
    }
  });
}

render();

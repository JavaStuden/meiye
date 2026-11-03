'use strict';

/**
 * 美业直播 · 现代化直播中控台、弹幕机器人、视频库与直播间设置核心逻辑
 */

const opsVideoUrls = new Map();
const opsImageUrls = new Map();
let pendingRoomId = null;
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
let serverMediaError = '';
if (db.configs?.cos) {
  delete db.configs.cos.secretId;
  delete db.configs.cos.secretKey;
  delete db.configs.cos;
  persist();
}

async function loadServerMedia() {
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
}

if (location.pathname === '/admin') loadServerMedia().then(() => render()).catch(() => {});

function csrfHeaders() {
  const headers = new Headers();
  const token = document.querySelector('meta[name="_csrf"]')?.content;
  const name = document.querySelector('meta[name="_csrf_header"]')?.content;
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

// 确保默认包含图一中的任务
if (!db.robotTasks) db.robotTasks = [];
if (!db.robotTasks.some(t => t.name === '向总互动')) {
  db.robotTasks.unshift({
    id: 9001,
    roomId: 1,
    templateId: 101,
    name: '向总互动',
    robotCount: 100,
    intervalDesc: '2~5 秒（随机）间隔',
    active: true,
    scope: '全部',
    loop: true,
    mode: '通用模式',
    commentIndex: 0,
    sentCount: 38,
    createdAt: Date.now() - 3600000
  });
}

function roomVideoUrl(asset) {
  if (!asset) return 'assets/reference.mp4';
  return opsVideoUrls.get(Number(asset.id)) || asset.videoUrl || asset.url || 'assets/reference.mp4';
}

function roomPosterUrl(room) {
  if (!room) return 'assets/live-still.png';
  return opsImageUrls.get(`${room.id}:cover`) || room.posterUrl || 'assets/live-still.png';
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
  const r = room() || db.rooms[0];
  const asset = db.assets.find(a => a.id === r.asset) || db.assets[0];
  const videoSrc = asset ? roomVideoUrl(asset) : 'assets/reference.mp4';
  const isPlaying = r.status === '直播中';

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
        <div class="lcc-metric-item"><i class="lcc-dot cyan"></i> 直播时长 <b id="lcc-timer-display">70:46:20</b></div>
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
          <video id="lcc-player" src="${E(videoSrc)}" controls autoplay loop muted poster="${E(roomPosterUrl(r))}" style="${!isPlaying ? 'filter: brightness(0.35) grayscale(0.5);' : ''}"></video>
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
                <label>弹幕次数</label>
                <b>${(db.comments || []).length + 24}</b>
              </div>
              <div class="lcc-metric-cell cell-teal">
                <label>弹幕人数</label>
                <b>${Math.min(18, (db.comments || []).length + 6)}</b>
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

// 弹幕聊天室实时消息流渲染
function renderLccChatStream(r) {
  const msgs = (db.comments || []).slice(-30);
  if (!msgs.length) {
    return `<div style="text-align:center;color:#64748b;font-size:12px;padding:20px 0">等待弹幕互动与机器人发言...</div>`;
  }
  return msgs.map((c, i) => {
    const isStaff = c.author === '运营人员' || c.author === '管理员';
    const uid = '90000' + ((1000 + i * 37) % 9000);
    return `
      <div class="lcc-chat-msg">
        <span class="lcc-msg-badge ${isStaff ? 'staff' : 'viewer'}">${isStaff ? '管理员' : '观众'}</span>
        <span class="lcc-msg-uid">${uid}</span>
        <span class="lcc-msg-author">${E(c.author || '美业同行')}</span>
        <span class="lcc-msg-text">${E(c.text)}</span>
      </div>`;
  }).join('');
}

function submitLccChatMsg(e, roomId) {
  e.preventDefault();
  const input = $('#lccChatInput');
  const text = String(input.value || '').trim();
  if (!text) return;
  db.comments.push({
    id: uid(),
    room: roomId,
    author: '管理员',
    text,
    at: Math.floor(Math.random() * 60)
  });
  input.value = '';
  persist();
  const stream = $('#lcc-chat-stream');
  if (stream) {
    stream.innerHTML = renderLccChatStream(room());
    stream.scrollTop = stream.scrollHeight;
  }
}

function clearLccChat(roomId) {
  db.comments = db.comments.filter(c => c.room !== roomId);
  persist();
  render();
  toast('弹幕聊天室已清屏');
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
        <span class="lcc-pill gray">总互动 ${(db.comments || []).length + 328} 次</span>
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

function submitLccCreateRobotTask(e, roomId) {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const templateId = Number(f.get('templateId'));
  const template = db.robotTemplates.find(t => t.id === templateId) || db.robotTemplates[0];
  const execType = f.get('execType');

  const newTask = {
    id: uid(),
    roomId,
    templateId: template.id,
    name: template.name,
    robotCount: template.robotCount,
    intervalDesc: `${template.intervalMin || 2}~${template.intervalMax || 5} 秒（随机）间隔`,
    active: true,
    scope: '全部',
    loop: template.loop !== false,
    execType,
    commentIndex: 0,
    sentCount: 0,
    createdAt: Date.now()
  };

  db.robotTasks.unshift(newTask);
  persist();
  currentLccSubTab = 'tasks';
  render();
  toast(`已成功为当前直播间创建机器人任务【${newTask.name}】！`);
}

function toggleRobotTask(id) {
  const t = db.robotTasks.find(x => x.id === id);
  if (!t) return;
  t.active = !t.active;
  persist();
  render();
  toast(t.active ? `已恢复任务【${t.name}】` : `已暂停任务【${t.name}】`);
}

function deleteRobotTask(id) {
  db.robotTasks = db.robotTasks.filter(x => x.id !== id);
  persist();
  render();
  toast('机器人任务已停止并删除');
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
  if (response.redirected || response.status === 401 || response.status === 403) throw new Error('请先登录管理后台，再生成分享码');
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
      <div class="ops-share-footer"><button type="button" class="ops-btn-cancel" onclick="closeDialog()">关闭</button></div>
    </div>`);
  const root = document.getElementById('live-share-content');
  const signal = liveShareRequest.signal;
  const setError = (kind, error) => {
    if (signal.aborted || !root.isConnected) return;
    root.querySelector(`#share-${kind}-image`).textContent = error.message;
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

function copyMiniProgramPath(id) { copyH5LiveUrl(`pages/watch/watch?id=${id}`); }

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
              ＋ 本地上传视频
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
    if (selectedFolder !== '全部视频' && selectedFolder !== '腾讯云 COS 存储' && a.folder !== selectedFolder) return false;
    if (selectedFolder === '腾讯云 COS 存储' && !a.source.includes('COS')) return false;
    if (query && !a.name.toLowerCase().includes(query) && !a.duration.includes(query)) return false;
    return true;
  });

  if (!filtered.length) {
    return `<div style="grid-column:1/-1;text-align:center;color:#94a3b8;padding:40px">
      ${selectedFolder === '腾讯云 COS 存储' ? E(serverMediaError || 'COS 素材库为空，请上传视频') : '暂无匹配的视频，可点击右上角【本地上传视频】'}
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
  const form = new FormData();
  form.append('file', file);
  const endpoint = location.pathname.startsWith('/meiye/') ? '/meiye/api/admin/media' : '/api/admin/media';
  fetch(endpoint, {method: 'POST', headers: csrfHeaders(), credentials: 'same-origin', body: form})
    .then(async response => {
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) { const body = await response.json().catch(() => ({})); throw new Error(body.message || (response.status === 401 || response.status === 403 || response.redirected ? '请先登录管理后台' : 'COS 上传失败')); }
      return response.json();
    })
    .then(item => loadServerMedia().then(() => {
      const asset = db.assets.find(row => row.serverId === Number(item.id));
      if (asset) selectVideoForRoom(asset.id);
      toast(`已上传到腾讯云 COS：${item.name}`);
    }))
    .catch(error => toast(error.message));
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

      <div class="field"><label>Bucket</label><input readonly value="meiye-live-media-1344161993"></div>
      <div class="field"><label>地域</label><input readonly value="ap-guangzhou"></div>
      <p class="ops-note" style="margin-top:10px">上传由管理后台转发到私有 COS。服务器需配置 COS_BUCKET、COS_REGION、COS_SECRET_ID、COS_SECRET_KEY 环境变量。</p>

        <div class="dialog-foot" style="margin-top:16px">
          <button type="button" onclick="closeDialog()">取消</button>
          <button class="primary" type="button" onclick="closeDialog()">完成</button>
        </div>
    </div>
  `);
}

function saveCosSettings() { toast('COS 凭证必须通过服务器环境变量配置'); }

/* ==========================================================================
   图九、图十一：场次表单重构 (录播记忆/循环/弹幕跟随 + 直播专属封面/背景与五项开关)
   ========================================================================== */

function roomForm(r = {}, assetId) {
  const isEdit = Boolean(r.id);
  const roomKey = r.id || pendingRoomId || uid();
  const mode = r.mode || '录播';
  const selectedAsset = db.assets.find(a => a.id === Number(assetId || r.asset)) || db.assets[0];
  const isCurrentlyPlaying = isEdit && Boolean(r.status === '直播中');

  return `
  <form id="roomOperationsForm" onsubmit="submitRoomOperations(event, ${isEdit ? Number(r.id) : 0}, ${Number(roomKey)})">
    <div class="ops-room-form">
      <!-- 基础信息 -->
      <section class="ops-form-section">
        <h3>场次基础信息</h3>
        <div class="field">
          <label for="ops-room-name">场次标题</label>
          <input id="ops-room-name" name="name" required maxlength="60" value="${E(r.name || (selectedAsset?.name ? selectedAsset.name.replace(/\.[^.]+$/, '') : '美业精品课录播'))}">
        </div>
        <div class="ops-form-grid">
          <div class="field">
            <label for="ops-room-mode">播放模式</label>
            <select id="ops-room-mode" name="mode" onchange="syncRoomModeFields(this.value)">
              <option value="录播" ${mode === '录播' ? 'selected' : ''}>录播（主要放视频）</option>
              <option value="直播" ${mode === '直播' ? 'selected' : ''}>直播（实时推流）</option>
              <option value="伪直播（录播播放）" ${mode.startsWith('伪直播') ? 'selected' : ''}>定时伪直播</option>
            </select>
          </div>
          <div class="field">
            <label for="ops-room-start">计划开始时间</label>
            <input id="ops-room-start" name="time" type="datetime-local" required value="${E((r.time || localTime(Date.now() + 300000)).replace(' ', 'T'))}">
          </div>
        </div>
      </section>

      <!-- 录播专用设置：视频素材库选择 + 记忆播放 + 循环播放 + 评论跟随循环 -->
      <section class="ops-form-section" data-room-mode="录播" ${mode === '录播' ? '' : 'hidden'}>
        <h3>录播视频素材</h3>
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
              <div style="display:flex;flex-direction:column;gap:6px">
                <button type="button" onclick="previewVideoWithMinutes(${selectedAsset.id})">预览视频</button>
                <button type="button" class="primary" onclick="openVideoLibraryModal(${selectedAsset.id})">切换视频</button>
              </div>
            </div>
          ` : `
            <div style="padding:16px;text-align:center;border:1px dashed #cbd5e1;border-radius:6px;margin-bottom:12px">
              <button type="button" class="primary" onclick="openVideoLibraryModal()">📂 从视频库/文件夹选择录播视频</button>
            </div>
          `}
        </div>

        <div class="ops-video-actions-bar">
          <button type="button" class="ops-action-btn primary-outline" onclick="openVideoLibraryModal(${selectedAsset?.id || 0})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span>从视频文件素材库选择视频</span>
          </button>
          <label class="ops-action-btn secondary-btn" style="cursor:pointer;margin:0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            <span>本地上传视频</span>
            <input type="file" accept="video/mp4,video/*" style="display:none" onchange="handleModalLocalUpload(this, ${selectedAsset?.id || 0})">
          </label>
        </div>

        <!-- 录播三大播放设置 (高保真卡片化，彻底杜绝原生复选框变形) -->
        <div class="ops-toggle-list">
          <!-- 1. 记忆播放 -->
          <div class="ops-toggle-card ${r.rememberPlayback !== false ? 'active' : ''}">
            <div class="ops-toggle-info">
              <div class="ops-toggle-title">
                <b>记忆播放</b>
                <span class="ops-toggle-status ${r.rememberPlayback !== false ? 'on' : 'off'}">${r.rememberPlayback !== false ? '已开启' : '已关闭'}</span>
              </div>
              <p class="ops-toggle-desc">开启后，同一账号在同一设备再次进入本场录播，将从上次观看位置继续播放。如果是首次进入，则从第一秒开始播放。</p>
            </div>
            <label class="ios-switch">
              <input type="checkbox" name="rememberPlayback" ${r.rememberPlayback !== false ? 'checked' : ''} onchange="updateOpsToggleCard(this)">
              <span class="slider"></span>
            </label>
          </div>

          <!-- 2. 循环播放 -->
          <div class="ops-toggle-card ${r.loopPlayback ? 'active' : ''}">
            <div class="ops-toggle-info">
              <div class="ops-toggle-title">
                <b>循环播放</b>
                <span class="ops-toggle-status ${r.loopPlayback ? 'on' : 'off'}">${r.loopPlayback ? '已开启' : '已关闭'}</span>
              </div>
              <p class="ops-toggle-desc">开启后，视频播完全部内容后将自动从头循环播放；关闭则停留在播放结束状态。</p>
            </div>
            <label class="ios-switch">
              <input type="checkbox" name="loopPlayback" ${r.loopPlayback ? 'checked' : ''} onchange="updateOpsToggleCard(this)">
              <span class="slider"></span>
            </label>
          </div>

          <!-- 3. 评论跟随循环 -->
          <div class="ops-toggle-card ${r.commentFollowLoop ? 'active' : ''} ${isCurrentlyPlaying ? 'disabled' : ''}">
            <div class="ops-toggle-info">
              <div class="ops-toggle-title">
                <b>评论跟随循环</b>
                <span class="ops-toggle-status ${isCurrentlyPlaying ? 'locked' : (r.commentFollowLoop ? 'on' : 'off')}">${isCurrentlyPlaying ? '开播已锁定' : (r.commentFollowLoop ? '已开启' : '已关闭')}</span>
              </div>
              <p class="ops-toggle-desc">${isCurrentlyPlaying ? '本场已开始播放，设置已被锁定，开播后不可修改。' : '每轮循环按原视频时间点同步展示已审核评论弹幕，不重复计数；开播后不可修改。'}</p>
            </div>
            <label class="ios-switch">
              <input type="checkbox" name="commentFollowLoop" ${r.commentFollowLoop ? 'checked' : ''} ${isCurrentlyPlaying ? 'disabled' : ''} onchange="updateOpsToggleCard(this)">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </section>

      <!-- 直播专用设置 (图九、图十一：封面图+背景图 + 仅回放、连麦、累计人数、允许聊天、显示首页五项) -->
      <section class="ops-form-section" data-room-mode="直播" ${mode === '直播' ? '' : 'hidden'}>
        <h3>直播间素材 (封面图 + 背景图)</h3>
        <div class="ops-image-grid">
          <div class="ops-image-field">
            <div class="ops-image-header">
              <label>直播封面图</label>
              <label class="button ops-file-button">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                更换封面
                <input type="file" accept="image/*" style="display:none" onchange="attachRoomImage('cover', this)">
              </label>
            </div>
            <div class="ops-thumb-container">
              <img id="room-cover-preview" src="${E(roomPosterUrl(r))}" alt="直播封面预览">
              <span id="room-cover-note" class="ops-thumb-tag">${opsImageUrls.has(`${roomKey}:cover`) ? '已选本地图片' : '默认直播封面'}</span>
            </div>
          </div>
          <div class="ops-image-field">
            <div class="ops-image-header">
              <label>直播背景图</label>
              <label class="button ops-file-button">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                更换背景
                <input type="file" accept="image/*" style="display:none" onchange="attachRoomImage('background', this)">
              </label>
            </div>
            <div class="ops-thumb-container">
              <img id="room-background-preview" src="${E(roomBackgroundUrl(r) || 'assets/live-still.png')}" alt="直播背景预览">
              <span id="room-background-note" class="ops-thumb-tag">${roomBackgroundUrl(r) ? '已配置背景' : '未选择背景'}</span>
            </div>
          </div>
        </div>

        <h3 style="margin-top:18px">直播间设置</h3>
        <p class="ops-note" style="margin-bottom:8px">精确控制直播间关键功能入口与互动状态：</p>
        <div class="ops-live-five-switches">
          <label>
            <input type="checkbox" name="replayEnabled" ${r.replayEnabled !== false ? 'checked' : ''}>
            <span>回放</span>
          </label>
          <label>
            <input type="checkbox" name="connectEnabled" ${r.connectEnabled ? 'checked' : ''}>
            <span>连麦</span>
          </label>
          <label>
            <input type="checkbox" name="showCumulative" ${r.showCumulative !== false ? 'checked' : ''}>
            <span>累计人数</span>
          </label>
          <label>
            <input type="checkbox" name="allowChat" ${r.allowChat !== false ? 'checked' : ''}>
            <span>允许聊天</span>
          </label>
          <label>
            <input type="checkbox" name="showHome" ${r.showHome !== false ? 'checked' : ''}>
            <span>显示首页</span>
          </label>
        </div>
      </section>

      <!-- 定时伪直播 -->
      <section class="ops-form-section" data-room-mode="伪直播（录播播放）" ${mode.startsWith('伪直播') ? '' : 'hidden'}>
        <h3>定时录播素材</h3>
        <p class="ops-note">全员同一排期统一进度播放录播视频。</p>
      </section>
    </div>

    <div class="dialog-foot">
      <button type="button" onclick="closeDialog()">取消</button>
      <button class="primary" type="submit">${isEdit ? '保存设置' : '创建场次'}</button>
    </div>
  </form>`;
}

function submitRoomOperations(event, editId, roomIdValue) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const mode = String(data.get('mode') || '录播');

  if (!name) return toast('请输入场次标题');
  const assetId = Number(data.get('asset')) || db.assets[0]?.id || 1;
  const start = data.get('time');

  let target = editId ? db.rooms.find(r => r.id === editId) : null;
  const id = editId || roomIdValue;
  const isCurrentlyPlaying = target && target.status === '直播中';

  const updates = {
    name,
    mode,
    asset: assetId,
    time: start ? start.replace('T', ' ') : localTime(Date.now()),
    // 录播三大设置
    rememberPlayback: data.has('rememberPlayback'),
    loopPlayback: data.has('loopPlayback'),
    commentFollowLoop: isCurrentlyPlaying ? target.commentFollowLoop : data.has('commentFollowLoop'),
    // 直播五大设置
    replayEnabled: data.has('replayEnabled'),
    connectEnabled: data.has('connectEnabled'),
    showCumulative: data.has('showCumulative'),
    allowChat: data.has('allowChat'),
    showHome: data.has('showHome')
  };

  if (target) {
    Object.assign(target, updates);
  } else {
    target = {
      ...updates,
      id,
      status: mode === '录播' ? '已发布' : '待开播',
      goods: [],
      likes: 0,
      onlineCount: 1,
      totalAudience: 5,
      replayPublished: true
    };
    db.rooms.unshift(target);
  }

  // 绑定封面与背景图
  for (const key of ['cover', 'background']) {
    const url = opsImageUrls.get(`${id}:${key}`) || opsImageUrls.get(`${pendingRoomId}:${key}`);
    if (url) opsImageUrls.set(`${id}:${key}`, url);
  }

  pendingRoomId = null;
  persist();
  closeDialog();
  render();
  toast(editId ? '场次设置已更新！' : '新场次已成功创建！');
}

// 覆盖入口
newLive = function(assetId) {
  pendingRoomId = uid();
  const r = assetId ? db.assets.find(a => a.id === Number(assetId)) : null;
  modal('创建直播/录播场次', roomForm({ id: 0, mode: '录播', time: localTime(Date.now() + 300000), asset: r?.id }, r?.id));
};

// 本地图片选取与预览更新 (修复图一)
function attachRoomImage(type, input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return toast('请选择有效的图片文件');
  const url = URL.createObjectURL(file);
  const roomKey = pendingRoomId || (room() ? room().id : 1);
  opsImageUrls.set(`${roomKey}:${type}`, url);
  const imgEl = $(`#room-${type}-preview`);
  if (imgEl) imgEl.src = url;
  const noteEl = $(`#room-${type}-note`);
  if (noteEl) noteEl.textContent = '已选择本地图片';
  toast(`已选择${type === 'cover' ? '封面' : '背景'}图片：${file.name}`);
}

// 图二高保真：直播设置专属弹窗 (Live Settings Modal)
function openLiveSettingsModal(roomId) {
  const r = db.rooms.find(x => x.id === Number(roomId)) || room() || db.rooms[0];
  modal('直播设置', `
    <div class="live-settings-dialog">
      <div class="live-settings-subhead">
        <span>开关变更后将同步至观众和主播直播间</span>
        <button type="button" class="live-settings-expand-btn" title="全屏" onclick="toggleLccFullscreen()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        </button>
      </div>

      <form onsubmit="saveLiveSettingsModal(event, ${r.id})">
        <div class="live-settings-switches-grid">
          <!-- 1. 回放 (蓝框) -->
          <div class="live-setting-item blue ${r.replayEnabled !== false ? 'active' : ''}">
            <span class="setting-name">回放</span>
            <label class="ios-switch">
              <input type="checkbox" name="replayEnabled" ${r.replayEnabled !== false ? 'checked' : ''} onchange="updateSwitchLabel(this)">
              <span class="slider"></span>
              <span class="switch-state-text">${r.replayEnabled !== false ? '开' : '关'}</span>
            </label>
          </div>

          <!-- 2. 礼物 (粉框) -->
          <div class="live-setting-item pink ${r.giftEnabled ? 'active' : ''}">
            <span class="setting-name">礼物</span>
            <label class="ios-switch">
              <input type="checkbox" name="giftEnabled" ${r.giftEnabled ? 'checked' : ''} onchange="updateSwitchLabel(this)">
              <span class="slider"></span>
              <span class="switch-state-text">${r.giftEnabled ? '开' : '关'}</span>
            </label>
          </div>

          <!-- 3. 在线人数 (紫框) -->
          <div class="live-setting-item purple ${r.onlineCountEnabled ? 'active' : ''}">
            <span class="setting-name">在线人数</span>
            <label class="ios-switch">
              <input type="checkbox" name="onlineCountEnabled" ${r.onlineCountEnabled ? 'checked' : ''} onchange="updateSwitchLabel(this)">
              <span class="slider"></span>
              <span class="switch-state-text">${r.onlineCountEnabled ? '开' : '关'}</span>
            </label>
          </div>

          <!-- 4. 累计人数 (青蓝框) -->
          <div class="live-setting-item cyan ${r.showCumulative !== false ? 'active' : ''}">
            <span class="setting-name">累计人数</span>
            <label class="ios-switch">
              <input type="checkbox" name="showCumulative" ${r.showCumulative !== false ? 'checked' : ''} onchange="updateSwitchLabel(this)">
              <span class="slider"></span>
              <span class="switch-state-text">${r.showCumulative !== false ? '开' : '关'}</span>
            </label>
          </div>

          <!-- 5. 火力值 (暗黑框) -->
          <div class="live-setting-item dark ${r.heatEnabled ? 'active' : ''}">
            <span class="setting-name">火力值</span>
            <label class="ios-switch">
              <input type="checkbox" name="heatEnabled" ${r.heatEnabled ? 'checked' : ''} onchange="updateSwitchLabel(this)">
              <span class="slider"></span>
              <span class="switch-state-text">${r.heatEnabled ? '开' : '关'}</span>
            </label>
          </div>

          <!-- 6. 连麦 (橙褐框) -->
          <div class="live-setting-item orange ${r.connectEnabled ? 'active' : ''}">
            <span class="setting-name">连麦</span>
            <label class="ios-switch">
              <input type="checkbox" name="connectEnabled" ${r.connectEnabled ? 'checked' : ''} onchange="updateSwitchLabel(this)">
              <span class="slider"></span>
              <span class="switch-state-text">${r.connectEnabled ? '开' : '关'}</span>
            </label>
          </div>

          <!-- 7. 允许聊天 (绿框) -->
          <div class="live-setting-item green ${r.allowChat !== false ? 'active' : ''}">
            <span class="setting-name">允许聊天</span>
            <label class="ios-switch">
              <input type="checkbox" name="allowChat" ${r.allowChat !== false ? 'checked' : ''} onchange="updateSwitchLabel(this)">
              <span class="slider"></span>
              <span class="switch-state-text">${r.allowChat !== false ? '开' : '关'}</span>
            </label>
          </div>
        </div>

        <!-- 底部全宽卡片：观看时长奖励 (Image 4) -->
        <div class="live-setting-reward-box ${r.watchRewardEnabled ? 'active' : ''}">
          <div class="reward-box-header">
            <b>观看时长奖励</b>
            <label class="ios-switch">
              <input type="checkbox" name="watchRewardEnabled" ${r.watchRewardEnabled ? 'checked' : ''} onchange="updateSwitchLabel(this)">
              <span class="slider"></span>
              <span class="switch-state-text">${r.watchRewardEnabled ? '开' : '关'}</span>
            </label>
          </div>
          <p class="reward-box-desc">
            观众达标后自动到账，可分别设置本场一次或每满指定时长奖励一次；暂停、离开或直播结束时停止计时。红包和余额均存入商城余额。
          </p>
        </div>

        <div class="live-settings-footer">
          <button type="button" class="live-settings-cancel" onclick="closeDialog()">取消</button>
          <button type="submit" class="live-settings-save">保存</button>
        </div>
      </form>
    </div>
  `);
}

function updateSwitchLabel(checkbox) {
  const item = checkbox.closest('.live-setting-item') || checkbox.closest('.live-setting-reward-box');
  const labelSpan = checkbox.parentElement.querySelector('.switch-state-text');
  if (labelSpan) {
    labelSpan.textContent = checkbox.checked ? '开' : '关';
  }
  if (item) {
    item.classList.toggle('active', checkbox.checked);
  }
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
    r.replayEnabled = f.has('replayEnabled');
    r.giftEnabled = f.has('giftEnabled');
    r.onlineCountEnabled = f.has('onlineCountEnabled');
    r.showCumulative = f.has('showCumulative');
    r.heatEnabled = f.has('heatEnabled');
    r.connectEnabled = f.has('connectEnabled');
    r.allowChat = f.has('allowChat');
    r.watchRewardEnabled = f.has('watchRewardEnabled');
    persist();
  }
  closeDialog();
  render();
  toast('直播设置已保存并同步至直播间！');
}

function editLiveRoom(id) {
  pendingRoomId = Number(id);
  const target = db.rooms.find(r => r.id === Number(id));
  if (!target) return toast('场次不存在');
  modal(`编辑场次 · ${target.name}`, roomForm(target, target.asset));
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
  modal('关闭直播提示', `
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
        <button type="button" class="qihui-btn reset" onclick="closeDialog()">取消</button>
        <button type="button" class="qihui-btn danger-confirm" onclick="closeLiveRoom(${r.id})">确认关闭直播</button>
      </div>
    </div>
  `);
}

function closeLiveRoom(id) {
  const r = db.rooms.find(x => x.id === Number(id));
  if (!r) return;
  r.status = '已结束';
  r.end = formatLocalDateTime(new Date());
  persist();
  try {
    const headers = csrfHeaders();
    headers.set('Content-Type', 'application/json');
    fetch(`/api/rooms/${r.id}/status`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ status: 'ENDED' })
    }).catch(() => {});
  } catch (e) {}
  activeMoreDropdownRoomId = null;
  closeDialog();
  render();
  toast(`直播间【${r.name}】已成功关闭！当前状态：【已结束】（结束时间：${r.end}）`);
}

function startLiveRoom(id) {
  const r = db.rooms.find(x => x.id === Number(id));
  if (!r) return;
  r.status = '直播中';
  r.time = formatLocalDateTime(new Date());
  r.end = '—';
  persist();
  try {
    const headers = csrfHeaders();
    headers.set('Content-Type', 'application/json');
    fetch(`/api/rooms/${r.id}/status`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ status: 'LIVE' })
    }).catch(() => {});
  } catch (e) {}
  activeMoreDropdownRoomId = null;
  closeDialog();
  render();
  toast(`直播间【${r.name}】已开启直播，当前状态：【直播中】！`);
}

function confirmDeleteLiveRoom(id) {
  const r = db.rooms.find(x => x.id === Number(id));
  if (!r) return;
  activeMoreDropdownRoomId = null;
  modal('删除场次确认', `
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
        <button type="button" class="qihui-btn reset" onclick="closeDialog()">取消</button>
        <button type="button" class="qihui-btn danger-confirm" onclick="deleteLiveRoom(${r.id})">确认删除</button>
      </div>
    </div>
  `);
}

function deleteLiveRoom(id) {
  const idx = db.rooms.findIndex(x => x.id === Number(id));
  if (idx !== -1) {
    const removed = db.rooms.splice(idx, 1)[0];
    persist();
    closeDialog();
    render();
    toast(`已成功删除直播场次：【${removed.name}】`);
  }
}

function copyLiveRoom(id) {
  const orig = db.rooms.find(r => r.id === Number(id));
  if (!orig) return;
  const newId = Math.max(...db.rooms.map(x => x.id)) + 1;
  const cloned = {
    ...structuredClone(orig),
    id: newId,
    name: `${orig.name} (复制)`,
    time: formatLocalDateTime(new Date(Date.now() + 600000)),
    end: '—',
    status: '待开播',
    createdAt: formatLocalDateTime(new Date())
  };
  db.rooms.unshift(cloned);
  persist();
  render();
  toast(`已复制并生成新场次：【${cloned.name}】（ID：${newId}，状态：待开播）`);
}

function toggleRoomVisibility(id, checked) {
  const r = db.rooms.find(x => x.id === Number(id));
  if (r) {
    r.showInList = checked;
    persist();
    toast(`直播间【${r.name}】已${checked ? '开启展示' : '隐藏'}`);
  }
}

function openPushPullModal(id) {
  const r = db.rooms.find(x => x.id === Number(id)) || room();
  modal(`推拉流配置 · ${r.name}`, `
    <div style="padding:4px">
      <p style="font-size:12px;color:#64748b;margin-bottom:14px">抖音 / 视频号 RTMP 推流尚未配置。平台推流地址与密钥需要保存在服务器环境变量中。</p>
      
      <div class="field" style="margin-bottom:12px">
        <label style="font-size:12px;font-weight:600">RTMP 推流状态</label>
        <input readonly value="未配置平台推流地址 / 密钥" style="width:100%;font-size:11px;background:#f8fafc">
      </div>

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:10px 14px;font-size:11px;color:#9a3412;margin-top:14px">
        推流端还需接入 FFmpeg 循环视频与 Qwen 音频混流服务；当前页面不会伪造可用线路。
      </div>

      <div class="dialog-foot" style="margin-top:16px">
        <button type="button" class="primary" onclick="closeDialog()">关闭</button>
      </div>
    </div>
  `);
}

// 统一映射：点击「直播设置」呼出图二专属面板
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
              <div>开播时间：${E(r.time || '—')}</div>
              <div>关播时间：${E(r.end || '已保存')}</div>
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

  // 1. 替换自定义封面与背景
  html = html.replace(/poster="[^"]*"/g, `poster="${E(roomPosterUrl(r))}"`);
  const background = roomBackgroundUrl(r);
  if (r.mode === '直播' && background) {
    html = html.replace(/class="mini-live room-reference/g, `class="mini-live room-reference ops-room-background" style="--ops-room-background:url('${E(background)}')`);
  }

  // 2. 录播循环播放
  if (r.mode === '录播' || r.mode.startsWith('伪直播')) {
    html = html.replace(/<video ([^>]*?)\sloop\s/g, `<video $1 ${r.loopPlayback ? 'loop' : ''} `);
  }

  // 3. 直播间设置：允许聊天
  if (r.mode === '直播' && r.allowChat === false) {
    html = html.replace(/<div class="room-input-shell">[\s\S]*?<\/div>/, '<span class="room-chat-disabled">本场暂未开放聊天</span>');
  }

  // 4. 直播间设置：显示首页
  if (r.mode === '直播' && r.showHome === false) {
    html = html.replace(/<button class="room-home"[\s\S]*?<\/button>/, '');
  }

  // 5. 直播间设置：连麦
  if (r.mode === '直播' && r.connectEnabled === false) {
    html = html.replace(/<button class="room-connect"[\s\S]*?<\/button>/, '');
  }

  // 6. 直播间设置：累计人数
  if (r.mode === '直播' && r.showCumulative === false) {
    html = html.replace(/<div class="room-audience"[\s\S]*?<\/div>/, '');
  }

  // 7. 直播间设置：回放
  if (r.mode === '直播' && r.replayEnabled === false) {
    html = html.replace(/<button class="room-replay"[\s\S]*?<\/button>/, '');
  }

  return html;
};

// 记忆播放核心调度
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
      video.currentTime = 0; // 首次进来从第一秒开始
    }
  } else {
    video.currentTime = 0;
  }

  // 定期记录进度
  video.ontimeupdate = () => {
    if (r.rememberPlayback !== false && video.currentTime > 0) {
      localStorage.setItem(storageKey, String(Math.floor(video.currentTime)));
    }
  };
}

// 机器人定时发射评论循环 (每 3 秒调度一次活跃任务)
if (!window._lccRobotInterval) {
  window._lccRobotInterval = setInterval(() => {
    if (!db.robotTasks) return;
    const activeTasks = db.robotTasks.filter(t => t.active);
    if (!activeTasks.length) return;

    for (const task of activeTasks) {
      const template = db.robotTemplates.find(t => t.id === task.templateId) || db.robotTemplates[0];
      const script = db.scriptTemplates.find(st => st.name === template.scriptTemplate) || db.scriptTemplates[0];
      if (!script || !script.lines || !script.lines.length) continue;

      const idx = (task.commentIndex || 0) % script.lines.length;
      const text = script.lines[idx];
      task.commentIndex = idx + 1;
      task.sentCount = (task.sentCount || 0) + 1;

      // 产生美业特色昵称
      const names = ['美业向向', '美肌时光小鹿', '广州颜悦皮肤', '静静美容定制', '护肤达人琳达', '雅兰美业阿强', '韩辰皮肤管理', '素颜主义小雅'];
      const author = names[Math.floor(Math.random() * names.length)];

      if (!db.comments) db.comments = [];
      db.comments.push({
        id: uid(),
        room: task.roomId,
        author,
        text,
        at: Math.floor(Math.random() * 60)
      });

      // 保持最多 60 条评论
      if (db.comments.length > 60) db.comments.shift();

      // 如果当前正处于中控台，实时同步更新弹幕聊天室
      const stream = $('#lcc-chat-stream');
      if (stream && page === 'control') {
        stream.innerHTML = renderLccChatStream(room());
        stream.scrollTop = stream.scrollHeight;
      }
    }
  }, 4000);
}

// 全屏中控台全屏切换
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
  toast(isDark ? '已切换至深色专业模式' : '已切换至浅色标准模式');
}

// 话术与机器人模板的增删改模态框
function openRobotTemplateModal(editId) {
  const target = editId ? db.robotTemplates.find(t => t.id === editId) : null;
  const scriptOpts = db.scriptTemplates.map(st => `<option value="${st.name}" ${target?.scriptTemplate === st.name ? 'selected' : ''}>${E(st.name)} (${(st.lines || []).length}条)</option>`).join('');

  modal(target ? '编辑机器人模板' : '新建机器人模板', `
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
      <div class="dialog-foot">
        <button type="button" onclick="closeDialog()">取消</button>
        <button class="primary" type="submit">保存模板</button>
      </div>
    </form>
  `);
}

function saveRobotTemplate(e, id) {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const name = String(f.get('name') || '').trim();
  const robotCount = Number(f.get('robotCount')) || 50;
  const scriptTemplate = String(f.get('scriptTemplate') || '技术互动');
  const intervalMin = Number(f.get('intervalMin')) || 2;
  const intervalMax = Number(f.get('intervalMax')) || 5;
  const loop = f.has('loop');

  if (id) {
    const t = db.robotTemplates.find(x => x.id === id);
    if (t) Object.assign(t, { name, robotCount, scriptTemplate, intervalMin, intervalMax, loop });
  } else {
    db.robotTemplates.push({ id: uid(), name, robotCount, scriptTemplate, intervalMin, intervalMax, loop, active: true });
  }
  persist();
  closeDialog();
  render();
  toast('机器人模板已保存！');
}

function deleteRobotTemplate(id) {
  if (db.robotTemplates.length <= 1) return toast('至少保留一个机器人模板');
  db.robotTemplates = db.robotTemplates.filter(t => t.id !== id);
  persist();
  render();
  toast('机器人模板已删除');
}

function openScriptTemplateModal(editId) {
  const target = editId ? db.scriptTemplates.find(st => st.id === editId) : null;
  const linesText = target ? (target.lines || []).join('\n') : '';

  modal(target ? '编辑话术模板' : '新建话术模板', `
    <form onsubmit="saveScriptTemplate(event, ${target ? target.id : 0})">
      <div class="field">
        <label>模板名称</label>
        <input name="name" required maxlength="30" value="${E(target?.name || '技术互动')}">
      </div>
      <div class="field">
        <label>话术条目（每行一条弹幕）</label>
        <textarea name="lines" rows="8" required placeholder="输入弹幕话术，每行一条">${E(linesText)}</textarea>
      </div>
      <div class="dialog-foot">
        <button type="button" onclick="closeDialog()">取消</button>
        <button class="primary" type="submit">保存话术</button>
      </div>
    </form>
  `);
}

function saveScriptTemplate(e, id) {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const name = String(f.get('name') || '').trim();
  const lines = String(f.get('lines') || '').split('\n').map(s => s.trim()).filter(Boolean);
  if (!lines.length) return toast('请至少输入一条话术');

  if (id) {
    const st = db.scriptTemplates.find(x => x.id === id);
    if (st) Object.assign(st, { name, lines });
  } else {
    db.scriptTemplates.push({ id: uid(), name, lines });
  }
  persist();
  closeDialog();
  render();
  toast('话术模板已保存！');
}

function deleteScriptTemplate(id) {
  if (db.scriptTemplates.length <= 1) return toast('至少保留一个话术模板');
  db.scriptTemplates = db.scriptTemplates.filter(st => st.id !== id);
  persist();
  render();
  toast('话术模板已删除');
}

// ==========================================================================
// 图三高保真：旗慧美业企业级工作台、直播管理列表与全局重塑
// ==========================================================================

function getUreshiLogoSvg() {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="40" viewBox="0 0 60 40"><rect width="60" height="40" rx="4" fill="%23fff" stroke="%23e2e8f0"/><text x="30" y="18" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="9" font-weight="900" fill="%23991b1b" text-anchor="middle">URESHI</text><text x="30" y="30" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="8" font-weight="700" fill="%23b91c1c" text-anchor="middle">优润诗</text></svg>`;
}

function getCourseCoverSvg(title) {
  const isGold = title.includes('水光');
  const isPink = title.includes('抗衰');
  const bg = isGold ? '%23fffbeb' : isPink ? '%23fdf2f8' : '%23f8fafc';
  const border = isGold ? '%23fde68a' : isPink ? '%23fbcfe8' : '%23e2e8f0';
  const color = isGold ? '%23b45309' : isPink ? '%23be185d' : '%232563eb';
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect width="60" height="60" rx="4" fill="${bg}" stroke="${border}"/><text x="30" y="24" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="8" font-weight="bold" fill="${color}" text-anchor="middle">${title.slice(0, 4)}</text><text x="30" y="38" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="7" fill="%2364748b" text-anchor="middle">实操课</text><rect x="10" y="44" width="40" height="8" rx="2" fill="${color}"/><text x="30" y="50" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="6" fill="%23fff" text-anchor="middle">精品回放</text></svg>`;
}

function ensureQihuiLiveRooms() {
  if (!db.rooms) db.rooms = [];
  if (db.rooms.some(r => r.id === 151)) return;

  const qihuiRooms = [
    { id: 151, name: '新客大单系统', host: '优润诗直播', mode: '录播', status: '直播中', time: '2026-10-24 22:11:13', end: '—', asset: 1, goods: [1, 2], showInList: true, createdAt: '2026-10-24 22:12:00', cover: getUreshiLogoSvg(), layout: '竖屏' },
    { id: 150, name: '瑞士抗衰', host: '优润诗直播', mode: '录播', status: '直播中', time: '2026-10-24 16:15:58', end: '—', asset: 2, goods: [1], showInList: true, createdAt: '2026-10-24 19:41:11', cover: getCourseCoverSvg('瑞士抗衰'), layout: '竖屏' },
    { id: 149, name: '瑞士抗衰', host: '优润诗直播', mode: '录播', status: '直播中', time: '2026-10-24 16:15:58', end: '—', asset: 2, goods: [1], showInList: true, createdAt: '2026-10-24 19:41:10', cover: getCourseCoverSvg('瑞士抗衰'), layout: '竖屏' },
    { id: 148, name: '瑞士抗衰', host: '优润诗直播', mode: '录播', status: '直播中', time: '2026-10-24 16:15:58', end: '—', asset: 2, goods: [1], showInList: true, createdAt: '2026-10-24 19:41:07', cover: getCourseCoverSvg('瑞士抗衰'), layout: '竖屏' },
    { id: 145, name: '瑞士抗衰', host: '优润诗直播', mode: '录播', status: '直播中', time: '2026-10-24 16:15:58', end: '—', asset: 2, goods: [1], showInList: true, createdAt: '2026-10-24 16:16:25', cover: getCourseCoverSvg('瑞士抗衰'), layout: '竖屏' },
    { id: 140, name: '采裂频', host: '优润诗直播', mode: '直播', status: '已结束', time: '2026-10-23 19:54:25', end: '2026-10-25 00:19:56', asset: 0, goods: [3], showInList: true, createdAt: '2026-10-23 19:54:51', cover: getCourseCoverSvg('采裂频'), layout: '竖屏' },
    { id: 118, name: '抗衰直播搭建', host: '优润诗直播', mode: '录播', status: '直播中', time: '2026-10-17 15:36:33', end: '—', asset: 3, goods: [2], showInList: true, createdAt: '2026-10-17 15:37:02', cover: getCourseCoverSvg('抗衰直播'), layout: '竖屏' },
    { id: 117, name: '水光直播搭建', host: '优润诗直播', mode: '录播', status: '直播中', time: '2026-10-17 15:35:17', end: '—', asset: 4, goods: [1], showInList: true, createdAt: '2026-10-17 15:36:06', cover: getCourseCoverSvg('水光直播'), layout: '竖屏' },
    { id: 116, name: '水光+抗衰不露脸直播', host: '优润诗直播', mode: '录播', status: '直播中', time: '2026-10-17 15:29:57', end: '—', asset: 1, goods: [1, 4], showInList: true, createdAt: '2026-10-17 15:34:32', cover: getCourseCoverSvg('抗衰水光'), layout: '竖屏' }
  ];

  db.rooms = [...qihuiRooms, ...db.rooms];
  persist();
}

let qihuiFilterName = '';
let qihuiFilterHost = '';
let qihuiFilterMode = '';
let qihuiFilterStatus = '';

function livePage() {
  ensureQihuiLiveRooms();

  let list = db.rooms.slice();
  if (qihuiFilterName) list = list.filter(r => r.name.toLowerCase().includes(qihuiFilterName.toLowerCase()));
  if (qihuiFilterHost) list = list.filter(r => (r.host || '优润诗直播').toLowerCase().includes(qihuiFilterHost.toLowerCase()));
  if (qihuiFilterMode) list = list.filter(r => r.mode.includes(qihuiFilterMode));
  if (qihuiFilterStatus) list = list.filter(r => r.status === qihuiFilterStatus);

  return `
  <div class="qihui-live-page">
    <!-- 合规提示条 (Image 3) -->
    <div class="qihui-compliance-bar">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>请您遵守国家相关规定，禁止发布含有违法、违规、低俗、暴力、色情、虚假宣传等内容直播。</span>
    </div>

    <!-- 筛选卡片 (Image 3 卡片 1) -->
    <div class="qihui-filter-card">
      <div class="qihui-filter-row">
        <div class="qihui-filter-item">
          <label>直播间名称</label>
          <input id="qihuiFilterName" placeholder="请输入直播间名称" value="${E(qihuiFilterName)}">
        </div>
        <div class="qihui-filter-item">
          <label>主播</label>
          <input id="qihuiFilterHost" placeholder="请输入主播名称" value="${E(qihuiFilterHost)}">
        </div>
        <div class="qihui-filter-item">
          <label>直播类型</label>
          <select id="qihuiFilterMode">
            <option value="">请选择直播类型</option>
            <option value="录播" ${qihuiFilterMode === '录播' ? 'selected' : ''}>录播</option>
            <option value="直播" ${qihuiFilterMode === '直播' ? 'selected' : ''}>直播</option>
            <option value="伪直播" ${qihuiFilterMode === '伪直播' ? 'selected' : ''}>伪直播</option>
          </select>
        </div>
        <div class="qihui-filter-item">
          <label>直播状态</label>
          <select id="qihuiFilterStatus">
            <option value="">请选择直播状态</option>
            <option value="直播中" ${qihuiFilterStatus === '直播中' ? 'selected' : ''}>直播中</option>
            <option value="待开播" ${qihuiFilterStatus === '待开播' ? 'selected' : ''}>待开播</option>
            <option value="已结束" ${qihuiFilterStatus === '已结束' ? 'selected' : ''}>已结束</option>
          </select>
        </div>
        <div class="qihui-filter-actions">
          <button class="qihui-btn reset" onclick="resetQihuiLiveFilters()">重置</button>
          <button class="qihui-btn search" onclick="applyQihuiLiveFilters()">查询</button>
        </div>
      </div>
    </div>

    <!-- 表格卡片 (Image 3 卡片 2) -->
    <div class="qihui-table-card">
      <div class="qihui-table-topbar">
        <button class="qihui-btn create-live" onclick="newLive()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          创建直播间
        </button>
        <button class="qihui-icon-btn refresh" onclick="render()" title="刷新列表">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        </button>
      </div>

      <div class="qihui-table-wrap">
        <table class="qihui-enterprise-table">
          <thead>
            <tr>
              <th style="width:45px">ID</th>
              <th style="width:65px">展示图</th>
              <th style="min-width:140px">直播间名称</th>
              <th style="min-width:90px">主播</th>
              <th style="min-width:150px">直播时间</th>
              <th style="width:75px">直播状态</th>
              <th style="width:65px">类型</th>
              <th style="width:55px">样式</th>
              <th style="width:75px">是否展示</th>
              <th style="min-width:130px">添加时间</th>
              <th style="min-width:140px">操作</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(r => renderQihuiTableRow(r)).join('') || `<tr><td colspan="11" style="text-align:center;padding:30px;color:#94a3b8">未找到匹配的直播间记录</td></tr>`}
          </tbody>
        </table>
      </div>

      <div class="qihui-pagination-bar">
        <div>共 ${list.length} 条记录</div>
        <div class="qihui-pager-tools">
          <button class="pager-btn" disabled>&lt;</button>
          <span class="pager-current">1</span>
          <button class="pager-btn" disabled>&gt;</button>
        </div>
      </div>
    </div>
  </div>`;
}

function renderQihuiTableRow(r) {
  const isPlaying = r.status === '直播中';
  const isEnded = r.status === '已结束';
  const isLiveType = r.mode === '直播';
  const isReplayType = r.mode === '录播';
  const thumbUrl = r.cover || (r.id === 151 ? getUreshiLogoSvg() : (r.id % 2 === 0 ? 'assets/beauty-products.png' : 'assets/live-still.png'));

  const statusClass = isPlaying ? 'live' : isEnded ? 'ended' : 'waiting';
  const typeClass = isLiveType ? 'live-type' : isReplayType ? 'replay-type' : 'pseudo-type';
  const typeText = isLiveType ? '直播' : isReplayType ? '录播' : '伪直播';

  return `
  <tr>
    <td style="color:#64748b;font-weight:500">${r.id}</td>
    <td>
      <img src="${E(thumbUrl)}" class="qihui-table-thumb" alt="${E(r.name)}" onerror="this.src='assets/beauty-products.png'">
    </td>
    <td>
      <b>${E(r.name)}</b>
    </td>
    <td style="color:#475569">${E(r.host || '优润诗直播')}</td>
    <td>
      <div style="font-size:11px">开播：${E(r.time || '2026-10-24 16:15:58')}</div>
      <div style="font-size:11px;color:#94a3b8">结束：${E(r.end || '—')}</div>
    </td>
    <td>
      <span class="qihui-status-tag ${statusClass}">${E(r.status)}</span>
    </td>
    <td>
      <span class="qihui-type-tag ${typeClass}">${typeText}</span>
    </td>
    <td style="color:#64748b">${E(r.layout || '竖屏')}</td>
    <td>
      <label class="ios-switch small">
        <input type="checkbox" ${r.showInList !== false ? 'checked' : ''} onchange="toggleRoomVisibility(${r.id}, this.checked)">
        <span class="slider"></span>
      </label>
    </td>
    <td style="color:#64748b;font-size:11px">${E(r.createdAt || r.time || '2026-10-24 19:41:07')}</td>
    <td>
      <div class="qihui-ops-links">
        <div class="qihui-ops-line">
          <button class="tbl-action-link" onclick="openControl(${r.id})">中控台</button>
          <button class="tbl-action-link" onclick="editLiveRoom(${r.id})">编辑</button>
          <button class="tbl-action-link" onclick="copyLiveRoom(${r.id})">复制</button>
        </div>
        <div class="qihui-ops-line">
          ${r.id === 140 || r.mode === '直播' ? `
            <button class="tbl-action-link" onclick="openPushPullModal(${r.id})">推拉流</button>
          ` : `
            <button class="tbl-action-link" onclick="openLiveShareModal(${r.id})">分享</button>
          `}
          <button class="tbl-action-link qihui-more-btn" onclick="toggleMoreOpsMenu(event, ${r.id})">··· 更多</button>
        </div>
        ${activeMoreDropdownRoomId === r.id ? `
          <div class="qihui-more-dropdown-menu" onclick="event.stopPropagation()">
            <button class="qihui-dropdown-item" onclick="activeMoreDropdownRoomId=null;openLiveSettingsModal(${r.id})">
              <span>⚙️</span> 直播设置
            </button>
            ${r.id === 140 || r.mode === '直播' ? `
              <button class="qihui-dropdown-item" onclick="activeMoreDropdownRoomId=null;openLiveShareModal(${r.id})">
                <span>🔗</span> 分享小程序/H5
              </button>
            ` : `
              <button class="qihui-dropdown-item" onclick="activeMoreDropdownRoomId=null;openPushPullModal(${r.id})">
                <span>📡</span> 推拉流配置
              </button>
            `}
            ${isPlaying ? `
              <button class="qihui-dropdown-item danger" onclick="confirmCloseLiveRoom(${r.id})">
                <span>🛑</span> 关闭直播
              </button>
            ` : `
              <button class="qihui-dropdown-item success" onclick="startLiveRoom(${r.id})">
                <span>▶️</span> 开启直播
              </button>
            `}
            <button class="qihui-dropdown-item delete" onclick="confirmDeleteLiveRoom(${r.id})">
              <span>🗑️</span> 删除场次
            </button>
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

// 全局覆写中控台和工作台为图二沉浸式专业中控台与图三企业后台
window.controlPage = controlPage;
window.liveWorkspace = controlPage;
window.overviewPage = controlPage;
window.livePage = livePage;

// 动态处理沉浸式全屏中控台布局与企业工作台布局 (图二、图三布局规范)
if (typeof window !== 'undefined') {
  window.render = function() {
    clearInterval(autoTimer);
    if (surface === 'pc') {
      document.body.classList.add('in-pc-mode');
      if (page === 'overview' || page === 'control') {
        document.body.classList.add('in-lcc-mode');
        try {
          if (localStorage.getItem('lcc-theme') === 'dark') {
            document.body.classList.add('lcc-dark-mode');
          } else {
            document.body.classList.remove('lcc-dark-mode');
          }
        } catch (e) {}
        $('#app').innerHTML = controlPage();
      } else {
        document.body.classList.remove('in-lcc-mode');
        $('#app').innerHTML = `
          <header class="qihui-header-bar">
            <div class="qihui-brand-group">
              <div class="qihui-brand-logo">
                <span class="qihui-logo-icon">T</span>
                <span>旗慧美业</span>
              </div>
              <button class="qihui-refresh-btn" onclick="render()" title="刷新">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </button>
            </div>

            <nav class="qihui-nav-tabs">
              <button class="qihui-nav-tab" onclick="openControl(1)">工作台</button>
              <button class="qihui-nav-tab" onclick="go('media')">课程</button>
              <button class="qihui-nav-tab ${page==='live'?'active':''}" onclick="go('live')">直播</button>
              <button class="qihui-nav-tab ${page==='goods'?'active':''}" onclick="go('goods')">商城</button>
              <button class="qihui-nav-tab ${page==='shop'?'active':''}" onclick="go('shop')">装修</button>
              <button class="qihui-nav-tab ${page==='orders'?'active':''}" onclick="go('orders')">交易</button>
              <button class="qihui-nav-tab ${page==='members'?'active':''}" onclick="go('members')">用户</button>
              <button class="qihui-nav-tab ${page==='data'?'active':''}" onclick="go('data')">数据</button>
              <button class="qihui-nav-tab ${page==='settings'?'active':''}" onclick="go('settings')">设置</button>
              <button class="qihui-nav-tab ${page==='marketing'?'active':''}" onclick="go('marketing')">应用</button>
            </nav>

            <div class="qihui-surface-switcher">
              <button class="qihui-surface-btn active">PC后台</button>
              <button class="qihui-surface-btn" onclick="switchSurface('mini')">小程序</button>
              <button class="qihui-surface-btn" onclick="switchSurface('h5')">H5端</button>
              <button class="qihui-surface-btn" onclick="switchSurface('capture')">录制APP</button>
            </div>

            <div class="qihui-header-tools">
              <button class="qihui-tool-icon" onclick="go('settings')" title="设置"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
              <button class="qihui-tool-icon" onclick="toggleDarkMode()" title="夜间模式"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button>
              <button class="qihui-tool-icon" onclick="toggleLccFullscreen()" title="全屏"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg></button>
              <div class="qihui-user-badge" title="当前登录账户：MY 优润诗管理">MY</div>
            </div>
          </header>

          <div class="qihui-workbench-layout">
            <aside class="qihui-sidebar">
              <nav class="qihui-sidebar-nav">
                <button class="qihui-sidebar-item ${page==='live'?'active':''}" onclick="go('live')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                  <span>直播间列表</span>
                </button>
                <button class="qihui-sidebar-item" onclick="configure('stream')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  <span>直播配置</span>
                </button>
                <button class="qihui-sidebar-item" onclick="modal('主播管理', '<div style=\\'padding:12px\\'><h4>签约主播列表</h4><p style=\\'color:#64748b;font-size:12px\\'>优润诗官方主播 · 向总团队已认证就绪</p></div>')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span>主播管理</span>
                </button>
                <button class="qihui-sidebar-item" onclick="go('live')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>直播记录</span>
                </button>
                <button class="qihui-sidebar-item" onclick="go('data')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  <span>直播统计</span>
                </button>
                <button class="qihui-sidebar-item" onclick="go('data')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                  <span>流量统计</span>
                </button>
                <button class="qihui-sidebar-item" onclick="go('data')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  <span>流量明细</span>
                </button>
                <button class="qihui-sidebar-item" onclick="go('finance')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  <span>充值记录</span>
                </button>
                <button class="qihui-sidebar-item" onclick="configure('sync')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  <span>域名管理</span>
                </button>
                <button class="qihui-sidebar-item" onclick="modal('投诉管理', '<div style=\\'padding:12px\\'><h4>用户反馈与维权</h4><p style=\\'color:#64748b;font-size:12px\\'>当前暂无未处理的观众投诉记录</p></div>')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                  <span>投诉管理</span>
                </button>
                <button class="qihui-sidebar-item" onclick="go('media')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  <span>素材管理</span>
                </button>
                <button class="qihui-sidebar-item" onclick="go('scripts')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span>话术模板</span>
                </button>
                <button class="qihui-sidebar-item" onclick="go('robots')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
                  <span>机器人模板</span>
                </button>
                <button class="qihui-sidebar-item" onclick="modal('敏感词设置', '<div style=\\'padding:12px\\'><h4>违规关键词拦截库</h4><p style=\\'color:#64748b;font-size:12px\\'>已启用全国美业直播通用违规词、极限词过滤引擎</p></div>')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                  <span>敏感词设置</span>
                </button>
              </nav>

              <div class="qihui-sidebar-footer">
                <button class="qihui-pin-btn" title="固定侧边栏">📌</button>
              </div>
            </aside>

            <main class="qihui-main-content">
              ${adminPage()}
            </main>
          </div>
        `;
      }
    } else {
      document.body.classList.remove('in-pc-mode');
      document.body.classList.remove('in-lcc-mode');
      $('#app').innerHTML = previewLayout();
    }
  };
}

// 确保选中的主标签属于允许的四个：在线观众、商品管理、弹幕机器人、邀请记录
if (!['在线观众', '商品管理', 'robot', '邀请记录'].includes(currentLccMainTab)) {
  currentLccMainTab = '在线观众';
}

// 全局点击自动关闭更多下拉操作栏
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

// 刷新页面状态保持
render();



const API_BASE = 'https://voice.yourunshi.online/meiye';

function baseUrl() {
  try { return getApp().globalData.apiBase || API_BASE; } catch (_) { return API_BASE; }
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl()}${path}`,
      method: options.method || 'GET',
      data: options.data,
      header: options.header || {},
      dataType: 'json',
      timeout: 15000,
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data);
          return;
        }
        reject(new Error(response.data && response.data.message || `后台暂时无法读取（${response.statusCode}）`));
      },
      fail() { reject(new Error('连接直播后台失败，请检查小程序服务器域名配置或网络')); }
    });
  });
}

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const base = baseUrl().replace(/\/+$/, '');
  const route = path.startsWith('/') ? path : `/${path}`;
  const baseMatch = /^(https?:\/\/[^/]+)(\/.*)?$/i.exec(base);
  const basePath = baseMatch && baseMatch[2] ? baseMatch[2].replace(/\/+$/, '') : '';
  if (baseMatch && basePath && (route === basePath || route.startsWith(`${basePath}/`))) {
    return `${baseMatch[1]}${route}`;
  }
  return `${base}${route}`;
}

function mapRoom(room) {
  const mode = room.modeLabel || room.mode;
  const rawStatus = room.statusLabel || room.status;
  const status = mode === '录播回放' && rawStatus === '直播中' ? '回放中' : rawStatus;
  return {
    ...room,
    mode,
    status,
    cover: mediaUrl(room.posterUrl),
    time: room.scheduledAt ? new Date(room.scheduledAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '时间待定',
    host: room.host || '美业直播间',
    replayVideo: room.mediaReady ? mediaUrl(room.streamUrl) : '',
    playerMessage: room.mediaReady ? '' : '本场暂未配置可播放的视频源'
  };
}

module.exports = { request, mediaUrl, mapRoom };

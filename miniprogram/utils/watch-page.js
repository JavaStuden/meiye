const { roomIdFromOptions } = require('./room-route');
const { request, mapRoom, mediaUrl } = require('./backend');

function createWatchPage({ customNav = false } = {}) {
  const page = {
    data: { room: null, roomError: '', loading: true, showProducts: false, showCommentInput: false, commentText: '', viewerName: '', postingComment: false, comments: [], commentScrollTarget: '', newCommentCount: 0, liked: false, products: [], playerHeadTop: 14, playerHeadRight: 12 },
    onLoad(options) {
      this.roomId = roomIdFromOptions(options);
      this.viewerToken = getViewerToken();
      this.followLatestComments = true;
      const system = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
      this.commentViewportHeight = (system.windowWidth || 375) * 250 / 750;
      this.setData({ viewerName: getViewerName(this.viewerToken) });
      if (customNav) {
        const system = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
        const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
        if (menu && menu.left && system.windowWidth) {
          this.setData({ playerHeadTop: menu.top, playerHeadRight: Math.max(12, system.windowWidth - menu.left + 8) });
        }
      }
      if (!this.roomId) this.refresh();
    },
    onShow() { if (this.roomId) { this.refresh(); this.startMessagePolling(); } },
    onHide() { this.stopMessagePolling(); },
    onUnload() { this.stopMessagePolling(); },
    async refresh() {
      if (!this.roomId) {
        this.setData({ room: null, loading: false, roomError: '直播间分享参数无效，请重新扫码。' });
        return;
      }
      this.setData({ loading: true, roomError: '' });
      try {
        const [rawRoom, playback, rawComments, rawProducts] = await Promise.all([
          request(`/api/rooms/${this.roomId}`),
          request(`/api/rooms/${this.roomId}/playback`),
          request(`/api/rooms/${this.roomId}/messages`),
          request(`/api/rooms/${this.roomId}/products`)
        ]);
        const room = { ...mapRoom(rawRoom), replayVideo: playback.source ? mediaUrl(playback.source) : '',
          playerMessage: playback.phase === 'UNCONFIGURED' ? '本场暂未配置可播放的视频源' : '' };
        const products = (Array.isArray(rawProducts) ? rawProducts : []).map(item => ({
          ...item, price: Number(item.price), original: Number(item.originalPrice), cover: '/assets/beauty-products.jpg'
        }));
        this.setData({ room, products, loading: false });
        this.applyComments(rawComments, true);
      } catch (error) {
        this.setData({ room: null, comments: [], products: [], loading: false, roomError: error.message });
      }
    },
    toggleProducts() { this.setData({ showProducts: !this.data.showProducts }); },
    startMessagePolling() {
      this.stopMessagePolling();
      this.messagePollTimer = setInterval(() => this.loadComments(), 4000);
    },
    stopMessagePolling() {
      if (this.messagePollTimer) clearInterval(this.messagePollTimer);
      this.messagePollTimer = null;
    },
    async loadComments() {
      try {
        const raw = await request(`/api/rooms/${this.roomId}/messages`);
        this.applyComments(raw);
      } catch (_) { }
    },
    applyComments(raw, forceLatest = false) {
      if (forceLatest) this.commentsTouching = false;
      const comments = (Array.isArray(raw) ? raw : []).slice(-80).map((item, index) => ({
        id: String(item.id == null ? `row-${index}` : item.id), name: item.author, text: item.content
      }));
      if (!forceLatest && (this.followLatestComments === false || this.commentsTouching)) {
        this.pendingComments = comments;
        const visibleIds = new Set(this.data.comments.map(item => item.id));
        this.setData({ newCommentCount: comments.filter(item => !visibleIds.has(item.id)).length });
        return;
      }
      this.pendingComments = null;
      this.followLatestComments = true;
      const changed = JSON.stringify(comments) !== JSON.stringify(this.data.comments);
      if (!changed && !forceLatest) return;
      this.setData({ comments, newCommentCount: 0, commentScrollTarget: '' }, () => {
        const last = comments[comments.length - 1];
        if (last && this.followLatestComments && !this.commentsTouching) {
          this.setData({ commentScrollTarget: `comment-${last.id}` });
        }
      });
    },
    onCommentsTouchStart() { this.commentsTouching = true; },
    onCommentsTouchEnd() { this.commentsTouching = false; },
    onCommentsScroll(event) {
      const detail = event.detail || {};
      this.followLatestComments = detail.scrollHeight - detail.scrollTop - this.commentViewportHeight <= 24;
    },
    onCommentsBottom() {
      this.followLatestComments = true;
      if (!this.commentsTouching && this.pendingComments) this.jumpToLatestComments();
    },
    jumpToLatestComments() {
      this.commentsTouching = false;
      this.applyComments(this.pendingComments ? this.pendingComments.map(item => ({ id: item.id, author: item.name, content: item.text }))
        : this.data.comments.map(item => ({ id: item.id, author: item.name, content: item.text })), true);
    },
    onVideoError(event) {
      const detail = event.detail && event.detail.errMsg || '视频加载失败';
      this.setData({ 'room.replayVideo': '', 'room.playerMessage': `${detail}。请检查 COS 视频权限、微信下载域名配置或视频编码格式。` });
    },
    openComment() {
      if (!this.data.room || !this.data.room.commentsEnabled) { wx.showToast({ title: '本场评论已关闭', icon: 'none' }); return; }
      this.setData({ showCommentInput: true });
    },
    closeComment() { this.setData({ showCommentInput: false }); },
    onCommentInput(event) { this.setData({ commentText: event.detail.value }); },
    onNicknameInput(event) { this.setData({ viewerName: event.detail.value }); },
    async sendComment() {
      const content = this.data.commentText.trim();
      const author = this.data.viewerName.trim().slice(0, 24);
      if (!content || !author || this.data.postingComment) return;
      this.setData({ postingComment: true });
      try {
        wx.setStorageSync('meiyeViewerName', author);
        await request(`/api/miniprogram/rooms/${this.roomId}/messages`, {
          method: 'POST', data: { author, content }, header: { 'X-Viewer-Token': this.viewerToken }
        });
        this.setData({ commentText: '', showCommentInput: false, postingComment: false });
        await this.loadComments();
        wx.showToast({ title: '评论已发送', icon: 'success' });
      } catch (error) {
        this.setData({ postingComment: false });
        wx.showToast({ title: error.message || '评论发送失败', icon: 'none' });
      }
    },
    toggleLike() { wx.showToast({ title: '点赞暂未接入', icon: 'none' }); },
    showDemo(event) { wx.showToast({ title: `${event.currentTarget.dataset.name}暂未接入`, icon: 'none' }); },
    preventClose() {},
    onShareAppMessage() {
      const room = this.data.room;
      if (!room) return { title: '美业直播', path: '/pages/home/home' };
      return { title: room.title, path: `/pages/watch-share/watch-share?id=${room.id}` };
    },
    openProduct(event) {
      const product = this.data.products.find(item => item.id === Number(event.currentTarget.dataset.id));
      if (!product) return;
      wx.showModal({ title: product.name, content: `${product.description || ''}\n价格：¥${Number(product.price).toFixed(2)}\n下单与支付暂未接入。`, showCancel: false });
    },
    openFeature(event) { wx.navigateTo({ url: `/pages/feature/feature?view=${event.currentTarget.dataset.view}` }); }
  };
  if (customNav) {
    page.onShareTimeline = function () {
      return this.data.room ? { title: this.data.room.title, query: `id=${this.roomId}` } : { title: '美业直播' };
    };
  }
  return page;
}

function getViewerToken() {
  let token = wx.getStorageSync('meiyeViewerToken');
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(token || '')) {
    token = `mp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
    wx.setStorageSync('meiyeViewerToken', token);
  }
  return token;
}

function getViewerName(token) {
  const saved = wx.getStorageSync('meiyeViewerName');
  return saved || `观众${token.slice(-4)}`;
}

module.exports = { createWatchPage };

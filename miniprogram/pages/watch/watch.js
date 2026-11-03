const { getState, saveState } = require('../../utils/demo-data');
const { roomIdFromOptions } = require('../../utils/room-route');

Page({
  data: { room: null, roomError: '', showProducts: false, showCommentInput: false, commentText: '', comments: [], liked: false, products: [] },
  onLoad(options) {
    this.roomId = roomIdFromOptions(options);
    this.refresh();
  },
  onShow() { if (this.roomId) this.refresh(); },
  refresh() {
    const state = getState();
    const room = state.rooms.find(item => item.id === this.roomId);
    if (!room) {
      this.setData({ room: null, roomError: this.roomId ? '此直播间暂未同步到小程序，请联系主办方。' : '直播间分享参数无效，请重新扫码。' });
      return;
    }
    const comments = state.comments[room.id] || room.comments;
    const products = room.goods.map(id => state.products.find(item => item.id === id)).filter(Boolean);
    this.setData({ room, comments, products, liked: Boolean(state.likedRooms && state.likedRooms[room.id]) });
  },
  toggleProducts() { this.setData({ showProducts: !this.data.showProducts }); },
  openComment() { this.setData({ showCommentInput: true }); },
  closeComment() { this.setData({ showCommentInput: false }); },
  onCommentInput(event) { this.setData({ commentText: event.detail.value }); },
  sendComment() {
    const text = this.data.commentText.trim();
    if (!text) return;
    const comments = this.data.comments.concat([{ name: '体验观众', text }]);
    const state = getState(); state.comments[this.roomId] = comments; saveState(state);
    this.setData({ comments, commentText: '', showCommentInput: false });
    wx.showToast({ title: '演示评论已发送', icon: 'none' });
  },
  toggleLike() {
    const state = getState(); state.likedRooms = state.likedRooms || {}; state.likedRooms[this.roomId] = !this.data.liked; saveState(state);
    this.refresh();
    wx.showToast({ title: this.data.liked ? '已点赞（演示）' : '已取消点赞', icon: 'none' });
  },
  showDemo(event) {
    wx.showToast({ title: `${event.currentTarget.dataset.name}为演示入口`, icon: 'none' });
  },
  preventClose() {},
  onShareAppMessage() {
    const room = this.data.room;
    if (!room) return { title: '美业直播', path: '/pages/home/home' };
    return { title: room.title, path: `/pages/watch/watch?id=${room.id}` };
  },
  onShareTimeline() { return this.data.room ? { title: this.data.room.title, query: `id=${this.roomId}` } : { title: '美业直播' }; },
  openProduct(event) { wx.navigateTo({ url: `/pages/feature/feature?view=detail&id=${event.currentTarget.dataset.id}` }); },
  openFeature(event) { wx.navigateTo({ url: `/pages/feature/feature?view=${event.currentTarget.dataset.view}` }); },
  reserve() {
    const state = getState(); state.reminders[this.roomId] = true; saveState(state);
    wx.showToast({ title: '已预约提醒（演示）', icon: 'none' });
  }
});

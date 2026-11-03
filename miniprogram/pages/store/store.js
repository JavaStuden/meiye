const { getState } = require('../../utils/demo-data');

Page({
  data: {
    products: [], rooms: [], query: '',
    shortcuts: [
      { label: '新品推荐', icon: '袋', view: 'category' }, { label: '限时秒杀', icon: '时', view: 'flash' }, { label: '拼团活动', icon: '团', view: 'group' }, { label: '领券中心', icon: '券', view: 'coupon' }, { label: '积分签到', icon: '签', view: 'points' },
      { label: '我的收藏', icon: '藏', view: 'favorites' }, { label: '地址管理', icon: '址', view: 'address' }, { label: '行业资讯', icon: '讯', view: 'news' }, { label: '会员中心', icon: '会', view: 'mine' }, { label: '商品分类', icon: '类', view: 'category' }
    ],
    coupons: [{ id: 'welcome20', name: '新人满199减20', amount: 20, threshold: 199 }, { id: 'live10', name: '直播专属满99减10', amount: 10, threshold: 99 }]
  },
  onShow() { this.refresh(); },
  onPullDownRefresh() { this.refresh(); wx.stopPullDownRefresh(); },
  refresh() { const state = getState(); this.setData({ products: state.products, rooms: state.rooms }); },
  onSearchInput(event) { this.setData({ query: event.detail.value }); },
  search() {
    const q = this.data.query.trim();
    if (!q) return this.refresh();
    const state = getState();
    this.setData({ products: state.products.filter(item => item.name.includes(q) || item.category.includes(q)), rooms: state.rooms.filter(item => item.title.includes(q)) });
  },
  openTab(event) { wx.switchTab({ url: `/pages/${event.currentTarget.dataset.tab}/${event.currentTarget.dataset.tab}` }); },
  openFeature(event) {
    const view = event.currentTarget.dataset.view;
    if (view === 'mine') return wx.switchTab({ url: '/pages/mine/mine' });
    if (view === 'category') return wx.switchTab({ url: '/pages/category/category' });
    wx.navigateTo({ url: `/pages/feature/feature?view=${view}` });
  },
  openProduct(event) { wx.navigateTo({ url: `/pages/feature/feature?view=detail&id=${event.currentTarget.dataset.id}` }); },
  openRoom(event) { wx.navigateTo({ url: `/pages/watch/watch?id=${event.currentTarget.dataset.id}` }); },
  takeCoupon(event) {
    const state = getState();
    if (state.coupons.some(coupon => coupon.id === event.currentTarget.dataset.id)) return wx.showToast({ title: '已领取', icon: 'none' });
    state.coupons.push({ id: event.currentTarget.dataset.id, name: event.currentTarget.dataset.name, amount: Number(event.currentTarget.dataset.amount), threshold: Number(event.currentTarget.dataset.threshold), used: false });
    require('../../utils/demo-data').saveState(state);
    this.refresh();
    wx.showToast({ title: '优惠券已领取（演示）', icon: 'none' });
  }
});

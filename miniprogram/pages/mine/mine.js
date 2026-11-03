const { getState } = require('../../utils/demo-data');

Page({
  data: { state: null, orderActions: [{ label: '待付款', icon: '付', view: 'orders' }, { label: '待发货', icon: '发', view: 'orders' }, { label: '待收货', icon: '收', view: 'orders' }, { label: '待核销', icon: '核', view: 'orders' }, { label: '退款售后', icon: '售', view: 'orders' }], menu: [
    { label: '我的录播课程', icon: '课', view: 'course' }, { label: '已预约直播', icon: '预', view: 'live' }, { label: '积分签到', icon: '签', view: 'points' }, { label: '我的优惠券', icon: '券', view: 'coupon' }, { label: '充值有礼', icon: '充', view: 'recharge' }, { label: '分享推广中心', icon: '享', view: 'distribution' }, { label: '佣金提现', icon: '提', view: 'withdraw' }, { label: '我的收藏', icon: '藏', view: 'favorites' }, { label: '消息通知', icon: '信', view: 'messages' }
  ] },
  onShow() {
    const state = getState();
    this.setData({ state: { ...state, walletText: Number(state.wallet).toFixed(2) } });
  },
  openMenu(event) {
    const view = event.currentTarget.dataset.view;
    if (view === 'live') return wx.switchTab({ url: '/pages/home/home' });
    wx.navigateTo({ url: `/pages/feature/feature?view=${view}` });
  },
  openOrders() { wx.navigateTo({ url: '/pages/feature/feature?view=orders' }); },
  openCart() { wx.switchTab({ url: '/pages/cart/cart' }); },
  showDemo() { wx.showToast({ title: '当前为交互演示', icon: 'none' }); }
});

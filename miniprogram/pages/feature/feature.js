const { getState, saveState, productById } = require('../../utils/demo-data');

const titles = {
  detail: '商品详情', checkout: '确认订单', orders: '我的订单', course: '录播课程', flash: '限时秒杀', group: '拼团活动', bargain: '好友助力', coupon: '领券中心', points: '积分签到', recharge: '充值有礼', lottery: '幸运抽奖', distribution: '分享有礼', rank: '邀请排行榜', withdraw: '佣金提现', stores: '附近门店', messages: '消息通知', favorites: '我的收藏', news: '行业资讯', address: '收货地址'
};

Page({
  data: { view: 'detail', title: '商品详情', state: null, product: null, isFavorite: false, couponOffers: [], categories: [], activeFilter: '全部', filters: ['全部', '待付款', '待发货', '待收货', '待核销', '已完成', '已取消'], visibleOrders: [], quantity: 1, prizeTiles: ['10元券', '20积分', '护肤礼盒', '50积分', '参与抽奖', '到店体验', '谢谢参与', '30积分', '5元券'], weekPoints: [10, 10, 10, 10, 10, 10, 30], rechargeOptions: [{ amount: 100, gift: 0 }, { amount: 500, gift: 50 }, { amount: 1000, gift: 120 }], invitees: ['演示好友A', '演示好友B', '演示好友C'], rankings: ['演示用户A', '演示用户B', '演示用户C', '演示用户D'], wheelIndex: 4, bargain: 159, selectedCoupon: '' },
  onLoad(options) {
    const view = options.view || 'detail';
    const id = Number(options.id || 1);
    wx.setNavigationBarTitle({ title: titles[view] || '美业直播' });
    this.setData({ view, title: titles[view] || '美业直播', product: productById(id) });
  },
  onShow() { this.refresh(); },
  refresh() {
    const state = getState();
    const view = this.data.view;
    const visibleOrders = view === 'orders' && this.data.activeFilter !== '全部' ? state.orders.filter(order => order.status === this.data.activeFilter) : state.orders;
    const cartItems = state.cart.map(row => ({ ...row, product: state.products.find(item => item.id === row.productId) })).filter(row => row.product);
    const productId = this.data.product && this.data.product.id;
    const favoriteProducts = state.products.filter(product => state.favorites.includes(product.id));
    const courseRooms = state.rooms.filter(room => room.mode === '录播');
    const offers = [{ id: 'welcome20', name: '新人满199减20', amount: 20, threshold: 199 }, { id: 'live10', name: '直播专属满99减10', amount: 10, threshold: 99 }];
    const visibleOrdersWithProduct = visibleOrders.map(order => ({ ...order, totalText: Number(order.total).toFixed(2), product: state.products.find(product => product.id === order.productId) || state.products[0] }));
    const campaignProducts = state.products.map(product => ({ ...product, promoPrice: product.id === 1 ? 129 : product.price }));
    const viewState = { ...state, walletText: Number(state.wallet).toFixed(2), commissionText: Number(state.commission).toFixed(2) };
    const bargain = Math.max(99, 159 - (state.bargainHelp || 0) * 10);
    this.setData({ state: viewState, visibleOrders: visibleOrdersWithProduct, cartItems, favoriteProducts, courseRooms, campaignProducts, bargain, bargainText: bargain.toFixed(2), isFavorite: Boolean(productId && state.favorites.includes(productId)), couponOffers: offers.map(item => ({ ...item, claimed: state.coupons.some(coupon => coupon.id === item.id) })) });
  },
  setFilter(event) {
    const activeFilter = event.currentTarget.dataset.filter;
    const state = getState();
    this.setData({ activeFilter, visibleOrders: activeFilter === '全部' ? state.orders : state.orders.filter(order => order.status === activeFilter) });
  },
  changeQuantity(event) { this.setData({ quantity: Math.max(1, Math.min(99, this.data.quantity + Number(event.currentTarget.dataset.delta))) }); },
  addToCart() {
    const state = getState(); const id = this.data.product.id;
    const row = state.cart.find(item => item.productId === id);
    if (row) row.quantity += this.data.quantity; else state.cart.push({ productId: id, quantity: this.data.quantity, checked: true });
    saveState(state); wx.showToast({ title: '已加入购物车', icon: 'success' });
  },
  buyNow() { this.addToCart(); wx.navigateTo({ url: '/pages/feature/feature?view=checkout' }); },
  toggleFavorite() {
    const state = getState(); const id = this.data.product.id;
    state.favorites = state.favorites || [];
    const index = state.favorites.indexOf(id);
    if (index >= 0) state.favorites.splice(index, 1); else state.favorites.push(id);
    saveState(state); this.refresh(); wx.showToast({ title: index >= 0 ? '已取消收藏' : '已收藏', icon: 'none' });
  },
  goCart() { wx.switchTab({ url: '/pages/cart/cart' }); },
  goStore() { wx.switchTab({ url: '/pages/store/store' }); },
  goMine() { wx.switchTab({ url: '/pages/mine/mine' }); },
  openFeature(event) { const view = event.currentTarget.dataset.view; if (view) wx.navigateTo({ url: `/pages/feature/feature?view=${view}` }); },
  openRoom(event) { wx.navigateTo({ url: `/pages/watch/watch?id=${event.currentTarget.dataset.id}` }); },
  takeCoupon(event) {
    const state = getState(); const id = event.currentTarget.dataset.id;
    if (state.coupons.some(coupon => coupon.id === id)) return wx.showToast({ title: '已领取', icon: 'none' });
    state.coupons.push({ id, name: event.currentTarget.dataset.name, amount: Number(event.currentTarget.dataset.amount), threshold: Number(event.currentTarget.dataset.threshold), used: false });
    saveState(state); this.refresh(); wx.showToast({ title: '领取成功（演示）', icon: 'none' });
  },
  checkout() {
    const state = getState();
    const rows = state.cart.filter(item => item.checked !== false);
    if (!rows.length) return wx.showToast({ title: '购物车没有选中商品', icon: 'none' });
    const total = rows.reduce((sum, row) => sum + state.products.find(item => item.id === row.productId).price * row.quantity, 0);
    const order = { id: `MY${Date.now()}`, productId: rows[0].productId, quantity: rows.reduce((sum, row) => sum + row.quantity, 0), total, status: '待付款', date: new Date().toISOString().slice(0, 10) };
    state.orders.unshift(order); state.cart = state.cart.filter(item => !rows.includes(item)); saveState(state); this.refresh();
    wx.showModal({ title: '演示订单已生成', content: `${order.id}\n合计 ¥${total.toFixed(2)}。当前不会扣款或发货。`, showCancel: false, success: () => wx.navigateTo({ url: '/pages/feature/feature?view=orders' }) });
  },
  cancelOrder(event) { const state = getState(); const order = state.orders.find(item => item.id === event.currentTarget.dataset.id); if (order) order.status = '已取消'; saveState(state); this.refresh(); wx.showToast({ title: '订单已取消（演示）', icon: 'none' }); },
  confirmReceive(event) { const state = getState(); const order = state.orders.find(item => item.id === event.currentTarget.dataset.id); if (order) order.status = order.status === '待核销' ? '已核销' : '已完成'; saveState(state); this.refresh(); wx.showToast({ title: '状态已更新（演示）', icon: 'none' }); },
  checkIn() { const state = getState(); if (state.signed) return wx.showToast({ title: '今天已签到', icon: 'none' }); state.signed = true; state.points += 10; saveState(state); this.refresh(); wx.showToast({ title: '签到成功，获得10积分', icon: 'none' }); },
  drawPrize() {
    const state = getState(); if (state.points < 20) return wx.showToast({ title: '积分不足，请先签到', icon: 'none' });
    state.points -= 20; const win = Math.random() < 0.5;
    if (win) { state.coupons.push({ id: `lottery-${Date.now()}`, name: '抽奖优惠券', amount: 10, threshold: 99, used: false }); state.lastPrize = '本次获得10元优惠券（演示）'; }
    else { state.points += 30; state.lastPrize = '本次获得30积分（演示）'; }
    saveState(state); this.refresh(); wx.showModal({ title: '抽奖结果', content: state.lastPrize, showCancel: false });
  },
  helpBargain() { const state = getState(); state.bargainHelp = (state.bargainHelp || 0) + 1; saveState(state); this.refresh(); wx.showToast({ title: '演示好友已助力，价格已更新', icon: 'none' }); },
  startGroup() { wx.showModal({ title: '拼团演示', content: '已模拟发起拼团，不会真实支付或邀请好友。', showCancel: false }); },
  confirmRecharge(event) { const amount = Number(event.currentTarget.dataset.amount); const state = getState(); state.wallet += amount; saveState(state); this.refresh(); wx.showToast({ title: '余额仅作本地演示更新', icon: 'none' }); },
  requestWithdraw() { wx.showToast({ title: '提现申请为演示，未提交资金请求', icon: 'none' }); },
  contactStore() { wx.showModal({ title: '悦己美学 · 总部旗舰店', content: '演示地址：品牌体验中心一层\n营业时间：10:00—21:00', showCancel: false }); },
  copyCode(event) { wx.setClipboardData({ data: event.currentTarget.dataset.code || 'YM1008' }); },
  previewShare() { wx.showToast({ title: '请使用右上角菜单分享小程序', icon: 'none' }); },
  noop() { wx.showToast({ title: '此处为订单信息演示', icon: 'none' }); },
  onShareAppMessage() {
    const title = this.data.view === 'bargain' ? '好友助力 · 享优惠' : this.data.view === 'distribution' ? '美业直播 · 邀请好友一起学习' : '美业直播 · 美业经营课堂';
    return { title, path: '/pages/home/home' };
  }
});

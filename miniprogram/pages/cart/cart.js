const { getState, saveState } = require('../../utils/demo-data');

Page({
  data: { items: [], total: '0.00', count: 0 },
  onShow() { this.refresh(); },
  refresh() {
    const state = getState();
    const items = state.cart.map(row => ({ ...row, product: state.products.find(item => item.id === row.productId) })).filter(row => row.product);
    const selected = items.filter(item => item.checked !== false);
    const total = selected.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    this.setData({ items, total: total.toFixed(2), count: selected.reduce((sum, item) => sum + item.quantity, 0) });
  },
  changeQuantity(event) {
    const state = getState();
    const row = state.cart.find(item => item.productId === Number(event.currentTarget.dataset.id));
    if (!row) return;
    row.quantity = Math.max(1, Math.min(99, row.quantity + Number(event.currentTarget.dataset.delta)));
    saveState(state); this.refresh();
  },
  toggleItem(event) {
    const state = getState();
    const row = state.cart.find(item => item.productId === Number(event.currentTarget.dataset.id));
    if (row) row.checked = !row.checked;
    saveState(state); this.refresh();
  },
  removeItem(event) {
    const state = getState();
    state.cart = state.cart.filter(item => item.productId !== Number(event.currentTarget.dataset.id));
    saveState(state); this.refresh();
  },
  checkout() {
    if (!this.data.count) return wx.showToast({ title: '请先选择商品', icon: 'none' });
    wx.navigateTo({ url: '/pages/feature/feature?view=checkout' });
  },
  openStore() { wx.switchTab({ url: '/pages/store/store' }); }
});

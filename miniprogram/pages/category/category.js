const { getState } = require('../../utils/demo-data');

Page({
  data: { categories: [], activeCategory: '全部', products: [] },
  onShow() { this.refresh(); },
  refresh() {
    const state = getState();
    const activeCategory = this.data.activeCategory;
    this.setData({ categories: state.categories, products: activeCategory === '全部' ? state.products : state.products.filter(item => item.category === activeCategory) });
  },
  selectCategory(event) {
    const activeCategory = event.currentTarget.dataset.category;
    const state = getState();
    this.setData({ activeCategory, products: activeCategory === '全部' ? state.products : state.products.filter(item => item.category === activeCategory) });
  },
  openProduct(event) { wx.navigateTo({ url: `/pages/feature/feature?view=detail&id=${event.currentTarget.dataset.id}` }); },
  openFeature(event) { wx.navigateTo({ url: `/pages/feature/feature?view=${event.currentTarget.dataset.view}` }); }
});

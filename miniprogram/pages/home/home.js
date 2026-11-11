const { request, mapRoom } = require('../../utils/backend');

Page({
  data: { rooms: [], visibleRooms: [], filters: ['全部直播', '正在直播', '直播预告', '录播回放'], activeFilter: '全部直播', loading: true, loadError: '' },
  onShow() { this.loadRooms(); },
  async loadRooms() {
    this.setData({ loading: true, loadError: '' });
    try {
      const response = await request('/api/rooms');
      const rooms = (Array.isArray(response) ? response : []).map(mapRoom);
      this.setData({ rooms, visibleRooms: this.filterRooms(rooms, this.data.activeFilter), loading: false });
    } catch (error) {
      this.setData({ rooms: [], visibleRooms: [], loading: false, loadError: error.message });
    }
  },
  filterRooms(rooms, filter) {
    if (filter === '正在直播') return rooms.filter(room => room.mode !== '录播回放' && room.status === '直播中');
    if (filter === '直播预告') return rooms.filter(room => room.status === '待开播');
    if (filter === '录播回放') return rooms.filter(room => room.mode.includes('录播'));
    return rooms;
  },
  selectFilter(event) {
    const activeFilter = event.currentTarget.dataset.filter;
    this.setData({ activeFilter, visibleRooms: this.filterRooms(this.data.rooms, activeFilter) });
  },
  openRoom(event) {
    wx.navigateTo({ url: `/pages/watch/watch?id=${event.currentTarget.dataset.id}` });
  },
  openFeature(event) {
    wx.navigateTo({ url: `/pages/feature/feature?view=${event.currentTarget.dataset.view}` });
  }
});

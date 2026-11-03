const { getState, saveState } = require('../../utils/demo-data');

Page({
  data: { rooms: [], visibleRooms: [], filters: ['全部直播', '正在直播', '直播预告', '录播回放'], activeFilter: '全部直播' },
  onShow() { this.loadRooms(); },
  loadRooms() {
    const state = getState();
    const visibleRooms = this.filterRooms(state.rooms, this.data.activeFilter);
    this.setData({ rooms: state.rooms, visibleRooms, reminders: state.reminders || {} });
  },
  filterRooms(rooms, filter) {
    if (filter === '正在直播') return rooms.filter(room => room.status === '直播中');
    if (filter === '直播预告') return rooms.filter(room => room.status === '待开播');
    if (filter === '录播回放') return rooms.filter(room => room.mode === '录播');
    return rooms;
  },
  selectFilter(event) {
    const activeFilter = event.currentTarget.dataset.filter;
    this.setData({ activeFilter, visibleRooms: this.filterRooms(this.data.rooms, activeFilter) });
  },
  openRoom(event) {
    wx.navigateTo({ url: `/pages/watch/watch?id=${event.currentTarget.dataset.id}` });
  },
  remind(event) {
    const state = getState();
    const id = Number(event.currentTarget.dataset.id);
    state.reminders[id] = true;
    saveState(state);
    this.loadRooms();
    wx.showToast({ title: '已预约提醒（演示）', icon: 'none' });
  },
  openFeature(event) {
    wx.navigateTo({ url: `/pages/feature/feature?view=${event.currentTarget.dataset.view}` });
  }
});

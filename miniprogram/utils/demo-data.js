const initialState = {
  rooms: [
    { id: 1, title: '美业经营课堂 · 门店盈利方案', host: '老师讲解 / 美业专场', mode: '直播', status: '直播中', time: '2026-10-07 19:30', cover: '/assets/live-still.jpg', likes: 4544, announcement: '欢迎来到美业经营课堂，课程资料和问题可在评论区咨询。', goods: [1, 2, 3], comments: [{ name: '俏佳人美肤中心', text: '怎么跟老师学习？' }, { name: '单酱', text: '皮肤店能用吗？' }, { name: '小叶', text: '这个方法讲得很清楚' }] },
    { id: 2, title: '美业门店经营 · 客户复购课程', host: '老师讲解 / 美业专场', mode: '伪直播（录播播放）', status: '待开播', time: '2026-10-08 19:30', cover: '/assets/live-still.jpg', likes: 621, announcement: '当前为排期播放演示，不代表真实直播。', goods: [4], comments: [{ name: '小美', text: '预约听课' }] },
    { id: 3, title: '肩颈护理实操 · 精品回放', host: '老师讲解 / 美业专场', mode: '录播', status: '已结束', time: '2026-10-06 14:00', cover: '/assets/live-still.jpg', replayVideo: 'https://voice.yourunshi.online/meiye/meiye/assets/reference.mp4', likes: 862, announcement: '本场为录播内容演示。', goods: [3], comments: [{ name: '小满', text: '已收藏，回去练习' }, { name: 'Linda', text: '讲解很细致' }] }
  ],
  products: [
    { id: 1, name: '舒缓修护精华液 30ml', category: '护肤产品', price: 159, original: 239, sold: 1286, stock: 268, tag: '直播间专享', cover: '/assets/beauty-products.jpg' },
    { id: 2, name: '水润保湿面膜 5片装', category: '护肤产品', price: 69, original: 99, sold: 2036, stock: 420, tag: '限时秒杀', cover: '/assets/beauty-products.jpg' },
    { id: 3, name: '肩颈舒缓护理体验 60分钟', category: '到店护理', price: 99, original: 198, sold: 186, stock: 60, tag: '到店核销', cover: '/assets/beauty-products.jpg' },
    { id: 4, name: '美业门店经营课 · 3节精品课程', category: '美业课程', price: 199, original: 399, sold: 426, stock: 999, tag: '录播课程', cover: '/assets/beauty-products.jpg' }
  ],
  categories: ['全部', '护肤产品', '到店护理', '美业课程'],
  cart: [],
  orders: [{ id: 'MY20261007001', productId: 1, quantity: 1, total: 159, status: '待发货', date: '2026-10-07' }, { id: 'MY20261007002', productId: 3, quantity: 1, total: 99, status: '待核销', date: '2026-10-07', code: 'YM1002' }],
  comments: {},
  favorites: [],
  coupons: [],
  points: 120,
  wallet: 800,
  commission: 186.5,
  signed: false,
  addresses: [{ name: '演示收件人', phone: '13800000000', address: '演示地址 · 不作为真实配送地址' }],
  reminders: {},
  lastPrize: ''
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getState() {
  const stored = wx.getStorageSync('meiyeMiniDemoState');
  if (stored && stored.products && stored.rooms) {
    stored.rooms.forEach(room => {
      if (room.cover === '/assets/live-still.png') room.cover = '/assets/live-still.jpg';
      if (room.id === 3 && room.mode === '录播') room.replayVideo = 'https://voice.yourunshi.online/meiye/meiye/assets/reference.mp4';
    });
    stored.products.forEach(product => {
      if (product.cover === '/assets/beauty-products.png') product.cover = '/assets/beauty-products.jpg';
    });
    wx.setStorageSync('meiyeMiniDemoState', stored);
    return stored;
  }
  const state = clone(initialState);
  wx.setStorageSync('meiyeMiniDemoState', state);
  return state;
}

function saveState(state) {
  wx.setStorageSync('meiyeMiniDemoState', state);
}

function roomById(id) {
  return getState().rooms.find(room => room.id === Number(id)) || getState().rooms[0];
}

function productById(id) {
  const state = getState();
  return state.products.find(product => product.id === Number(id)) || state.products[0];
}

module.exports = { initialState, getState, saveState, roomById, productById };

'use strict';
(() => {
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => '¥' + Number(value).toFixed(2);
  const date = value => value ? new Date(value).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai', hour12: false}) : '尚未设置';
  const dialog = $('#app-dialog');
  const content = $('#dialog-content');
  let toastTimer;
  function toast(message) {
    const node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.hidden = true; }, 3600);
  }
  try {
    const savedNotice = sessionStorage.getItem('meiye:admin-success');
    if (savedNotice) { sessionStorage.removeItem('meiye:admin-success'); toast(savedNotice); }
  } catch {}
  function openDialog(title, body) {
    if (!dialog) return;
    $('#dialog-title').textContent = title;
    content.replaceChildren();
    if (typeof body === 'string') content.innerHTML = body;
    else content.append(body);
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('dialog-open');
  }
  function closeDialog() { if (dialog) dialog.close(); }
  $('.dialog-close')?.addEventListener('click', closeDialog);
  dialog?.addEventListener('close', () => document.body.classList.remove('dialog-open'));
  dialog?.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
  });
  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = $('meta[name="_csrf"]')?.content;
    const tokenHeader = $('meta[name="_csrf_header"]')?.content;
    if (options.body) headers.set('Content-Type', 'application/json');
    if (options.method && options.method !== 'GET' && token && tokenHeader) headers.set(tokenHeader, token);
    const response = await fetch(path, {...options, headers, credentials: 'same-origin', cache: 'no-store'});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(response.status === 403 ? '会话已变化，请刷新页面后重试。' : data.message || '请求未完成，请稍后重试。');
      error.status = response.status;
      throw error;
    }
    return data;
  }
  async function busy(button, operation) {
    if (button.disabled || button.dataset.busy === 'true') return;
    button.dataset.busy = 'true';
    button.disabled = true;
    try { await operation(); } catch (error) { toast(error.message || '网络暂时不可用，请重试。'); }
    finally {
      delete button.dataset.busy;
      button.disabled = button.closest('#comment-form') ? document.body.dataset.commentsEnabled !== 'true' : false;
    }
  }

  // Admin lists are filtered locally; all changes are submitted to the server.
  let roomFilter = 'all';
  function filterRooms() {
    const query = ($('#room-search')?.value || '').trim().toLowerCase();
    let found = 0;
    $$('.room-card').forEach(card => {
      const visible = (roomFilter === 'all' || card.dataset.mode === roomFilter) && card.dataset.search.toLowerCase().includes(query);
      card.hidden = !visible;
      if (visible) found++;
    });
    if ($('#room-empty')) $('#room-empty').hidden = found > 0 || !$$('.room-card').length;
  }
  $$('[data-filter]').forEach(button => button.addEventListener('click', () => {
    roomFilter = button.dataset.filter;
    $$('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
    filterRooms();
  }));
  $('#room-search')?.addEventListener('input', filterRooms);
  $('#order-search')?.addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();
    let found = 0;
    $$('.order-row').forEach(row => { row.hidden = !row.textContent.toLowerCase().includes(query); if (!row.hidden) found++; });
    $('#order-filter-empty').hidden = found > 0 || !$$('.order-row').length;
  });
  const modeField = $('#mode');
  function updateModeHelp() {
    if (!modeField) return;
    const texts = {LIVE:'实时直播播放已有直播流；采集、推流、转码和分发需要你的流媒体服务。', REPLAY:'录播支持暂停与进度拖动；请填写可访问的 MP4 或 HLS 录播地址。', PSEUDO:'伪直播使用录播文件，按北京时间排期计算统一进度；需要开始时间与实际时长。'};
    $('#mode-help').textContent = texts[modeField.value];
    $('#scheduledAt').required = modeField.value === 'PSEUDO';
  }
  modeField?.addEventListener('change', updateModeHelp);
  updateModeHelp();
  $$('.room-edit-form, #product-editor form').forEach(editForm => editForm.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.target;
    const submit = $('button[type="submit"]', form);
    if (submit.disabled) return;
    let errorNotice = $('.form-submit-error', form);
    if (!errorNotice) {
      errorNotice = document.createElement('div');
      errorNotice.className = 'notice error form-submit-error';
      errorNotice.setAttribute('role', 'alert');
      errorNotice.tabIndex = -1;
      form.prepend(errorNotice);
    }
    errorNotice.hidden = true;
    const formData = new FormData(form);
    submit.disabled = true;
    try {
      const headers = new Headers();
      const csrfToken = $('meta[name="_csrf"]')?.content;
      const csrfHeader = $('meta[name="_csrf_header"]')?.content;
      if (csrfToken && csrfHeader) headers.set(csrfHeader, csrfToken);
      const response = await fetch(form.action, {method:'POST', headers, body:formData, credentials:'same-origin'});
      if (response.redirected && new URL(response.url).pathname === '/login') throw new Error('登录会话已变化。请在新标签页重新登录，再返回此页提交。');
      if (response.ok && response.redirected) {
        try { sessionStorage.setItem('meiye:admin-success', new URL(form.action).pathname === '/admin/products' ? '商品配置已保存' : '场次已保存'); } catch {}
        location.href = response.url; return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(response.status === 403 ? '登录会话已变化。请在新标签页重新登录，再返回此页提交。' : data.message || '保存未完成，请检查输入内容后重试。');
      }
      location.href = '/admin';
    } catch (error) {
      errorNotice.textContent = error.message || '网络暂时不可用，请重试。';
      errorNotice.hidden = false;
      errorNotice.focus();
      errorNotice.scrollIntoView({block:'center', behavior:'smooth'});
    } finally { submit.disabled = false; }
  }));
  $$('.date-display').forEach(node => { node.textContent = date(node.textContent); });

  const roomId = document.body.dataset.roomId;
  if (!roomId) return;
  const roomPath = '/api/rooms/' + encodeURIComponent(roomId);
  const roomMode = document.body.dataset.roomMode;
  const clock = $('#phone-time');
  function updateClock() { clock.textContent = new Date().toLocaleTimeString('zh-CN', {timeZone:'Asia/Shanghai', hour:'2-digit', minute:'2-digit', hour12:false}); }
  updateClock();
  setInterval(updateClock, 30000);

  let productRequest = 0;
  async function productList() {
    const request = ++productRequest;
    openDialog('直播间精选商品', '<p class="dialog-copy" role="status">正在读取最新商品…</p>');
    try {
      const products = await api(roomPath + '/products');
      if (request !== productRequest || !dialog.open || $('#dialog-title').textContent !== '直播间精选商品') return;
      const rows = products.map((product, index) => `<article class="product-row"><div class="product-art ${index % 2 ? 'art-sage' : 'art-rose'}" aria-label="商品示意插画"><span class="product-bottle"></span><small>BEAUTY</small></div><div class="product-details"><h3>${escape(product.name)}</h3><p>${escape(product.description)}</p><span class="price">${money(product.price)}</span>${product.originalPrice == null ? '' : '<del>' + money(product.originalPrice) + '</del>'}</div><button class="button pink small" data-buy data-id="${escape(product.id)}">选购</button></article>`).join('');
      openDialog('直播间精选商品', `<p class="dialog-intro">直播间精选 <span class="soft-badge">演示商品 · 不收取费用</span></p>${products.length ? '<div class="product-list">' + rows + '</div>' : '<p class="empty-state">本场暂未关联商品。</p>'}`);
    } catch (error) {
      if (request !== productRequest || !dialog.open || $('#dialog-title').textContent !== '直播间精选商品') return;
      openDialog('直播间精选商品', `<p class="form-error" role="alert">${escape(error.message)}</p><button class="button" data-action="products">重新读取商品</button>`);
    }
  }
  function roomInfo() { openDialog('关于这场直播', $('#room-info-template').content.cloneNode(true)); }
  function integration(feature) {
    const descriptions = {'优惠券':'需要配置券模板、适用商品、发放限额、领取身份和核销规则。', '拼团活动':'需要配置团购价格、成团条件、支付与超时退款服务。', '砍价活动':'需要配置助力规则、参与身份、价格边界和防重复机制。', '抽奖活动':'需要配置奖池、库存、参与资格和服务端开奖规则。', '分享分销':'分享链接可以复制；分销归因、佣金结算和提现服务尚未接入。'};
    openDialog(feature + ' · 待接入', `<span class="soft-badge">参考项目功能入口</span><p class="dialog-copy">${escape(descriptions[feature] || '此功能需要正式业务服务与外部接口。')}</p><div class="notice">本版本不模拟真实奖励、佣金、资金或支付结果。</div><p class="muted">当前可使用评论、点赞、每日签到、商品选购和演示订单查询。</p>`);
  }
  function share() {
    const link = location.origin + '/rooms/' + encodeURIComponent(roomId);
    openDialog('邀请朋友，一起观看', `<div class="dialog-copy">复制此链接，在同一网络或已部署的站点中打开。</div><div class="share-link" id="share-link"></div><button class="button pink full-width" id="copy-share">复制观看链接</button><p class="muted">本地地址仅能在本机访问；跨设备观看需使用可访问的部署地址。</p>`);
    $('#share-link').textContent = link;
    $('#copy-share').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(link);
        toast('观看链接已复制');
      } catch {
        const field = document.createElement('input');
        field.value = link; field.readOnly = true; field.setAttribute('aria-label', '观看链接，请手动复制');
        $('#share-link').replaceChildren(field); field.focus(); field.select();
        toast('请复制已选中的观看链接');
      }
    });
  }
  function checkIn(button) {
    return busy(button, async () => {
      const result = await api(roomPath + '/check-in', {method:'POST'});
      openDialog('直播签到', `<span class="soft-badge">当前浏览器会话 · 每日一次</span><strong class="points-number">${escape(result.points)}</strong><p class="points-label">今日演示积分</p><div class="notice success">${escape(result.message)}</div><p class="muted">积分用于本应用的业务演示，不可提现或兑换真实奖品。新会话会重新计算签到记录。</p>`);
    });
  }
  function orders() {
    let lastCode = '';
    try { lastCode = sessionStorage.getItem('meiye:last-order') || ''; } catch {}
    openDialog('查询演示订单', `<p class="dialog-copy">输入订单号和下单手机号，查看已提交的演示记录。</p><form id="lookup-form"><div class="field"><label for="lookup-code">订单号</label><input id="lookup-code" name="code" value="${escape(lastCode)}" required maxlength="80" placeholder="MY…"></div><div class="field"><label for="lookup-phone">下单手机号</label><input id="lookup-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required pattern="1[3-9][0-9]{9}" maxlength="11" placeholder="11 位手机号"></div><p class="form-error" id="lookup-error" role="alert" hidden></p><button class="button pink full-width" type="submit">查询订单</button></form>`);
    $('#lookup-form').addEventListener('submit', async event => {
      event.preventDefault();
      const button = $('button[type=submit]', event.target);
      await busy(button, async () => {
        $('#lookup-error').hidden = true;
        try {
          const code = $('#lookup-code').value.trim();
          const phone = $('#lookup-phone').value.trim();
          const result = await api('/api/orders/' + encodeURIComponent(code) + '?phone=' + encodeURIComponent(phone));
          showOrder(result, false);
        } catch (error) { $('#lookup-error').textContent = error.message; $('#lookup-error').hidden = false; }
      });
    });
  }
  function tools() {
    openDialog('直播互动与服务', '<div class="tool-grid"><button data-action="products"><svg><use href="#i-bag"/></svg>直播商品</button><button data-action="check-in"><svg><use href="#i-calendar"/></svg>签到积分</button><button data-action="share"><svg><use href="#i-share"/></svg>分享直播</button><button data-action="orders"><svg><use href="#i-order"/></svg>查询订单</button><button data-action="nickname"><svg><use href="#i-users"/></svg>修改昵称</button><button data-action="room-list"><svg><use href="#i-live"/></svg>全部场次</button></div><p class="dialog-copy">更多营销功能需要业务服务接入。</p><div class="tool-grid"><button data-action="integration" data-feature="优惠券">优惠券 · 待接入</button><button data-action="integration" data-feature="抽奖活动">抽奖 · 待接入</button><button data-action="integration" data-feature="分享分销">分销 · 待接入</button></div>');
  }
  let nickname = '访客';
  try { nickname = sessionStorage.getItem('meiye:nickname') || '访客'; } catch {}
  function editNickname() {
    openDialog('设置评论昵称', `<form id="nickname-form"><div class="field"><label for="nickname-input">昵称（1–24 个字）</label><input id="nickname-input" value="${escape(nickname)}" required maxlength="24"></div><button class="button pink full-width">保存昵称</button></form>`);
    $('#nickname-form').addEventListener('submit', event => {
      event.preventDefault();
      nickname = $('#nickname-input').value.trim();
      if (!nickname) return;
      try { sessionStorage.setItem('meiye:nickname', nickname); } catch {}
      closeDialog(); toast('评论昵称已更新');
    });
  }
  async function listRooms() {
    try {
      const rooms = await api('/api/rooms');
      const list = document.createElement('nav');
      list.className = 'room-switcher';
      rooms.forEach(room => {
        const a = document.createElement('a');
        a.href = '/rooms/' + encodeURIComponent(room.id);
        const title = document.createElement('span');
        const name = document.createElement('strong'); name.textContent = room.title;
        const label = document.createElement('small'); label.textContent = room.modeLabel + ' · ' + room.statusLabel;
        title.append(name, label); a.append(title); list.append(a);
      });
      openDialog('全部直播场次', list);
    } catch (error) { toast(error.message); }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const actions = {'products':productList,'room-info':roomInfo,'share':share,'check-in':()=>checkIn(button),'orders':orders,'tools':tools,'nickname':editNickname,'room-list':listRooms,'integration':()=>integration(button.dataset.feature)};
    actions[button.dataset.action]?.();
  });
  function showOrder(order, justCreated) {
    const title = justCreated ? '演示订单已提交' : '演示订单详情';
    const status = order.status === 'DEMO_PENDING' ? '演示待处理（未付款）' : order.status;
    openDialog(title, `<div class="order-receipt"><span class="receipt-check"><svg><use href="#i-check"/></svg></span><h3>${title}</h3><p>${escape(order.productName)} × ${escape(order.quantity)}</p><strong class="order-code">${escape(order.code)}</strong><p>订单金额 <strong class="price">${money(order.total)}</strong></p><p>顾客 ${escape(order.buyer)} · ${escape(order.phone)}</p><p>${escape(status)} · ${date(order.createdAt)}</p></div><div class="notice">未发生真实扣款；本订单不代表支付成功或实际发货。</div><p class="muted">请保存订单号，稍后可通过订单号和手机号查询。</p><div class="dialog-actions"><button class="button pink" data-action="products">继续逛逛</button><button class="button" data-action="orders">查询订单</button></div>`);
  }
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-buy]');
    if (!button) return;
    await busy(button, async () => {
      const products = await api(roomPath + '/products');
      const product = products.find(item => String(item.id) === button.dataset.id);
      if (!product) { toast('该商品已调整，请重新查看商品列表。'); await productList(); return; }
      checkout(product);
    });
  });
  function checkout(product) {
    openDialog('提交演示订单', `<div class="order-summary"><h3>${escape(product.name)}</h3><p>本商品为演示记录；不会扣费，不提供真实发货。</p><strong class="price">${money(product.price)}</strong></div><form id="checkout-form"><div class="field"><label for="buyer-name">联系人</label><input id="buyer-name" name="buyer" autocomplete="name" required maxlength="60" placeholder="填写用于演示订单的联系人"></div><div class="form-grid"><div class="field"><label for="buyer-phone">手机号</label><input id="buyer-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required pattern="1[3-9][0-9]{9}" maxlength="11" placeholder="11 位手机号"></div><div class="field"><label for="buy-quantity">数量</label><input id="buy-quantity" name="quantity" type="number" min="1" max="20" value="1" required></div></div><div class="notice">演示合计 <strong class="price" id="checkout-total">${money(product.price)}</strong></div><p class="form-error" id="checkout-error" role="alert" hidden></p><button class="button pink full-width" type="submit">确认提交演示订单（不付款）</button></form>`);
    $('#buy-quantity').addEventListener('input', event => { $('#checkout-total').textContent = money(Number(product.price) * Number(event.target.value || 0)); });
    $('#checkout-form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.target;
      const submit = $('button[type=submit]', form);
      await busy(submit, async () => {
        $('#checkout-error').hidden = true;
        try {
          const result = await api(roomPath + '/orders', {method:'POST', body:JSON.stringify({productId:Number(product.id),buyer:form.buyer.value.trim(),phone:form.phone.value.trim(),quantity:Number(form.quantity.value),expectedUnitPrice:product.price})});
          try { sessionStorage.setItem('meiye:last-order', result.code); } catch {}
          showOrder(result, true);
        } catch (error) {
          const errorNotice = $('#checkout-error');
          errorNotice.textContent = error.message;
          if (error.status === 409) {
            const reselect = document.createElement('button');
            reselect.type = 'button'; reselect.className = 'button small';
            reselect.dataset.action = 'products'; reselect.textContent = '重新选择商品';
            errorNotice.append(document.createTextNode(' '), reselect);
          }
          errorNotice.hidden = false;
        }
      });
    });
  }
  let lastMessageSignature = '';
  function updateRoomConfiguration(room) {
    document.title = room.title + ' · 美业直播';
    const fields = [
      ['.channel-pill strong', room.host], ['.room-announcement p', room.announcement],
      ['.current-room h3', room.title], ['.current-room .room-description', room.description]
    ];
    fields.forEach(([selector, value]) => { const node = $(selector); if (node) node.textContent = value || ''; });
    const status = $('.current-room .status-badge');
    if (status) { status.textContent = room.statusLabel; status.className = 'status-badge ' + room.status.toLowerCase(); }
    const poster = room.posterUrl || '/assets/studio-poster.svg';
    if (video.getAttribute('poster') !== poster) video.setAttribute('poster', poster);
    const posterImage = $('#studio-poster img');
    if (posterImage.getAttribute('src') !== poster) posterImage.setAttribute('src', poster);
    const info = $('#room-info-template').content;
    $('h3', info).textContent = room.title;
    $('.dialog-room-info > p', info).textContent = room.description || '';
    $('.notice p', info).textContent = room.announcement || '';
    const likeCount = $('#like-count');
    likeCount.textContent = Math.max(Number(likeCount.textContent) || 0, room.likes);
    const enabled = Boolean(room.commentsEnabled);
    const changed = document.body.dataset.commentsEnabled !== String(enabled);
    document.body.dataset.commentsEnabled = String(enabled);
    $('#comment-input').disabled = !enabled;
    $('#comment-input').placeholder = enabled ? '说点什么…' : '本场暂未开放评论';
    const commentSubmit = $('#comment-form button');
    commentSubmit.disabled = !enabled || commentSubmit.dataset.busy === 'true';
    $('#comments-status').textContent = enabled ? '已开放' : '已关闭';
    $('#product-count').textContent = room.productCount;
    if (changed) {
      lastMessageSignature = null;
      const hint = $('#room-comments .comment-invitation');
      if (hint) hint.textContent = enabled ? '和大家聊聊你的想法吧' : '本场暂未开放评论';
      toast(enabled ? '管理员已开放本场评论' : '管理员已关闭本场评论');
    }
  }
  async function refreshMessages() {
    if (document.hidden) return;
    const list = await api(roomPath + '/messages');
    const signature = list.map(message => message.id).join(',');
    if (signature === lastMessageSignature) return;
    lastMessageSignature = signature;
    const comments = $('#room-comments');
    comments.replaceChildren();
    if (!list.length) {
      const hint = document.createElement('p'); hint.className = 'comment-invitation';
      hint.textContent = document.body.dataset.commentsEnabled === 'true' ? '和大家聊聊你的想法吧' : '本场暂未开放评论';
      comments.append(hint);
    }
    list.forEach(message => {
      const line = document.createElement('p'); line.className = 'room-comment';
      const author = document.createElement('b'); author.textContent = message.author + '：';
      line.append(author, document.createTextNode(message.content)); comments.append(line);
    });
    comments.scrollTop = comments.scrollHeight;
  }
  $('#comment-form').addEventListener('submit', async event => {
    event.preventDefault();
    const input = $('#comment-input');
    const message = input.value.trim();
    if (!message) return;
    const submit = $('button', event.target);
    await busy(submit, async () => {
      await api(roomPath + '/messages', {method:'POST', body:JSON.stringify({author:nickname,content:message})});
      input.value = ''; await refreshMessages();
    });
  });
  $('#like-button').addEventListener('click', event => busy(event.currentTarget, async () => {
    const result = await api(roomPath + '/like', {method:'POST'});
    $('#like-count').textContent = result.likes;
    const button = $('#like-button'); button.classList.remove('liked');
    requestAnimationFrame(() => { button.classList.add('liked'); });
  }));
  refreshMessages().catch(() => {});
  setInterval(() => refreshMessages().catch(() => {}), 4000);

  // Playback uses a real URL supplied by the operator. A room status never fabricates media.
  const video = $('#room-video');
  const placeholder = $('#media-placeholder');
  const playButton = $('#play-video');
  const shortcuts = $('#player-shortcuts');
  const replayControls = $('#replay-controls');
  let playback = null;
  let receivedAt = 0;
  let activeSource = '';
  let hls = null;
  let mediaFailed = false;
  let polling = false;
  let playingRequested = false;
  function stateMessage(title, description, canPlay = false) {
    $('#media-title').textContent = title;
    $('#media-description').textContent = description;
    placeholder.hidden = false;
    playButton.hidden = !canPlay;
  }
  function sourceError() {
    mediaFailed = true;
    video.pause(); video.hidden = true; shortcuts.hidden = true; replayControls.hidden = true;
    $('#room-stage').classList.remove('with-replay-controls');
    $('#source-status').textContent = '无法播放 · 请检查地址';
    stateMessage('媒体暂时无法播放', '请检查媒体地址、格式、跨域与源站状态。\n可以联系管理员更新播放源。');
  }
  function destroySource() {
    hls?.destroy(); hls = null;
    video.pause(); video.removeAttribute('src'); video.load();
    activeSource = ''; mediaFailed = false; playingRequested = false;
    video.playbackRate = 1;
    $('#replay-speed').textContent = '1.0倍速';
    $('#replay-position').textContent = '0:00';
    $('#replay-duration').textContent = '0:00';
    $('#replay-seek').value = '0';
    $('#replay-seek').max = '1';
    video.hidden = true; shortcuts.hidden = true; replayControls.hidden = true;
    $('#room-stage').classList.remove('with-replay-controls');
  }
  function attachSource(source) {
    if (activeSource === source) return;
    destroySource(); activeSource = source;
    const isHls = /\.m3u8(?:$|[?#])/i.test(source);
    if (isHls && !video.canPlayType('application/vnd.apple.mpegurl')) {
      if (window.Hls?.isSupported()) {
        hls = new window.Hls({enableWorker:true, maxBufferLength:30});
        hls.loadSource(source); hls.attachMedia(video);
        hls.on(window.Hls.Events.ERROR, (_event, data) => { if (data.fatal) sourceError(); });
      } else { sourceError(); return; }
    } else { video.src = source; video.load(); }
    video.controls = false;
  }
  function pseudoOffset() {
    return Math.max(0, Number(playback?.offsetSeconds || 0) + (performance.now() - receivedAt) / 1000);
  }
  function syncPseudo(force = false) {
    if (roomMode !== 'PSEUDO' || playback?.phase !== 'PLAYING' || !video.readyState) return;
    const target = Math.min(pseudoOffset(), Math.max(0, Math.min(video.duration || Infinity, playback.durationSeconds) - .25));
    if (force || Math.abs(video.currentTime - target) > 3) video.currentTime = target;
  }
  function renderPlayback() {
    if (!playback) return;
    const hasSource = Boolean(playback.source);
    if (playback.phase === 'WAITING') {
      video.pause(); video.hidden = true; shortcuts.hidden = true; replayControls.hidden = true;
      playingRequested = false;
      $('#room-stage').classList.remove('with-replay-controls');
      $('#source-status').textContent = hasSource ? '已配置 · 等待开播' : '尚未配置';
      stateMessage('这场精彩，正在准备', (playback.startsAt ? '计划开始：' + date(playback.startsAt) : '场次尚未开放播放。') + (hasSource ? '\n到时刷新状态后可开始观看。' : '\n当前也尚未配置媒体播放源。'));
      return;
    }
    if (playback.phase === 'ENDED') {
      video.pause(); video.hidden = true; shortcuts.hidden = true; replayControls.hidden = true;
      playingRequested = false;
      $('#room-stage').classList.remove('with-replay-controls');
      $('#source-status').textContent = hasSource ? '已配置 · 本场已结束' : '尚未配置';
      stateMessage('本场播放已结束', roomMode === 'PSEUDO' ? '本场录播排期已经结束。\n你仍然可以浏览商品或参与评论。' : '感谢你的陪伴。\n可以在场次列表中选择其他内容。');
      return;
    }
    if (!hasSource || playback.phase === 'UNCONFIGURED') {
      if (activeSource) destroySource();
      $('#source-status').textContent = '尚未配置';
      stateMessage('待接入播放源', '场次已就绪，配置真实媒体后即可观看。\n此封面不是直播或录播视频。');
      return;
    }
    attachSource(playback.source);
    if (mediaFailed) return;
    syncPseudo();
    if (video.ended) {
      stateMessage('播放完成', roomMode === 'REPLAY' ? '可以再看一遍，也可以浏览本场精选商品。' : '媒体内容已播放完毕。', roomMode === 'REPLAY');
    } else if (!playingRequested) {
      $('#source-status').textContent = video.readyState > 0 ? '媒体已就绪' : '已配置 · 加载中';
      stateMessage(video.readyState > 0 ? '可以开始观看' : '播放源已配置', roomMode === 'PSEUDO' ? '本场使用录播文件，按排期同步播放。\n点击后将从当前排期进度开始观看。' : '已配置媒体地址。\n点击开始观看，是否可播取决于源站。', true);
    } else if (video.paused) {
      $('#source-status').textContent = '已暂停';
    }
  }
  async function refreshPlayback() {
    if (polling || document.hidden) return;
    polling = true;
    try {
      const [state, room] = await Promise.all([api(roomPath + '/playback'), api(roomPath)]);
      if (state.mode !== roomMode || room.mode !== roomMode) { location.reload(); return; }
      updateRoomConfiguration(room);
      playback = state; receivedAt = performance.now(); renderPlayback();
    }
    catch { if (!playback) stateMessage('暂时无法读取场次', '请检查网络连接，稍后将自动重试。'); }
    finally { polling = false; }
  }
  playButton.addEventListener('click', () => busy(playButton, async () => {
    if (!playback || playback.phase !== 'PLAYING' || mediaFailed) return;
    if (roomMode === 'REPLAY' && video.ended) video.currentTime = 0;
    syncPseudo(true);
    try { await video.play(); playingRequested = true; }
    catch (error) { if (error.name !== 'AbortError') stateMessage('播放器尚未开始', '媒体可能正在加载；也请检查源站访问权限与格式。', true); }
  }));
  video.addEventListener('loadedmetadata', () => { syncPseudo(true); if (!mediaFailed) $('#source-status').textContent = '媒体已就绪'; });
  video.addEventListener('playing', () => {
    if (playback?.phase !== 'PLAYING') { video.pause(); return; }
    playingRequested = true; video.hidden = false; placeholder.hidden = true;
    shortcuts.hidden = roomMode === 'REPLAY';
    replayControls.hidden = roomMode !== 'REPLAY';
    $('#room-stage').classList.toggle('with-replay-controls', roomMode === 'REPLAY');
    $('#video-toggle').textContent = '暂停';
    $('#replay-toggle').textContent = '暂停';
    $('#source-status').textContent = roomMode === 'PSEUDO' ? '录播按排期同步中' : '正在播放真实媒体';
  });
  video.addEventListener('pause', () => { $('#video-toggle').textContent = '继续'; $('#replay-toggle').textContent = '继续'; });
  video.addEventListener('error', () => { if (activeSource && video.getAttribute('src')) sourceError(); });
  video.addEventListener('ended', () => {
    shortcuts.hidden = true;
    stateMessage('播放完成', roomMode === 'REPLAY' ? '可以再看一遍，也可以浏览本场精选商品。' : '媒体内容已播放完毕。', roomMode === 'REPLAY');
  });
  $('#video-toggle').addEventListener('click', async () => {
    if (video.paused) { syncPseudo(true); try { await video.play(); } catch { toast('暂时无法继续播放，请重试。'); } }
    else video.pause();
  });
  $('#video-mute').addEventListener('click', () => { video.muted = !video.muted; $('#video-mute').textContent = video.muted ? '开声音' : '静音'; });
  const secondsLabel = seconds => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  video.addEventListener('timeupdate', () => {
    if (roomMode !== 'REPLAY' || !Number.isFinite(video.duration)) return;
    $('#replay-position').textContent = secondsLabel(video.currentTime);
    $('#replay-duration').textContent = secondsLabel(video.duration);
    $('#replay-seek').max = String(video.duration);
    $('#replay-seek').value = String(video.currentTime);
  });
  $('#replay-seek').addEventListener('input', event => { if (Number.isFinite(video.duration)) video.currentTime = Number(event.target.value); });
  $('#replay-back').addEventListener('click', () => { video.currentTime = Math.max(0, video.currentTime - 10); });
  $('#replay-toggle').addEventListener('click', async () => { if (video.paused) { try { await video.play(); } catch { toast('暂时无法继续播放。'); } } else video.pause(); });
  $('#replay-speed').addEventListener('click', () => {
    const rates = [1, 1.25, 1.5, 2, .75];
    video.playbackRate = rates[(rates.indexOf(video.playbackRate) + 1) % rates.length];
    $('#replay-speed').textContent = String(video.playbackRate) + '倍速';
  });
  $('#replay-mute').addEventListener('click', () => { video.muted = !video.muted; $('#replay-mute').textContent = video.muted ? '开声音' : '静音'; });
  refreshPlayback();
  setInterval(refreshPlayback, 8000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refreshMessages().catch(() => {}); refreshPlayback(); } });
  window.addEventListener('pagehide', destroySource);
})();

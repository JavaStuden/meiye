'use strict';

// Reference-led watching UI. The persistent notice is deliberately outside the chat feed.
const roomUIBase={messageMarkup,liveSheet,watch,commentsPage,controlPage,liveWorkspace,servicePage,render,overviewPage,dataPage,resetDemo};
const defaultRoomNotice='欢迎来到直播间。直播间内禁止未成年人打赏礼物或进行直播/连麦，禁止主播诱导观众私下交易，直播及连麦时禁止出现违法违规、色情低俗、诱导欺诈、抽烟酗酒等内容。请谨慎判断，理性消费，避免财产及人身损失，发现违规行为请及时投诉。';
let cleanRoomId=null;
let activeVisitRoom=null;
function roomFeedHeight(r){const value=Number(r?.feedHeight);return Number.isFinite(value)?Math.max(28,Math.min(62,value)):44;}
function roomViewEntries(r){return Number.isSafeInteger(r.viewEntries)&&r.viewEntries>=0?r.viewEntries:0;}
function roomLikeCount(r){return r.likeCount==null?4544:Number(r.likeCount)||0;}
function roomShareCount(r){return r.shareCount==null?59:Number(r.shareCount)||0;}
function totalViewEntries(){return db.rooms.reduce((n,r)=>n+roomViewEntries(r),0);}
// Count entry transitions, never paints, comments, likes, or panel changes.
render=function(){
  const r=room(),viewing=['mini','h5'].includes(surface)&&miniPage==='watch'&&mayWatch(r)&&r.status!=='已取消';
  const entered=viewing?r.id:null;
  transitionViewerPlaybackRoom(activeVisitRoom,entered);
  if(entered!==null&&activeVisitRoom!==entered){r.viewEntries=roomViewEntries(r)+1;r.lastViewedAt=stamp();persist();}
  activeVisitRoom=entered;
  roomUIBase.render();
};
resetDemo=function(){if(activeVisitRoom!==null)transitionViewerPlaybackRoom(activeVisitRoom,null);activeVisitRoom=null;cleanRoomId=null;roomUIBase.resetDemo();};
function roomNotice(r){return String(r.systemNotice||defaultRoomNotice);}
function smileIcon(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M7 14c1 5 9 5 10 0"/><path d="M8 8v3m8-3v3"/></svg>';}

messageMarkup=function(r,mini=false){
  if(!mini)return roomUIBase.messageMarkup(r,false);
  const messages=db.liveMessages.filter(m=>m.room===r.id&&!m.hidden&&!m.pending).slice(-12);
  return messages.length?messages.map(m=>{
    const role=m.kind==='viewer'?'观众':m.kind==='staff'?'运营':m.kind==='auto'?'助手':'系统';
    return `<div class="room-comment ${m.kind==='viewer'?'viewer-comment':m.kind==='auto'?'assistant-comment':'staff-comment'}"><span class="comment-role">${role}</span><b>${E(m.name)}：</b><span>${E(m.text)}</span></div>`;
  }).join(''):'<div class="room-comment comment-invitation">和老师打个招呼，聊聊你的问题吧</div>';
};

function roomGate(r,allowed,asset){
  if(!allowed)return `<h2>${E(r.permission)}专享</h2><p>${r.permission==='付费用户'?'购买关联课程后可观看':'请使用内部学员身份观看'}</p>${r.permission==='付费用户'?`<button class="pinkbtn" onclick="viewProduct(${r.accessProduct})">查看关联课程</button>`:'<button onclick="viewerIdentity()">切换演示身份</button>'}`;
  if(r.status==='已取消')return '<h2>本场直播已取消</h2><p>可返回列表查看其他场次</p><button onclick="navigateMini(\'live\',\'live\')">查看直播列表</button>';
  const pseudoReady=r.mode.startsWith('伪直播')&&asset?.status==='可用';
  if(r.status==='待开播'&&!pseudoReady)return `<h2>直播尚未开始</h2><p>${E(r.time)}</p><button class="pinkbtn" onclick="remindLive(${r.id})">${db.configs['remind'+r.id]?'取消预约':'预约开播提醒'}</button>`;
  if(r.mode==='录播'||r.status==='已结束'&&r.replayPublished&&asset?.status==='可用'&&!pseudoReady)return `<h2>录播回放</h2><p>${E(asset?.duration||'')} · 支持暂停与继续</p><button class="pinkbtn" onclick="playCourse(${r.asset})">播放回放</button>`;
  if(r.status==='已结束'&&!pseudoReady)return `<h2>本场直播已结束</h2><p>${r.archiveJob?'录像正在归档或等待运营发布':'暂无已发布回放'}</p><button onclick="navigateMini('live','live')">查看其他直播</button>`;
  return '';
}

function replayControlsMarkup(r){
  const asset=db.assets.find(a=>a.id===r.asset),duration=mediaSeconds(asset),seconds=viewerPlaybackTime(r),state=viewerPlaybackState(r),rates=[0.5,0.75,1,1.25,1.5,2];
  return `<div class="room-playback-controls" aria-label="录播播放控制"><div class="room-player-row"><button type="button" class="room-playback-toggle" data-viewer-playback-toggle onclick="toggleViewerPlayback(${r.id})" aria-label="${state?.playing?'暂停':'继续播放'}">${state?.playing?'Ⅱ':'▶'}</button><div class="room-player-timeline"><div class="room-player-time"><span data-viewer-playback-time>${fmt(seconds)}</span><span>/ ${E(asset?.duration||fmt(duration))}</span></div><input type="range" min="0" max="${Math.max(1,duration)}" step="1" value="${seconds}" aria-label="录播时间轴" data-viewer-playback-range oninput="setViewerPlaybackPosition(${r.id},this.value)" ${r.allowSeek===false?'disabled':''}></div><div class="room-rate-wrap"><button type="button" class="room-playback-rate" data-viewer-playback-rate onclick="toggleViewerPlaybackRateMenu(${r.id})">倍速 ${Number(state?.rate||1)}×</button><div class="room-speed-menu" data-viewer-speed-menu="${r.id}" role="group" aria-label="选择播放倍速" hidden>${rates.map(rate=>`<button type="button" data-viewer-speed-option="${rate}" class="${Number(state?.rate||1)===rate?'active':''}" aria-pressed="${Number(state?.rate||1)===rate?'true':'false'}" onclick="setViewerPlaybackRate(${r.id},${rate})">${rate}×</button>`).join('')}</div></div></div></div>`;
}

miniWatch=function(){
  const r=room(),allowed=mayWatch(r),asset=db.assets.find(a=>a.id===r.asset),pseudoReady=r.mode.startsWith('伪直播')&&asset?.status==='可用'&&r.status!=='已取消',replay=r.mode==='录播'||r.status==='已结束'&&r.replayPublished&&asset?.status==='可用'&&!r.mode.startsWith('伪直播'),gate=roomGate(r,allowed,asset),viewGate=allowed&&replay?'':gate;
  const clean=cleanRoomId===r.id&&!viewGate;
  const usePlaybackVideo=allowed&&asset?.status==='可用'&&(r.mode==='录播'||pseudoReady);
  const featured=allowed&&r.explain&&r.goods.includes(r.explain)?db.products.find(p=>p.id===r.explain&&p.active):null;
  const mode=pseudoReady?'直播中':r.mode==='录播'?'录播回放':r.mode==='直播'&&r.status==='直播中'?'实时直播':r.status;
  return `<div class="mini-live room-reference ${clean?'room-clean':''} ${featured?'has-featured':''} ${viewGate?'has-room-gate':''} ${allowed&&replay?'has-replay-controls':''}">
    ${usePlaybackVideo?`<video id="roomPlaybackMedia" class="mini-live-image room-replay-video" data-room-id="${r.id}" src="${E(assetVideoUrl(asset))}" poster="${E(roomPosterUrl(r))}" muted autoplay ${r.loopPlayback?'loop':''} playsinline preload="auto" aria-label="录播体验视频" onloadedmetadata="attachViewerPlaybackMedia(${r.id},this)"></video>`:`<img class="mini-live-image" src="${E(roomPosterUrl(r))}" alt="直播封面与背景画面">`}<div class="live-shade"></div>
    <div class="room-header"><div class="room-channel"><span class="room-avatar">美</span><div><strong title="${E(r.name)}">${E(r.name)}</strong><small><span data-live-like-count>${roomLikeCount(r).toLocaleString('zh-CN')}</span> 本场点赞</small></div></div><div class="room-capsule">${r.mode==='直播'&&r.showHome!==false?'<button class="room-home" onclick="navigateMini(\'home\',\'home\')" aria-label="返回首页">首页</button>':''}<button onclick="liveSheet('tools')" aria-label="更多直播互动">•••</button><i></i><button onclick="navigateMini('live','live')" aria-label="退出直播间">◎</button></div></div>
    <div class="room-subheader">${r.mode==='直播'&&r.showCumulative===false?'':`<span class="room-audience" title="按进入直播间的次数累计，同一人重新进入也计入"><b data-room-view-entries>${roomViewEntries(r).toLocaleString('zh-CN')}</b> 累计观看人次</span>`}<button class="room-report" onclick="reportRoom()">投诉</button></div>
    <div class="room-play-label"><i></i>${E(mode)}${mode==='直播中'?` <b data-room-time>${fmt(playbackTime(r))}</b>`:''}</div>
    ${viewGate?`<div class="watch-state">${viewGate}</div>`:''}
    ${allowed&&replay&&asset?.status==='可用'&&r.replayEnabled!==false?replayControlsMarkup(r):''}
    <div class="room-interaction-stack" data-testid="room-interaction-stack" style="--room-feed-height:${roomFeedHeight(r)}%">
      <aside class="room-system-notice room-feed-message" aria-label="直播间系统提示" data-testid="system-notice"><span class="room-feed-badge">通知</span><span>${E(roomNotice(r))}</span></aside>
      <div class="room-topic-message"><span class="room-feed-badge">主题</span><span>${E(r.topic||'成交教练')}</span></div>
      <div class="room-topic-message"><span class="room-feed-badge">通知</span><span>主播已隐藏观众昵称</span></div>
      <div class="room-gift-message" aria-label="互动样例，仅用于展示界面"><span class="room-fan-badge">✦ 5</span><span class="room-rank-badge">⭐2 学员团</span><span class="room-demo-gift">互动样例 送出“学习到了” ×1</span></div>
      <div class="live-comments room-comments" id="liveComments" aria-label="直播评论记录">${allowed?messageMarkup(r,true):''}</div>
    </div>
    ${featured?`<div class="live-product room-featured">${productPic(featured)}<div class="grow"><small>正在讲解</small><strong>${E(featured.name)}</strong><span class="money">${currency(featured.price)}</span></div><button class="pinkbtn" onclick="viewProduct(${featured.id})">去看看</button></div>`:''}
    <div class="live-footer room-footer">
      ${r.mode==='直播'&&r.allowChat===false?'<span class="room-chat-disabled">本场暂未开放聊天</span>':`<div class="room-input-shell"><input id="liveInput" aria-label="直播评论" placeholder="聊一聊" maxlength="100" ${viewGate?'disabled':''} onkeydown="if(event.key==='Enter')sendLiveComment()"><button class="room-emoji" onclick="openRoomEmoji()" aria-label="选择评论表情" ${viewGate?'disabled':''}>${smileIcon()}</button></div>`}
      <button class="room-bag" onclick="liveSheet('products')" aria-label="直播商品">${icon('bag')}</button>
      <button class="room-connect" onclick="liveSheet('connect')" aria-label="视频连麦"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 3.1 8 2.5l2.2 5.1-2 1.7a15.8 15.8 0 006.5 6.5l1.7-2 5.1 2.2-.6 2.8a3 3 0 01-3 2.4C9.8 20.7 3.3 14.2 2.8 6.1a3 3 0 012.4-3z"/><path d="M14.5 6.2h7v6.1h-7zM12.8 8l-4 2.1V8.4l4-2.1z"/></svg></button>
      <button class="room-gift" onclick="liveSheet('gift')" aria-label="直播礼物">${icon('gift')}</button>
      <button class="room-share" onclick="liveSheet('share')" aria-label="分享直播"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3l8 8-8 8v-5C7.5 14 4 16.3 2 21c.6-8.3 4.2-12 12-12V3z"/></svg><small class="room-share-count" aria-label="分享次数示例"><span data-live-share-count>${roomShareCount(r).toLocaleString('zh-CN')}</span></small></button>
      <button class="room-like" onclick="likeRoom()" aria-label="点赞"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v11H3V10h4zm2 11h8.4c1.1 0 2-.7 2.3-1.7l2-6.5A2.2 2.2 0 0017.6 10H14l.6-3.5A2.8 2.8 0 0011.9 3L9 10v11z"/></svg><small class="room-like-count" aria-label="点赞次数示例"><span data-live-like-count>${roomLikeCount(r).toLocaleString('zh-CN')}</span></small></button>
    </div><div id="roomLikeLayer" class="room-like-layer" aria-hidden="true"></div>
    <button class="restore-room-ui" onclick="toggleRoomClean()">${icon('grid')} 恢复互动</button><div id="sheetMount"></div>
  </div>`;
};

watch=function(id){cleanRoomId=null;roomUIBase.watch(id);};
function roomSheet(title,body,theme=''){
  if(!$('#sheetMount'))return;
  $('#sheetMount').innerHTML=`<button class="room-sheet-backdrop" aria-label="关闭弹层" onclick="closeSheet()"></button><section class="sheet room-sheet ${theme}" role="dialog" aria-label="${E(title)}"><div class="sheet-head"><h2>${E(title)}</h2><button aria-label="关闭面板" onclick="closeSheet()">×</button></div>${body}</section>`;
}
liveSheet=function(id){
  if(id==='products'){
    const goods=room().goods.map(id=>db.products.find(p=>p.id===id&&p.active)).filter(Boolean);
    const body=goods.length?`<p class="room-sheet-count">共 ${goods.length} 件商品</p>${goods.map(p=>`<div class="room-goods-row">${productPic(p)}<div class="grow"><h3>${E(p.name)}</h3><p>${currency(p.price)}</p></div><button onclick="viewProduct(${p.id})">选购</button></div>`).join('')}`:'<div class="room-goods-empty">暂无商品</div>';
    return roomSheet('直播商品',body,'room-products');
  }
  if(id==='connect')return roomSheet('视频连麦',`<div class="room-demo-action"><p>连麦功能入口已展示。正式连麦需接入微信小程序音视频能力。</p><button class="room-full-button" onclick="closeSheet();toast('当前体验版暂未接入真实连麦')">申请连麦（演示）</button></div>`);
  if(id==='gift')return roomSheet('直播礼物',`<p class="share-intro">选择礼物查看互动效果。体验版仅作界面演示，不会扣款或发送真实礼物。</p><div class="room-gift-choices">${[['🌷','鲜花'],['👏','掌声'],['📚','学习到了']].map(([emoji,label])=>`<button onclick="demoRoomGift('${label}')"><span>${emoji}</span><b>${label}</b></button>`).join('')}</div>`);
  if(id==='tools'){
    const items=[['share','share','分享'],['link','globe','链接'],['clear','clipboard','清屏'],['myorders','order','我的订单'],['products','bag','商品'],['mine','users','个人中心'],['coupon','coupon','我的优惠券'],['points','star','积分'],['rank','users','我的邀请']];
    return roomSheet('更多功能',`<div class="room-tools-grid">${items.map((x,i)=>`<button onclick="roomTool('${x[0]}')"><span class="room-tool-icon tool-color-${i}">${icon(x[1])}</span><span>${x[2]}</span></button>`).join('')}</div><details class="room-extra-tools"><summary>直播福利与服务</summary><div><button onclick="liveSheet('giftbag')">直播福袋</button><button onclick="liveSheet('points')">直播签到</button><button onclick="liveSheet('coupon')">领取优惠券</button><button onclick="liveSheet('service')">在线客服</button><button onclick="toggleRoomFollow()">${db.configs.followed?'取消关注直播间':'关注直播间'}</button></div></details><details class="room-extra-tools"><summary>更多营销活动</summary><div>${marketing.map(m=>`<button onclick="closeSheet();navigateMini('${m.id}')">${E(m.name)}</button>`).join('')}</div></details>`,'room-tools-panel');
  }
  if(id==='share')return roomSheet('小程序分享卡片',`<p class="share-intro">好友收到这样的卡片，点击即可进入本场直播间。</p>${shareCardMarkup(room(),true)}<p class="room-share-note">点击上方卡片预览直达效果。当前仅预览，不会向微信好友实际发送。</p>`,'room-native-share');
  return roomUIBase.liveSheet(id);
};
function demoRoomGift(label){closeSheet();toast(`互动样例：送出“${label}”（仅本地演示）`);}
function roomTool(action){
  if(action==='clear')return toggleRoomClean();
  if(action==='link')return copyRoomLink();
  if(['share','products'].includes(action))return liveSheet(action);
  closeSheet();if(action==='myorders')miniOrderFilter='全部';navigateMini(action,action==='mine'||action==='myorders'?'mine':miniTab);
}
function toggleRoomFollow(){db.configs.followed=!db.configs.followed;persist();liveSheet('tools');toast(db.configs.followed?'已关注直播间':'已取消关注');}
function toggleRoomClean(){
  if(roomGate(room(),mayWatch(room()),db.assets.find(a=>a.id===room().asset)))return toast('开始播放后可以清屏');
  cleanRoomId=cleanRoomId===roomId?null:roomId;closeSheet();render();
}
function liveRoomUrl(){const url=new URL(location.href);url.search='';url.searchParams.set('view','mini');url.searchParams.set('room',String(roomId));return url.href;}
async function copyRoomLink(){
  const url=liveRoomUrl();
  try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(url);toast('已复制本场链接，可在本机打开预览');}
  catch{roomSheet('复制直播链接',`<p class="form-help">浏览器未允许自动复制，可选中以下链接手动复制。</p><input aria-label="直播链接" readonly value="${E(url)}" onclick="this.select()">`);}
}
function openRoomEmoji(){if(!isPlaying(room())||!mayWatch(room()))return toast('开始播放后可以评论');roomSheet('选择表情',`<div class="room-emoji-grid">${['👏','👍','😊','🌷','❤️','🎉','🙌','✨','😍','💪','🙏','👌'].map(e=>`<button onclick="insertRoomEmoji('${e}')" aria-label="添加表情 ${e}">${e}</button>`).join('')}</div>`);}
function insertRoomEmoji(emoji){const field=$('#liveInput');if(!field||field.disabled)return;field.value=(field.value+emoji).slice(0,100);closeSheet();field.focus();}
function likeRoom(){
  if(!isPlaying(room())||!mayWatch(room()))return toast('开始播放后可以点赞');
  const r=room();r.likeCount=roomLikeCount(r)+1;db.liked++;persist();$$('[data-live-like-count]').forEach(el=>el.textContent=r.likeCount.toLocaleString('zh-CN'));
  const layer=$('#roomLikeLayer');if(layer){const heart=document.createElement('span');heart.textContent='♥';heart.style.setProperty('--drift',`${Math.round(Math.random()*40-20)}px`);layer.appendChild(heart);setTimeout(()=>heart.remove(),1300);}
}
function shareCardMarkup(r,interactive=false){
  const status=r.mode.startsWith('伪直播')?'录播播放':r.mode==='录播'?'录播回放':r.status;
  const content=`<span class="wx-share-brand"><i>美</i>${E(r.shareBrand||'美业直播')}</span><strong class="wx-share-title">${E(r.shareTitle||r.name)}</strong><span class="wx-share-cover"><span class="wx-share-state">◎ ${E(status)}</span><span class="wx-cover-kicker">美业经营课堂</span><strong>${E(r.shareHeadline||'门店经营\n增长方法课').replace(/\n/g,'<br>')}</strong><span class="wx-cover-subtitle">${E(r.shareSubtitle||'门店经营 · 客户服务 · 复购方法')}</span><span class="wx-cover-cta">点击进入课堂</span></span><span class="wx-share-footer">${icon('grid')} 小程序</span>`;
  return interactive?`<button class="wx-share-card" onclick="openSharedRoom(${r.id})" aria-label="点击小程序卡片进入本场直播间">${content}</button>`:`<div class="wx-share-card">${content}</div>`;
}
function openSharedRoom(id){if(!db.rooms.some(r=>r.id===id))return toast('该场次已不存在');closeSheet();watch(id);}
function editShareCard(id=roomId){
  const r=db.rooms.find(r=>r.id===id);if(!r)return;
  modal('小程序分享卡片',`<form onsubmit="saveShareCard(event,${r.id})"><p class="form-help">分享目标固定为当前直播间。配置标题与封面文字后，观看端分享面板同步更新。</p><div class="field"><label>小程序名称</label><input name="brand" value="${E(r.shareBrand||'美业直播')}" maxlength="15" required></div><div class="field"><label>分享标题</label><input name="title" value="${E(r.shareTitle||r.name)}" maxlength="60" required></div><div class="field"><label>封面主标题</label><textarea name="headline" rows="2" maxlength="30" required>${E(r.shareHeadline||'门店经营\n增长方法课')}</textarea></div><div class="field"><label>封面说明</label><input name="subtitle" value="${E(r.shareSubtitle||'门店经营 · 客户服务 · 复购方法')}" maxlength="60" required></div><div class="dialog-foot"><button type="button" onclick="closeDialog()">取消</button><button class="primary">保存分享卡片</button></div></form>`);
}
function saveShareCard(e,id){
  e.preventDefault();const r=db.rooms.find(r=>r.id===id),f=new FormData(e.target);if(!r)return;
  const values=['brand','title','headline','subtitle'].map(k=>String(f.get(k)||'').trim());
  if(values.some((v,i)=>!v||v.length>[15,60,30,60][i]))return toast('请按字数要求填写分享文案');
  [r.shareBrand,r.shareTitle,r.shareHeadline,r.shareSubtitle]=values;persist();closeDialog();render();toast('小程序分享卡片已更新');
}
function editRoomNotice(id=roomId){
  const r=db.rooms.find(r=>r.id===id);if(!r)return;
  modal('直播间系统提示',`<form onsubmit="saveRoomNotice(event,${r.id})"><p class="form-help">${E(r.name)} · 进入房间即展示，评论滚动不会覆盖；清屏时暂时隐藏。</p><div class="field"><label for="roomNoticeText">入场提示内容</label><textarea id="roomNoticeText" name="notice" rows="6" maxlength="180" required>${E(roomNotice(r))}</textarea></div><p class="form-help">前台按视频号样式显示“通知”标签与白色文案，不进入自动评论循环。</p><div class="dialog-foot"><button type="button" onclick="document.querySelector('#roomNoticeText').value=defaultRoomNotice">恢复默认文案</button><button class="primary" type="submit">保存提示</button></div></form>`);
}
function saveRoomNotice(e,id){e.preventDefault();const r=db.rooms.find(r=>r.id===id),text=String(new FormData(e.target).get('notice')||'').trim();if(!r)return;if(!text||text.length>180)return toast('请输入1—180字系统提示');r.systemNotice=text;persist();closeDialog();render();toast('已保存，观看端入场提示已同步');}
commentsPage=function(){return roomUIBase.commentsPage();};
controlPage=function(){return roomUIBase.controlPage().replace('<div>累计观看<b>1,286</b>示例统计</div>',`<div>累计观看人次<b>${roomViewEntries(room()).toLocaleString('zh-CN')}</b>重复进入计次 · 本地记录</div>`)+`<section class="card"><div class="card-title"><h2>入场系统提示</h2><button onclick="editRoomNotice(${roomId})">编辑提示文案</button></div><p>${E(roomNotice(room()))}</p></section>`+shareAdminPanel();};
function shareAdminPanel(){return `<section class="card"><div class="card-title"><h2>小程序卡片分享</h2><button onclick="editShareCard(${roomId})">配置分享标题与封面</button></div><p class="muted">好友点击卡片直达“${E(room().name)}”，不经过网址中转或扫码页面。</p><div class="admin-share-preview">${shareCardMarkup(room())}</div><p class="form-help">此处为分享样式与落点原型。真实转发需要微信小程序发布及原生分享能力接入。</p></section>`;}
liveWorkspace=function(){return roomUIBase.liveWorkspace().replace('<div>累计观看<strong>1,286</strong>示例数据</div>',`<div>累计观看人次<strong>${roomViewEntries(room()).toLocaleString('zh-CN')}</strong>重复进入计次 · 本地记录</div>`)+shareAdminPanel();};
overviewPage=function(){return roomUIBase.overviewPage().replace('<span>直播观看人数</span><span class="badge gray">演示</span></div><strong>1,286</strong><small>真实观众统计口径</small>',`<span>累计观看人次</span><span class="badge gray">本地</span></div><strong>${totalViewEntries().toLocaleString('zh-CN')}</strong><small>按各场进入次数累计，包含重复进入</small>`);};
dataPage=function(){return `<section class="card"><div class="card-title"><h2>直播间累计观看人次</h2><span class="badge gray">本地访问记录</span></div><p class="muted">每次进入记 1 次，同一人退出再进入继续累计；评论、点赞与面板切换不增加。</p>${table(['直播间','累计观看人次'],db.rooms.map(r=>`<tr><td>${E(r.name)}</td><td>${roomViewEntries(r).toLocaleString('zh-CN')}</td></tr>`))}</section>`+roomUIBase.dataPage();};
function reportRoom(){roomSheet('投诉与反馈',`<form onsubmit="submitRoomReport(event)"><div class="field"><label for="reportType">反馈类型</label><select id="reportType" name="type"><option>内容不适宜</option><option>商品或服务问题</option><option>播放或互动异常</option><option>其他问题</option></select></div><div class="field"><label for="reportDetail">补充说明</label><textarea id="reportDetail" name="detail" rows="3" maxlength="300" required placeholder="请描述你遇到的问题"></textarea></div><button class="primary room-full-button">保存反馈</button><p class="form-help">原型仅保存本地反馈记录，未向平台发送。</p></form>`);}
function submitRoomReport(e){e.preventDefault();const f=new FormData(e.target),detail=String(f.get('detail')||'').trim();if(!detail)return toast('请填写问题说明');db.roomReports||=[];db.roomReports.push({id:uid(),room:roomId,type:f.get('type'),detail:detail.slice(0,300),status:'待处理',time:stamp()});persist();closeSheet();toast('反馈已保存到本地演示记录');}
servicePage=function(){return roomUIBase.servicePage()+`<section class="card"><div class="card-title"><h2>直播间投诉与反馈</h2><span class="badge gray">本地演示记录</span></div>${table(['场次','类型','反馈内容','状态','操作'],(db.roomReports||[]).slice().reverse().map(item=>`<tr><td>${E(db.rooms.find(r=>r.id===item.room)?.name||'已移除场次')}</td><td>${E(item.type)}</td><td class="source-col">${E(item.detail)}</td><td>${E(item.status)}</td><td>${item.status==='待处理'?`<button class="link" onclick="finishRoomReport(${item.id})">标记已处理</button>`:'已处理'}</td></tr>`))}</section>`;};
function finishRoomReport(id){const item=(db.roomReports||[]).find(x=>x.id===id);if(!item||item.status!=='待处理')return;item.status='已处理';item.handledAt=stamp();persist();render();toast('反馈已标记为已处理');}

if(typeof window!=='undefined'){
  const route=new URLSearchParams(location.search);
  let requested=Number(route.get('room'));
  if(!requested){
    const match=location.pathname.match(/\/rooms\/(\d+)/);
    if(match)requested=Number(match[1]);
  }
  const view=route.get('view');
  if((view==='mini'||view==='h5')&&requested&&db.rooms.some(r=>r.id===requested)){
    surface=view;miniPage='watch';miniTab='live';roomId=requested;
  } else if(requested&&db.rooms.some(r=>r.id===requested)){
    surface='mini';miniPage='watch';miniTab='live';roomId=requested;
  } else if(view==='capture'){
    surface='capture';
  } else if(view==='pc'||location.pathname.includes('/admin')){
    surface='pc';
  }
}

'use strict';

// V2.1: shared state and lifecycle for the local, simulated prototype.
// No camera, streaming, payment, or third-party service is called here.
const legacy = {render, mediaPage, capturePage, liveWorkspace, controlPage, miniWatch,
  commentsPage, previewLayout, miniPoints, miniOrders, miniFlash, miniGroup, miniBargain,
  groupAction, bargainHelp, claimCoupon, checkIn, submitConfig, resetDemo, livePage, miniCheckout, ordersPage, miniMine,
  miniRecharge, miniLottery, confirmRecharge, liveSheet, settingsPage};
const storageKey = 'beautyCommerceV2';
const stamp = () => Date.now();
const uid = () => stamp() * 1000 + Math.floor(Math.random() * 1000);
const dateKey = (n = stamp()) => {const d = new Date(n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const localTime = n => {const d=new Date(n);return dateKey(n)+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
const timeValue = value => new Date(String(value).replace(' ','T')).getTime();
const mediaSeconds = a => String(a?.duration||'0:00').split(':').reduce((sum,n)=>sum*60+Number(n),0)||0;
function assetVideoUrl(asset){return asset?.videoUrl||asset?.url||'assets/reference.mp4';}
const money = n => Math.round((Number(n)+Number.EPSILON)*100)/100;
let volatileStorage = false;

const defaultRobotNames = [
  "俏佳人美肤中心",
  "悦颜美容院",
  "靓姐护肤馆",
  "焕颜美肤中心",
  "美颜坊护肤",
  "俏颜美容院",
  "润颜美肤馆",
  "丽都护肤中心",
  "佳颜美肤中心",
  "靓颜美容院",
  "美润护肤馆",
  "俏润美肤中心",
  "丽颜坊美容院",
  "焕丽美肤中心",
  "佳美护肤馆",
  "靓润美容院",
  "润丽美肤中心",
  "美俏护肤馆",
  "颜悦美容院",
  "丽润美肤中心",
  "佳颜坊护肤",
  "俏丽美肤馆",
  "焕美美容院",
  "润俏美肤中心",
  "颜丽护肤馆",
  "靓佳美容院",
  "美颜坊美肤中心",
  "俏悦护肤馆",
  "焕润美容院",
  "丽佳美肤中心"
];

const defaultScriptTemplates = [
  {
    id: 1,
    name: "技术互动",
    lines: [
      "老师，这个水光有膏的吗？",
      "轻量冻粉配比是多少呀？",
      "老师这个技术手法适合零基础学吗？",
      "请问课程有线下实操指导吗？",
      "手法好细腻，学习了！",
      "敏感肌操作时需要注意什么？",
      "老师，门店拓客话术有配套资料吗？",
      "刚才提到的会员裂变方案能再讲讲吗？",
      "老师讲得太透彻了，干货满满！",
      "这个肩颈项目在二线城市好推吗？",
      "老师用的仪器是什么型号的？",
      "皮肤屏障受损能做这个护理吗？",
      "用越买越上瘾的复购方案怎么落地？",
      "老师，微晶导入深度一般调多少？",
      "院线产品进货有起订门槛吗？",
      "学完可以拿到结业证书吗？",
      "老师操作手法太专业了！",
      "做完这个项目后几天可以正常化妆？",
      "孕妇或者哺乳期可以做吗？",
      "老师，客户嫌贵的时候怎么话术应对？",
      "项目定价一般是成本的几倍比较合理？",
      "已经做笔记了，满满的实战经验！",
      "老师后面还有加场演示吗？",
      "怎么联系加盟老师的赋能团队？"
    ]
  },
  {
    id: 2,
    name: "互动",
    lines: [
      "进来，大家好啊",
      "我又来了，向老师打卡！",
      "晚上好，准时来听课了！",
      "声音和画面都很清晰！",
      "签到了，今天又有新干货！",
      "老师讲得真好，点赞支持！",
      "刚进直播间，讲到哪个环节了？",
      "鲜花送上，支持老师！",
      "每天都跟着老师打卡学习！",
      "已经分享到美业交流群了！"
    ]
  }
];

const defaultRobotTemplates = [
  {
    id: 1,
    name: "技术互动10",
    robotCount: 100,
    scriptTemplate: "技术互动",
    intervalType: "random",
    fixedSeconds: 5,
    minSeconds: 5,
    maxSeconds: 10,
    loop: true,
    active: true
  },
  {
    id: 2,
    name: "互动",
    robotCount: 100,
    scriptTemplate: "互动",
    intervalType: "fixed",
    fixedSeconds: 2,
    minSeconds: 2,
    maxSeconds: 5,
    loop: true,
    active: false
  }
];

const defaultPresetScripts = [
  { id: 1, text: "怎么跟老师学？", room: 0, at: 5 },
  { id: 2, text: "皮肤店能用吗？", room: 0, at: 12 },
  { id: 3, text: "用越买越上瘾的复购方案怎么落地？", room: 0, at: 20 },
  { id: 4, text: "老师，门店拓客话术有配套资料吗？", room: 0, at: 28 },
  { id: 5, text: "老师讲得太透彻了，干货满满！", room: 0, at: 35 },
  { id: 6, text: "刚才提到的会员裂变方案能再讲讲吗？", room: 0, at: 42 },
  { id: 7, text: "这个肩颈项目在二线城市好推吗？", room: 0, at: 50 },
  { id: 8, text: "支持回放反复学习吗？", room: 0, at: 58 },
  { id: 9, text: "怎么联系加盟老师的团队？", room: 0, at: 65 },
  { id: 10, text: "已经预约后续课程了，期待！", room: 0, at: 75 }
];

function getActiveRobotTemplate(){
  db.robotTemplates = (Array.isArray(db.robotTemplates) && db.robotTemplates.length) ? db.robotTemplates : structuredClone(defaultRobotTemplates);
  return db.robotTemplates.find(t=>t.active) || db.robotTemplates[0];
}

function nextRobotInterval(template){
  const t = template || getActiveRobotTemplate();
  if(t.intervalType === 'random'){
    const min = Math.max(1, Number(t.minSeconds) || 5);
    const max = Math.max(min, Number(t.maxSeconds) || 10);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return Math.max(1, Number(t.fixedSeconds) || 5);
}

function getNextRobotUsername(templateOverride){
  const list = (Array.isArray(db.robotNames) && db.robotNames.length) ? db.robotNames : defaultRobotNames;
  const template = templateOverride || getActiveRobotTemplate();
  const poolSize = Math.min(list.length, Math.max(1, Number(template.robotCount) || list.length));
  db.robotNameIndex = Number.isInteger(db.robotNameIndex) ? ((db.robotNameIndex % poolSize) + 1) % poolSize : 0;
  return list[db.robotNameIndex] || '美业学员';
}

function resetDefaultRobotNames(){
  db.robotNames = [...defaultRobotNames];
  persist();
  const el = $('#robotNamesInput');
  if(el) el.value = db.robotNames.join('\n');
  render();
  toast('已恢复默认30家美肤门店评论昵称');
}

function toggleIntervalInputs(type){
  const randomWrap = $('#randomIntervalInputs');
  const fixedWrap = $('#fixedIntervalInputs');
  if(randomWrap && fixedWrap){
    randomWrap.style.display = type === 'random' ? 'block' : 'none';
    fixedWrap.style.display = type === 'fixed' ? 'block' : 'none';
  }
}

function prepareState(recover=false) {
  if(!db||typeof db!=='object'||!Array.isArray(db.rooms)||!Array.isArray(db.products))db=structuredClone(defaultState);
  for(const [key,value] of Object.entries(defaultState)) if(db[key]===undefined)db[key]=structuredClone(value);
  db.capture ||= {connected:false,room:1,status:'待录制',elapsed:0,mode:'仅录制'};
  db.ingestJobs ||= []; db.liveMessages ||= []; db.mutedViewers ||= {}; db.playback ||= {}; db.prizes ||= [];
  db.robotTasks ||= [];
  db.viewerRole ||= '会员';
  
  db.robotNames = (Array.isArray(db.robotNames) && db.robotNames.length) ? db.robotNames : [...defaultRobotNames];
  db.scriptTemplates ||= structuredClone(defaultScriptTemplates);
  if(!Array.isArray(db.scriptTemplates) || !db.scriptTemplates.length){
    db.scriptTemplates = structuredClone(defaultScriptTemplates);
  }
  db.robotTemplates ||= structuredClone(defaultRobotTemplates);
  if(!Array.isArray(db.robotTemplates) || !db.robotTemplates.length){
    db.robotTemplates = structuredClone(defaultRobotTemplates);
  }
  db.activeRobotTemplateId ||= db.robotTemplates[0]?.id || 1;
  if(db.auto === undefined) db.auto = true;
  if(!db.comments || !db.comments.length) db.comments = structuredClone(defaultPresetScripts);

  if(!db.robotTaskMigrationDone){
    if(db.auto){
      for(const room of db.rooms){
        if(!db.robotTasks.some(task=>task.roomId===room.id))db.robotTasks.push({id:uid(),roomId:room.id,templateId:db.activeRobotTemplateId,active:true,nextAt:null,commentIndex:0,createdAt:stamp(),name:'历史全局自动评论'});
      }
    }
    db.robotTaskMigrationDone=true;
  }
  db.auto=false;

  for(const r of db.rooms){
    r.permission ||= '全部会员'; r.accessProduct ||= 4;
    if(r.rememberPlayback===undefined)r.rememberPlayback=true;
    if(r.loopPlayback===undefined)r.loopPlayback=false;
    if(r.commentFollowLoop===undefined)r.commentFollowLoop=false;
    if(r.replayEnabled===undefined)r.replayEnabled=r.record!==false;
    if(r.connectEnabled===undefined)r.connectEnabled=false;
    if(r.showCumulative===undefined)r.showCumulative=true;
    if(r.allowChat===undefined)r.allowChat=true;
    if(r.showHome===undefined)r.showHome=true;
    if(r.replayPublished===undefined)r.replayPublished=r.mode==='录播';
    if(r.status==='直播中'&&!r.startedAt)r.startedAt=stamp();
    if(r.autoCursor===undefined)r.autoCursor=-1;
    r.sentScripts ||= [];
  }
  
  if(!db.liveMessages.length){
    db.liveMessages = [
      { id: uid()+1, room: 1, kind: 'viewer', name: '俏佳人美肤中心', text: '怎么跟老师学？', time: stamp()-15000, at: 5, key: 'init1' },
      { id: uid()+2, room: 1, kind: 'viewer', name: '单蓉', text: '皮肤店能用吗？', time: stamp()-8000, at: 12, key: 'init2' },
      { id: uid()+3, room: 2, kind: 'viewer', name: '悦颜美容院', text: '怎么跟老师学？', time: stamp()-15000, at: 5, key: 'init3' },
      { id: uid()+4, room: 2, kind: 'viewer', name: '靓姐护肤馆', text: '皮肤店能用吗？', time: stamp()-8000, at: 12, key: 'init4' },
      { id: uid()+5, room: 3, kind: 'viewer', name: '焕颜美肤中心', text: '怎么跟老师学？', time: stamp()-15000, at: 5, key: 'init5' }
    ];
  }

  if(recover){
    if(db.capture.status==='录制中'){
      db.capture.status='录制已中断'; db.capture.elapsed=Math.max(0,db.capture.elapsed||0);
      db.capture.connected=false; delete db.capture.startedAt;
    }
    for(const job of db.ingestJobs)if(['上传中','校验与转码中'].includes(job.status))job.status='已暂停';
  }
  db.signed=db.signDate===dateKey(); syncCapture();
}
function syncCapture(){captureConnected=!!db.capture.connected; recording=db.capture.status==='录制中';seconds=captureDuration();}
function captureDuration(){const c=db.capture;return Math.max(0,Math.floor((c.elapsed||0)+(c.status==='录制中'?(stamp()-c.startedAt)/1000:0)));}
persist = function(){try{localStorage.setItem(storageKey,JSON.stringify(db));volatileStorage=false;}catch{volatileStorage=true;if($('#toast'))toast('浏览器存储已满或不可用，本次更改暂未保存。请导出备份。');}};
prepareState(true);

function playbackTime(r){
  if(r.mode==='录播'||r.mode.startsWith('伪直播'))return viewerPlaybackTime(r);
  const n=Math.max(0,Math.floor(((r.endedAt||stamp())-(r.startedAt||stamp()))/1000));
  return n;
}
const viewerPlaybackStorageKey='beautyViewerPlaybackV1';
const viewerPlaybackRates=[0.5,0.75,1,1.25,1.5,2];
let viewerPlaybackStore={};
let viewerInstanceId='';
try{
  viewerPlaybackStore=JSON.parse(localStorage.getItem(viewerPlaybackStorageKey)||'{}')||{};
  viewerInstanceId=localStorage.getItem('beautyViewerInstanceV1')||'';
  if(!viewerInstanceId){viewerInstanceId=crypto.randomUUID?crypto.randomUUID():String(stamp())+'-'+Math.random().toString(36).slice(2);localStorage.setItem('beautyViewerInstanceV1',viewerInstanceId);}
}catch{viewerInstanceId='browser-session';}
function viewerPlaybackStoreId(r){return `${viewerInstanceId}:${String(db.userName||'viewer')}:${r.id}`;}
function viewerPlaybackState(r,create=false){if(!r)return null;const key=viewerPlaybackStoreId(r);let p=viewerPlaybackStore[key];if(!p&&r.mode==='录播'&&db.playback[r.id]){p=viewerPlaybackStore[key]={seconds:Number(db.playback[r.id].seconds)||0,playing:false,updatedAt:stamp(),completed:false,rate:1};persistViewerPlayback();}if(!p&&create)p=viewerPlaybackStore[key]={seconds:0,playing:false,updatedAt:stamp(),completed:false,rate:1};if(p&&!viewerPlaybackRates.includes(Number(p.rate)))p.rate=1;return p||null;}
function persistViewerPlayback(){try{localStorage.setItem(viewerPlaybackStorageKey,JSON.stringify(viewerPlaybackStore));}catch{}}
function viewerPlaybackTime(r){const p=viewerPlaybackState(r);if(!p)return 0;let seconds=Math.max(0,Number(p.seconds)||0);if(p.playing&&Number.isFinite(p.updatedAt))seconds+=Math.max(0,(stamp()-p.updatedAt)/1000)*(Number(p.rate)||1);const duration=mediaSeconds(db.assets.find(a=>a.id===r.asset));if(duration&&(r.mode.startsWith('伪直播')||r.loopPlayback))seconds%=duration;else if(duration)seconds=Math.min(seconds,duration);return Math.floor(seconds);}
function viewerPlaybackAvailable(r){return r&&r.status!=='已取消'&&(r.mode==='录播'||r.mode.startsWith('伪直播'))&&mayWatch(r)&&db.assets.some(a=>a.id===r.asset&&a.status==='可用');}
function beginViewerPlayback(id){const r=db.rooms.find(x=>x.id===id);if(!viewerPlaybackAvailable(r))return;const p=viewerPlaybackState(r,true),duration=mediaSeconds(db.assets.find(a=>a.id===r.asset)),pseudo=r.mode.startsWith('伪直播');if(!r.rememberPlayback){p.seconds=0;p.completed=false;}if(pseudo){if(duration&&p.seconds>=duration)p.seconds=0;p.playing=true;p.completed=false;p.updatedAt=stamp();}else if(duration&&p.seconds>=duration&&!r.loopPlayback){p.seconds=duration;p.playing=false;p.completed=true;}else{if(duration&&p.seconds>=duration)p.seconds=0;p.playing=true;p.completed=false;p.updatedAt=stamp();}r.commentLoopCursor=viewerPlaybackTime(r)-1;persistViewerPlayback();syncViewerPlaybackMedia(id,p.playing);}
function pauseViewerPlayback(id){const r=db.rooms.find(x=>x.id===id);if(!r)return;const p=viewerPlaybackState(r);if(!p||!p.playing)return;p.seconds=viewerPlaybackTime(r);p.playing=false;p.updatedAt=stamp();persistViewerPlayback();syncViewerPlaybackMedia(id,false);}
function attachViewerPlaybackMedia(id,video){const r=db.rooms.find(x=>x.id===id),p=viewerPlaybackState(r);if(!r||!p)return;video.loop=!!r.loopPlayback;video.playbackRate=Number(p.rate)||1;const duration=Number(video.duration)||0;if(duration)video.currentTime=viewerPlaybackTime(r)%duration;if(p.playing){const promise=video.play();if(promise?.catch)promise.catch(()=>{});}else video.pause();}
function syncViewerPlaybackMedia(id,playing){const video=$('#roomPlaybackMedia'),r=db.rooms.find(x=>x.id===id),p=viewerPlaybackState(r);if(!video||!r||!p||Number(video.dataset.roomId)!==Number(id))return;video.playbackRate=Number(p.rate)||1;const duration=Number(video.duration)||0;if(duration&&video.readyState>0){const target=viewerPlaybackTime(r)%duration;if(Math.abs(video.currentTime-target)>.8)video.currentTime=target;}if(playing){const promise=video.play();if(promise?.catch)promise.catch(()=>{});}else video.pause();}
let activeViewerPlaybackRoom=null;
function transitionViewerPlaybackRoom(previousId,currentId){if(previousId!==currentId&&previousId!==null)pauseViewerPlayback(previousId);activeViewerPlaybackRoom=currentId;if(currentId===null)return;const r=db.rooms.find(x=>x.id===currentId);if(!viewerPlaybackAvailable(r))return;const p=viewerPlaybackState(r);if(previousId!==currentId||!p)beginViewerPlayback(currentId);}
function setViewerPlaybackPosition(id,value){const r=db.rooms.find(x=>x.id===id);if(!viewerPlaybackAvailable(r))return;const duration=mediaSeconds(db.assets.find(a=>a.id===r.asset)),p=viewerPlaybackState(r,true);if(r.allowSeek===false){toast('本课程已关闭拖动进度');return;}p.seconds=Math.max(0,Math.min(duration||Infinity,Number(value)||0));p.updatedAt=stamp();p.completed=!!duration&&p.seconds>=duration;if(p.completed)p.playing=false;persistViewerPlayback();syncViewerPlaybackMedia(id,p.playing);paintViewerPlaybackControls(r);}
function skipViewerPlayback(id,delta=10){const r=db.rooms.find(x=>x.id===id);if(!r)return;setViewerPlaybackPosition(id,viewerPlaybackTime(r)+Number(delta||0));}
function toggleViewerPlayback(id){const r=db.rooms.find(x=>x.id===id);if(!r||!viewerPlaybackAvailable(r))return;const p=viewerPlaybackState(r,true),duration=mediaSeconds(db.assets.find(a=>a.id===r.asset));if(p.playing){pauseViewerPlayback(id);}else{if(duration&&p.seconds>=duration){p.seconds=0;p.completed=false;}p.playing=true;p.updatedAt=stamp();persistViewerPlayback();syncViewerPlaybackMedia(id,true);}paintViewerPlaybackControls(r);}
function checkpointViewerPlayback(r,now=stamp()){const p=viewerPlaybackState(r);if(!p?.playing)return false;const duration=mediaSeconds(db.assets.find(a=>a.id===r.asset));p.seconds=viewerPlaybackTime(r);p.updatedAt=now;if(duration&&p.seconds>=duration&&!r.mode.startsWith('伪直播')){if(r.loopPlayback){p.seconds=0;p.completed=false;}else{p.seconds=duration;p.playing=false;p.completed=true;syncViewerPlaybackMedia(r.id,false);}}persistViewerPlayback();return true;}
function isPlaying(r){if(r.mode==='录播')return !!viewerPlaybackState(r)?.playing;if(r.mode.startsWith('伪直播'))return viewerPlaybackAvailable(r)&&!!viewerPlaybackState(r)?.playing;return r.status==='直播中';}
function setViewerPlaybackRate(id,value){const r=db.rooms.find(x=>x.id===id);if(!r||!viewerPlaybackAvailable(r))return;const rate=Number(value);if(!viewerPlaybackRates.includes(rate))return;const p=viewerPlaybackState(r,true);p.seconds=viewerPlaybackTime(r);p.rate=rate;p.updatedAt=stamp();persistViewerPlayback();syncViewerPlaybackMedia(id,p.playing);paintViewerPlaybackControls(r);$$(`[data-viewer-speed-menu="${id}"]`).forEach(menu=>menu.hidden=true);}
function toggleViewerPlaybackRateMenu(id){const menu=$(`[data-viewer-speed-menu="${id}"]`);if(menu)menu.hidden=!menu.hidden;}
function paintViewerPlaybackControls(r){if(!r)return;const p=viewerPlaybackState(r),seconds=viewerPlaybackTime(r),duration=mediaSeconds(db.assets.find(a=>a.id===r.asset));for(const el of $$('[data-viewer-playback-time]'))el.textContent=fmt(seconds);for(const el of $$('[data-viewer-playback-range]')){if(document.activeElement!==el)el.value=String(seconds);el.max=String(Math.max(1,duration));el.disabled=r.allowSeek===false;}for(const el of $$('[data-viewer-playback-toggle]')){el.textContent=p?.playing?'Ⅱ':'▶';el.setAttribute('aria-label',p?.playing?'暂停':'继续播放');}for(const el of $$('[data-viewer-playback-rate]'))el.textContent=`倍速 ${Number(p?.rate||1)}×`;for(const el of $$('[data-viewer-speed-option]')){const selected=Number(el.dataset.viewerSpeedOption)===Number(p?.rate||1);el.classList.toggle('active',selected);el.setAttribute('aria-pressed',selected?'true':'false');}}
function mayWatch(r){
  if(r.permission==='内部学员')return db.viewerRole==='内部学员';
  if(r.permission==='付费用户')return db.orders.some(o=>o.product===r.accessProduct&&o.status==='已完成');
  return true;
}
function writeLiveMessage(r,kind,text,key,customAuthor){
  if(key&&db.liveMessages.some(m=>m.key===key&&m.room===r.id))return;
  const author=customAuthor||(kind==='viewer'?db.userName:kind==='staff'?'直播运营':kind==='system'?'系统':'运营助手 · 自动');
  db.liveMessages.push({id:uid(),room:r.id,kind,text:String(text).slice(0,160),time:stamp(),at:playbackTime(r),key,pending:kind==='viewer'&&!customAuthor&&db.configs.moderation?.['评论审核']==='先审后发',
    name:author});
  db.liveMessages=db.liveMessages.slice(-1000);persist();paintComments();
}
function messageMarkup(r,mini=false){
  const rows=db.liveMessages.filter(m=>m.room===r.id&&!m.hidden&&!m.pending).slice(mini?-7:-40);
  return rows.length?rows.map(m=>mini?`<div class="live-bubble"><b>${E(m.name)}：</b>${E(m.text)}</div>`:
    `<p><b>${E(m.name)}：</b>${E(m.text)} <small>${fmt(m.at)}</small></p>`).join(''):
    (mini?'<div class="live-bubble"><b>系统：</b>欢迎来到直播间，请文明互动。</div>':'<p class="muted">本场暂无评论。观看端与后台的消息将在这里同步。</p>');
}
function paintComments(){
  for(const [id,mini]of [['#studio-chat',false],['#liveComments',true]]){
    const el=$(id);if(el){el.innerHTML=mini&&!mayWatch(room())?'':messageMarkup(room(),mini);el.scrollTop=el.scrollHeight;}
  }
}
function autoCommentInterval(){const n=Number(db.configs.assistant?.interval);return Number.isInteger(n)&&n>=2&&n<=120?n:2;}
function saveAutoInterval(value){const n=Number(value);if(!Number.isInteger(n)||n<2||n>120)return toast('循环间隔须为2—120秒');db.configs.assistant=db.configs.assistant||{};db.configs.assistant.interval=n;for(const r of db.rooms)r.autoLoopAt=null;persist();render();toast('自动评论循环间隔已保存');}
function resetRobotSchedule(r){r.nextRobotAt=null;r.robotCommentIndex=0;r.robotLoopIndex=0;}
function setAutoComments(enabled){const target=db.rooms.find(r=>r.id===Number(db.commentRoom))||room(),tasks=db.robotTasks.filter(t=>t.roomId===target.id);if(enabled&&!tasks.length){db.robotTasks.push({id:uid(),roomId:target.id,templateId:getActiveRobotTemplate().id,active:true,nextAt:null,commentIndex:0,createdAt:stamp()});}else tasks.forEach(t=>{t.active=!!enabled;t.nextAt=null;});db.auto=false;persist();toast(enabled?'已为当前场次启用机器人任务':'已暂停当前场次的机器人任务');}
sendStudioComment=function(){const el=$('#studioComment'),t=el?.value.trim();if(!t)return toast('请输入评论');if(!isPlaying(room()))return toast('场次播放时才可发送运营评论');writeLiveMessage(room(),'staff',t);el.value='';};
sendLiveComment=function(){
  const el=$('#liveInput'),t=el?.value.trim(),r=room();if(!t)return toast('请输入评论');
  if(!mayWatch(r)||!isPlaying(r))return toast('当前未播放，暂不能发送评论');
  if(db.mutedViewers[r.id])return toast('你在本场已被禁言，可联系客服');
  const last=db.liveMessages.filter(m=>m.room===r.id&&m.kind==='viewer').at(-1);
  const interval=Math.max(1,Number(db.configs.moderation?.['发送间隔（秒）']||2));
  if(last&&stamp()-last.time<interval*1000)return toast('发送太快，请稍后再试');
  const cap=Math.max(1,Number(db.configs.moderation?.['每分钟上限']||10));
  if(db.liveMessages.filter(m=>m.room===r.id&&m.kind==='viewer'&&stamp()-m.time<60000).length>=cap)return toast('已达到本分钟评论上限，请稍后再试');
  writeLiveMessage(r,'viewer',t);el.value='';
  if(db.configs.moderation?.['评论审核']==='先审后发')toast('评论已提交，等待运营审核');
};
function toggleMute(id){db.mutedViewers[id]=!db.mutedViewers[id];persist();render();toast(db.mutedViewers[id]?'已禁言该演示会员':'已解除禁言');}
function hideMessage(id){const m=db.liveMessages.find(m=>m.id===id);if(m){m.hidden=!m.hidden;persist();render();}}
function approveMessage(id){const m=db.liveMessages.find(m=>m.id===id);if(!m?.pending)return;m.pending=false;persist();render();toast('评论已审核通过');}
saveScript=function(e){e.preventDefault();const f=new FormData(e.target),at=Number(f.get('at')),scope=Number(f.get('room')),text=String(f.get('text')||'').trim();
  if(!text||text.length>160)return toast('请输入1—160字评论');if(!Number.isInteger(at)||at<0||at>86400)return toast('时间点应为0—86400整数秒');
  if(scope&&!db.rooms.some(r=>r.id===scope))return toast('所选场次不存在');db.comments.push({id:uid(),at,room:scope,text,template:getActiveRobotTemplate().scriptTemplate||'技术互动'});db.comments.sort((a,b)=>a.at-b.at);for(const r of db.rooms)resetRobotSchedule(r);log('新增自动评论脚本');closeDialog();render();toast('脚本已保存，将按播放时间发送');};
window.assistantSubTab = window.assistantSubTab || 'all';
window.setAssistantSubTab = function(tab){
  window.assistantSubTab = tab;
  if(tab === 'scripts') page = 'scripts';
  else if(tab === 'robots') page = 'robots';
  else page = 'comments';
  render();
  scrollTop();
};

function openScriptTemplateModal(id=null){
  const st = id ? (db.scriptTemplates || defaultScriptTemplates).find(x => x.id === Number(id)) : null;
  const isEdit = !!st;
  const title = isEdit ? '编辑话术模版' : '新建话术模版';
  const nameVal = st ? st.name : '';
  const linesVal = st ? (st.lines || []).join('\n') : '';
  
  modal(title, `
    <form onsubmit="saveScriptTemplate(event, ${st ? st.id : 0})" style="display:flex;flex-direction:column;gap:14px">
      <div class="field">
        <label for="scriptNameInput" style="font-weight:600"><span style="color:#ef4444">*</span> 名称</label>
        <div style="position:relative">
          <input id="scriptNameInput" name="name" maxlength="64" required placeholder="请输入" value="${E(nameVal)}" oninput="$('#scriptNameCounter').textContent=this.value.length+' / 64'">
          <span id="scriptNameCounter" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:12px;color:#94a3b8">${nameVal.length} / 64</span>
        </div>
      </div>
      <div class="field">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <label for="scriptContentInput" style="font-weight:600"><span style="color:#ef4444">*</span> 内容</label>
          <label class="link small" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px">
            📁 导入 Excel / 文本文件
            <input type="file" accept=".txt,.csv,.xlsx,.xls" style="display:none" onchange="importScriptFile(event)">
          </label>
        </div>
        <textarea id="scriptContentInput" name="content" rows="10" placeholder="每行一条话术，发送时随机一条&#10;空行会自动忽略；也可导入 Excel（首列每行一条）" style="font-size:13px;line-height:1.6;font-family:inherit" required>${E(linesVal)}</textarea>
        <small style="color:#94a3b8;display:block;margin-top:4px;font-size:12px">每行一条话术，空行自动忽略；Excel 首列导入，首行可为表头「话术」</small>
      </div>
      <div class="dialog-foot" style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px">
        <button type="button" onclick="closeDialog()">取消</button>
        <button class="primary" type="submit">保存</button>
      </div>
    </form>
  `);
}

function saveScriptTemplate(e, id){
  e.preventDefault();
  const f = new FormData(e.target);
  const name = String(f.get('name') || '').trim();
  if(!name) return toast('请输入模版名称');
  const rawLines = String(f.get('content') || '').split('\n').map(s => s.trim()).filter(Boolean);
  if(!rawLines.length) return toast('请至少输入一条话术');
  
  db.scriptTemplates ||= structuredClone(defaultScriptTemplates);
  if(id){
    const item = db.scriptTemplates.find(x => x.id === Number(id));
    if(item){
      const oldName = item.name;
      item.name = name;
      item.lines = rawLines;
      for(const t of (db.robotTemplates || [])){
        if(t.scriptTemplate === oldName) t.scriptTemplate = name;
      }
    }
  } else {
    const newId = uid();
    db.scriptTemplates.push({
      id: newId,
      name,
      lines: rawLines
    });
    const sel = $('#scriptTemplateSelect');
    if(sel){
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      opt.selected = true;
      sel.appendChild(opt);
    }
  }
  persist();
  closeDialog();
  render();
  toast(id ? '话术模版已更新！' : '新建话术模版成功！');
}

function deleteScriptTemplate(id){
  db.scriptTemplates ||= structuredClone(defaultScriptTemplates);
  if(db.scriptTemplates.length <= 1) return toast('至少需保留一个话术模版');
  const target = db.scriptTemplates.find(x => x.id === Number(id));
  if(!target) return;
  modal('确认删除话术模版', `
    <p style="margin:10px 0 16px">确定要删除话术模版【<b>${E(target.name)}</b>】吗？删除后关联该模版的机器人需重新指定话术。</p>
    <div class="dialog-foot" style="display:flex;justify-content:flex-end;gap:10px">
      <button type="button" onclick="closeDialog()">取消</button>
      <button class="primary" style="background:#ef4444;border-color:#ef4444" type="button" onclick="confirmDeleteScriptTemplate(${target.id})">确认删除</button>
    </div>
  `);
}

function confirmDeleteScriptTemplate(id){
  db.scriptTemplates = db.scriptTemplates.filter(x => x.id !== Number(id));
  persist();
  closeDialog();
  render();
  toast('已删除话术模版');
}

function importScriptFile(e){
  const file = e.target.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(evt){
    const content = evt.target.result || '';
    const lines = content.split(/\r?\n/)
      .map(s => s.trim().replace(/^["']|["']$/g, '').trim())
      .filter(s => s && s !== '话术' && s !== '内容' && s !== '话术内容');
    const textarea = $('#scriptContentInput');
    if(textarea){
      const existing = textarea.value.trim();
      textarea.value = existing ? existing + '\n' + lines.join('\n') : lines.join('\n');
      toast(`成功导入 ${lines.length} 条话术！`);
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function openRobotTemplateModal(id=null){
  const t = (id ? (db.robotTemplates || defaultRobotTemplates).find(x => x.id === Number(id)) : null) || {
    name: '技术互动10',
    robotCount: 100,
    scriptTemplate: db.scriptTemplates?.[0]?.name || '技术互动',
    intervalType: 'random',
    minSeconds: 5,
    maxSeconds: 10,
    fixedSeconds: 5,
    loop: true
  };
  const isEdit = !!id;
  const currentScriptTemplate = t.scriptTemplate || (db.scriptTemplates?.[0]?.name || '技术互动');
  const scriptOptions = (db.scriptTemplates || defaultScriptTemplates).map(s => 
    `<option value="${E(s.name)}" ${s.name === currentScriptTemplate ? 'selected' : ''}>${E(s.name)}</option>`
  ).join('');

  modal(isEdit ? '编辑机器人模版' : '新建机器人模版', `
    <form onsubmit="saveRobotTemplate(event, ${id || 0})" style="display:flex;flex-direction:column;gap:14px">
      <div class="field">
        <label for="templateName" style="font-weight:600"><span style="color:#ef4444">*</span> 名称</label>
        <div style="position:relative">
          <input id="templateName" name="name" maxlength="64" required value="${E(t.name || '')}" placeholder="请输入模版名称" oninput="$('#nameCounter').textContent=this.value.length+'/64'">
          <span id="nameCounter" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:12px;color:#94a3b8">${(t.name || '').length}/64</span>
        </div>
      </div>
      <div class="field">
        <label for="robotCount" style="font-weight:600"><span style="color:#ef4444">*</span> 机器人数</label>
        <input id="robotCount" name="robotCount" type="number" min="1" max="10000" required value="${t.robotCount || 100}">
      </div>
      <div class="field">
        <label for="scriptTemplateSelect" style="font-weight:600"><span style="color:#ef4444">*</span> 话术模版</label>
        <div style="display:flex;gap:8px">
          <select id="scriptTemplateSelect" name="scriptTemplate" style="flex:1">
            ${scriptOptions}
          </select>
          <button type="button" class="small" onclick="openScriptTemplateModal()">新增</button>
        </div>
      </div>
      <div class="field">
        <label style="font-weight:600">发送间隔</label>
        <div style="display:flex;gap:24px;margin:6px 0 10px">
          <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer">
            <input type="radio" name="intervalType" value="fixed" ${t.intervalType==='fixed'?'checked':''} onchange="toggleIntervalInputs(this.value)"> 固定间隔
          </label>
          <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer">
            <input type="radio" name="intervalType" value="random" ${t.intervalType!=='fixed'?'checked':''} onchange="toggleIntervalInputs(this.value)"> 随机间隔
          </label>
        </div>
        <div id="randomIntervalInputs" style="${t.intervalType==='fixed'?'display:none':''};border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#f8fafc">
          <div class="field" style="margin-bottom:10px">
            <label for="minSeconds" style="font-size:13px">最短秒数</label>
            <input id="minSeconds" name="minSeconds" type="number" min="1" max="3600" value="${t.minSeconds||5}">
            <small style="color:#94a3b8;display:block;margin-top:2px;font-size:11px">单位: 秒，范围1-3600</small>
          </div>
          <div class="field">
            <label for="maxSeconds" style="font-size:13px">最长秒数</label>
            <input id="maxSeconds" name="maxSeconds" type="number" min="1" max="3600" value="${t.maxSeconds||10}">
            <small style="color:#94a3b8;display:block;margin-top:2px;font-size:11px">每次发送后在最短与最长秒数之间随机等待</small>
          </div>
        </div>
        <div id="fixedIntervalInputs" style="${t.intervalType==='fixed'?'':'display:none'};border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#f8fafc">
          <div class="field">
            <label for="fixedSeconds" style="font-size:13px">固定秒数</label>
            <input id="fixedSeconds" name="fixedSeconds" type="number" min="1" max="3600" value="${t.fixedSeconds||5}">
            <small style="color:#94a3b8;display:block;margin-top:2px;font-size:11px">单位: 秒，范围1-3600</small>
          </div>
        </div>
      </div>
      <div class="field">
        <label class="check" style="display:flex;align-items:center;gap:8px;font-weight:600;cursor:pointer">
          <input type="checkbox" name="loop" ${t.loop!==false?'checked':''}> 循环执行
        </label>
        <small style="color:#94a3b8;display:block;margin-left:24px;font-size:12px">开启后轮次执行至下播</small>
      </div>
      <div class="dialog-foot" style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px">
        <button type="button" onclick="closeDialog()">取消</button>
        <button class="primary" type="submit">保存</button>
      </div>
    </form>
  `);
}
const editRobotTemplateModal = openRobotTemplateModal;

function saveRobotTemplate(e, id){
  e.preventDefault();
  const f = new FormData(e.target);
  const name = String(f.get('name')||'').trim();
  if(!name) return toast('请输入模版名称');
  
  const robotCount = Math.max(1, Number(f.get('robotCount'))||100);
  const scriptTemplate = f.get('scriptTemplate')||(db.scriptTemplates?.[0]?.name || '技术互动');
  const intervalType = f.get('intervalType')||'random';
  const fixedSeconds = Math.max(1, Number(f.get('fixedSeconds'))||5);
  const minSeconds = Math.max(1, Number(f.get('minSeconds'))||5);
  const maxSeconds = Math.max(minSeconds, Number(f.get('maxSeconds'))||10);
  const loop = f.has('loop');
  
  db.robotTemplates ||= structuredClone(defaultRobotTemplates);
  if(id){
    const item = db.robotTemplates.find(x => x.id === Number(id));
    if(item){
      item.name = name;
      item.robotCount = robotCount;
      item.scriptTemplate = scriptTemplate;
      item.intervalType = intervalType;
      item.fixedSeconds = fixedSeconds;
      item.minSeconds = minSeconds;
      item.maxSeconds = maxSeconds;
      item.loop = loop;
    }
  } else {
    const newId = uid();
    db.robotTemplates.push({
      id: newId,
      name,
      robotCount,
      scriptTemplate,
      intervalType,
      fixedSeconds,
      minSeconds,
      maxSeconds,
      loop,
      active: false
    });
  }
  
  for(const r of db.rooms) resetRobotSchedule(r);
  persist();
  closeDialog();
  render();
  toast(id ? '机器人模版已更新！' : '新建机器人模版成功！');
}

function deleteRobotTemplate(id){
  db.robotTemplates ||= structuredClone(defaultRobotTemplates);
  if(db.robotTemplates.length <= 1) return toast('至少需保留一个机器人模版');
  const target = db.robotTemplates.find(x => x.id === Number(id));
  if(!target) return;
  modal('确认删除机器人模版', `
    <p style="margin:10px 0 16px">确定要删除机器人模版【<b>${E(target.name)}</b>】吗？</p>
    <div class="dialog-foot" style="display:flex;justify-content:flex-end;gap:10px">
      <button type="button" onclick="closeDialog()">取消</button>
      <button class="primary" style="background:#ef4444;border-color:#ef4444" type="button" onclick="confirmDeleteRobotTemplate(${target.id})">确认删除</button>
    </div>
  `);
}

function confirmDeleteRobotTemplate(id){
  db.robotTemplates = db.robotTemplates.filter(x => x.id !== Number(id));
  if(!db.robotTemplates.some(t => t.active)){
    db.robotTemplates[0].active = true;
    db.activeRobotTemplateId = db.robotTemplates[0].id;
  }
  for(const r of db.rooms) resetRobotSchedule(r);
  persist();
  closeDialog();
  render();
  toast('已删除机器人模版');
}

function setActiveRobotTemplate(id){
  db.robotTemplates ||= structuredClone(defaultRobotTemplates);
  for(const t of db.robotTemplates){
    t.active = (t.id === Number(id));
  }
  db.activeRobotTemplateId = Number(id);
  for(const r of db.rooms) resetRobotSchedule(r);
  persist();
  render();
  toast('已切换生效模版，将使用该模版的话术与间隔规则');
}

function openRobotNamesModal(){
  const namesText = (db.robotNames && db.robotNames.length ? db.robotNames : defaultRobotNames).join('\n');
  modal('配置评论用户昵称库', `
    <form onsubmit="saveRobotNames(event)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <p class="form-help" style="margin:0">一行一个门店用户名，保存后自动同步至各直播间互动：</p>
        <button type="button" class="link small" onclick="resetDefaultRobotNames()">恢复默认30家门店</button>
      </div>
      <div class="field">
        <textarea id="robotNamesInput" name="names" rows="12" style="font-size:13px;line-height:1.6;font-family:inherit" required>${namesText}</textarea>
      </div>
      <div class="dialog-foot" style="display:flex;justify-content:flex-end;gap:10px">
        <button type="button" onclick="closeDialog()">取消</button>
        <button class="primary" type="submit">保存昵称库</button>
      </div>
    </form>
  `);
}

function saveRobotNames(e){
  e.preventDefault();
  const f = new FormData(e.target);
  const raw = String(f.get('names')||'').split('\n').map(s=>s.trim()).filter(Boolean);
  if(!raw.length) return toast('至少需要一个评论人用户名');
  db.robotNames = raw;
  persist();
  closeDialog();
  render();
  toast(`已保存 ${raw.length} 个评论人用户名！`);
}

function sendTestRobotComment(roomId=null){
  const r = (roomId ? db.rooms.find(x=>x.id===roomId) : null) || room();
  const list = (db.robotNames && db.robotNames.length) ? db.robotNames : defaultRobotNames;
  const author = list[Math.floor(Math.random() * list.length)];
  const t = getActiveRobotTemplate();
  const st = (db.scriptTemplates || defaultScriptTemplates).find(s => s.name === t.scriptTemplate) 
             || (db.scriptTemplates && db.scriptTemplates[0]) 
             || defaultScriptTemplates[0];
  const lines = (st && st.lines && st.lines.length) ? st.lines : defaultScriptTemplates[0].lines;
  const text = lines[Math.floor(Math.random() * lines.length)];
  writeLiveMessage(r, 'viewer', text, null, author);
  render();
  toast(`已模拟【${author}】发表评论：“${text}”`);
}

commentsPage = function(){
  const r = db.rooms.find(r => r.id === db.commentRoom) || room();
  if(page === 'scripts') window.assistantSubTab = 'scripts';
  else if(page === 'robots') window.assistantSubTab = 'robots';
  else if(page === 'comments' && !window.assistantSubTab) window.assistantSubTab = 'all';
  const subTab = window.assistantSubTab || 'all';
  
  // 1. Robot Templates Card (Image 2)
  const robotRows = (db.robotTemplates || defaultRobotTemplates).map(t => {
    const intervalDisplay = t.intervalType === 'random' ? `${t.minSeconds || 5}~${t.maxSeconds || 10} 秒（随机）` : `${t.fixedSeconds || 5}秒`;
    return `
      <tr>
        <td><b>${E(t.name)}</b> ${t.active ? '<span class="badge ok" style="margin-left:6px;font-size:11px">当前生效</span>' : ''}</td>
        <td>${t.robotCount || 100}</td>
        <td><span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:500">${E(t.scriptTemplate || '技术互动')}</span></td>
        <td>${intervalDisplay}</td>
        <td>${t.loop !== false ? '循环执行' : '单次执行'}</td>
        <td>
          <div class="actions">
            ${!t.active ? `<button class="link" onclick="setActiveRobotTemplate(${t.id})">设为生效</button>` : ''}
            <button class="link" onclick="openRobotTemplateModal(${t.id})">编辑</button>
            <button class="link danger" onclick="deleteRobotTemplate(${t.id})">删除</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  
  const robotCardHtml = `
    <section class="card robot-template-section" id="section-robots">
      <div class="card-title">
        <div style="display:flex;align-items:center;gap:12px">
          <h2>机器人模版</h2>
          <span style="font-size:12px;color:#64748b">商户级维护；关联商品需在「配货任务」启动时单独设置</span>
        </div>
        <div class="actions">
          <button class="primary small" onclick="openRobotTemplateModal()">新建机器人模版</button>
          <button class="small" onclick="sendTestRobotComment(${r.id})">模拟发送一条</button>
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>名称</th><th>机器人数</th><th>话术模版</th><th>发送间隔</th><th>循环执行</th><th>操作</th></tr>
          </thead>
          <tbody>
            ${robotRows}
          </tbody>
        </table>
      </div>
      <div class="data-foot">
        <span>共 ${(db.robotTemplates || defaultRobotTemplates).length} 条记录</span>
        <span>20条/页</span>
      </div>
    </section>
  `;

  // 2. Script Templates Card (Image 1 & Image 4)
  const scriptRows = (db.scriptTemplates || defaultScriptTemplates).map(st => {
    const lines = st.lines || [];
    const preview = lines.slice(0, 3).join('，') + (lines.length > 3 ? '...' : '');
    return `
      <tr>
        <td><b>${E(st.name)}</b></td>
        <td><b>${lines.length}</b></td>
        <td style="color:#475569;max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${E(lines.join('\n'))}">${E(preview || '暂无内容')}</td>
        <td>
          <div class="actions">
            <button class="link" onclick="openScriptTemplateModal(${st.id})">编辑</button>
            <button class="link danger" onclick="deleteScriptTemplate(${st.id})">删除</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const scriptCardHtml = `
    <section class="card script-template-section" id="section-scripts">
      <div class="card-title">
        <div style="display:flex;align-items:center;gap:12px">
          <h2>话术模版</h2>
          <span style="font-size:12px;color:#64748b">话术模板支持单户级维护，全部直播间可用；每行一条话术，空行自动忽略</span>
        </div>
        <div class="actions">
          <button class="primary small" onclick="openScriptTemplateModal()">新建话术模版</button>
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th style="width:20%">名称</th><th style="width:15%">话术条数</th><th>内容预览</th><th style="width:18%">操作</th></tr>
          </thead>
          <tbody>
            ${scriptRows}
          </tbody>
        </table>
      </div>
      <div class="data-foot">
        <span>共 ${(db.scriptTemplates || defaultScriptTemplates).length} 条记录</span>
        <span>20条/页</span>
      </div>
    </section>
  `;

  // 3. User Nicknames Library Card
  const namesCardHtml = `
    <section class="card" id="section-names">
      <div class="card-title">
        <div style="display:flex;align-items:center;gap:12px">
          <h2>评论用户昵称库（共 ${db.robotNames.length} 个美业门店）</h2>
          <span style="font-size:12px;color:#64748b">机器人发表弹幕时轮换使用此昵称库，自动标注【观众】身份</span>
        </div>
        <div class="actions">
          <button class="primary small" onclick="openRobotNamesModal()">编辑评论人列表</button>
          <button class="small" onclick="resetDefaultRobotNames()">恢复默认30家门店</button>
        </div>
      </div>
      <p class="form-help">直播间弹幕将自动提取以下 30 家美业机构名称模拟真实观众参与互动：</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;max-height:160px;overflow-y:auto;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
        ${db.robotNames.map(name=>`<span style="background:#f1e8ff;color:#6b21a8;border:1px solid #ddd6fe;border-radius:14px;padding:3px 10px;font-size:12px;font-weight:500;display:inline-flex;align-items:center;gap:4px"><span style="background:#c084fc;color:#fff;border-radius:8px;padding:0 4px;font-size:10px">观众</span>${E(name)}</span>`).join('')}
      </div>
    </section>
  `;

  // 4. Live Message Stream & Review Card
  const commentsStreamHtml = `
    <section class="card" id="section-stream">
      <div class="card-title">
        <div style="display:flex;align-items:center;gap:12px">
          <h2>本场评论记录与审核</h2>
          <span style="font-size:12px;color:#64748b">${E(r.name)} · 消息同时出现在后台中控与观看端</span>
        </div>
        <div class="actions">
          <button onclick="configure('moderation')">审核与频控</button>
          <button onclick="toggleMute(${r.id})">${db.mutedViewers[r.id]?'解除会员禁言':'禁言演示会员'}</button>
        </div>
      </div>
      ${table(['时间点','发送者','内容','显示状态','操作'],db.liveMessages.filter(m=>m.room===r.id).slice(-50).reverse().map(m=>`<tr><td>${fmt(m.at)}</td><td><b>${E(m.name)}</b></td><td>${E(m.text)}</td><td>${m.pending?'<span class="badge wait">待审核</span>':m.hidden?'<span class="badge gray">已隐藏</span>':'<span class="badge ok">显示中</span>'}</td><td>${m.pending?`<button class="link" onclick="approveMessage(${m.id})">审核通过</button>`:''}<button class="link" onclick="hideMessage(${m.id})">${m.hidden?'恢复':'隐藏'}</button></td></tr>`))}
    </section>
  `;

  // Sub-tabs navigation bar
  const tabsHtml = `
    <div class="assistant-tabs" style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="${subTab==='all'?'active':''}" onclick="setAssistantSubTab('all')">全部展示</button>
      <button class="${subTab==='robots'?'active':''}" onclick="setAssistantSubTab('robots')">🤖 机器人模版</button>
      <button class="${subTab==='scripts'?'active':''}" onclick="setAssistantSubTab('scripts')">📝 话术模版</button>
      <button class="${subTab==='names'?'active':''}" onclick="setAssistantSubTab('names')">👥 评论人昵称库 (30家)</button>
      <button class="${subTab==='stream'?'active':''}" onclick="setAssistantSubTab('stream')">📋 评论记录与审核</button>
    </div>
  `;

  const noticeCardHtml = (typeof roomNotice === 'function') ? `
    <section class="card room-notice-config">
      <div class="card-title">
        <h2>直播间系统提示</h2>
        <button class="primary small" onclick="editRoomNotice(${r.id})">编辑入场提示</button>
      </div>
      <p>${E(roomNotice(r))}</p>
      <small class="muted">独立于评论时间轴，进入直播间即展示，不会被新评论覆盖。</small>
    </section>
  ` : '';

  let pageTitle = '直播助手';
  let pageSub = '配置机器人自动发评论、管理话术模版与评论人昵称库';
  let contentHtml = '';

  if(subTab === 'robots'){
    pageTitle = '机器人模版';
    pageSub = '商户级维护；关联商品需在「配货任务」启动时单独设置';
    contentHtml = robotCardHtml;
  } else if(subTab === 'scripts'){
    pageTitle = '话术模版';
    pageSub = '话术模板支持单户级维护，全部直播间可用；每行一条话术，空行自动忽略';
    contentHtml = scriptCardHtml;
  } else if(subTab === 'names'){
    pageTitle = '评论用户昵称库';
    pageSub = '评论用户昵称库（共 30 个美业门店），机器人发表弹幕时轮换使用';
    contentHtml = namesCardHtml;
  } else if(subTab === 'stream'){
    pageTitle = '本场评论记录与审核';
    pageSub = `${E(r.name)} · 消息同时出现在后台中控与观看端`;
    contentHtml = noticeCardHtml + commentsStreamHtml;
  } else {
    pageTitle = '直播助手';
    pageSub = '配置机器人自动发评论、管理话术模版与评论人昵称库';
    contentHtml = robotCardHtml + scriptCardHtml + namesCardHtml + noticeCardHtml + commentsStreamHtml;
  }

  return title(pageTitle, pageSub) + tabsHtml + contentHtml;
};

// Pairing, recording and ingestion survive view changes and support interrupted tasks.
pairDevice=function(){
  if(recording)return toast('录制中不能更换设备，请先结束或中断录制');
  db.pairing={code:'MY-'+String(uid()).slice(-6),expiresAt:stamp()+300000,used:false};persist();
  const options=db.rooms.filter(r=>r.mode==='直播'&&!['已结束','已取消'].includes(r.status));
  modal('扫码连接手机采集APP',`<form onsubmit="confirmPair(event)"><div class="form-grid"><div><div class="qr" aria-label="配对二维码示意"><span>APP</span></div><p class="form-help">配对示意码 · 真实APP接口待接入</p></div><div><h3>悦己美学 · 总部直播中心</h3><p class="pair-code">${E(db.pairing.code)}</p><p>有效期 <b id="pairCountdown">05:00</b></p><div class="field"><label for="pairRoom">绑定直播间</label><select id="pairRoom" name="room">${options.map(r=>`<option value="${r.id}" ${r.id===db.capture.room?'selected':''}>${E(r.name)}</option>`).join('')||'<option value="0">仅录制素材，不绑定场次</option>'}</select></div><div class="field"><label for="captureMode">采集方式</label><select id="captureMode" name="mode"><option>仅录制</option>${options.length?'<option>录制并直播</option>':''}</select></div></div></div><p class="dialog-info">核对账号、场次后模拟确认。确认一次后连接码即失效。</p><div class="dialog-foot"><button type="button" onclick="pairDevice()">刷新连接码</button><button class="primary" type="submit">模拟APP扫码确认</button></div></form>`);
};
function confirmPair(e){
  e.preventDefault();const p=db.pairing;if(!p||p.used||stamp()>=p.expiresAt)return toast('连接码已过期或已使用，请刷新');
  const f=new FormData(e.target),c=db.capture;if(c.status==='录制已中断'&&Number(f.get('room'))!==c.room)return toast('请先保存中断的录像，再更换场次');
  p.used=true;c.connected=true;c.room=Number(f.get('room'));c.mode=f.get('mode')||'仅录制';syncCapture();persist();closeDialog();render();toast('手机与PC已配对（本地模拟）');
}
function disconnectCapture(){
  const c=db.capture;if(c.status==='录制中'){c.elapsed=captureDuration();c.status='录制已中断';delete c.startedAt;}
  c.connected=false;syncCapture();persist();render();toast('连接已断开，录制进度已保留。可重连继续或结束保存');
}
toggleRecord=function(){
  const c=db.capture;
  if(c.status==='录制中'||c.status==='录制已中断')return finishCapture();
  if(!c.connected)return pairDevice();
  if(c.mode==='录制并直播'){
    const r=db.rooms.find(r=>r.id===c.room);if(!r||['已结束','已取消'].includes(r.status))return toast('绑定场次已结束，请重新配对');
    if(r.status!=='直播中')startRoom(r);
  }
  Object.assign(c,{status:'录制中',elapsed:0,startedAt:stamp(),sessionId:uid()});syncCapture();persist();render();toast('录制计时已开始（演示）');
};
function resumeCapture(){const c=db.capture;if(c.status!=='录制已中断')return;if(!c.connected)return pairDevice();c.status='录制中';c.startedAt=stamp();syncCapture();persist();render();toast('已从保留的进度继续录制');}
function addIngest(name,duration,source,sourceRoom=0,id=uid()){
  if(db.ingestJobs.some(j=>j.id===id))return;
  db.ingestJobs.unshift({id,name,duration:fmt(Math.max(1,duration)),source,sourceRoom,status:'上传中',progress:0,updatedAt:stamp()});persist();
}
function finishCapture(){
  const c=db.capture;if(!['录制中','录制已中断'].includes(c.status))return;
  const duration=captureDuration(),r=db.rooms.find(r=>r.id===c.room);
  addIngest((r?.name||'手机录制')+' · '+new Date(stamp()).toLocaleTimeString('zh-CN'),duration,'手机扫码录制',c.mode==='录制并直播'?c.room:0,c.sessionId);
  if(c.mode==='录制并直播'&&r?.status==='直播中'){r.status='已结束';r.endedAt=stamp();r.archiveJob=c.sessionId;}
  Object.assign(c,{status:'待录制',elapsed:0});delete c.startedAt;syncCapture();persist();render();toast('录制结束，已进入自动归档队列；可在后台查看进度');
}
function updateJob(id,action){
  const j=db.ingestJobs.find(j=>j.id===id);if(!j||j.status==='已归档')return;
  j.status=action==='retry'?(j.progress<60?'上传中':'校验与转码中'):action==='fail'?'上传失败':'已暂停';j.updatedAt=stamp();persist();render();
  toast(action==='retry'?'已从上次进度继续':'任务已'+(action==='fail'?'模拟失败，保留进度，可重试':'暂停，保留进度'));
}
function captureRecovery(){const c=db.capture;return `<section class="card recovery-card"><div class="card-title"><h2>设备与录制任务</h2>${badge(c.status)}</div><p>${c.connected?'采集APP已连接':'采集APP未连接'} · ${E(c.mode)} · 已录 <b data-capture-time>${fmt(captureDuration())}</b></p><div class="actions">${c.status==='录制已中断'?'<button class="primary" onclick="resumeCapture()">重连 / 继续录制</button><button onclick="finishCapture()">结束并保存已录内容</button>':c.status==='录制中'?'<button class="primary" onclick="finishCapture()">结束并自动保存</button>':'<button onclick="pairDevice()">连接 / 更换采集设备</button>'}${c.connected?'<button onclick="disconnectCapture()">模拟连接中断</button>':''}</div><p class="form-help">本地演示保留录制元数据；刷新时标记为中断，实际视频文件需采集APP及存储服务接入。</p></section>`;}
function ingestPanel(){return `<section class="card"><div class="card-title"><h2>自动归档任务</h2><span class="badge gray">上传 → 校验转码 → 素材可用</span></div>${db.ingestJobs.length?db.ingestJobs.slice(0,10).map(j=>`<div class="ingest-item"><div class="row"><div class="grow"><b>${E(j.name)}</b><p class="muted">${E(j.duration)} · ${E(j.source)}</p></div><span data-job-status="${j.id}">${badge(j.status)}</span></div><div class="progress"><i data-job-bar="${j.id}" style="width:${j.progress}%"></i></div><div class="actions">${j.status==='已归档'?`<button class="link" onclick="previewVideo(${j.id})">预览素材</button><button class="link" onclick="newLive(${j.id})">安排伪直播</button><button class="link" onclick="publishReplay(${j.id})">发布录播回放</button>`:['上传失败','已暂停'].includes(j.status)?`<button class="primary small" onclick="updateJob(${j.id},'retry')">继续 / 重试</button>`:`<button class="small" onclick="updateJob(${j.id},'pause')">暂停</button><button class="small" onclick="updateJob(${j.id},'fail')">模拟上传失败</button>`}</div></div>`).join(''):'<div class="empty">尚无归档任务，手机录制结束后自动出现在这里。</div>'}</section>`;}
mediaPage=function(){return legacy.mediaPage().replace('<section class="card"><div class="card-title"><h2>素材库</h2>',captureRecovery()+ingestPanel()+'<section class="card"><div class="card-title"><h2>素材库</h2>').replace(/(<button class="link" onclick="newLive\((\d+)\)"[^>]*>用于伪直播<\/button>)/g,'$1<button class="link" onclick="publishReplay($2)">发布回放</button>');};
capturePage=function(){return legacy.capturePage().replace('手机保留 + 后台自动收录','采集APP接入后保留视频').replace('录制并直播</b>',E(db.capture.mode)+'</b>').replace('结束录制后自动上传，后台完成校验和转码后进入素材库。','录制与上传为本地状态演示，实际视频采集接口待接入。')+captureRecovery()+ingestPanel();};

function roomForm(r={},assetId){
  const asset=db.assets.find(a=>a.id===assetId),mode=r.mode||(asset?'伪直播（录播播放）':'直播');
  return `<form onsubmit="${r.id?'saveRoomSettings(event,'+r.id+')':'createLive(event)'}"><div class="field"><label for="liveName">场次标题</label><input id="liveName" name="name" maxlength="60" required value="${E(r.name||asset?.name||'')}"></div><div class="form-grid"><div class="field"><label for="liveMode">播放模式</label><select id="liveMode" name="mode" ${r.id?'disabled':''} onchange="$('#videoChoice').hidden=this.value==='直播'">${['直播','录播','伪直播（录播播放）'].map(x=>`<option ${x===mode?'selected':''}>${x}</option>`).join('')}</select></div><div class="field" id="videoChoice" ${mode==='直播'?'hidden':''}><label for="liveAsset">录像素材</label><select id="liveAsset" name="asset"><option value="">请选择可用录像</option>${db.assets.filter(a=>a.status==='可用').map(a=>`<option value="${a.id}" ${a.id===(assetId||r.asset)?'selected':''}>${E(a.name)}</option>`).join('')}</select></div><div class="field"><label for="liveStart">计划开始时间</label><input id="liveStart" name="time" type="datetime-local" required value="${E(r.time?.replace(' ','T')||localTime(stamp()+300000))}"></div><div class="field"><label for="roomFeedHeight">评论互动区最大高度</label><div class="range-row"><input id="roomFeedHeight" name="feedHeight" type="range" min="28" max="62" step="1" value="${Number(r.feedHeight)||44}" oninput="this.nextElementSibling.value=this.value+'%'"><output id="roomFeedHeightOutput">${Number(r.feedHeight)||44}%</output></div><p class="form-help">调整观看端评论、主题、通知和互动样例区域的显示高度；保存后应用到本场直播间。</p></div><div class="field"><label for="permission">观看权限</label><select id="permission" name="permission">${['全部会员','付费用户','内部学员'].map(x=>`<option ${r.permission===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label for="accessProduct">付费权限关联课程</label><select id="accessProduct" name="accessProduct">${db.products.filter(p=>p.type==='课程').map(p=>`<option value="${p.id}" ${r.accessProduct===p.id?'selected':''}>${E(p.name)}</option>`).join('')}</select></div></div><div class="field"><label>关联商品（可以不带货）</label>${db.products.filter(p=>p.active).map(p=>`<label class="check"><input name="goods" type="checkbox" value="${p.id}" ${(r.goods||[]).includes(p.id)?'checked':''}>${E(p.name)}</label>`).join('')}</div><label class="check"><input name="record" type="checkbox" ${r.record!==false?'checked':''}>实时直播结束自动归档录像</label><label class="check"><input name="autoStart" type="checkbox" ${r.autoStart?'checked':''}>伪直播按计划时间自动开播（本地页面保持打开时）</label><p class="form-help">录播发布后用户自主播放，可暂停、拖动时间轴和调节倍速；伪直播进入后自动播放，退出后按个人进度续播。后台调度服务尚未接入。</p>${footSave()}</form>`;
}
newLive=function(assetId){if(assetId&&db.assets.find(a=>a.id===assetId)?.status!=='可用')return toast('请先完成素材处理');modal('创建直播场次',roomForm({},assetId));};
function readRoomForm(e,existing){
  const f=new FormData(e.target),name=String(f.get('name')||'').trim(),mode=existing?.mode||f.get('mode'),asset=Number(f.get('asset')),start=timeValue(f.get('time'));
  if(!name||name.length>60){toast('请输入1—60字场次标题');return;}
  if(!Number.isFinite(start)){toast('请输入有效开始时间');return;}
  let end=f.get('end')?timeValue(f.get('end')):null;
  if(!end||!Number.isFinite(end)||end<=start){
    end=existing?.end?timeValue(existing.end):null;
    if(!end||!Number.isFinite(end)||end<=start)end=start+7200000;
  }
  if(!['直播','录播','伪直播（录播播放）'].includes(mode)){toast('请选择有效模式');return;}
  if(mode!=='直播'&&!db.assets.some(a=>a.id===asset&&a.status==='可用')){toast('请选择仍然可用的录像素材');return;}
  if(mode.startsWith('伪直播')&&f.has('autoStart')&&start<=stamp()&&existing?.status!=='直播中'){toast('自动排期须晚于当前时间，或取消勾选后手动开播');return;}
  const permission=f.get('permission')||'全部会员',accessProduct=Number(f.get('accessProduct')||4);
  if(permission==='付费用户'&&!db.products.some(p=>p.id===accessProduct&&p.type==='课程')){toast('请选择付费关联课程');return;}
  return {name,mode,asset:mode==='直播'?0:asset,time:f.get('time').replace('T',' '),end:localTime(end).replace('T',' '),goods:f.getAll('goods').map(Number).filter(id=>db.products.some(p=>p.id===id&&p.active)),record:f.has('record'),autoStart:mode.startsWith('伪直播')&&f.has('autoStart'),permission,accessProduct,feedHeight:Math.max(28,Math.min(62,Number(f.get('feedHeight'))||44))};
}
createLive=function(e){e.preventDefault();const value=readRoomForm(e);if(!value)return;db.rooms.push({...value,id:uid(),status:value.mode==='录播'?'已发布':'待开播',replayPublished:value.mode==='录播',sentScripts:[],autoCursor:-1});log('创建场次：'+value.name);closeDialog();go('live');toast(value.mode==='录播'?'录播已发布，观看端可自主播放':'场次已保存');};
liveSettings=function(id){roomId=id;const r=room();modal('直播设置',roomForm(r));};
function saveRoomSettings(e,id){e.preventDefault();const r=db.rooms.find(r=>r.id===id),v=readRoomForm(e,r);if(!v)return;if(r.status==='直播中'&&r.mode!=='直播')v.asset=r.asset;if(r.mode==='直播')v.asset=r.asset;Object.assign(r,v);if(!r.goods.includes(r.explain))delete r.explain;log('更新场次设置');closeDialog();render();toast('场次设置已保存');}
function startRoom(r,scheduled=false){
  if(r.status!=='待开播')return false;
  if(r.mode!=='直播'&&!db.assets.some(a=>a.id===r.asset&&a.status==='可用')){r.scheduleError='素材不可用，请重新选择';return false;}
  if(r.mode==='直播')r.demoLive=true;
  r.status='直播中';r.startedAt=scheduled?timeValue(r.time):stamp();
  const startTime = timeValue(r.time) || stamp();
  const endTime = r.end ? timeValue(r.end) : (startTime + 7200000);
  r.scheduleEndAt=scheduled?endTime:stamp()+Math.max(1000,endTime-startTime);
  r.sentScripts=[];r.autoCursor=playbackTime(r)-1;resetRobotSchedule(r);delete r.scheduleError;persist();return true;
}
toggleLive=function(id){roomId=id;const r=room();if(r.mode==='录播')return watch(id);if(r.status==='已取消')return toast('该场已取消，请新建场次');if(r.status==='已结束')return go('media');if(r.status==='直播中')return modal('结束本场直播',`<p>结束“${E(r.name)}”。${r.mode==='直播'&&r.record?'录像会进入自动归档任务。':''}</p>`,`<button onclick="closeDialog()">继续直播</button><button class="primary" onclick="endLive(${id})">确认结束</button>`);if(startRoom(r)){render();toast('场次已开始（本地播放状态演示）');}};
endLive=function(id){const r=db.rooms.find(r=>r.id===id);if(!r||r.status!=='直播中')return;r.endedAt=stamp();r.status='已结束';
  if(r.mode==='直播'&&recording&&db.capture.room===id&&db.capture.mode==='录制并直播')finishCapture();
  else if(r.mode==='直播'&&r.record&&!r.archiveJob){r.archiveJob=uid();addIngest(r.name,playbackTime(r),'直播自动录制',id,r.archiveJob);}
  log('结束场次：'+r.name);closeDialog();render();toast('场次已结束，录像归档进度可在素材库查看');};
function cancelRoom(id){const r=db.rooms.find(r=>r.id===id);if(r?.status!=='待开播')return;modal('取消排期',`<p>取消“${E(r.name)}”的待播排期？已预约的观众将看到取消提示。</p>`,`<button onclick="closeDialog()">保留排期</button><button class="primary" onclick="confirmCancelRoom(${id})">确认取消排期</button>`);}
function confirmCancelRoom(id){const r=db.rooms.find(r=>r.id===id);if(r?.status!=='待开播')return;r.status='已取消';r.autoStart=false;log('取消排期：'+r.name);closeDialog();render();toast('排期已取消');}
function publishReplay(id){const a=db.assets.find(a=>a.id===id);if(a?.status!=='可用')return toast('素材尚不可用');const existing=db.rooms.find(r=>r.asset===id&&r.replayPublished);if(existing)return toast('该录像已有回放入口：'+existing.name);
  modal('发布录播回放',`<p>${E(a.name)} · ${E(a.duration)}</p><p>发布后出现在小程序“录播回放”。可进入场次设置调整观看权限。</p>`,`<button onclick="closeDialog()">取消</button><button class="primary" onclick="confirmPublishReplay(${id})">发布到观看端</button>`);
}
function confirmPublishReplay(id){const a=db.assets.find(a=>a.id===id);if(!a||a.status!=='可用')return;let r=db.rooms.find(r=>r.asset===id&&(r.mode==='录播'||r.status==='已结束'));if(r){r.replayPublished=true;}else{r={id:uid(),name:a.name,mode:'录播',asset:id,status:'已发布',time:localTime(stamp()).replace('T',' '),end:localTime(stamp()+3600000).replace('T',' '),goods:[],permission:'全部会员',record:false,replayPublished:true,sentScripts:[],autoCursor:-1};db.rooms.push(r);}log('发布回放：'+a.name);closeDialog();render();toast('回放已发布到小程序');}
livePage=function(){return legacy.livePage().replace(/(<button class="link" onclick="liveSettings\((\d+)\)">设置<\/button>)/g,(match,_all,id)=>match+(db.rooms.find(r=>r.id===Number(id))?.status==='待开播'?`<button class="link" onclick="cancelRoom(${id})">取消排期</button>`:''))+`<section class="card"><h2>排期运行说明</h2><p class="form-help">勾选自动开播的伪直播，在本页打开期间按本机时间执行；刷新后会核对排期。生产运行需后台调度服务。</p>${db.rooms.filter(r=>r.scheduleError).map(r=>`<p class="danger">${E(r.name)}：${E(r.scheduleError)}</p>`).join('')}</section>`;};

watch=function(id){const r=db.rooms.find(r=>r.id===id);if(!r)return toast('场次不存在');roomId=id;surface=surface==='h5'?'h5':'mini';miniPage='watch';miniTab='live';if(mayWatch(r)&&(r.mode==='录播'||r.mode.startsWith('伪直播')&&r.status==='直播中'))beginViewerPlayback(r.id);
  if(mayWatch(r)&&isPlaying(r)&&db.configs.assistant?.welcome)writeLiveMessage(r,'auto','欢迎进入美业课堂，问题可在评论区留言。','welcome:'+db.userName);
  render();scrollTop();};
function viewerIdentity(){modal('切换演示身份',`<p>用于检查原型观看权限，不是真实登录或授权。</p><div class="actions"><button onclick="setViewerRole('会员')">普通会员</button><button onclick="setViewerRole('内部学员')">内部学员</button></div>`);}
function setViewerRole(role){db.viewerRole=role;persist();closeDialog();render();}
miniWatch=function(){
  const r=room(),allowed=mayWatch(r),a=db.assets.find(a=>a.id===r.asset),replay=r.mode==='录播'||(r.status==='已结束'&&r.replayPublished&&a?.status==='可用');
  let html=legacy.miniWatch();
  html=html.replace(/<div class="live-comments" id="liveComments">[\s\S]*?<\/div>(?=<button style="position:absolute|<div class="live-product")/,`<div class="live-comments" id="liveComments">${allowed?messageMarkup(r,true):''}</div>`);
  html=html.replace(/<button style="position:absolute;top:43%[\s\S]*?<\/button>/,'');
  const goods=r.goods.map(id=>db.products.find(p=>p.id===id&&p.active)).filter(Boolean);
  if(!goods.length)html=html.replace(/<div class="live-product">[\s\S]*?(?=<div class="live-footer")/,'');
  let state='';
  if(!allowed)state=`<h2>${E(r.permission)}专享</h2><p>${r.permission==='付费用户'?'购买关联课程后可观看':'请使用内部学员身份观看'}</p>${r.permission==='付费用户'?`<button class="pinkbtn" onclick="viewProduct(${r.accessProduct})">查看关联课程</button>`:`<button onclick="viewerIdentity()">切换演示身份</button>`}`;
  else if(r.status==='待开播')state=`<h2>直播尚未开始</h2><p>${E(r.time)}</p><button class="pinkbtn" onclick="remindLive(${r.id})">${db.configs['remind'+r.id]?'取消预约':'预约开播提醒'}</button>`;
  else if(r.status==='已取消')state='<h2>本场直播已取消</h2><p>请返回直播列表查看其他场次</p><button onclick="navigateMini(\'live\',\'live\')">查看直播列表</button>';
  else if(replay)state=`<h2>录播回放</h2><p>${E(a?.duration||'')} · 支持暂停与继续</p><button class="pinkbtn" onclick="playCourse(${r.asset})">播放回放</button>`;
  else if(r.status==='已结束')state=`<h2>本场直播已结束</h2><p>${r.archiveJob?'录像正在归档或等待运营发布':'暂无已发布回放'}</p><button onclick="navigateMini('live','live')">查看其他直播</button>`;
  const progress=r.status==='直播中'?`<div class="playback-strip">${r.mode.startsWith('伪直播')?'个人播放进度':'开播时长'} <b data-room-time>${fmt(playbackTime(r))}</b>${r.mode.startsWith('伪直播')?' / '+E(a?.duration||''):''}</div>`:'';
  html=html.replace('<div class="live-shade"></div>','<div class="live-shade"></div>'+progress+(state?`<div class="watch-state">${state}</div>`:''));
  if(state)html=html.replace('id="liveInput"','id="liveInput" disabled').replace('onclick="sendLiveComment()"','onclick="sendLiveComment()" disabled');
  if(r.status!=='直播中')html=html.replace(/<span class="live-counter">[^<]*<\/span>/,`<span class="live-counter">${r.status==='待开播'?'直播预告':E(r.status)}</span>`);
  return html;
};
miniCourses=function(){const rooms=db.rooms.filter(r=>r.replayPublished&&db.assets.some(a=>a.id===r.asset&&a.status==='可用'));return `<div class="mini-promo-title"><h2>美业精品回放</h2><p>仅展示已发布的录像，素材库中的草稿不会公开</p></div>${rooms.map(r=>`<div class="mini-card"><h3>${E(r.name)}</h3><p class="muted">${E(r.permission||'全部会员')} · ${E(db.assets.find(a=>a.id===r.asset).duration)}</p><button class="pinkbtn small" onclick="watch(${r.id})">${mayWatch(r)?'观看录播':'查看观看权限'}</button></div>`).join('')||'<div class="mini-empty">暂无已发布回放</div>'}`;};
playCourse=function(id){const r=db.rooms.find(r=>r.asset===id&&r.replayPublished&&mayWatch(r)),a=db.assets.find(a=>a.id===id);if(!r||a?.status!=='可用')return toast('该录像未发布或当前账号没有观看权限');roomId=r.id;modal(E(a.name),`<video id="replayPlayer" controls src="assets/reference.mp4" onloadedmetadata="restorePlayback(${r.id},this)" onplay="replayEvent(${r.id},this,'play')" onpause="replayEvent(${r.id},this,'pause')" ontimeupdate="replayEvent(${r.id},this,'time')" onseeked="seekReplay(${r.id},this)" onended="replayEvent(${r.id},this,'end')" style="width:100%;max-height:420px;background:#111"></video><p class="form-help">此处播放附件中约4秒参考视频，非列表标注的业务录像。进度仅用于验证播放器和评论时间轴，真实视频服务待接入。</p>`);};
function restorePlayback(id,video){const saved=db.playback[id]?.seconds||0;if(saved<video.duration-1)video.currentTime=saved;video.dataset.allowedTime=video.currentTime||0;}
function seekReplay(id,video){const r=db.rooms.find(r=>r.id===id);if(r?.allowSeek===false&&Math.abs(video.currentTime-Number(video.dataset.allowedTime||0))>1.5){video.currentTime=Number(video.dataset.allowedTime||0);toast('本课程已关闭拖动进度');}}
function replayEvent(id,video,event){const r=db.rooms.find(r=>r.id===id);if(!r||!mayWatch(r))return;if(video.seeking&&r.allowSeek===false)return;db.playback[id]={seconds:Math.floor(video.currentTime||0),playing:event==='play'||(event==='time'&&!video.paused)};if(video.dataset)video.dataset.allowedTime=video.currentTime||0;if(event==='end')db.playback[id].playing=false;if(event==='play'&&db.playback[id].seconds===0)r.autoCursor=-1;persist();}
remindLive=function(id){const r=db.rooms.find(r=>r.id===id);if(r?.status!=='待开播')return toast('该场次当前不可预约');db.configs['remind'+id]=!db.configs['remind'+id];persist();render();toast(db.configs['remind'+id]?'已预约开播提醒（本地记录）':'已取消预约');};

function studioClock(){const r=room();return `<div class="workflow-bar"><span>${E(r.mode)} · <b data-room-time>${fmt(playbackTime(r))}</b></span><span>评论 ${db.liveMessages.filter(m=>m.room===r.id&&!m.hidden).length} 条</span><button class="link" onclick="viewerIdentity()">观看端身份：${E(db.viewerRole)}</button></div>`;}
liveWorkspace=function(){let html=legacy.liveWorkspace().replace('<div class="studio-layout">',studioClock()+'<div class="studio-layout">').replace(/<div class="studio-chat" id="studio-chat">[\s\S]*?<\/div>/,`<div class="studio-chat" id="studio-chat">${messageMarkup(room())}</div>`).replace(/onchange="db\.auto=this\.checked;persist\(\);toast\([^\"]+\)"/g,'onchange="setAutoComments(this.checked)"');if(db.capture.status==='录制已中断')html=html.replace('手机APP扫码连接电脑后台','录制已中断，已录进度已保留').replace('连接手机后可开始录制，结束自动保存，不用手动导入视频','重连后继续录制，或在下方保存已录内容').replace('待录制</b>','录制已中断</b>')+captureRecovery();return html;};
controlPage=function(){return legacy.controlPage()+`<section class="card"><h2>本场评论</h2>${studioClock()}<div id="studio-chat" class="studio-chat">${messageMarkup(room())}</div><div class="toolbar"><input id="studioComment" maxlength="160" aria-label="运营评论" placeholder="输入运营评论"><button class="primary" onclick="sendStudioComment()">发送</button></div></section>`;};

// Commerce checks protect state transitions and keep configured activity switches effective.
function campaignEnabled(id){return db.campaigns.find(c=>c.id===id)?.enabled!==false;}
function campaignPauseView(){return '<div class="mini-empty"><h3>活动已暂停</h3><p>请关注直播间其他福利。</p><button onclick="navigateMini(\'live\',\'live\')">返回直播</button></div>';}
miniRecharge=function(){return campaignEnabled('recharge')?legacy.miniRecharge():campaignPauseView();};
miniLottery=function(){return campaignEnabled('lottery')?legacy.miniLottery()+`<div class="mini-card"><h3>我的奖品记录</h3>${db.prizes.map(p=>`<p>${E(p.name)} · ${E(p.status)}</p>`).join('')||'<p class="muted">暂无奖品</p>'}</div>`:campaignPauseView();};
confirmRecharge=function(amount,gift){if(!campaignEnabled('recharge'))return toast('充值活动已暂停');if(!Number.isFinite(amount)||amount<=0||!Number.isFinite(gift)||gift<0)return toast('充值配置无效');legacy.confirmRecharge(amount,gift);};
function awardPrize(name,source){const coupon=String(name).match(/^(\d+(?:\.\d+)?)元(?:优惠)?券$/),points=String(name).match(/^(\d+)积分$/);if(coupon)db.coupons.push({id:'prize'+uid(),name:source+'优惠券',amount:Number(coupon[1]),threshold:Number(coupon[1]),used:false});else if(points)db.points+=Number(points[1]);db.prizes.unshift({id:uid(),name,source,status:coupon||points?'已发放（模拟）':'待联系门店领取（模拟）'});}
drawPrize=function(){if(!campaignEnabled('lottery'))return toast('抽奖活动已暂停');const c=db.configs.lottery||{},cost=Number(c['单次积分消耗']||20),limit=Number(c['奖品数量']??100);if(!Number.isFinite(cost)||cost<0||db.points<cost)return toast('积分不足或规则无效');if((db.drawAwardCount||0)>=limit)return toast('本期奖品已发完');db.points-=cost;const name=c['奖品名称']||'10元优惠券';if(Math.random()<.5){awardPrize(name,'积分抽奖');db.drawAwardCount=(db.drawAwardCount||0)+1;db.lastPrize='获得'+name+'（本地随机演示）';}else db.lastPrize='本次未中奖（本地随机演示）';log('参与积分抽奖');render();toast(db.lastPrize);};
submitConfig=function(e,id){e.preventDefault();const fields=marketing.find(m=>m.id===id)?.fields||configDefs[id]?.fields||[],f=new FormData(e.target);for(const [key,,type]of fields){if(type==='number'){const value=Number(f.get(key));if(!Number.isFinite(value)||value<0)return toast(key+'应为有效的非负数');if(/人数|数量|限购|小时|秒|分钟|每日积分/.test(key)&&value===0)return toast(key+'须大于0');if(key.includes('比例')&&value>100)return toast('比例不得超过100%');}}legacy.submitConfig(e,id);if(id==='replay'&&db.configs.replay){const c=db.configs.replay,r=room();r.record=c['自动生成回放']==='开启';r.permission=c['可见范围']==='内部培训人员'?'内部学员':c['可见范围'];r.allowSeek=c['允许拖动进度']!=='否';persist();render();}};
liveSheet=function(id){if(id==='giftbag')return giftSheet();if(id==='points')db.signed=db.signDate===dateKey();if(id==='products'){const goods=room().goods.map(pid=>db.products.find(p=>p.id===pid&&p.active)).filter(Boolean);return sheet('直播商品 · '+goods.length+'件',goods.length?goods.map(p=>`<div class="row">${productPic(p,'thumb')}<div class="grow"><b>${E(p.name)}</b><p class="money">${currency(p.price)}</p></div><button class="pinkbtn small" onclick="viewProduct(${p.id})">选购</button></div>`).join(''):'<div class="empty">本场未上架商品</div>');}return legacy.liveSheet(id);};
function giftSheet(){const r=room(),g=r.giftEntry,c=db.configs.giftbag||{};sheet('直播福袋',`<div class="mini-promo-title"><h2>${E(c['福袋名称']||'直播间专属福利')}</h2><p>${E(c['奖品']||'10元优惠券')}</p></div><div class="mini-card"><p>参与条件：${E(c['参与条件']||'观看并评论')}</p><p>${g?g.result?E(g.result):'已参与，开奖时间 '+new Date(g.drawAt).toLocaleTimeString('zh-CN'):'尚未参与'}</p></div><button class="pinkbtn" style="width:100%" onclick="${g?'drawGift()':'joinGift()'}" ${g?.result?'disabled':''}>${g?g.result?'已开奖':'查看开奖结果':'参与福袋'}</button><p class="form-help">仅演示本人参与和奖品发放状态；真实多人抽奖服务未接入。</p>`);}
function joinGift(){const r=room(),c=db.configs.giftbag||{};if(!isPlaying(r)||!mayWatch(r))return toast('请在有观看权限的播放场次参与');if(r.giftEntry)return toast('本场已参与');const condition=c['参与条件']||'观看并评论';if(condition==='观看并评论'&&!db.liveMessages.some(m=>m.room===r.id&&m.kind==='viewer'&&!m.pending&&!m.hidden))return toast('先发送一条有效评论再参与');if(condition==='观看满3分钟'&&((db.viewerVisits?.[r.id]||0)<180))return toast('在本场观看满3分钟后可参与');if(condition==='关注店铺'&&!db.configs.followed)return toast('请先关注店铺');r.giftEntry={drawAt:stamp()+Math.max(1,Number(c['开奖倒计时（秒）']||120))*1000,prize:c['奖品']||'10元优惠券'};persist();giftSheet();toast('已参与，达到开奖时间后可查看结果');}
function drawGift(){const g=room().giftEntry;if(!g||g.result)return;if(stamp()<g.drawAt)return toast('尚未到开奖时间');if(Math.random()<.5){awardPrize(g.prize,'直播福袋');g.result='获得'+g.prize+'（演示）';}else g.result='本次未中奖（演示）';persist();giftSheet();}
miniGroup=function(){return campaignEnabled('group')?legacy.miniGroup():campaignPauseView();};
miniBargain=function(){return campaignEnabled('bargain')?legacy.miniBargain():campaignPauseView();};
groupAction=function(){if(!campaignEnabled('group'))return toast('活动已暂停');return legacy.groupAction();};
bargainHelp=function(){if(!campaignEnabled('bargain'))return toast('活动已暂停');const limit=Number(db.configs.bargain?.['助力人数上限']||10);if((db.bargainHelp||0)>=limit)return toast('已达助力人数上限');legacy.bargainHelp();};
claimCoupon=function(id){if(!campaignEnabled('coupon'))return toast('领券活动已暂停');if(!couponDefinitions().some(c=>c.id===id))return toast('优惠券不存在');legacy.claimCoupon(id);};
checkIn=function(){if(!campaignEnabled('points'))return toast('签到活动已暂停');db.signed=db.signDate===dateKey();if(db.signed)return toast('今天已签到');const yesterday=dateKey(stamp()-86400000);db.signStreak=db.signDate===yesterday?(db.signStreak||0)+1:1;db.signDate=dateKey();const bonus=db.signStreak%7===0?Number(db.configs.points?.['连续7天奖励']||30):0;db.points+=bonus;legacy.checkIn();};
miniPoints=function(){db.signed=db.signDate===dateKey();return legacy.miniPoints()+`<div class="mini-card">连续签到 ${db.signStreak||0} 天 · 最近签到 ${E(db.signDate||'暂无')}</div>`;};
totals=function(){
  const subtotal=money(checkoutItems.reduce((a,i)=>a+i.price*i.qty,0));
  const eligible=db.coupons.filter(c=>!c.used&&!c.reservedBy).map(c=>{const base=money(checkoutItems.filter(i=>!c.product||i.id===c.product).reduce((s,i)=>s+i.price*i.qty,0));return{c,base,discount:base>=c.threshold?Math.max(0,Math.min(Number(c.amount)||0,base)):0};}).filter(v=>v.discount>0).sort((a,b)=>b.discount-a.discount);
  const coupon=eligible[0]?.c,discount=checkoutCoupon?eligible[0]?.discount||0:0;
  const physical=checkoutItems.some(i=>product(i.id).type==='实物'),threshold=Math.max(0,Number(db.configs.shipping?.['包邮门槛']??199)),shipping=physical&&checkoutDelivery==='快递配送'&&subtotal<threshold?Math.max(0,Number(db.configs.shipping?.['基础运费']??8)):0;
  return{subtotal,coupon,discount,shipping,total:money(subtotal-discount+shipping)};
};
resolveWithdrawal=function(i,ok){const w=db.withdrawals[i];if(!w||w.status!=='待审核')return toast('申请已经处理');w.status=ok?(w.method==='账户余额'?'已到账':'已审核'):'已驳回';if(!ok)db.commission=money(db.commission+w.amount);else if(w.method==='账户余额')db.wallet=money(db.wallet+w.amount);log('提现'+(ok?'审核通过':'驳回'));closeDialog();render();toast(ok?(w.method==='账户余额'?'已转入账户余额（模拟）':'审核通过，等待真实通道接入后打款'):'佣金已退还');};

function paymentAllowed(method){return ['微信支付','余额支付','支付宝支付'].includes(method)&&!(method==='支付宝支付'&&surface!=='h5')&&db.configs.payment?.[method==='支付宝支付'?'H5支付宝支付':method]!=='关闭';}
miniCheckout=function(){let html=legacy.miniCheckout();for(const method of ['微信支付','余额支付','支付宝支付'])if(!paymentAllowed(method))html=html.replace(`<option>${method}</option>`,'');const t=totals();html=html.replace('可减 '+currency(t.coupon?.amount),'可减 '+currency(t.discount||Math.min(t.coupon?.amount||0,t.subtotal)));return html;};
function allocateCents(amount,weights){
  const total=Math.round(money(amount)*100),sum=weights.reduce((a,n)=>a+n,0),out=weights.map(n=>sum?Math.floor(total*n/sum):0);let remaining=total-out.reduce((a,n)=>a+n,0);
  for(let i=0;remaining>0&&i<out.length;i++){if(weights[i]>0){out[i]++;remaining--;}}
  return out.map(n=>n/100);
}
submitOrder=function(e){
  e.preventDefault();const payment=new FormData(e.target).get('payment');if(!checkoutItems.length)return toast('订单已提交，请勿重复提交');if(!paymentAllowed(payment))return toast('该支付方式未启用，请选择其他方式');
  if(checkoutDelivery==='快递配送'&&!db.addresses.length)return toast('请添加收货地址');
  for(const i of checkoutItems){const p=db.products.find(p=>p.id===i.id);if(!p?.active||!Number.isInteger(i.qty)||i.qty<1||p.stock<i.qty||!Number.isFinite(i.price)||i.price<0)return toast('商品、数量或价格无效，请重新选择');}
  const t=totals(),group='PAY'+uid(),weights=checkoutItems.map(i=>!t.coupon?.product||i.id===t.coupon.product?i.price*i.qty:0),discounts=allocateCents(t.discount,weights),freights=allocateCents(t.shipping,checkoutItems.map(i=>product(i.id).type==='实物'?i.price*i.qty:0));
  const timeout=Math.max(1,Number(db.configs.payment?.['支付超时（分钟）']||30))*60000;
  checkoutItems.forEach((i,index)=>{const p=product(i.id);p.stock-=i.qty;db.orders.unshift({id:'MY'+uid(),group,name:db.userName,product:i.id,qty:i.qty,total:money(i.price*i.qty-discounts[index]+freights[index]),discount:discounts[index],freight:freights[index],status:'待支付',payment,delivery:p.type==='课程'?'线上交付':p.type==='服务券'?'到店自提':checkoutDelivery,store:'总部旗舰店',date:dateKey(),phone:'演示号码',address:db.addresses[0]?.address||'',trace:[],code:'YM'+String(uid()).slice(-8),couponId:t.discount?t.coupon.id:null,expiresAt:stamp()+timeout});});
  if(t.discount)t.coupon.reservedBy=group;if(checkoutSource==='cart')db.cart=[];checkoutItems=[];persist();miniOrderFilter='待支付';navigateMini('myorders','mine');openPayment(group);
};
function openPayment(group){const list=db.orders.filter(o=>o.group===group&&o.status==='待支付');if(!list.length)return toast('该订单已处理');modal('模拟支付确认',`<p>共 ${list.length} 件商品订单，应付 <b class="money">${currency(list.reduce((n,o)=>n+o.total,0))}</b></p><p>支付方式：${E(list[0].payment)}</p><p class="dialog-info">仅验证成功、失败与取消后的订单状态，不发生真实扣款。取消弹窗后可从“待支付”继续支付。</p>`,`<button onclick="cancelPayment('${group}')">取消订单</button><button onclick="completePayment('${group}',false)">模拟支付失败</button><button class="primary" onclick="completePayment('${group}',true)">模拟支付成功</button>`);}
function completePayment(group,ok){const list=db.orders.filter(o=>o.group===group&&o.status==='待支付');if(!list.length)return toast('订单已经处理');if(list.some(o=>stamp()>=o.expiresAt))return cancelPayment(group,'支付超时，订单已关闭');if(!ok){list.forEach(o=>o.paymentError='支付失败，可重试');persist();closeDialog();render();return toast('支付失败，订单保留在待支付，可重试或取消');}
  if(!paymentAllowed(list[0].payment))return toast('该支付方式现已关闭，请取消订单后重新选择');const total=money(list.reduce((n,o)=>n+o.total,0));if(list[0].payment==='余额支付'&&db.wallet<total)return toast('余额不足，请取消订单后充值或选择其他方式');if(list[0].payment==='余额支付')db.wallet=money(db.wallet-total);
  for(const o of list){o.status=o.delivery==='线上交付'?'已完成':o.delivery==='到店自提'?'待核销':'待发货';product(o.product).sold+=o.qty;o.trace.push({time:dateKey(),text:'模拟支付成功'});delete o.paymentError;}
  const coupon=db.coupons.find(c=>c.reservedBy===group);if(coupon){coupon.used=true;delete coupon.reservedBy;}
  log('模拟支付成功 '+group);closeDialog();miniOrderFilter='全部';render();toast('支付成功，后台订单与课程权限已同步（模拟）');
}
function cancelPayment(group,reason='订单已取消'){let n=0;for(const o of db.orders){if(o.group!==group||o.status!=='待支付')continue;product(o.product).stock+=o.qty;o.status='已取消';o.trace.push({time:dateKey(),text:reason});n++;}if(!n)return;const coupon=db.coupons.find(c=>c.reservedBy===group);if(coupon)delete coupon.reservedBy;persist();closeDialog();render();toast(reason);}
miniOrders=function(){let html=legacy.miniOrders();html=html.replace('<div class="mini-chip-row">',`<div class="mini-chip-row"><button class="${miniOrderFilter==='待支付'?'active':''}" onclick="miniOrderFilter='待支付';render()">待支付</button><button class="${miniOrderFilter==='已取消'?'active':''}" onclick="miniOrderFilter='已取消';render()">已取消</button>`);for(const o of db.orders.filter(o=>o.status==='待支付')){const anchor=`<button class="small" onclick="orderDetail('${o.id}')">详情</button>`;html=html.replace(anchor,`<button class="pinkbtn small" onclick="openPayment('${o.group}')">继续支付</button><button class="small" onclick="cancelPayment('${o.group}')">取消订单</button>${anchor}${o.paymentError?'<p class="danger">支付失败，可重试</p>':''}`);}return html;};
miniMine=function(){let html=legacy.miniMine();for(const [name,status]of [['待付款','待支付'],['待发货','待发货'],['待收货','已发货'],['待核销','待核销'],['退款售后','售后处理中']])html=html.replace(new RegExp(`onclick="navigateMini\\('myorders'\\)">([\\s\\S]*?<\\/svg>)${name}<\\/button>`),`onclick="miniOrderFilter='${status}';navigateMini('myorders')">$1${name}</button>`);return html;};
submitRefund=function(e,id){e.preventDefault();const o=db.orders.find(o=>o.id===id);if(!o||!['待发货','待核销','已发货','已完成'].includes(o.status))return toast('该订单不能重复申请退款');const f=new FormData(e.target);o.previousStatus=o.status;o.status='售后处理中';o.refundReason=String(f.get('reason')||'售后退款')+(f.get('note')?'：'+String(f.get('note')).slice(0,200):'');log('申请退款 '+id);closeDialog();render();toast('退款申请已提交');};
finishRefund=function(id,approved){const o=db.orders.find(o=>o.id===id);if(!o||o.status!=='售后处理中')return toast('申请已经处理');o.status=approved?'已退款':o.previousStatus;if(approved){if(o.payment==='余额支付')db.wallet=money(db.wallet+o.total);const p=product(o.product);if(['待发货','待核销'].includes(o.previousStatus))p.stock+=o.qty;else if(p.type==='实物')o.returnPending=true;p.sold=Math.max(0,p.sold-o.qty);o.trace.push({time:dateKey(),text:'退款退回'+o.payment+'（模拟）'});if(o.couponId&&db.orders.filter(x=>x.group===o.group).every(x=>x.status==='已退款')){const c=db.coupons.find(c=>c.id===o.couponId);if(c)c.used=false;}}log(approved?'退款审核通过':'拒绝退款申请');closeDialog();render();toast(approved?'退款完成；已发货实物需验收入库后恢复库存':'已恢复原订单状态');};
ordersPage=function(){let html=legacy.ordersPage();for(const o of db.orders.filter(o=>o.returnPending))html=html.replace(`<button class="link" onclick="orderDetail('${o.id}')">详情</button>`,`<button class="link" onclick="orderDetail('${o.id}')">详情</button><button class="link" onclick="receiveReturn('${o.id}')">退货验收入库</button>`);return html;};
function receiveReturn(id){const o=db.orders.find(o=>o.id===id);if(!o?.returnPending)return;modal('确认退货验收',`<p>确认已收到 ${E(product(o.product).name)} × ${o.qty}，且满足再次入库条件？</p>`,`<button onclick="closeDialog()">尚未收到</button><button class="primary" onclick="confirmReturn('${id}')">确认验收入库</button>`);}
function confirmReturn(id){const o=db.orders.find(o=>o.id===id);if(!o?.returnPending)return;o.returnPending=false;product(o.product).stock+=o.qty;o.trace.push({time:dateKey(),text:'退货验收入库（模拟）'});persist();closeDialog();render();toast('退货库存已恢复');}

function workflowTick(){
  let changed=false,redraw=false;const now=stamp(),c=db.capture;
  if(surface!=='pc'&&surface!=='capture'&&miniPage==='watch'&&mayWatch(room())&&isPlaying(room())){db.viewerVisits||={};db.viewerVisits[roomId]=(db.viewerVisits[roomId]||0)+1;changed=true;}
  if(c.status==='录制中'){seconds=captureDuration();for(const el of $$('[data-capture-time],#capture-time'))el.textContent=fmt(seconds);if($('#record-status'))$('#record-status').textContent='录制中 / '+fmt(seconds);if(now-(c.checkpointAt||0)>=3000){c.elapsed=seconds;c.startedAt=now;c.checkpointAt=now;changed=true;}}
  if($('#pairCountdown')&&db.pairing)$('#pairCountdown').textContent=now>=db.pairing.expiresAt?'已过期':fmt(Math.ceil((db.pairing.expiresAt-now)/1000));
  for(const job of db.ingestJobs){
    if(!['上传中','校验与转码中'].includes(job.status))continue;
    if(now-job.updatedAt<1000)continue;job.progress=Math.min(100,job.progress+10);job.updatedAt=now;job.status=job.progress<60?'上传中':'校验与转码中';changed=true;
    if(job.progress===100){
      if(!db.assets.some(a=>a.id===job.id))db.assets.unshift({id:job.id,name:job.name,duration:job.duration,source:job.source,date:dateKey(),status:'可用'});
      job.status='已归档';const r=db.rooms.find(r=>r.id===job.sourceRoom);if(r){r.asset=job.id;r.archiveJob=job.id;}redraw=true;
    }
    const bar=$(`[data-job-bar="${job.id}"]`),status=$(`[data-job-status="${job.id}"]`);if(bar)bar.style.width=job.progress+'%';if(status)status.innerHTML=badge(job.status);
  }
  for(const r of db.rooms){
    if(r.autoStart&&r.status==='待开播'&&now>=timeValue(r.time)){
      if(r.end&&now>=timeValue(r.end)){r.status='已结束';r.scheduleError='本地页面未在开播时运行，本场排期已过期';changed=redraw=true;}
      else if(startRoom(r,true)){changed=redraw=true;if(db.configs['remind'+r.id])db.notifications.unshift({title:r.name+' 已开播',channel:'站内通知',state:'已发送',audience:'预约用户'});}
    }
    if(r.status==='直播中'&&r.mode.startsWith('伪直播')){
      if(now>=(r.scheduleEndAt||Infinity)){r.status='已结束';r.endedAt=now;changed=redraw=true;}
    }
    if(!isPlaying(r))continue;
    const cursor=playbackTime(r);
    if(r.commentFollowLoop&&r.mode==='录播'){
      const timeline=db.comments.filter(item=>(!item.room||item.room===r.id)&&Number.isFinite(Number(item.at))).sort((a,b)=>a.at-b.at);
      let previous=Number.isFinite(r.commentLoopCursor)?r.commentLoopCursor:-1;
      if(cursor<previous){r.commentLoopCycle=(r.commentLoopCycle||0)+1;previous=-1;}
      for(const item of timeline){if(item.at>previous&&item.at<=cursor){writeLiveMessage(r,'system',item.text,`replay-comment:${r.id}:${r.commentLoopCycle||0}:${item.id}`,'回放评论');changed=true;}}
      r.commentLoopCursor=cursor;
    }
    for(const task of db.robotTasks.filter(item=>item.roomId===r.id&&item.active)){
      const t=db.robotTemplates.find(item=>item.id===Number(task.templateId))||getActiveRobotTemplate();
      const st=(db.scriptTemplates||defaultScriptTemplates).find(item=>item.name===t.scriptTemplate)||(db.scriptTemplates&&db.scriptTemplates[0])||defaultScriptTemplates[0];
      const lines=(st&&st.lines&&st.lines.length)?st.lines:(defaultScriptTemplates[0]?.lines||[]);
      if(!lines.length)continue;
      if(!Number.isFinite(task.nextAt)||now>=task.nextAt){
        const index=Number.isInteger(task.commentIndex)?task.commentIndex:0;
        if(index<lines.length||t.loop!==false){
          const text=lines[index%lines.length],author=getNextRobotUsername(t);
          writeLiveMessage(r,'viewer',text,null,author);
          const message=db.liveMessages.at(-1);if(message)message.robotTaskId=task.id;
          task.commentIndex=index+1;task.sentCount=(task.sentCount||0)+1;task.nextAt=now+nextRobotInterval(t)*1000;changed=true;
        }else{task.active=false;task.completedAt=now;changed=true;}
      }
    }
    if(r.autoCursor!==cursor){r.autoCursor=cursor;changed=true;}
    if(r.mode==='录播'||r.mode.startsWith('伪直播'))checkpointViewerPlayback(r,now);
  }
  for(const el of $$('[data-room-time]'))el.textContent=fmt(playbackTime(room()));
  paintViewerPlaybackControls(room());
  for(const group of new Set(db.orders.filter(o=>o.status==='待支付'&&now>=o.expiresAt).map(o=>o.group)))cancelPayment(group,'支付超时，订单已关闭');
  if(changed)persist();if(redraw)render();
}
render=function(){syncCapture();legacy.render();clearInterval(autoTimer);paintComments();try{if(typeof sessionStorage!=='undefined')sessionStorage.setItem('beautyViewV21',JSON.stringify({surface,page,miniPage,miniTab,roomId}));}catch{}};
resetDemo=function(){
  clearInterval(recordTimer);
  db=structuredClone(defaultState);
  db.scriptTemplates=structuredClone(defaultScriptTemplates);
  db.robotNames=[...defaultRobotNames];
  db.robotTemplates=structuredClone(defaultRobotTemplates);
  db.activeRobotTemplateId=1;
  db.comments=structuredClone(defaultPresetScripts);
  prepareState();
  roomId=1;surface='pc';page='overview';miniPage='watch';miniTab='live';checkoutItems=[];
  persist();closeDialog();render();toast('已恢复初始演示');
};
if(typeof window!=='undefined'){
  window.addEventListener('storage',e=>{if(e.key===storageKey&&e.newValue){try{const next=JSON.parse(e.newValue);if(!next?.rooms||!next?.products)return;db=next;prepareState();if(!$('#dialog').open)render();}catch{}}});
  window.addEventListener('pagehide',()=>{if(activeViewerPlaybackRoom!==null)pauseViewerPlayback(activeViewerPlaybackRoom);if(db.capture.status==='录制中'){db.capture.elapsed=captureDuration();db.capture.status='录制已中断';db.capture.connected=false;delete db.capture.startedAt;}for(const j of db.ingestJobs)if(['上传中','校验与转码中'].includes(j.status))j.status='已暂停';persist();});
  document.addEventListener('close',e=>{if(e.target.id==='dialog'){for(const p of Object.values(db.playback))p.playing=false;persist();}},true);
}
setInterval(workflowTick,1000);
try{if(typeof sessionStorage!=='undefined'){const v=JSON.parse(sessionStorage.getItem('beautyViewV21'));if(v&&['pc','mini','h5','capture'].includes(v.surface)&&db.rooms.some(r=>r.id===v.roomId)){surface=v.surface;page=nav.some(n=>n[0]===v.page)||v.page==='control'?v.page:'overview';miniPage=miniTitles[v.miniPage]?v.miniPage:'watch';miniTab=v.miniTab||'live';roomId=v.roomId;}}}catch{}
persist();render();

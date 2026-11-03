# Public reference audit

Audit date: 2026-10-19 (Asia/Shanghai).

This document describes the supplied public prototype and defines a practical Java replacement scope. It is evidence from downloaded public HTML, JavaScript and CSS; it is not a claim that the reference has production services behind its controls. Browser inspection is recorded separately in the delivery verification notes.

## Reference URLs

| Entry | URL | Initial content from a fresh browser state |
| --- | --- | --- |
| Real-time room | [Room 1](http://49.232.129.183/meiye/?view=mini&room=1&v=20261013-032957) | 美业经营课堂 · 门店盈利方案; mode 直播; status 直播中 |
| Replay room | [Room 3](http://49.232.129.183/meiye/?view=mini&room=3&v=20261013-032957) | 肩颈护理实操 · 精品回放; mode 录播; status 已结束 |
| Pseudo-live room | [Room 2](http://49.232.129.183/meiye/?view=mini&room=2&v=20261013-032957) | 美业门店经营 · 客户复购课程; mode 伪直播（录播播放）; status 待开播 |
| Admin | [Admin root](http://49.232.129.183/meiye/) | PC 直播后台 / 直播工作台 |

The three query URLs use the same application shell. `view=mini&room=N` selects the viewing surface and room. The root selects the PC workbench. The reference also exposes H5 and a simulated phone capture application as surface tabs. Local saved changes can alter the initial content on subsequent visits.

## What the public implementation actually does

- The page identifies itself as “交互原型 V2.2.9 · 业务模拟”.
- The application is a client-rendered prototype with shared objects in browser `localStorage` (`beautyCommerceV2`), view navigation in `sessionStorage`, and browser `storage` events for same-origin tab synchronization.
- The inspected JavaScript has no live service calls using `fetch`, XMLHttpRequest or WebSocket, and no camera acquisition through `navigator.mediaDevices`. The presence of a configuration form is not evidence that a service is connected.
- Room 1 uses `assets/live-still.png`, a static reference frame. The live badge and elapsed clock do not establish real streaming.
- Replay and pseudo-live use an HTML video element whose fallback is `assets/reference.mp4`. The preview text identifies that clip as a four-second reference video. A 28:05 or 42:18 label is seed business metadata, not the duration of that clip.
- Replay and pseudo-live progress is stored separately under `beautyViewerPlaybackV1`, keyed by browser instance, user name and room. Progress resumes after leaving and entering. Pseudo-live in this reference is personal playback from 00:00, not a shared broadcast position for every viewer.
- Automatic scheduling and ingest progress are advanced by a page timer. They require an open page; there is no evidenced background scheduler, media encoder or recorder.
- There is no authentication gate at the public admin root. “切换演示身份” only changes local prototype access checks.

Source evidence: `reference.html:1`; `app.js:31–38, 95, 112–116`; `flows.js:1–4, 18–43, 46–87, 130–177, 179–220, 314–352`; `live-room.js:13–22, 34–79, 160–164`. These are source positions in the downloaded reference, not files copied into the replacement application.

## Viewing UI and workflows

### Shared room appearance

A narrow phone frame is centered in a desktop preview, with guidance/navigation on the left and current-room details on the right. The phone has a white status bar and a full-height portrait teaching image/video beneath it. The room uses white text over a dark gradient, a translucent avatar/title pill in the upper left, a top-right mini-program capsule, entry count and complaint buttons, and a small mode label.

The lower interaction stack contains an independent system notice, a topic row (default “成交教练”), a notice that the host hides viewer nicknames, a clearly labeled gift example, and scrolling role-tagged comments. The system notice is independent from ordinary chat messages. The per-room interaction stack height is configurable from 28% to 62%, default 44%.

The fixed bottom row contains a comment input with emoji picker, product bag, video-connect button, gift button, share button and like button. Defaults are 4,544 example likes and 59 example shares; cumulative viewing entries start from local records and count re-entry rather than unique people. Clicking like animates hearts. Clear-screen mode hides interaction controls and exposes “恢复互动”.

### Room-specific behavior

| Room | Media and controls | Products | Important distinction |
| --- | --- | --- | --- |
| 1 real-time | Static teaching frame; live mode label; active local comments | Product 1, 2, 3 | No evidenced RTMP/HLS source, push pipeline or actual recording |
| 3 replay | Auto-starting reference video; pause/resume; timeline; playback rates 0.5, 0.75, 1, 1.25, 1.5, 2; progress saved per viewer | Product 3 | Label says 28:05 while the fallback clip is a four-second reference loop |
| 2 pseudo-live | Reference video begins on entry even with seed status 待开播 when its asset is available; label becomes 直播中; per-viewer elapsed progress | Product 4 | Independent viewer progress; scheduled start option is only a local-page timer |

Other public states include upcoming with reservation, ended without published replay, cancelled, paid-course access, and internal-student access. The latter two are prototype identity/order checks, not production authorization.

### Room action flows

| Action | Visible workflow | Reference persistence / limitation |
| --- | --- | --- |
| Comment | Enter text or choose emoji → submit → room feed and admin assistant | Local messages; limits, mute, moderation approval, hide and assistant reply are simulated state |
| Product bag | Bottom sheet → product → product detail → cart/buy → checkout → payment result | Local stock/order changes; never charges funds |
| Featured product | Admin chooses “开始讲解” → product card in viewer → “去看看” | Same local room/product object |
| Share | Mini-program share-card preview → click card reopens room; more menu also copies room URL | No native WeChat forwarding, no published mini-program |
| Gift | Choose flower / applause / 学习到了 → effect/toast | Explicit demo; no charge or true gift delivery |
| Video connect | Application sheet → demo feedback | Explicitly requires a real audio/video service |
| Complaint | Choose type and description → saved feedback → admin marks handled | Local report record |
| More menu | Share, link, clear screen, orders, products, personal center, coupons, points, invites | Secondary welfare/service and marketing entries |
| Coupon / check-in | Claim coupon, daily points, gift bag, customer-service sheet | Local demonstration state; no external delivery |

## Admin UI and workflows

The PC UI has a sticky white platform header, blue brand mark, 190px white sidebar, pale gray page background, white bordered cards, compact tables and blue primary actions. Base colors are blue `#3678ee`, ink `#252f40`, muted `#86909f`, background `#f3f5f8`, border `#e9edf3`, viewer commerce pink `#f3447b`. Fonts are Segoe UI / Microsoft YaHei / sans-serif. At narrow widths, navigation becomes horizontal and grids collapse.

The default workbench contains three mode cards; a phone-pairing strip; dark stage preview; room settings and start/end controls; four metric cards; upcoming replay/pseudo-live items; a comment/operator panel; recording/storage status; and live support tools. The public sidebar exposes the following modules:

| Module group | Public entries | Visible workflows |
| --- | --- | --- |
| Live/content | 直播工作台, 直播管理, 录制与素材, 直播助手 | Room create/edit, schedules, mode, source asset, permissions, goods association, start/end, replay publishing, notice/share-card editing, comments and scripts |
| Commerce | 商品管理, 订单管理, 会员管理 | Product CRUD/status/stock; local checkout; simulated payment success/failure/cancel and expiry; shipping, pickup verification, refund decisions; member balance/points |
| Marketing | 营销中心, 推广与分销 | Flash sale, group buy, bargain, distribution, coupons, check-in points, recharge, lottery; all configured and simulated locally |
| Operations | 门店与核销, 在线客服, 消息中心, 商城装修, 收款与提现, 物流与打印 | Store/pickup codes, local chat replies, simulated notices, home copy, configured payment channels, withdrawal approvals, logistics/print previews |
| System/data | 数据分析, 系统设置, PPT功能核对 | Example charts, local view counts, settings forms, logs, export/import/reset, and a claimed PPT coverage checklist |

The referenced PPT itself was not supplied. Labels such as “20 / 20” and PPT page numbers only describe the public prototype's own checklist and cannot establish completeness against a missing document.

Room create/edit fields include title (60 chars), mode, usable media, start/end, comment area height, permission, associated paid course, zero or more associated products, automatic recording and pseudo-live automatic start. The reference validates end after start and usable replay assets. A running non-live room cannot switch its media asset.

Media UI shows pairing code with five-minute expiry, room binding, record-only/record-and-live modes, recording interruption/reconnect, elapsed metadata and ingest tasks. Tasks progress upload → verification/transcode → archived, with pause/fail/retry. No actual captured/uploaded file or media transcoding was evidenced; selecting a local file only registers metadata in the original code.

## Seed content worth reproducing

| ID | Product | Type | Price | Initial stock |
| --- | --- | --- | --- | --- |
| 1 | 舒缓修护精华液 30ml | Physical | ¥159.00 | 268 |
| 2 | 水润保湿面膜 5片装 | Physical | ¥69.00 | 420 |
| 3 | 肩颈舒缓护理体验 60分钟 | Service voucher | ¥99.00 | 60 |
| 4 | 美业门店经营课 · 3节精品课程 | Course | ¥199.00 | 999 |

The default demo member is 美业体验用户, with balance ¥800, 120 points, ¥186.50 commission and 12 invites. Initial order examples include one ¥159 pending shipment and one ¥99 pending pickup verification. Initial assistant scripts occur at 15, 90 and 180 seconds. The reference's historical seed dates are examples and should not be represented as current business events.

## Java replacement scope matrix

The table below is a proposed implementation scope, not a claim that every reference submenu is already implemented. The delivered project's README and verification notes should state the actual coverage.

| Capability | Practical runnable Java scope | Requires external integration / unavailable evidence |
| --- | --- | --- |
| Three room URLs and admin root | Compatibility redirects and dedicated room/admin pages | None |
| Room configuration | Persistent server records for mode, schedule, status, title, notice, source URL, products and share text | Production content approval policies |
| Real-time viewing | Play configured compatible media URL; explicit placeholder when missing | Streaming provider, source URL, ingest key, CDN, recording webhooks |
| Replay | HTML5 controls, pause/seek/rate and saved browser progress for configured MP4 | Licensed real media and optional adaptive streaming |
| Pseudo-live | Clearly described prerecorded playback with configurable source and schedule; document independent vs shared progress semantics | Real broadcast scheduling/encoding requires media service |
| Admin workbench/list/control | Real server-backed room editing, start/end state, preview and current counts | Real online audience/concurrency analytics |
| Chat/moderation | Persistent room messages, post/refresh, hide/approve/mute where implemented | High-volume realtime chat infrastructure and actual identity |
| Product shelf | Persistent products and room associations; featured product and viewer detail | External catalog synchronization |
| Orders | Explicit demo checkout and persisted demo order transitions | Merchant accounts, payment/signature/webhook credentials, settlement |
| Media library | Metadata/source-URL records and usable status | Real phone app, upload storage, transcoding, recording pipeline |
| Coupons/check-in/reports | Small persistent demo workflows with clear labels | Campaign eligibility and operational fulfillment |
| Share/like/gift/connect | URL copy and native browser share where possible; clear previews | WeChat mini-program release/SDK, true gifts, audio/video calling |
| Secondary marketing/finance/logistics | Honest integration-status/configuration pages or bounded demo workflows | Logistics, printer, SMS, payment, refund, withdrawal and attribution services |
| Admin security | Configurable authenticated admin session for the Java application | Production SSO, multi-tenant roles and account provisioning |
| Persistence | Local file database or configured SQL database; no reliance on browser-only business records | Backups, managed database, deployment-specific credentials |
| Build/run | Java 21 + Spring Boot, reproducible Maven package/run instructions | No need to reproduce the original build stack |

## Unknowns and delivery boundaries

No production API specification, real stream source, push key, WeChat application identity, payment merchant identity, database, licensed full-duration course media, mobile capture app, original PPT or operational credentials were supplied. The public pages do not establish their existence. Real streaming, real payments/refunds/withdrawals, native mini-program share, video calling, actual camera capture, automatic encoding, third-party logistics and production concurrency targets must remain configurable integration points or explicitly labeled placeholders.

The replacement should be independently implemented from the observed screen structure, labels and workflows. Downloaded reference code is inspection material; it should not be transplanted wholesale as the Java application's business implementation.

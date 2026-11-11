# 直播间真实分享码接入（2026-11-02）

分享弹窗改为请求微信服务端生成小程序码。H5 二维码使用 ZXing 编码正式观看网址；图片下载保存接口返回的原图，不再绘制装饰码。移除了将网页预览描述为打开原生小程序的按钮。

## 服务器配置

| 环境变量 | 值或用途 |
| --- | --- |
| `WECHAT_APP_ID` | 默认 `wxb495cab07d4737c7`，应与实际发布小程序一致 |
| `WECHAT_APP_SECRET` | 该小程序后台的 AppSecret；仅在服务器配置，不放源码、前端或聊天中 |
| `WECHAT_ENV_VERSION` | 默认 `release`（正式版），也支持 `trial`、`develop` |
| `MEIYE_PUBLIC_WATCH_URL` | 默认 `https://voice.yourunshi.online/meiye/meiye/`，不含查询参数 |
| `MEIYE_PUBLIC_H5_ROOM_URL` | H5 分享观看页前缀，默认 `https://voice.yourunshi.online/meiye/share/rooms/`，后端会追加房间编号 |

把变量加到 meiye 应用已有的受限环境配置文件中，重启 meiye 服务后生效。不要改动 Qwen 服务配置。若微信返回 `40164`，在小程序后台的接口 IP 白名单添加应用服务器实际出口 IP。`41030` 表示正式版缺少指定页面，需要先发布观看页。

现有 Docker 部署还支持可选配置文件 `/app/data/wechat-share.properties`，对应宿主机 `/home/ubuntu/meiye-live/data/wechat-share.properties`。可在服务器运行 `bash /home/ubuntu/meiye-live/configure-wechat-share.sh`，按提示隐藏输入 AppSecret；脚本只允许操作已确认的 meiye 数据目录，以 600 权限保存文件并重启 meiye 容器。此文件含凭据，勿贴入聊天或提交源码。

`WECHAT_APP_SECRET` 与 COS SecretKey、微信支付密钥不同，不能互换。管理员登录后才允许调用生成接口；缺少凭据时显示提示，保存按钮保持禁用。

## 扫码路由及发布

微信接口：`POST https://api.weixin.qq.com/wxa/getwxacodeunlimit`。目标页为 `pages/watch-share/watch-share`，用 `scene=id=房间编号` 传参。小程序内从直播列表进入 `pages/watch/watch`，显示原生返回导航；分享卡片和管理端生成的小程序码进入独立的沉浸式页面，不显示原生左上角导航。正式版启用 `check_path`；服务端使用稳定版 access token，提前 120 秒更新，遇到 token 失效重试一次。每进程最多缓存 200 张真实码。

两个观看页共用后端读取逻辑。分享页支持 `scene` 和 `?id=编号` 参数。**正式版扫码提示“页面不存在”时，说明微信当前正式版还没有 `pages/watch-share/watch-share`；本地代码和服务器无法替已发布的小程序更新页面，必须在微信开发者工具上传并发布包含该页面的新版本，再重新生成小程序码。**旧码也要重新生成。

H5 二维码直达 `/meiye/share/rooms/{id}`，不经过 PC/小程序/H5 演示预览框。该页使用服务器数据库中的房间、播放源、封面和评论，支持录播循环播放与向同一评论流发送消息。小程序分享码仅携带房间编号，不会复制视频或评论数据。若所选房间未配置视频，观看页会明确提示。

## 接口与验收

- `GET /api/admin/share/rooms/{id}`：分享页面元信息。
- `GET /api/admin/share/rooms/{id}/miniprogram-code`：微信生成的 PNG/JPEG 图片。
- `GET /api/admin/share/rooms/{id}/h5-code`：真实 H5 PNG 二维码。
- 同时支持 `/meiye/api/admin/share/rooms/...` 别名。

验收时分别打开房间 1、3，生成并保存小程序码，使用微信扫码核对房间；新建但未同步到小程序的房间应提示尚未同步。再验证 H5 二维码、复制链接和下载图片。体验版或开发版还应验证当前扫码微信账号具有对应权限。

本地已验证 H5 图片能解码回精确的房间网址、鉴权和缺少密钥提示、微信请求参数、token 缓存与失效重试、上游错误脱敏，以及小程序扫码参数。微信真实生成、手机扫码与线上部署需服务器凭据和发布完成后验收。

2026-11-02 部署记录：已通过 `ubuntu` 登录正式服务器并更新 `meiye-live` Docker 容器。旧 JAR 和停机后的数据库备份位于 `/home/ubuntu/meiye-live/backups/share-20261102T025825Z`。上线前 94 项 Java 测试通过；`node src/test/js/share-routing.cjs` 通过。上线后通过现有管理员账号验证分享元信息、H5 图片响应和缺少微信密钥的 503 提示；公网页面与 JS 已加载 `20261102-real-share-v1`。服务器尚无 AppSecret，因此尚未验证微信真实生成和手机扫码。Qwen 容器未作修改。

微信文档：[获取小程序码](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/getUnlimitedQRCode.html)、[稳定版接口调用凭据](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-access-token/getStableAccessToken.html)。

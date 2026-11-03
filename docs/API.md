# API 与数据说明

业务数据保存在服务端 H2。时间戳使用 ISO-8601 UTC，界面按 Asia/Shanghai 显示；后台 `scheduledAt` 表单接收北京时间 `yyyy-MM-dd'T'HH:mm`。

| 方法与地址 | 行为 |
| --- | --- |
| GET `/api/rooms` | 场次列表 |
| GET `/api/rooms/{id}` | 配置、状态、媒体源可用性、点赞数 |
| GET `/api/rooms/{id}/playback` | `phase,offsetSeconds,startsAt,serverTime,source,mode,durationSeconds` |
| GET `/api/rooms/{id}/messages` | 最近 80 条消息，按时间正序 |
| POST `/api/rooms/{id}/messages` | `{author,content}`，201；昵称1–24字，正文1–300字 |
| POST `/api/rooms/{id}/like` | `{likes}`；数据库原子累加 |
| POST `/api/rooms/{id}/check-in` | `{points,message}`；当前会话、北京时间每日一次 |
| GET `/api/rooms/{id}/products` | 关联演示商品 |
| POST `/api/rooms/{id}/orders` | `{productId,buyer,phone,quantity,expectedUnitPrice?}`，201 |
| GET `/api/orders/{code}?phone=...` | 订单号与手机号必须同时匹配，否则404；手机号返回掩码 |

写请求均要求会话 CSRF token。前端从页面 meta `_csrf` 与 `_csrf_header` 读取 token 和请求头名，使用同一会话 cookie 提交。缺少 token 返回403。服务端校验、找不到数据、评论已关闭、触发频率限制分别返回400/404/409/429，错误 JSON 含 `message`。

昵称是匿名自填身份；不存在微信登录。基础限频按会话区分：留言1秒、点赞0.5秒、演示下单3秒，不是抗攻击或跨实例限流。订单数量1–20；金额使用服务端商品售价和 BigDecimal 计算，不接受客户端总价。`expectedUnitPrice` 是向后兼容的可选校验字段，观看端始终提交显示给用户的单价；若与当前商品价不同，返回409且不创建订单，要求重新选购确认。该字段不作为实际计价依据。订单号使用随机 UUID，状态始终是 `DEMO_PENDING`。

播放状态：草稿→WAITING；实时直播仅 LIVE 可播；已结束的录播仍可回看；伪直播在排期前 WAITING、排期中 PLAYING、超过配置时长 ENDED。应播放但没有源时返回 UNCONFIGURED。`PLAYING` 仅表示配置和时间条件允许，不证明媒体源连通；播放器仍须处理加载失败。

`status` 保留管理员配置的枚举；伪直播的 `statusLabel` 按当前排期计算“待开播 / 排期进行中 / 已结束”，不会把缺少媒体源标记成可播。播放时间规则与浏览器是否打开无关，按服务器当前时间实时计算。

管理员表单 POST `/admin/rooms`、`/admin/rooms/{id}/status`、`/admin/products`，使用 Spring Security 会话登录及 CSRF。没有开放公共商品改价或后台修改 API。

数据表：`live_rooms`、`room_products`、`chat_messages`、`demo_orders`。商品通过 roomId 关联，历史订单保存商品名和金额快照。当前没有库存扣减、订单支付状态机、消息审核、账号管理、数据库迁移版本或生产审计系统。

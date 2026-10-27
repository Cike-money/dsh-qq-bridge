# v0.1.0

第一个版本：把 QQ（NapCat）接到 DeepSeek Harness。

- 私聊 / 群聊消息递进 DSH 会话，回复按行发回 QQ
- 私聊带 [HH:MM]，群聊带 [HH:MM 昵称(QQ)]
- 群里默认只在 @、关键词、名单时递；到点自看可选
- 整句 SILENT 不发；多行拆气泡，间隔可配
- 断线重连、可选自动拉起 NapCat、干跑模式
- 配置全走 schema，默认值不含任何真实 QQ 号或 token

已知限制：只在 Windows 验证过；依赖 DSH 的会话服务把消息塞进会话；单账号。
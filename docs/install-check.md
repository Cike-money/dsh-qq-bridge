# 干净 profile 验收（给人点的一版）

前提：NapCat 已登录，HTTP 3000 / WS 3001 通。

1. 新建一个干净 profile（或另一台机器），不要在装好用的那个上试。
2. 打开插件页，从「压缩包」安装 `dsh-qq-bridge-0.1.0.tgz`，或者从市场装。
3. 完全退出 DSH 再打开（宿主只在启动时加载插件）。
4. 进 设置 → 插件 → 插件配置 → dsh-qq-bridge：
   - 填 `napcatHttp` / `napcatWs` / `napcatToken`
   - 填 `ownerQQ`（你自己的 QQ）
   - 想看全部群消息再把 `watchAllGroups` 打开
   - 第一次建议先把 `dryRun` 打开
5. 看日志：`<DSH home>/qq-bridge/bridge.log` 里应该有「dsh-qq-bridge 启动」。
6. 关掉 `dryRun`，重启，用另一个号私聊机器人，看会话里有没有 `[HH:MM] 内容`、QQ 里有没有回。
7. 群里发一句不带任何触发词的话：默认不该递；再 @ 一次，应该递。

验收不过时先看 bridge.log，把最后二十行贴出来。
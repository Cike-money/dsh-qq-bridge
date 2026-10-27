# 上架清单

上架入口是 awesome-dsh-plugin 仓库的列表（市场实时读它生成的 plugins.json），
不是 dshmarket 自己的仓库。

发布前：

1. `pnpm pack` 出 tarball，附件传到 GitHub Release（tag `v0.1.0`）。
2. 仓库 public，README 里有安装步骤和截图/示例配置。
3. 在 awesome-dsh-plugin 里提 PR，加一条（字段以对方仓库当前 README 为准）：
   - 名称：dsh-qq-bridge
   - 仓库：https://github.com/Cike-money/dsh-qq-bridge
   - 一句话：把 QQ（NapCat）接到 DeepSeek Harness
   - 关键词：qq、napcat、bridge
4. 等 CI 刷新 plugins.json（通常一天内），在市场里搜到即收录。

自检：

- [ ] 默认配置没有真实 QQ 号、token、绝对路径
- [ ] 干净 profile 里装完，重启后能连上 NapCat
- [ ] 私聊进得来、回得去
- [ ] README 照着做能复现
## PR 正文（把 <用户名> 换掉）

```
加一条：dsh-qq-bridge

把 QQ（NapCat）接到 DeepSeek Harness 的桥插件：私聊/群聊消息递进会话，
回复按行发回 QQ。默认只回主人，群里只在 @、关键词、名单时递；支持到点自看、
断线重连、干跑；配置全走 schema，默认值不含任何真实 QQ 号或 token。

仓库：https://github.com/Cike-money/dsh-qq-bridge
许可：MIT
```
## 仓库介绍（About 栏）

一句话（中文）：

```
把 QQ（NapCat）接到 DeepSeek Harness：私聊和群聊消息递进会话，回复发回 QQ；默认只回主人，群里只在被点名时接。
```

一句话（英文）：

```
Bridge QQ (via NapCat) into DeepSeek Harness: messages become session prompts and replies go back to QQ.
```

Topics（仓库设置里填）：

```
dsh  dsh-plugin  deepseek-harness  qq  napcat  cordis  chatbot
```
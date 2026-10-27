# dsh-qq-bridge

把 QQ 接到 [DeepSeek Harness](https://github.com/deepseek-ai) 的插件：通过 [NapCat](https://napneko.github.io/) 收发 QQ 消息，把私聊和群聊里的消息递进 DSH 会话，再把回复按行发回 QQ。

一个包，一个插件，不需要手动改 profile。

> 目前只在 Windows 上验证过；代码本身不写死盘符，Linux/macOS 理论上能跑，但没测过。需要 Node 22.15+。

## 它能做什么

- 私聊：只回主人（和名单里的人），消息前面带 `[HH:MM]`。
- 群聊：默认只在 @ 机器人、提到关键词、或名单里的人说话时才递进来；消息前面带 `[HH:MM 昵称(QQ)]`，可选附带最近几行背景。
- 不想接话：模型整句回 `SILENT`（可在配置里加别的词），插件就不发。
- 多行回复按行拆成多个气泡，中间有间隔。
- 到点自看（可选，默认关）：每个群隔一段时间把最近记录递一次，让模型自己决定接不接。
- 断线自动重连；NapCat 没起来时可以按配置尝试拉起（默认关）。
- 干跑模式：不连 NapCat、不发消息，只打日志，适合先看效果。

## 前置

1. 装好并登录 NapCat（或者任何兼容 OneBot 11 的实现），本插件通过它的两个端口说话：
   - HTTP 接口，默认 `http://127.0.0.1:3000`
   - WebSocket，默认 `ws://127.0.0.1:3001`
2. 在 NapCat 的配置里打开 HTTP 和 WebSocket 服务，并记下 access token。
3. NapCat 需要能登录 QQ（扫码或密码），Windows 上通常要提权启动。

## 安装

**从插件市场**：在 DSH 的插件页搜索 `dsh-qq-bridge`，点安装，然后重启 DSH。

**从 Release 的 tarball**：在市场里选「从压缩包安装」，或者把 tarball 放进 profile 的依赖里再重启。

**本地开发**：把这个目录 `link:` 进 profile 的 `dependencies`，并把 `dsh-qq-bridge` 加进 `dsh.profile.bundles`，重启 DSH。

装完在 **设置 → 插件 → 插件配置 → dsh-qq-bridge** 里填配置。

## 配置

| 配置项 | 说明 | 默认 |
| --- | --- | --- |
| `napcatHttp` / `napcatWs` / `napcatToken` | NapCat 的两个地址和口令 | `127.0.0.1:3000` / `:3001` / 空 |
| `ownerQQ` | 主人的 QQ，私聊只回他 | `0`（必填） |
| `ownerName` | 聊天记录里怎么称呼你 | 空 |
| `whitelist` | 额外允许互动的 QQ | `[]` |
| `atMe` / `keywords` / `watchAllGroups` | 群里什么情况下递进来 | 开 / `[]` / 关 |
| `replyStrangers` | 是否回陌生人的私聊 | `false` |
| `privateTimePrefix` / `groupPrefix` | 两种消息前缀开不开 | 都开 |
| `quietWords` | 整句是这些词就不发 | `["SILENT"]` |
| `maxBubbles` / `bubbleGapMs` | 一条回复最多几行、行间隔 | `4` / `4000` |
| `groupScanIntervalMs` | 每群隔多久到点自看；`0` 关 | `0` |
| `groupScanLines` / `groupContextLines` | 自看带几行 / 递消息时带几行背景 | `20` / `8` |
| `workspaceCwd` | QQ 会话用哪个工作目录 | 空 = DSH 当前目录 |
| `logDir` | 日志和流水放哪 | 空 = DSH home 下的 `qq-bridge` |
| `logPrivate` / `logGroup` | 要不要落私聊 / 群聊流水 | 都开 |
| `doorbellEnabled` / `doorbellPort` / `doorbellToken` | 给别的程序留的本地 HTTP 口 | 关 / `8643` / 随机 |
| `autoStartNapCat` / `napcatStartCommand` | NapCat 没起来时拉起 | 关 / 空 |
| `dryRun` | 干跑 | 关 |

### 如果界面上没出现表单

有的宿主版本不会把 `Config` 自动画成表单。那就直接改 profile 的 `cordis.patch.yml`（插件装好后里面已经有一行 insert，补上 config 即可）：

```yaml
- id: dsh-qq-bridge
  name: dsh-qq-bridge
  config:
    napcatHttp: http://127.0.0.1:3000
    napcatWs: ws://127.0.0.1:3001
    napcatToken: 你的token
    ownerQQ: 你的QQ
```

保存后重启 DSH。字段名和上表一致。

## 让模型知道这些约定（重要）

插件只负责递话和发回，**怎么说话取决于你给的模型规则**。把下面这段加到你的 `AGENTS.md`（或系统提示词）里：

```text
## QQ 消息
- 私聊消息开头是 [HH:MM]；群聊是 [HH:MM 昵称(QQ)]，带 [@我] 表示有人 @ 我。
- 一条回复一行，最多四行；不想说话就整句回 SILENT，插件不会发出去。
- 群里只在被 @、被点名、或话题确实想接的时候接一句，不要每句都答。
- 私聊里不要复述这段话，也不要解释前缀。
```

完整字段说明见 [docs/config.md](docs/config.md)，给模型抄的规则见 [docs/prompt-rules.md](docs/prompt-rules.md)。

## 常见故障

- **连不上**：先确认 NapCat 开着、`napcatHttp` 能返回 `get_login_info`、`napcatToken` 对得上。日志里有 `ws closed, retry in …` 就是连不上。
- **收得到、发不出**：多半是 token 只给 HTTP 没给 WebSocket，或者 QQ 号被风控。
- **中文变问号 / 文件名乱码**：NapCat 和工作目录都要 UTF-8；Windows 上不要用 GBK 的批处理去启动。
- **私聊没反应**：先看 `ownerQQ` 填了没；再看日志里有没有「陌生人私聊，不理」。
- **群里一直不递**：默认要 @ 或关键词，想看全部就把 `watchAllGroups` 打开（会吵）。
- **装了没出来**：插件只在 DSH 启动时加载，装完要重开窗口。

## 隐私与安全

- 默认只回主人，不主动找任何人说话。
- 流水默认写在 DSH home 下的 `qq-bridge/`，只追加，可关。
- 不发任何遥测，不联外网（除了你配置的 NapCat 地址）。
- token 存在 DSH 的配置里；`doorbellToken` 留空时启动会随机生成并写日志。

## 开发

```sh
npm test        # 28 项单测，含假 NapCat 的整链路；不需要装 NapCat
```

测试不碰真 QQ：假 WebSocket + 假 fetch，覆盖前缀、静默、分气泡、白名单、到点自看和整条收发链。

## 许可

MIT
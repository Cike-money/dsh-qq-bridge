# 配置参考

插件装好后，配置有两种落法：

- 宿主能画表单：在 设置 → 插件 → 插件配置 → dsh-qq-bridge 里填。
- 宿主不画表单（有些版本不会自动渲染 schema）：直接改 profile 的 `cordis.patch.yml`。

```yaml
- id: dsh-qq-bridge
  name: dsh-qq-bridge
  config:
    napcatHttp: http://127.0.0.1:3000
    napcatWs: ws://127.0.0.1:3001
    napcatToken: 你的token
    ownerQQ: 123456
    ownerName: 老板
    keywords: [小满]
    whitelist: [10001]
    groupScanIntervalMs: 1800000
```

改完重启 DSH（宿主只在启动时读配置）。

## 连接

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `napcatHttp` | `http://127.0.0.1:3000` | NapCat 的 HTTP 接口 |
| `napcatWs` | `ws://127.0.0.1:3001` | NapCat 的 WebSocket |
| `napcatToken` | 空 | NapCat 配置里的 token，HTTP 和 WS 都要对 |

## 谁能说话

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `ownerQQ` | `0` | 主人的 QQ。私聊只回他；群里他也算白名单 |
| `ownerName` | 空 | 流水里怎么称呼他（「老板」「爸爸」随你） |
| `whitelist` | `[]` | 额外允许的 QQ 号 |
| `replyStrangers` | `false` | 打开后陌生私聊也接 |

群里什么时候递进来：

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `atMe` | `true` | 有人 @ 机器人就递 |
| `keywords` | `[]` | 话里带这些词就递（比如机器人的名字） |
| `watchAllGroups` | `false` | 每条群消息都递（会吵，调试用） |

## 消息长什么样

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `privateTimePrefix` | `true` | 私聊加 `[HH:MM]` |
| `groupPrefix` | `true` | 群聊加 `[HH:MM 昵称(QQ)]` |
| `quietWords` | `["SILENT"]` | 整句是这些词就不发 |
| `maxBubbles` | `4` | 一条回复最多拆几行 |
| `bubbleGapMs` | `4000` | 行与行之间的间隔 |
| `turnTimeoutMs` | `600000` | 一轮最多等多久 |

## 群里的背景和自看

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `groupContextLines` | `8` | 递消息时附带最近几行群聊流水；`0` 关 |
| `groupScanIntervalMs` | `0` | 每群隔多久把最近记录递一次；`0` 关 |
| `groupScanLines` | `20` | 自看带几行 |

## 落盘

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `logDir` | 空 | 空 = `<DSH home>/qq-bridge` |
| `logPrivate` / `logGroup` | `true` | 按天写 `private-YYYY-MM-DD.md` / `group-YYYY-MM-DD.md` |

流水一行一句，只追加；标题里的时间是本地时间。

## 进阶

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `workspaceCwd` | 空 | QQ 会话用哪个工作目录；空 = DSH 当前目录 |
| `doorbellEnabled` | `false` | 开一个本地 HTTP 口给别的程序递话 |
| `doorbellPort` / `doorbellToken` | `8643` / 空 | 上面那个口；口令空着启动时随机生成并写日志 |
| `autoStartNapCat` / `napcatStartCommand` | 关 / 空 | NapCat 没起来时按命令拉起（Windows 计划任务之类） |
| `dryRun` | `false` | 只打日志，不发消息；排障先开这个 |

## 常见组合

**只想在群里被 @ 时回**：`atMe: true`、`keywords: []`、`watchAllGroups: false`。

**想让机器人自己盯着群**：`groupScanIntervalMs: 1800000`（半小时），`groupContextLines: 8`。

**先看它会不会乱说话**：`dryRun: true`，看 `<logDir>/bridge.log` 里「干跑：不发送」。
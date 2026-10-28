import Schema from '@deepseek-ai/schemastery'

// 全部配置都在这里，界面上按这个 schema 出表单。
// 默认值一律留空或占位，不写任何真实 QQ 号、token、盘符。
export const Config = Schema.object({
  napcatHttp: Schema.string().default('http://127.0.0.1:3000').description('NapCat 的 HTTP 接口地址（NapCat 默认端口，没改过就不用动）'),
  napcatWs: Schema.string().default('ws://127.0.0.1:3001').description('NapCat 的 WebSocket 地址（NapCat 默认端口，没改过就不用动）'),
  napcatToken: Schema.string().default('').description('NapCat 的 access token（NapCat 配置里的 token）'),

  ownerQQ: Schema.number().default(0).description('主人的 QQ 号：私聊只回他，群里他也算白名单'),
  ownerName: Schema.string().default('').description('插件称呼你的名字，留空就不带称呼'),
  whitelist: Schema.array(Schema.number()).default([]).description('额外允许互动的 QQ 号'),

  atMe: Schema.boolean().default(true).description('群里 @ 机器人时递进来'),
  keywords: Schema.array(Schema.string()).default([]).description('群里提到这些词时递进来（可留空）'),
  watchAllGroups: Schema.boolean().default(false).description('群里每条消息都递进来（默认关，交给我自己判断）'),
  replyStrangers: Schema.boolean().default(false).description('允许回陌生人的私聊（默认只回主人和名单）'),

  privateTimePrefix: Schema.boolean().default(true).description('私聊消息前面带 [HH:MM]'),
  groupPrefix: Schema.boolean().default(true).description('群消息前面带 [HH:MM 昵称(QQ)]'),
  quietWords: Schema.array(Schema.string()).default(['SILENT']).description('整句是这些词就不发出去'),

  maxBubbles: Schema.number().default(4).description('一条回复最多拆成几行'),
  bubbleGapMs: Schema.number().default(4000).description('多行之间的间隔（毫秒）'),
  turnTimeoutMs: Schema.number().default(600000).description('一轮最多等多久（毫秒）'),

  groupScanIntervalMs: Schema.number().default(0).description('每群隔多久把最近记录递给我一次；0 = 关'),
  groupScanLines: Schema.number().default(20).description('到点自看带多少行'),
  groupContextLines: Schema.number().default(8).description('群里递消息时附带最近多少行背景；0 = 不带'),

  workspaceCwd: Schema.string().default('').description('给 QQ 会话用的工作目录，留空用 DSH 当前目录'),
  logDir: Schema.string().default('').description('日志和流水放哪，留空放 DSH home 下的 qq-bridge'),
  logPrivate: Schema.boolean().default(true).description('把私聊流水按天写到 logDir'),
  logGroup: Schema.boolean().default(true).description('把群聊流水按天写到 logDir'),

  doorbellEnabled: Schema.boolean().default(false).description('开一个本地 HTTP 口，别的程序也能往会话里递话'),
  doorbellPort: Schema.number().default(0).description('上面的端口；0 = 每次启动随机挑一个空闲端口'),
  doorbellToken: Schema.string().default('').description('上面的口令，留空则启动时随机生成'),

  napcatDir: Schema.string().default('').description('NapCat 装在哪；留空就在几个常见位置里找'),
  autoStartNapCat: Schema.boolean().default(true).description('NapCat 没起来时自动找出来并拉起'),
  napcatStartCommand: Schema.string().default('').description('自定义拉起命令，留空用 napcat 默认启动方式'),

  dryRun: Schema.boolean().default(false).description('干跑：不连真 NapCat、不发消息，只打日志'),
})
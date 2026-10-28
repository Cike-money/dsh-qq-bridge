import { randomBytes } from 'node:crypto'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { Config } from './config.js'
import { createGateway } from './gateway.js'
import { createRouter } from './router.js'
import { createBridge } from './bridge.js'
import { createDoorbell } from './doorbell.js'
import { createLog } from './log.js'

export const name = 'dsh-qq-bridge'
export { Config }

/**
 * 插件入口：门铃（可选）和桥合成一份。
 * 消息从 NapCat 进来 → 拼好正文塞进 DSH 会话 → 等一轮跑完 → 把回复按行发回 QQ。
 */
export function apply(ctx, rawConfig) {
  const config = Config(rawConfig ?? {})
  // 地址留空就按 NapCat 默认端口补上，保证大多数人装完能直接连
  if (!config.napcatHttp) config.napcatHttp = 'http://127.0.0.1:3000'
  if (!config.napcatWs) config.napcatWs = 'ws://127.0.0.1:3001'
  const home = resolveHome(ctx)
  const logDir = config.logDir || home
  const log = createLog(logDir)

  const gateway = createGateway({
    ctx,
    cwd: config.workspaceCwd || process.cwd(),
    statePath: join(logDir, 'sessions.json'),
    timeoutMs: Number(config.turnTimeoutMs ?? 600000),
    log,
  })

  const bridge = createBridge({ config, log })
  const router = createRouter({
    config,
    ask: (key, text) => gateway.prompt(key, text),
    send: (message) => bridge.send(message),
    forget: async (key) => gateway.forget(key),
    log,
  })
  bridge.setRouter(router)

  let doorbell
  if (config.doorbellEnabled === true) {
    const token = config.doorbellToken || randomBytes(12).toString('hex')
    doorbell = createDoorbell({
      port: Number(config.doorbellPort) > 0 ? Number(config.doorbellPort) : 20000 + Math.floor(Math.random() * 10000),
      token,
      prompt: (key, text) => gateway.prompt(key, text),
      forget: async (key) => gateway.forget(key),
      log,
    })
    log('doorbell 已开，口令', token)
  }

  const hints = []
  if (!Number(config.ownerQQ)) hints.push('ownerQQ 没填，私聊一律不回')
  if (!config.napcatToken) hints.push('napcatToken 空着：NapCat 没设口令就不用管，设了鉴权才需要填')
  if (!config.workspaceCwd) hints.push('workspaceCwd 没填，QQ 会话用 DSH 当前目录')
  if (hints.length) log('配置提醒：', hints.join('；'))

  log('dsh-qq-bridge 启动', config.dryRun ? '(干跑)' : '')
  void bridge.start().catch((err) => log('启动失败', err?.message ?? err))

  return () => {
    try {
      doorbell?.close()
    } catch {}
    bridge.stop()
    log('桥已停')
  }
}

/** 日志默认落在 DSH 的 home 下，拿不到就退回 ~/.dsh/qq-bridge */
function resolveHome(ctx) {
  try {
    const p = ctx.get('dshHomePath')
    if (typeof p === 'function') {
      const dir = p('qq-bridge')
      if (dir) return dir
    }
    if (typeof p === 'string' && p) return join(p, 'qq-bridge')
  } catch {}
  return join(homedir(), '.dsh', 'qq-bridge')
}
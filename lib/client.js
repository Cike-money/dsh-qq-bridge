// dsh-qq-bridge 的浏览器半侧：在插件页给这个组合包注册一个配置表单。
// 直接按宿主的模块加载格式写，不引入打包器。
window.__ModuleLoader__.load({
  id: 'dsh-qq-bridge',
  factory: (require) => {
    const { jsx, jsxs } = require('react/jsx-runtime')
    const React = require('react')

    const NS = 'qqBridge'
    const zh = {
      title: 'QQ 桥',
      description: '把 QQ（NapCat）接到 DeepSeek Harness：改完保存，桥会按新配置重启。',
      save: '保存',
      saving: '保存中…',
      saved: '已保存',
      failed: '没保存成功，值已保留，改一下再试',
      loading: '读取配置中…',
      readOnly: '这个部署的配置是只读的',
      empty: '留空表示用默认值',
      firstRun: '第一次用：先把 NapCat 装好（没装去它的官网下），插件会自己找到并拉起它，扫码登录后自动连上；然后在这里填主人 QQ。要填 token 的话（在 NapCat 的配置里，onebot/HTTP 那一段）；地址没改过就保持默认。',
      tokenMissing: 'NapCat 设了口令才需要填这格，没设就留空。',
      napcatTitle: '还没装 NapCat？',
      napcatSteps: '这个插件不带 NapCat。先去官网下载 Windows 版，装好并开一次，让它把自己的配置生成出来；然后回到这页保存，插件会自己找到它、拉起来，扫码登录完就自动连上。',
      napcatButton: '打开 NapCat 官网',
    }
    const en = {
      title: 'QQ bridge',
      description: 'Bridge QQ (NapCat) into DeepSeek Harness. Saving restarts the bridge with the new config.',
      save: 'Save',
      saving: 'Saving…',
      saved: 'Saved',
      failed: 'Not saved. Your values are kept — adjust and retry.',
      loading: 'Loading configuration…',
      readOnly: 'Configuration is read-only in this deployment',
      empty: 'Leave blank to use the default',
      firstRun: 'First run: install NapCat first — the plugin finds and launches it, then connects after you scan the QR code. Paste the token from your NapCat config (the onebot/HTTP section). Keep the default address unless you changed NapCat ports.',
      tokenMissing: 'Fill this only if your NapCat requires a token.',
      napcatTitle: 'NapCat not installed yet?',
      napcatSteps: 'This plugin does not ship NapCat. Download the Windows build from the official site, run it once so it writes its config, then come back and save this page — the plugin will find it, start it, and connect after you scan the QR code.',
      napcatButton: 'Open the NapCat site',
    }

    const FIELDS = [
      { key: 'napcatHttp', label: 'NapCat HTTP 地址', type: 'text', placeholder: 'NapCat 默认端口，没改过就不用动' },
      { key: 'napcatWs', label: 'NapCat WebSocket 地址', type: 'text', placeholder: 'NapCat 默认端口，没改过就不用动' },
      { key: 'napcatToken', label: 'NapCat Token（NapCat 没设口令就留空）', type: 'password' },
      { key: 'ownerQQ', label: '主人 QQ', type: 'number' },
      { key: 'ownerName', label: '怎么称呼你', type: 'text' },
      { key: 'whitelist', label: '额外白名单 QQ（逗号分隔）', type: 'numbers' },
      { key: 'keywords', label: '群里提到的关键词（逗号分隔）', type: 'strings' },
      { key: 'atMe', label: '群里 @ 机器人时递进来', type: 'boolean' },
      { key: 'watchAllGroups', label: '群里每条消息都递进来（调试用，会吵）', type: 'boolean' },
      { key: 'replyStrangers', label: '回陌生人的私聊', type: 'boolean' },
      { key: 'privateTimePrefix', label: '私聊前面带 [HH:MM]', type: 'boolean' },
      { key: 'groupPrefix', label: '群聊前面带 [HH:MM 昵称(QQ)]', type: 'boolean' },
      { key: 'quietWords', label: '静默词（逗号分隔），整句是这个就不发', type: 'strings' },
      { key: 'maxBubbles', label: '一条回复最多拆几行', type: 'number' },
      { key: 'bubbleGapMs', label: '气泡间隔（毫秒）', type: 'number' },
      { key: 'groupScanIntervalMs', label: '到点自看间隔（毫秒，0 = 关）', type: 'number' },
      { key: 'groupContextLines', label: '群里递消息时附带几行背景', type: 'number' },
      { key: 'workspaceCwd', label: 'QQ 会话的工作目录', type: 'text', placeholder: '留空 = DSH 当前目录' },
      { key: 'logDir', label: '日志目录', type: 'text', placeholder: '留空 = DSH home 下的 qq-bridge' },
      { key: 'napcatDir', label: 'NapCat 装在哪（留空自动找）', type: 'text', placeholder: '留空就在几个常见位置里找' },
      { key: 'autoStartNapCat', label: 'NapCat 没开时自动找出来并拉起', type: 'boolean' },
      { key: 'logPrivate', label: '记私聊流水', type: 'boolean' },
      { key: 'logGroup', label: '记群聊流水', type: 'boolean' },
      { key: 'dryRun', label: '干跑：只记日志不发送', type: 'boolean' },
    ]

    /** 把界面上的草稿转成保存时要提交的值 */
    function toValue(type, raw) {
      if (type === 'boolean') return Boolean(raw)
      if (type === 'number') {
        if (raw === '' || raw === null || raw === undefined) return undefined
        const n = Number(raw)
        return Number.isFinite(n) ? n : undefined
      }
      if (type === 'numbers') {
        return String(raw ?? '')
          .split(/[,，\s]+/)
          .filter(Boolean)
          .map(Number)
          .filter((n) => Number.isFinite(n))
      }
      if (type === 'strings') {
        return String(raw ?? '')
          .split(/[,，]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      }
      return String(raw ?? '')
    }

    /** 从已接受的配置里取某个字段，展示成人能看的样子 */
    function fromValue(type, value) {
      if (type === 'boolean') return value === true
      if (type === 'numbers' || type === 'strings') return Array.isArray(value) ? value.join(', ') : ''
      if (type === 'number') return value === undefined || value === null ? '' : String(value)
      return typeof value === 'string' ? value : ''
    }

    function fieldStyle() {
      return {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        marginBottom: '14px',
        fontSize: '13px',
      }
    }

    const inputStyle = {
      padding: '6px 8px',
      borderRadius: '6px',
      border: '1px solid rgba(128,128,128,0.35)',
      background: 'transparent',
      color: 'inherit',
      fontSize: '13px',
      width: '100%',
      boxSizing: 'border-box',
    }

    /**
     * 配置页：读 ctx.configForms 的共享快照，本地攒草稿，点保存一次性提交。
     */
    function ConfigPage({ t }) {
      const form = React.useContext(FormContext)
      if (!form) return jsx('div', { style: { padding: '16px' }, children: '这个部署没有提供配置表单服务' })
      const snapshot = React.useSyncExternalStore((listener) => form.subscribe(listener), () => form.getSnapshot())
      const [draft, setDraft] = React.useState(null)
      const [status, setStatus] = React.useState('idle')

      const value = snapshot?.value ?? {}
      React.useEffect(() => {
        const next = {}
        for (const field of FIELDS) next[field.key] = fromValue(field.type, value[field.key])
        setDraft(next)
        setStatus('idle')
      }, [snapshot?.revision])

      if (!draft) return jsx('div', { style: { padding: '16px' }, children: t('loading') })
      if (snapshot?.status === 'error') return jsx('div', { style: { padding: '16px' }, children: t('failed') })
      if (snapshot && snapshot.writable === false) {
        return jsx('div', { style: { padding: '16px' }, children: t('readOnly') })
      }

      async function save() {
        setStatus('saving')
        const ops = []
        for (const field of FIELDS) {
          const before = fromValue(field.type, value[field.key])
          if (String(draft[field.key] ?? '') === String(before ?? '')) continue
          const next = toValue(field.type, draft[field.key])
          if (next === undefined) continue
          ops.push({ op: 'set', path: [field.key], value: next })
        }
        if (!ops.length) {
          setStatus('saved')
          return
        }
        try {
          const ok = await form.mutate(ops, snapshot.revision)
          setStatus(ok ? 'saved' : 'failed')
        } catch {
          setStatus('failed')
        }
      }

      return jsxs('div', {
        style: { padding: '16px', maxWidth: '640px' },
        children: [
          jsx('div', { style: { fontSize: '13px', opacity: 0.7, marginBottom: '10px' }, children: t('description') }),
          jsx('div', {
            style: {
              fontSize: '12px',
              lineHeight: '1.6',
              padding: '10px 12px',
              marginBottom: '16px',
              borderRadius: '6px',
              background: 'rgba(128,128,128,0.12)',
            },
            children: t('firstRun'),
          }),
          ...FIELDS.map((field) => {
            if (field.type === 'boolean') {
              return jsxs('label', {
                key: field.key,
                style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '13px' },
                children: [
                  jsx('input', {
                    type: 'checkbox',
                    checked: Boolean(draft[field.key]),
                    disabled: status === 'saving',
                    onChange: (event) => setDraft({ ...draft, [field.key]: event.target.checked }),
                  }),
                  jsx('span', { children: field.label }),
                ],
              })
            }
            return jsxs('label', {
              key: field.key,
              style: fieldStyle(),
              children: [
                jsx('span', { children: field.label }),
                jsx('input', {
                  type: field.type === 'password' ? 'password' : 'text',
                  style: inputStyle,
                  placeholder: field.placeholder ?? t('empty'),
                  value: draft[field.key] ?? '',
                  disabled: status === 'saving',
                  onChange: (event) => setDraft({ ...draft, [field.key]: event.target.value }),
                }),
              ],
            })
          }),
          jsxs('div', {
            style: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' },
            children: [
              jsx('button', {
                type: 'button',
                disabled: status === 'saving',
                onClick: save,
                style: {
                  padding: '6px 18px',
                  borderRadius: '6px',
                  border: '1px solid rgba(128,128,128,0.35)',
                  background: 'rgba(80,120,255,0.18)',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: '13px',
                },
                children: status === 'saving' ? t('saving') : t('save'),
              }),
              jsx('span', {
                style: { fontSize: '12px', opacity: 0.7 },
                children: status === 'saved' ? t('saved') : status === 'failed' ? t('failed') : '',
              }),
              !String(draft.napcatToken ?? '').trim()
                ? jsx('span', { style: { fontSize: '12px', color: '#d98c00' }, children: t('tokenMissing') })
                : null,
            ],
          }),
        ],
      })
    }

    const FormContext = React.createContext(null)

    function apply(ctx) {
      const t = ctx.locale.bind(NS)
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-qq-bridge: dictionaries')

      let form
      try {
        form = ctx.configForms.get('dsh-qq-bridge')
      } catch {
        form = null
      }
      const Page = (props) => jsx(FormContext.Provider, { value: form, children: jsx(ConfigPage, { ...props, t }) })

      ctx.effect(
        () =>
          ctx.slots.inject('plugins.bundle.config', () =>
            ctx.slots.register(
              {
                name: 'plugins.bundle.config',
                key: 'dsh-qq-bridge',
                locale: NS,
              },
              Page,
            ),
          ),
        'dsh-qq-bridge: config page',
      )
    }

    const inject = ['slots', 'locale', 'configForms']
    return { NS, apply, inject }
  },
})
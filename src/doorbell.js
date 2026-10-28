import http from 'node:http'

/**
 * 可选的本地 HTTP 口：让别的程序也能往 DSH 会话里递一句话。
 * 默认关（config.doorbellEnabled），口令为空时由外面随机生成。
 */
export function createDoorbell({ port, token, prompt, forget, log = () => {} }) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    const auth = req.headers['x-doorbell-token'] ?? url.searchParams.get('token')
    const json = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(body))
    }
    if (url.pathname === '/health') return json(200, { ok: true })
    if (!token || auth !== token) return json(401, { ok: false, error: 'token 不对' })
    if (req.method !== 'POST') return json(404, { ok: false, error: '只有 POST' })

    let raw = ''
    for await (const chunk of req) {
      raw += chunk
      if (raw.length > 1_000_000) {
        req.destroy()
        return
      }
    }
    let body = {}
    try {
      body = JSON.parse(raw || '{}')
    } catch {
      return json(400, { ok: false, error: '身子不是 JSON' })
    }
    const key = String(body?.key ?? '').trim()
    if (!key) return json(400, { ok: false, error: 'key 空着' })

    try {
      if (url.pathname === '/prompt') {
        const text = String(body?.text ?? '')
        if (!text) return json(400, { ok: false, error: 'text 空着' })
        return json(200, await prompt(key, text))
      }
      if (url.pathname === '/forget') {
        const dropped = await forget(key)
        log('forget', key, dropped ?? '(none)')
        return json(200, { ok: true, dropped: dropped ?? null })
      }
      return json(404, { ok: false, error: '没有这个口子' })
    } catch (err) {
      log('doorbell 出错', err?.message ?? err)
      return json(500, { ok: false, error: err?.message ?? String(err) })
    }
  })
  server.on('error', (err) => log('doorbell 起不来（端口可能被占用），这次先不开', err?.message))
  server.listen(port, '127.0.0.1', () => log('doorbell listening on', port))
  return { close: () => server.close() }
}
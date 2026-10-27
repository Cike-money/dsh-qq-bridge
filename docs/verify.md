# 打包自检记录（2026-10-27）

在一台没有 DSH 的临时目录里，用 pnpm 从 tarball 装了一遍：

```
$ pnpm install   # 依赖 file:../dsh-qq-bridge/dsh-qq-bridge-0.1.0.tgz
+ dsh-qq-bridge 0.1.0
node_modules/@deepseek-ai: schemastery, cordis, cosmokit   # peer 依赖自动装上了
```

然后 `import { apply, Config } from 'dsh-qq-bridge'`：

- `Config({})` 返回默认值：napcatHttp=http://127.0.0.1:3000、ownerQQ=0、whitelist=[]、quietWords=["SILENT"]、dryRun=false
- `apply(假 ctx, { dryRun: true })` 正常启动、写日志、干净退出
- 全仓 `npm test`：28 项全过（格式化、路由、日志、会话网关、入口、假 NapCat 整链路）

没验到的两件（要真 DSH 才能验）：

- 插件配置页会不会把 Config 渲成表单
- 宿主会不会把 sessionController / workspaceRegistry 给第三方插件

注意：U 盘是 exFAT，pnpm 默认的符号链接装法会失败（EISDIR），
在 U 盘上装要加 `--node-linker=hoisted`；正常 profile 在 C 盘没这个问题。
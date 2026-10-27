// 只在测试里把宿主提供的 @deepseek-ai/schemastery 指到替身，别处不受影响。
import { registerHooks } from 'node:module'

const stub = new URL('../support/schemastery-stub.mjs', import.meta.url).href

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@deepseek-ai/schemastery') return { url: stub, shortCircuit: true }
    return nextResolve(specifier, context)
  },
})
// 测试用的 schemastery 替身：只实现 config.js 用到的那几个方法。
// 真跑时由 DSH 宿主提供 @deepseek-ai/schemastery。
function make(kind, meta = {}) {
  const node = {
    kind,
    meta,
    default(value) {
      return make(kind, { ...meta, defaultValue: value })
    },
    description(text) {
      return make(kind, { ...meta, description: text })
    },
  }
  return node
}

function Schema() {}

Schema.string = () => make('string')
Schema.number = () => make('number')
Schema.boolean = () => make('boolean')
Schema.array = (inner) => make('array', { inner })
Schema.object = (shape) => {
  const schema = (input = {}) => {
    const out = {}
    for (const [key, node] of Object.entries(shape)) {
      out[key] = input[key] !== undefined ? input[key] : node?.meta?.defaultValue
    }
    return out
  }
  schema.shape = shape
  return schema
}

export default Schema
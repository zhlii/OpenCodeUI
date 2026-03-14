// ============================================
// App Constants - 应用级常量
// ============================================

const DEFAULT_APP_NAME = 'OpenCode'

function getConfigValue(key: string): string | undefined {
  const value = window.__APP_CONFIG__?.[key]
  if (typeof value === 'string' && value !== `__${key}__`) return value
  return undefined
}

/** 应用名称，运行时通过 window.__APP_CONFIG__.APP_NAME 注入 */
export const APP_NAME = getConfigValue('APP_NAME') || DEFAULT_APP_NAME

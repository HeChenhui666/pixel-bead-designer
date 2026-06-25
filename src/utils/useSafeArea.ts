import { ref } from 'vue'

const safeTop = ref(0)
const safeBottom = ref(0)
let initialized = false

/**
 * 获取安全距离（H5 + 小程序通用）
 * 首次调用时从系统信息初始化，后续直接返回缓存值
 */
export function useSafeArea() {
  if (!initialized) {
    const sysInfo = uni.getSystemInfoSync()
    safeTop.value = sysInfo.statusBarHeight || 0
    safeBottom.value = sysInfo.safeAreaInsets?.bottom || 0
    initialized = true
  }
  return { safeTop, safeBottom }
}

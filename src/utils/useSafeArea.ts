import { ref } from 'vue'

const safeTop = ref(0)
const safeBottom = ref(0)
// 小程序右上角胶囊按钮的左边缘距屏幕右侧的距离，用于 header 右侧留白
const capsuleRight = ref(0)
// 胶囊按钮底部距页面顶部的距离（含状态栏），用于确保 header 高度不遮挡胶囊
const capsuleBottom = ref(0)

let initialized = false

export function useSafeArea() {
  if (!initialized) {
    const sysInfo = uni.getSystemInfoSync()
    safeTop.value = sysInfo.statusBarHeight || 0
    safeBottom.value = sysInfo.safeAreaInsets?.bottom || 0

    // #ifdef MP-WEIXIN
    try {
      const menuInfo = uni.getMenuButtonBoundingClientRect()
      const windowWidth = sysInfo.windowWidth || sysInfo.screenWidth || 375
      capsuleRight.value = windowWidth - menuInfo.left + 8
      capsuleBottom.value = menuInfo.bottom + 8
    } catch {}
    // #endif

    initialized = true
  }
  return { safeTop, safeBottom, capsuleRight, capsuleBottom }
}

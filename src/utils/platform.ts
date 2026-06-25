export type Platform = 'mp-weixin' | 'h5'

export function getPlatform(): Platform {
  // #ifdef MP-WEIXIN
  return 'mp-weixin'
  // #endif
  // #ifdef H5
  return 'h5'
  // #endif
}

/**
 * 获取屏幕可用宽度（减去左右 padding）
 */
export function getAvailableWidth(paddingPx: number = 32): number {
  // #ifdef H5
  return window.innerWidth - paddingPx
  // #endif
  // #ifdef MP-WEIXIN
  const sysInfo = uni.getSystemInfoSync()
  return sysInfo.windowWidth - paddingPx
  // #endif
}

/**
 * 获取设备像素比
 */
export function getDevicePixelRatio(): number {
  // #ifdef H5
  return window.devicePixelRatio || 1
  // #endif
  // #ifdef MP-WEIXIN
  const sysInfo = uni.getSystemInfoSync()
  return sysInfo.pixelRatio || 1
  // #endif
}

/**
 * 保存图片到相册
 */
export function saveImageToAlbum(tempPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath: tempPath,
      success: () => resolve(),
      fail: (err: any) => reject(err),
    })
  })
}

/**
 * 将 Canvas 导出为临时图片路径
 */
export function canvasToTempFilePath(canvasId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvasId,
      success: (res: any) => resolve(res.tempFilePath),
      fail: (err: any) => reject(err),
    })
  })
}

/**
 * 显示 Toast 提示
 */
export function showToast(title: string, icon: 'success' | 'none' | 'error' = 'none'): void {
  uni.showToast({ title, icon, duration: 2000 })
}

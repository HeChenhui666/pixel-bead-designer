// export-helper.ts — 导出工具函数（三端兼容）

export interface ExportOptions {
  cellData: string[][]
  gridWidth: number
  gridHeight: number
  cellPixelSize?: number
  /** hex → 色号 映射，传入后会在每个格子上绘制色号 */
  colorCodeMap?: Record<string, string>
  /** 是否显示每5格加粗辅助线 */
  showGuideLines?: boolean
}

export interface LongImageOptions extends ExportOptions {
  colorSummary: Array<{ hex: string; code: string; count: number }>
  paletteId: string
}

const DEFAULT_EXPORT_CELL_SIZE = 40

/**
 * H5 端：离屏 Canvas 绘制网格并导出 PNG 下载
 */
function renderGridToCanvas(
  cellData: string[][],
  gridWidth: number,
  gridHeight: number,
  cellSize: number,
  colorCodeMap?: Record<string, string>,
  showGuideLines?: boolean
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const totalWidth = gridWidth * cellSize
  const totalHeight = gridHeight * cellSize
  canvas.width = totalWidth
  canvas.height = totalHeight
  const ctx = canvas.getContext('2d')!

  // Pass 1: 色块
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const hex = cellData[y]?.[x]
      ctx.fillStyle = hex || '#FAFAFA'
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
    }
  }

  // Pass 2: 网格线
  ctx.strokeStyle = '#E8E8E8'
  ctx.lineWidth = 1
  for (let x = 0; x <= gridWidth; x++) {
    ctx.beginPath()
    ctx.moveTo(x * cellSize, 0)
    ctx.lineTo(x * cellSize, totalHeight)
    ctx.stroke()
  }
  for (let y = 0; y <= gridHeight; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * cellSize)
    ctx.lineTo(totalWidth, y * cellSize)
    ctx.stroke()
  }

  // Pass 2.5: 每5格加粗辅助线
  if (showGuideLines) {
    ctx.strokeStyle = '#999999'
    ctx.lineWidth = 2
    // 竖线：每5列
    for (let x = 0; x <= gridWidth; x += 5) {
      ctx.beginPath()
      ctx.moveTo(x * cellSize, 0)
      ctx.lineTo(x * cellSize, totalHeight)
      ctx.stroke()
    }
    // 横线：每5行
    for (let y = 0; y <= gridHeight; y += 5) {
      ctx.beginPath()
      ctx.moveTo(0, y * cellSize)
      ctx.lineTo(totalWidth, y * cellSize)
      ctx.stroke()
    }
  }

  // Pass 3: 色号标注
  // Pass 3: 色号标注
  if (colorCodeMap && Object.keys(colorCodeMap).length > 0) {
    const fontSize = Math.max(9, Math.min(cellSize * 0.35, 14))
    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const hex = cellData[y]?.[x]
        if (!hex) continue
        const code = colorCodeMap[hex]
        if (!code) continue

        // 根据背景色亮度选择文字颜色
        const brightness = getBrightness(hex)
        ctx.fillStyle = brightness > 160 ? '#000000' : '#FFFFFF'

        const centerX = x * cellSize + cellSize / 2
        const centerY = y * cellSize + cellSize / 2
        ctx.fillText(code, centerX, centerY)
      }
    }
  }

  return canvas
}

/** 计算颜色亮度（0-255），用于决定文字颜色 */
function getBrightness(hex: string): number {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000
}

/**
 * 导出网格 PNG（H5 端下载，App/小程序端保存到相册）
 */
export async function exportGridPNG(options: ExportOptions): Promise<string> {
  const { cellData, gridWidth, gridHeight, cellPixelSize = DEFAULT_EXPORT_CELL_SIZE, colorCodeMap, showGuideLines } = options

  // #ifdef H5
  const canvas = renderGridToCanvas(cellData, gridWidth, gridHeight, cellPixelSize, colorCodeMap, showGuideLines)
  const dataUrl = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.download = `bead-grid-${gridWidth}x${gridHeight}.png`
  link.href = dataUrl
  link.click()
  return dataUrl
  // #endif

  // #ifndef H5
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvasId: 'gridCanvas',
      fileType: 'png',
      quality: 1,
      success: (res: any) => {
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            uni.showToast({ title: '已保存到相册', icon: 'success' })
            resolve(res.tempFilePath)
          },
          fail: (err: any) => {
            uni.showToast({ title: '保存失败', icon: 'none' })
            reject(err)
          },
        })
      },
      fail: (err: any) => {
        uni.showToast({ title: '导出失败', icon: 'none' })
        reject(err)
      },
    })
  })
  // #endif
}

/**
 * 生成长图预览（仅 H5 端返回 dataUrl，不触发下载）
 */
export function generateLongImagePreview(options: LongImageOptions): string {
  const { cellData, gridWidth, gridHeight, colorSummary, cellPixelSize = DEFAULT_EXPORT_CELL_SIZE, colorCodeMap, showGuideLines } = options
  const padding = 40
  const gap = 30
  const swatchSize = 28
  const itemGap = 16
  const rowHeight = 36
  const gridTotalWidth = gridWidth * cellPixelSize
  const totalWidth = gridTotalWidth + padding * 2
  const gridTotalHeight = gridHeight * cellPixelSize

  const availableWidth = totalWidth - padding * 2
  const itemWidth = swatchSize + 8 + 60
  const itemsPerRow = Math.max(1, Math.floor((availableWidth + itemGap) / (itemWidth + itemGap)))
  const colorRows = Math.ceil(colorSummary.length / itemsPerRow)
  const colorTableHeight = colorRows * rowHeight
  const totalHeight = padding + gridTotalHeight + gap + colorTableHeight + padding

  // #ifdef H5
  const canvas = document.createElement('canvas')
  canvas.width = totalWidth
  canvas.height = totalHeight
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, totalWidth, totalHeight)

  const gridCanvas = renderGridToCanvas(cellData, gridWidth, gridHeight, cellPixelSize, colorCodeMap, showGuideLines)
  ctx.drawImage(gridCanvas, padding, padding)

  ctx.font = 'bold 14px sans-serif'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#AAAAAA'
  ctx.fillText(options.paletteId, padding, padding + gridTotalHeight + 6)

  const tableTop = padding + gridTotalHeight + gap
  ctx.font = '13px sans-serif'
  ctx.textBaseline = 'middle'

  for (let i = 0; i < colorSummary.length; i++) {
    const col = i % itemsPerRow
    const row = Math.floor(i / itemsPerRow)
    const itemX = padding + col * (itemWidth + itemGap)
    const itemY = tableTop + row * rowHeight

    ctx.fillStyle = colorSummary[i].hex
    ctx.fillRect(itemX, itemY + (rowHeight - swatchSize) / 2, swatchSize, swatchSize)

    ctx.fillStyle = '#333333'
    ctx.fillText(
      `${colorSummary[i].code} ×${colorSummary[i].count}`,
      itemX + swatchSize + 8,
      itemY + rowHeight / 2
    )
  }

  return canvas.toDataURL('image/png')
  // #endif

  // #ifndef H5
  // App/小程序端：使用离屏 Canvas 绘制长图预览，返回临时文件路径
  return new Promise<string>((resolve) => {
    try {
      const offscreen = (uni as any).createOffscreenCanvas({ type: '2d', width: totalWidth, height: totalHeight })
      if (!offscreen) { resolve(''); return }
      const ctx = offscreen.getContext('2d')

      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, totalWidth, totalHeight)

      // 绘制图纸区域
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          const hex = cellData[y]?.[x]
          ctx.fillStyle = hex || '#FAFAFA'
          ctx.fillRect(padding + x * cellPixelSize, padding + y * cellPixelSize, cellPixelSize, cellPixelSize)
        }
      }

      // 网格线
      if (cellPixelSize >= 2) {
        ctx.strokeStyle = '#E8E8E8'
        ctx.lineWidth = 1
        for (let x = 0; x <= gridWidth; x++) {
          ctx.beginPath()
          ctx.moveTo(padding + x * cellPixelSize, padding)
          ctx.lineTo(padding + x * cellPixelSize, padding + gridTotalHeight)
          ctx.stroke()
        }
        for (let y = 0; y <= gridHeight; y++) {
          ctx.beginPath()
          ctx.moveTo(padding, padding + y * cellPixelSize)
          ctx.lineTo(padding + gridTotalWidth, padding + y * cellPixelSize)
          ctx.stroke()
        }
      }

      // 每5格加粗辅助线
      if (showGuideLines && cellPixelSize >= 2) {
        ctx.strokeStyle = '#999999'
        ctx.lineWidth = 2
        for (let x = 0; x <= gridWidth; x += 5) {
          ctx.beginPath()
          ctx.moveTo(padding + x * cellPixelSize, padding)
          ctx.lineTo(padding + x * cellPixelSize, padding + gridTotalHeight)
          ctx.stroke()
        }
        for (let y = 0; y <= gridHeight; y += 5) {
          ctx.beginPath()
          ctx.moveTo(padding, padding + y * cellPixelSize)
          ctx.lineTo(padding + gridTotalWidth, padding + y * cellPixelSize)
          ctx.stroke()
        }
      }

      // 色号标注
      if (colorCodeMap && cellPixelSize >= 16) {
        ctx.font = `${Math.max(8, Math.floor(cellPixelSize / 3))}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        for (let y = 0; y < gridHeight; y++) {
          for (let x = 0; x < gridWidth; x++) {
            const hex = cellData[y]?.[x]
            if (hex && colorCodeMap[hex]) {
              const brightness = getBrightness(hex)
              ctx.fillStyle = brightness > 160 ? '#000000' : '#FFFFFF'
              ctx.fillText(colorCodeMap[hex], padding + x * cellPixelSize + cellPixelSize / 2, padding + y * cellPixelSize + cellPixelSize / 2)
            }
          }
        }
      }

      // 品牌标识
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#AAAAAA'
      ctx.fillText(options.paletteId, padding, padding + gridTotalHeight + 6)

      // 配色表
      const tableTop = padding + gridTotalHeight + gap
      ctx.font = '13px sans-serif'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < colorSummary.length; i++) {
        const col = i % itemsPerRow
        const row = Math.floor(i / itemsPerRow)
        const itemX = padding + col * (itemWidth + itemGap)
        const itemY = tableTop + row * rowHeight
        ctx.fillStyle = colorSummary[i].hex
        ctx.fillRect(itemX, itemY + (rowHeight - swatchSize) / 2, swatchSize, swatchSize)
        ctx.fillStyle = '#333333'
        ctx.fillText(`${colorSummary[i].code} ×${colorSummary[i].count}`, itemX + swatchSize + 8, itemY + rowHeight / 2)
      }

      uni.canvasToTempFilePath({
        canvas: offscreen,
        fileType: 'png',
        success: (res) => resolve(res.tempFilePath),
        fail: () => resolve(''),
      })
    } catch (_e) {
      resolve('')
    }
  }) as unknown as string
  // #endif
}

/**
 * 导出长图（图纸 + 配色表拼接）
 */
export async function exportLongImage(options: LongImageOptions): Promise<string> {
  const { cellData, gridWidth, gridHeight, colorSummary, cellPixelSize = DEFAULT_EXPORT_CELL_SIZE, colorCodeMap, showGuideLines } = options
  const padding = 40
  const gap = 30
  const swatchSize = 28
  const itemGap = 16
  const rowHeight = 36
  const gridTotalWidth = gridWidth * cellPixelSize
  const totalWidth = gridTotalWidth + padding * 2
  const gridTotalHeight = gridHeight * cellPixelSize

  // 横向布局：计算每行能放多少个色卡
  const availableWidth = totalWidth - padding * 2
  const itemWidth = swatchSize + 8 + 60 // 色块 + 间距 + 文字预估宽度
  const itemsPerRow = Math.max(1, Math.floor((availableWidth + itemGap) / (itemWidth + itemGap)))
  const colorRows = Math.ceil(colorSummary.length / itemsPerRow)
  const colorTableHeight = colorRows * rowHeight
  const totalHeight = padding + gridTotalHeight + gap + colorTableHeight + padding

  // #ifdef H5
  const canvas = document.createElement('canvas')
  canvas.width = totalWidth
  canvas.height = totalHeight
  const ctx = canvas.getContext('2d')!

  // 白色背景
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, totalWidth, totalHeight)

  // 绘制图纸区域（带色号标注）
  const gridCanvas = renderGridToCanvas(cellData, gridWidth, gridHeight, cellPixelSize, colorCodeMap, showGuideLines)
  ctx.drawImage(gridCanvas, padding, padding)

  // 绘制品牌标识
  ctx.font = 'bold 14px sans-serif'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#AAAAAA'
  ctx.fillText(options.paletteId, padding, padding + gridTotalHeight + 6)

  // 绘制配色表（横向布局）
  const tableTop = padding + gridTotalHeight + gap
  ctx.font = '13px sans-serif'
  ctx.textBaseline = 'middle'

  for (let i = 0; i < colorSummary.length; i++) {
    const col = i % itemsPerRow
    const row = Math.floor(i / itemsPerRow)
    const itemX = padding + col * (itemWidth + itemGap)
    const itemY = tableTop + row * rowHeight

    // 色块
    ctx.fillStyle = colorSummary[i].hex
    ctx.fillRect(itemX, itemY + (rowHeight - swatchSize) / 2, swatchSize, swatchSize)

    // 色号 + 数量
    ctx.fillStyle = '#333333'
    ctx.fillText(
      `${colorSummary[i].code} ×${colorSummary[i].count}`,
      itemX + swatchSize + 8,
      itemY + rowHeight / 2
    )
  }

  const dataUrl = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.download = `bead-long-${gridWidth}x${gridHeight}.png`
  link.href = dataUrl
  link.click()
  return dataUrl
  // #endif

  // #ifndef H5
  // App/小程序端：使用离屏 Canvas 绘制完整长图
  return new Promise<string>((resolve) => {
    try {
      const offscreen = (uni as any).createOffscreenCanvas({ type: '2d', width: totalWidth, height: totalHeight })
      if (!offscreen) {
        resolve('')
        return
      }
      const ctx = offscreen.getContext('2d')

      // 白色背景
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, totalWidth, totalHeight)

      // 绘制图纸区域
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          const hex = cellData[y]?.[x]
          ctx.fillStyle = hex || '#FAFAFA'
          ctx.fillRect(padding + x * cellPixelSize, padding + y * cellPixelSize, cellPixelSize, cellPixelSize)
        }
      }

      // 网格线
      if (cellPixelSize >= 2) {
        ctx.strokeStyle = '#E8E8E8'
        ctx.lineWidth = 1
        for (let x = 0; x <= gridWidth; x++) {
          ctx.beginPath()
          ctx.moveTo(padding + x * cellPixelSize, padding)
          ctx.lineTo(padding + x * cellPixelSize, padding + gridTotalHeight)
          ctx.stroke()
        }
        for (let y = 0; y <= gridHeight; y++) {
          ctx.beginPath()
          ctx.moveTo(padding, padding + y * cellPixelSize)
          ctx.lineTo(padding + gridTotalWidth, padding + y * cellPixelSize)
          ctx.stroke()
        }
      }

      // 每5格加粗辅助线
      if (showGuideLines && cellPixelSize >= 2) {
        ctx.strokeStyle = '#999999'
        ctx.lineWidth = 2
        for (let x = 0; x <= gridWidth; x += 5) {
          ctx.beginPath()
          ctx.moveTo(padding + x * cellPixelSize, padding)
          ctx.lineTo(padding + x * cellPixelSize, padding + gridTotalHeight)
          ctx.stroke()
        }
        for (let y = 0; y <= gridHeight; y += 5) {
          ctx.beginPath()
          ctx.moveTo(padding, padding + y * cellPixelSize)
          ctx.lineTo(padding + gridTotalWidth, padding + y * cellPixelSize)
          ctx.stroke()
        }
      }

      // 色号标注
      if (colorCodeMap && cellPixelSize >= 16) {
        ctx.font = `${Math.max(8, Math.floor(cellPixelSize / 3))}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        for (let y = 0; y < gridHeight; y++) {
          for (let x = 0; x < gridWidth; x++) {
            const hex = cellData[y]?.[x]
            if (hex && colorCodeMap[hex]) {
              const brightness = getBrightness(hex)
              ctx.fillStyle = brightness > 160 ? '#000000' : '#FFFFFF'
              ctx.fillText(
                colorCodeMap[hex],
                padding + x * cellPixelSize + cellPixelSize / 2,
                padding + y * cellPixelSize + cellPixelSize / 2
              )
            }
          }
        }
      }

      // 品牌标识
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#AAAAAA'
      ctx.fillText(options.paletteId, padding, padding + gridTotalHeight + 6)

      // 配色表（横向布局）
      const tableTop = padding + gridTotalHeight + gap
      ctx.font = '13px sans-serif'
      ctx.textBaseline = 'middle'

      for (let i = 0; i < colorSummary.length; i++) {
        const col = i % itemsPerRow
        const row = Math.floor(i / itemsPerRow)
        const itemX = padding + col * (itemWidth + itemGap)
        const itemY = tableTop + row * rowHeight

        // 色块
        ctx.fillStyle = colorSummary[i].hex
        ctx.fillRect(itemX, itemY + (rowHeight - swatchSize) / 2, swatchSize, swatchSize)

        // 色号 + 数量
        ctx.fillStyle = '#333333'
        ctx.fillText(
          `${colorSummary[i].code} ×${colorSummary[i].count}`,
          itemX + swatchSize + 8,
          itemY + rowHeight / 2
        )
      }

      // 导出为临时文件路径
      uni.canvasToTempFilePath({
        canvas: offscreen,
        fileType: 'png',
        success: (res) => resolve(res.tempFilePath),
        fail: () => resolve(''),
      })
    } catch (_e) {
      resolve('')
    }
  })
  // #endif
}

/**
 * 分享图片
 */
export async function shareImage(filePath: string, title?: string): Promise<void> {
  // #ifdef MP-WEIXIN
  uni.showToast({ title: '请使用右上角分享', icon: 'none' })
  // #endif

  // #ifdef H5
  try {
    const response = await fetch(filePath)
    const blob = await response.blob()
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ])
    uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
  } catch {
    uni.showToast({ title: '复制失败，请手动保存', icon: 'none' })
  }
  // #endif
}

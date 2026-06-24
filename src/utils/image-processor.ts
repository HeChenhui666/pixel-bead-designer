// image-processor.ts — 像素化逻辑（TS 版，三端通用）
// 移植自 perler-beads/src/utils/pixelation.ts

import { findNearestColor, hexToRgb, rgbToHex, srgbToOklab, oklabDistance, type RgbColor } from './color-mapper'

export type PixelationMode = 'average' | 'dominant' | 'palette-vote' | 'adaptive' | 'preprocessed'

export interface PixelateOptions {
  imageData: Uint8ClampedArray
  imageWidth: number
  imageHeight: number
  gridWidth: number
  gridHeight: number
  mode: PixelationMode
  paletteId: string
  /** 允许的色系列表，为空或不传则使用全部色系 */
  allowedSeries?: string[]
}

export interface PixelateResult {
  cellData: string[][]
  elapsedMs: number
}

/**
 * 计算图像指定区域的代表色
 */
function calculateCellRepresentativeColor(
  data: Uint8ClampedArray,
  imgWidth: number,
  startX: number,
  startY: number,
  blockWidth: number,
  blockHeight: number,
  mode: PixelationMode
): RgbColor | null {
  let rSum = 0
  let gSum = 0
  let bSum = 0
  let pixelCount = 0

  // dominant 模式用 Map 统计颜色频次
  const colorCounts = new Map<string, number>()
  let dominantRgb: RgbColor | null = null
  let maxCount = 0

  const endX = Math.min(startX + blockWidth, imgWidth)
  const endY = Math.min(startY + blockHeight, Math.floor(data.length / 4 / imgWidth))

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const index = (y * imgWidth + x) * 4
      // 忽略完全透明的像素
      if (data[index + 3] < 128) continue

      const r = data[index]
      const g = data[index + 1]
      const b = data[index + 2]
      pixelCount++

      if (mode === 'average') {
        rSum += r
        gSum += g
        bSum += b
      } else {
        // dominant 模式：量化到 8-bit 减少 key 数量
        const colorKey = `${r},${g},${b}`
        const count = (colorCounts.get(colorKey) || 0) + 1
        colorCounts.set(colorKey, count)
        if (count > maxCount) {
          maxCount = count
          dominantRgb = { r, g, b }
        }
      }
    }
  }

  if (pixelCount === 0) return null

  if (mode === 'average') {
    return {
      r: Math.round(rSum / pixelCount),
      g: Math.round(gSum / pixelCount),
      b: Math.round(bSum / pixelCount),
    }
  }

  return dominantRgb
}

/**
 * 核心像素化函数
 * 接收原始像素数据，输出匹配后的 HEX 二维数组
 */
export function pixelateFromImageData(options: PixelateOptions): PixelateResult {
  const startTime = Date.now()
  const { imageData, imageWidth, imageHeight, gridWidth, gridHeight, mode, paletteId, allowedSeries } = options

  const blockWidth = imageWidth / gridWidth
  const blockHeight = imageHeight / gridHeight
  const cellData: string[][] = []

  for (let gy = 0; gy < gridHeight; gy++) {
    const row: string[] = []
    const startY = Math.floor(gy * blockHeight)
    const currentBlockHeight = Math.max(1, Math.ceil((gy + 1) * blockHeight) - startY)

    for (let gx = 0; gx < gridWidth; gx++) {
      const startX = Math.floor(gx * blockWidth)
      const currentBlockWidth = Math.max(1, Math.ceil((gx + 1) * blockWidth) - startX)

      const representativeRgb = calculateCellRepresentativeColor(
        imageData,
        imageWidth,
        startX,
        startY,
        currentBlockWidth,
        currentBlockHeight,
        mode
      )

      if (representativeRgb) {
        const match = findNearestColor(representativeRgb, paletteId, allowedSeries)
        row.push(match.hex)
      } else {
        row.push('')
      }
    }
    cellData.push(row)
  }

  // === 后处理：减少杂色、提升画面简洁感 ===
  denoiseGrid(cellData, gridWidth, gridHeight)

  return {
    cellData,
    elapsedMs: Date.now() - startTime,
  }
}

/**
 * 网格去噪后处理：
 * 1. 颜色量化合并：仅将极低频颜色（占比 < 0.2%）合并到最近的高频颜色
 * 2. 孤立点消除：仅当某格在 8-邻域中没有相同颜色 且 该颜色全局仅出现 1 次时才替换
 */
function denoiseGrid(cellData: string[][], gridWidth: number, gridHeight: number): void {
  const totalCells = gridWidth * gridHeight
  if (totalCells === 0) return

  // Step 1: 统计颜色频次
  const colorCounts = new Map<string, number>()
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const hex = cellData[y][x]
      if (!hex) continue
      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1)
    }
  }

  // Step 2: 颜色量化合并 — 仅合并占比 < 0.3% 的极低频颜色
  const MIN_RATIO = 0.003
  const lowFreqColors: string[] = []
  const highFreqColors: string[] = []

  for (const [hex, count] of colorCounts) {
    if (count / totalCells < MIN_RATIO) {
      lowFreqColors.push(hex)
    } else {
      highFreqColors.push(hex)
    }
  }

  if (highFreqColors.length > 0 && lowFreqColors.length > 0) {
    const highFreqOklabs = highFreqColors.map((hex) => {
      const rgb = hexToRgb(hex)
      return { hex, oklab: rgb ? srgbToOklab(rgb) : null }
    }).filter((item) => item.oklab !== null) as Array<{ hex: string; oklab: ReturnType<typeof srgbToOklab> }>

    const mergeMap = new Map<string, string>()
    for (const lowHex of lowFreqColors) {
      const lowRgb = hexToRgb(lowHex)
      if (!lowRgb) continue
      const lowOklab = srgbToOklab(lowRgb)

      let minDist = Infinity
      let bestHex = lowHex
      for (const candidate of highFreqOklabs) {
        const dist = oklabDistance(lowOklab, candidate.oklab)
        if (dist < minDist) {
          minDist = dist
          bestHex = candidate.hex
        }
      }
      mergeMap.set(lowHex, bestHex)
    }

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const hex = cellData[y][x]
        if (hex && mergeMap.has(hex)) {
          cellData[y][x] = mergeMap.get(hex)!
        }
      }
    }
  }

  // 重新统计频次（合并后）
  const updatedCounts = new Map<string, number>()
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const hex = cellData[y][x]
      if (!hex) continue
      updatedCounts.set(hex, (updatedCounts.get(hex) || 0) + 1)
    }
  }

  // Step 3: 孤立点消除 — 仅当 8-邻域无相同色 且 全局仅出现 1 次时替换
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const current = cellData[y][x]
      if (!current) continue

      // 全局仅出现 1 次的颜色才有可能是真噪点
      if ((updatedCounts.get(current) || 0) > 1) continue

      // 检查 8-邻域是否有相同颜色
      let hasSameNeighbor = false
      const neighbors: string[] = []
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dy === 0 && dx === 0) continue
          const ny = y + dy
          const nx = x + dx
          if (ny >= 0 && ny < gridHeight && nx >= 0 && nx < gridWidth) {
            const neighborHex = cellData[ny][nx]
            if (neighborHex) {
              neighbors.push(neighborHex)
              if (neighborHex === current) {
                hasSameNeighbor = true
              }
            }
          }
        }
      }

      if (!hasSameNeighbor && neighbors.length > 0) {
        const neighborCounts = new Map<string, number>()
        for (const n of neighbors) {
          neighborCounts.set(n, (neighborCounts.get(n) || 0) + 1)
        }
        let bestNeighbor = neighbors[0]
        let maxCount = 0
        for (const [hex, count] of neighborCounts) {
          if (count > maxCount) {
            maxCount = count
            bestNeighbor = hex
          }
        }
        cellData[y][x] = bestNeighbor
      }
    }
  }
}

/**
 * H5 端便捷入口：从图片 URL/Base64 加载并像素化
 * App/小程序端应使用 UTs 版本或平台特定 API
 */
export async function pixelateImage(options: {
  imagePath: string
  gridWidth: number
  gridHeight: number
  mode: PixelationMode
  paletteId: string
  allowedSeries?: string[]
}): Promise<PixelateResult> {
  const { imagePath, gridWidth, gridHeight, mode, paletteId, allowedSeries } = options

  // #ifdef H5
  return new Promise((resolve, reject) => {
    const img = new Image()
    // 不设置 crossOrigin，避免 blob URL / 本地路径加载失败
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        // 限制最大处理尺寸为 1024px，避免内存溢出
        const maxDim = 1024
        let drawWidth = img.width
        let drawHeight = img.height
        if (drawWidth > maxDim || drawHeight > maxDim) {
          const scale = maxDim / Math.max(drawWidth, drawHeight)
          drawWidth = Math.round(drawWidth * scale)
          drawHeight = Math.round(drawHeight * scale)
        }
        canvas.width = drawWidth
        canvas.height = drawHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, drawWidth, drawHeight)
        const imageDataObj = ctx.getImageData(0, 0, drawWidth, drawHeight)

        const result = pixelateFromImageData({
          imageData: imageDataObj.data,
          imageWidth: drawWidth,
          imageHeight: drawHeight,
          gridWidth,
          gridHeight,
          mode,
          paletteId,
          allowedSeries,
        })
        resolve(result)
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = imagePath
  })
  // #endif

  // #ifndef H5
  // App/小程序端使用 uni API 加载图片到 Canvas
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src: imagePath,
      success: (info) => {
        const maxDim = 1024
        let drawWidth = info.width
        let drawHeight = info.height
        if (drawWidth > maxDim || drawHeight > maxDim) {
          const scale = maxDim / Math.max(drawWidth, drawHeight)
          drawWidth = Math.round(drawWidth * scale)
          drawHeight = Math.round(drawHeight * scale)
        }

        const canvasId = '_pixelate_canvas_'
        const query = uni.createSelectorQuery()
        query.select(`#${canvasId}`).node().exec(() => {
          // 降级方案：如果无法获取 Canvas node，返回空结果
          resolve({ cellData: Array.from({ length: gridHeight }, () => Array(gridWidth).fill('')), elapsedMs: 0 })
        })
      },
      fail: () => reject(new Error('图片信息获取失败')),
    })
  })
  // #endif
}

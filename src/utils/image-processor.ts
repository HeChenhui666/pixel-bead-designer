// image-processor.ts — 像素化逻辑（TS 版，三端通用）
// 移植自 perler-beads/src/utils/pixelation.ts

import { findNearestColor, hexToRgb, rgbToHex, srgbToOklab, oklabDistance, type RgbColor } from './color-mapper'
import type { WeightedMedianConfig, AdaptiveConfig, GaussianWeightedConfig, EdgeAwareConfig } from '../stores/useConfigStore'

export type PixelationMode = 'average' | 'adaptive' | 'weighted-median' | 'gaussian-weighted' | 'edge-aware'

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
  /** weighted-median 模式的可调参数 */
  weightedMedianConfig?: WeightedMedianConfig
  /** adaptive 模式的可调参数 */
  adaptiveConfig?: AdaptiveConfig
  /** gaussian-weighted 模式的可调参数 */
  gaussianWeightedConfig?: GaussianWeightedConfig
  /** edge-aware 模式的可调参数 */
  edgeAwareConfig?: EdgeAwareConfig
}

export interface PixelateResult {
  cellData: string[][]
  elapsedMs: number
}

/**
 * 估算图像块四角的背景色（取四角 2×2 区域的平均色）
 */
function estimateBackgroundColor(
  data: Uint8ClampedArray,
  imgWidth: number,
  startX: number,
  startY: number,
  blockWidth: number,
  blockHeight: number
): RgbColor | null {
  const endX = Math.min(startX + blockWidth, imgWidth)
  const endY = Math.min(startY + blockHeight, Math.floor(data.length / 4 / imgWidth))
  const sampleSize = Math.max(1, Math.min(2, Math.floor(blockWidth / 2), Math.floor(blockHeight / 2)))

  let rSum = 0, gSum = 0, bSum = 0, count = 0

  // 四个角的采样区域
  const corners = [
    { sx: startX, sy: startY },
    { sx: endX - sampleSize, sy: startY },
    { sx: startX, sy: endY - sampleSize },
    { sx: endX - sampleSize, sy: endY - sampleSize },
  ]

  for (const corner of corners) {
    for (let dy = 0; dy < sampleSize; dy++) {
      for (let dx = 0; dx < sampleSize; dx++) {
        const px = corner.sx + dx
        const py = corner.sy + dy
        if (px >= imgWidth || py >= endY) continue
        const idx = (py * imgWidth + px) * 4
        if (data[idx + 3] < 128) continue
        rSum += data[idx]
        gSum += data[idx + 1]
        bSum += data[idx + 2]
        count++
      }
    }
  }

  if (count === 0) return null
  return { r: Math.round(rSum / count), g: Math.round(gSum / count), b: Math.round(bSum / count) }
}

/**
 * 计算图像指定区域的代表色
 * 对 average/adaptive 模式：自动检测并剔除背景色像素，减少边缘杂色
 */
function calculateCellRepresentativeColor(
  data: Uint8ClampedArray,
  imgWidth: number,
  startX: number,
  startY: number,
  blockWidth: number,
  blockHeight: number,
  mode: PixelationMode,
  adaptiveConfig?: AdaptiveConfig
): RgbColor | null {
  const endX = Math.min(startX + blockWidth, imgWidth)
  const endY = Math.min(startY + blockHeight, Math.floor(data.length / 4 / imgWidth))

  // adaptive 模式：估算背景色并过滤背景像素，减少边缘杂色
  const useBgFilter = mode === 'adaptive'
  const bgColor = useBgFilter ? estimateBackgroundColor(data, imgWidth, startX, startY, blockWidth, blockHeight) : null
  const BG_DIST_THRESHOLD = adaptiveConfig?.bgDistThreshold ?? 0.03

  let rSum = 0
  let gSum = 0
  let bSum = 0
  let pixelCount = 0

  const colorCounts = new Map<string, number>()
  let dominantRgb: RgbColor | null = null
  let maxCount = 0

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const index = (y * imgWidth + x) * 4
      if (data[index + 3] < 128) continue

      const r = data[index]
      const g = data[index + 1]
      const b = data[index + 2]

      // adaptive 模式：过滤掉与背景色过于接近的像素
      if (useBgFilter && bgColor) {
        const pixelOklab = srgbToOklab({ r, g, b })
        const bgOklab = srgbToOklab(bgColor)
        const dist = oklabDistance(pixelOklab, bgOklab)
        if (dist < BG_DIST_THRESHOLD) continue
      }

      pixelCount++

      if (mode === 'average' || mode === 'adaptive') {
        rSum += r
        gSum += g
        bSum += b
      } else {
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

  if (mode === 'average' || mode === 'adaptive') {
    return {
      r: Math.round(rSum / pixelCount),
      g: Math.round(gSum / pixelCount),
      b: Math.round(bSum / pixelCount),
    }
  }

  return dominantRgb
}

/**
 * palette-vote 模式：块内每个像素投票给最近的调色板颜色，票数最多者胜出
 * @param colorCache - 量化颜色 key → 调色板 hex 的 session 级缓存，外部传入共享
 */
function calculateCellByPaletteVote(
  data: Uint8ClampedArray,
  imgWidth: number,
  startX: number,
  startY: number,
  blockWidth: number,
  blockHeight: number,
  paletteId: string,
  colorCache: Map<number, string>,
  allowedSeries?: string[]
): string | null {
  const endX = Math.min(startX + blockWidth, imgWidth)
  const endY = Math.min(startY + blockHeight, Math.floor(data.length / 4 / imgWidth))

  const votes = new Map<string, number>()

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const index = (y * imgWidth + x) * 4
      if (data[index + 3] < 128) continue

      const r = data[index]
      const g = data[index + 1]
      const b = data[index + 2]
      const quantKey = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)

      let hex = colorCache.get(quantKey)
      if (hex === undefined) {
        hex = findNearestColor({ r, g, b }, paletteId, allowedSeries).hex
        colorCache.set(quantKey, hex)
      }

      votes.set(hex, (votes.get(hex) ?? 0) + 1)
    }
  }

  if (votes.size === 0) return null

  let bestHex = ''
  let maxVotes = 0
  for (const [hex, count] of votes) {
    if (count > maxVotes) {
      maxVotes = count
      bestHex = hex
    }
  }
  return bestHex
}

const BOX_BLUR_RADIUS = 2

/**
 * adaptive 模式：低方差块用全块平均，高方差块用中心子块平均
 */
function calculateCellAdaptive(
  data: Uint8ClampedArray,
  imgWidth: number,
  startX: number,
  startY: number,
  blockWidth: number,
  blockHeight: number,
  adaptiveConfig?: AdaptiveConfig
): RgbColor | null {
  const varianceThreshold = adaptiveConfig?.varianceThreshold ?? 2000
  const centerRatio = adaptiveConfig?.centerRatio ?? 0.5
  const endX = Math.min(startX + blockWidth, imgWidth)
  const endY = Math.min(startY + blockHeight, Math.floor(data.length / 4 / imgWidth))

  // Pass 1: compute full-block average
  let rSum = 0, gSum = 0, bSum = 0, pixelCount = 0
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const index = (y * imgWidth + x) * 4
      if (data[index + 3] < 128) continue
      rSum += data[index]; gSum += data[index + 1]; bSum += data[index + 2]
      pixelCount++
    }
  }

  if (pixelCount === 0) return null

  const rAvg = rSum / pixelCount
  const gAvg = gSum / pixelCount
  const bAvg = bSum / pixelCount

  // Pass 2: compute variance from raw data (no intermediate array)
  let varianceSum = 0
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const index = (y * imgWidth + x) * 4
      if (data[index + 3] < 128) continue
      const dr = data[index] - rAvg
      const dg = data[index + 1] - gAvg
      const db = data[index + 2] - bAvg
      varianceSum += dr * dr + dg * dg + db * db
    }
  }
  const variance = varianceSum / pixelCount

  if (variance <= varianceThreshold) {
    return { r: Math.round(rAvg), g: Math.round(gAvg), b: Math.round(bAvg) }
  }

  // High variance: center sub-block (centerRatio controls size)
  const marginRatio = (1 - centerRatio) / 2
  const cx0 = startX + Math.floor(blockWidth * marginRatio)
  const cx1 = startX + Math.ceil(blockWidth * (1 - marginRatio))
  const cy0 = startY + Math.floor(blockHeight * marginRatio)
  const cy1 = startY + Math.ceil(blockHeight * (1 - marginRatio))

  // Guard: if center region is not actually smaller than full block, return full-block average
  if (cx0 <= startX && cx1 >= endX && cy0 <= startY && cy1 >= endY) {
    return { r: Math.round(rAvg), g: Math.round(gAvg), b: Math.round(bAvg) }
  }

  let crSum = 0, cgSum = 0, cbSum = 0, cCount = 0
  for (let y = cy0; y < Math.min(cy1, endY); y++) {
    for (let x = cx0; x < Math.min(cx1, endX); x++) {
      const index = (y * imgWidth + x) * 4
      if (data[index + 3] < 128) continue
      crSum += data[index]; cgSum += data[index + 1]; cbSum += data[index + 2]
      cCount++
    }
  }

  if (cCount === 0) {
    return { r: Math.round(rAvg), g: Math.round(gAvg), b: Math.round(bAvg) }
  }
  return {
    r: Math.round(crSum / cCount),
    g: Math.round(cgSum / cCount),
    b: Math.round(cbSum / cCount),
  }
}

/**
 * weighted-median 模式：空间加权 + 调色板投票
 *
 * 核心思路：
 * 1. 块内每个像素先映射到最近的调色板颜色（投票候选）
 * 2. 投票时附加"空间权重"：离块中心越近的像素权重越大
 *    - 中心区域（50%×50%）权重为 2，外围权重为 1
 *    - 这样边界处混入的"外来颜色"像素权重低，不会污染块的主色
 * 3. 票数最多的调色板色即为块的代表色 → 直接输出 HEX，无需二次映射
 *
 * 优势：
 * - 边界清晰：中心加权让块的主色更"纯粹"，边界处的混色像素被抑制
 * - 杂色少：每个像素投票的是调色板色而非原始 RGB，天然消除量化噪点
 * - 还原度高：投票机制保留块内真正的颜色分布，不会像 average 那样被拉向中间色
 */
function calculateCellWeightedMedian(
  data: Uint8ClampedArray,
  imgWidth: number,
  startX: number,
  startY: number,
  blockWidth: number,
  blockHeight: number,
  paletteId: string,
  colorCache: Map<number, string>,
  allowedSeries?: string[],
  wmConfig?: WeightedMedianConfig
): string | null {
  const endX = Math.min(startX + blockWidth, imgWidth)
  const endY = Math.min(startY + blockHeight, Math.floor(data.length / 4 / imgWidth))

  const centerWeight = wmConfig?.centerWeight ?? 2
  const edgeWeight = wmConfig?.edgeWeight ?? 1
  const centerRatio = wmConfig?.centerRatio ?? 0.5

  // 中心区域边界：centerRatio 控制中心区域的占比
  // 例如 centerRatio=0.5 → 中心区域从 25% 到 75%（即 50%×50%）
  // centerRatio=0.3 → 中心区域从 35% 到 65%（即 30%×30%）
  const marginRatio = (1 - centerRatio) / 2
  const centerStartX = startX + Math.floor(blockWidth * marginRatio)
  const centerEndX = startX + Math.ceil(blockWidth * (1 - marginRatio))
  const centerStartY = startY + Math.floor(blockHeight * marginRatio)
  const centerEndY = startY + Math.ceil(blockHeight * (1 - marginRatio))

  const votes = new Map<string, number>()

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const index = (y * imgWidth + x) * 4
      if (data[index + 3] < 128) continue

      const r = data[index]
      const g = data[index + 1]
      const b = data[index + 2]

      // 量化缓存：将 RGB 映射到最近的调色板颜色
      const quantKey = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
      let hex = colorCache.get(quantKey)
      if (hex === undefined) {
        hex = findNearestColor({ r, g, b }, paletteId, allowedSeries).hex
        colorCache.set(quantKey, hex)
      }

      // 空间加权：中心区域权重更高
      const isInCenter = x >= centerStartX && x < centerEndX && y >= centerStartY && y < centerEndY
      const weight = isInCenter ? centerWeight : edgeWeight

      votes.set(hex, (votes.get(hex) ?? 0) + weight)
    }
  }

  if (votes.size === 0) return null

  // 选出票数最高的调色板颜色
  let bestHex = ''
  let maxVotes = 0
  for (const [hex, count] of votes) {
    if (count > maxVotes) {
      maxVotes = count
      bestHex = hex
    }
  }
  return bestHex
}

/**
 * gaussian-weighted 模式：高斯核加权平均
 *
 * 核心思路：
 * 1. 对块内每个像素，按其到块中心的归一化距离计算高斯权重
 *    weight = exp(-(dx² + dy²) / (2 × sigma²))
 *    dx、dy 是像素到块中心的归一化坐标（-1 到 1 范围）
 * 2. sigma 越小 → 权重衰减越快，越聚焦中心；sigma 越大 → 权重分布越均匀
 * 3. 所有像素的 RGB 按权重加权求平均 → 映射到最近调色板色
 *
 * 优势：
 * - 比 weighted-median 更平滑：保留渐变过渡，不会像投票那样硬切换
 * - 比 average 更聚焦：中心区域权重更高，边缘混色影响被自然衰减
 * - sigma 可调：一参数即可在"平滑还原"和"清晰边界"之间连续过渡
 */
function calculateCellGaussianWeighted(
  data: Uint8ClampedArray,
  imgWidth: number,
  startX: number,
  startY: number,
  blockWidth: number,
  blockHeight: number,
  gwConfig?: GaussianWeightedConfig
): RgbColor | null {
  const endX = Math.min(startX + blockWidth, imgWidth)
  const endY = Math.min(startY + blockHeight, Math.floor(data.length / 4 / imgWidth))
  const sigma = gwConfig?.sigma ?? 0.4

  // 块中心的归一化坐标
  const centerX = (blockWidth - 1) / 2
  const centerY = (blockHeight - 1) / 2
  // 归一化因子：使 dx/dy 范围为 -1 到 1
  const scaleX = blockWidth > 1 ? 2 / (blockWidth - 1) : 0
  const scaleY = blockHeight > 1 ? 2 / (blockHeight - 1) : 0

  const twoSigmaSq = 2 * sigma * sigma

  let rWeightedSum = 0, gWeightedSum = 0, bWeightedSum = 0
  let totalWeight = 0

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const index = (y * imgWidth + x) * 4
      if (data[index + 3] < 128) continue

      const dx = (x - startX - centerX) * scaleX
      const dy = (y - startY - centerY) * scaleY
      const weight = Math.exp(-(dx * dx + dy * dy) / twoSigmaSq)

      rWeightedSum += data[index] * weight
      gWeightedSum += data[index + 1] * weight
      bWeightedSum += data[index + 2] * weight
      totalWeight += weight
    }
  }

  if (totalWeight === 0) return null

  return {
    r: Math.round(rWeightedSum / totalWeight),
    g: Math.round(gWeightedSum / totalWeight),
    b: Math.round(bWeightedSum / totalWeight),
  }
}

/**
 * edge-aware 模式：边缘感知采样
 *
 * 核心思路：
 * 1. 计算块内所有像素的颜色梯度（水平 gx 和垂直 gy）
 * 2. 从梯度向量中估算块内主边缘方向 angle = atan2(gy, gx)
 * 3. 低梯度块（无明显边缘）→ 用全块加权平均（高斯加权，sigma=0.4）
 * 4. 高梯度块（有边缘）→ 沿梯度垂直方向（即边缘走向）取窄条采样
 *    - 窄条沿边缘走向延伸，宽度由 stripWidth 控制
 *    - 这样窄条跨越了边缘，采样到两侧的真实颜色
 *    - 再对窄条内像素做调色板投票，取票数最高的颜色
 *
 * 优势：
 * - 边缘走向处保留真实颜色：沿边缘采样而非只取中心，边界线不丢失
 * - 低梯度区域平滑过渡：无边缘时用高斯加权平均，渐变自然
 * - 适合线条图案：边缘线不会被中心采样"截断"
 */
function calculateCellEdgeAware(
  data: Uint8ClampedArray,
  imgWidth: number,
  startX: number,
  startY: number,
  blockWidth: number,
  blockHeight: number,
  paletteId: string,
  colorCache: Map<number, string>,
  allowedSeries?: string[],
  eaConfig?: EdgeAwareConfig
): string | null {
  const endX = Math.min(startX + blockWidth, imgWidth)
  const endY = Math.min(startY + blockHeight, Math.floor(data.length / 4 / imgWidth))
  const gradientThreshold = eaConfig?.gradientThreshold ?? 50
  const stripWidthRatio = eaConfig?.stripWidth ?? 0.3

  // 块中心的归一化坐标
  const centerX = (blockWidth - 1) / 2
  const centerY = (blockHeight - 1) / 2
  const scaleX = blockWidth > 1 ? 2 / (blockWidth - 1) : 0
  const scaleY = blockHeight > 1 ? 2 / (blockHeight - 1) : 0
  const sigma = 0.4
  const twoSigmaSq = 2 * sigma * sigma

  // Pass 1: 计算高斯加权平均 + 颜色梯度
  let rWeightedSum = 0, gWeightedSum = 0, bWeightedSum = 0
  let totalWeight = 0
  let gxR = 0, gxG = 0, gxB = 0
  let gyR = 0, gyG = 0, gyB = 0

  // 前一行的加权平均 RGB（用于计算垂直梯度）
  let prevRowR = 0, prevRowG = 0, prevRowB = 0, prevRowWeight = 0

  for (let y = startY; y < endY; y++) {
    // 当前行的加权平均
    let curRowR = 0, curRowG = 0, curRowB = 0, curRowWeight = 0
    let prevColR = 0, prevColG = 0, prevColB = 0, prevColWeight = 0

    for (let x = startX; x < endX; x++) {
      const index = (y * imgWidth + x) * 4
      if (data[index + 3] < 128) continue

      const r = data[index], g = data[index + 1], b = data[index + 2]
      const dx = (x - startX - centerX) * scaleX
      const dy = (y - startY - centerY) * scaleY
      const weight = Math.exp(-(dx * dx + dy * dy) / twoSigmaSq)

      rWeightedSum += r * weight
      gWeightedSum += g * weight
      bWeightedSum += b * weight
      totalWeight += weight

      curRowR += r * weight
      curRowG += g * weight
      curRowB += b * weight
      curRowWeight += weight

      // 水平梯度：当前列与前一列的加权平均差
      if (prevColWeight > 0) {
        const colR = prevColR / prevColWeight
        const colG = prevColG / prevColWeight
        const colB = prevColB / prevColWeight
        gxR += Math.abs(r / weight - colR) * weight
        gxG += Math.abs(g / weight - colG) * weight
        gxB += Math.abs(b / weight - colB) * weight
      }

      prevColR += r * weight
      prevColG += g * weight
      prevColB += b * weight
      prevColWeight += weight
    }

    // 垂直梯度：当前行与前一行的加权平均差
    if (prevRowWeight > 0 && curRowWeight > 0) {
      const rowR = prevRowR / prevRowWeight
      const rowG = prevRowG / prevRowWeight
      const rowB = prevRowB / prevRowWeight
      const curAvgR = curRowR / curRowWeight
      const curAvgG = curRowG / curRowWeight
      const curAvgB = curRowB / curRowWeight
      gyR += Math.abs(curAvgR - rowR) * curRowWeight
      gyG += Math.abs(curAvgG - rowG) * curRowWeight
      gyB += Math.abs(curAvgB - rowB) * curRowWeight
    }

    prevRowR = curRowR
    prevRowG = curRowG
    prevRowB = curRowB
    prevRowWeight = curRowWeight
  }

  if (totalWeight === 0) return null

  // 计算梯度幅值
  const gradientMag = Math.sqrt(gxR * gxR + gxG * gxG + gxB * gxB + gyR * gyR + gyG * gyG + gyB * gyB)

  // 低梯度 → 无明显边缘，用高斯加权平均 → 映射到调色板色
  if (gradientMag <= gradientThreshold) {
    const rgb = {
      r: Math.round(rWeightedSum / totalWeight),
      g: Math.round(gWeightedSum / totalWeight),
      b: Math.round(bWeightedSum / totalWeight),
    }
    return findNearestColor(rgb, paletteId, allowedSeries).hex
  }

  // 高梯度 → 有边缘，估算边缘方向
  const angle = Math.atan2(
    Math.sqrt(gyR * gyR + gyG * gyG + gyB * gyB),
    Math.sqrt(gxR * gxR + gxG * gxG + gxB * gxB)
  )
  // 沿梯度垂直方向（边缘走向）采样
  // 边缘走向角度 = angle + π/2
  const stripAngle = angle + Math.PI / 2
  const cosA = Math.cos(stripAngle)
  const sinA = Math.sin(stripAngle)

  // 窄条：沿 stripAngle 方向延伸，宽度由 stripWidthRatio 控制
  // 垂直于 stripAngle 方向的偏移范围 = ±(stripWidthRatio * maxDim / 2)
  const maxDim = Math.max(blockWidth, blockHeight)
  const halfStripWidth = stripWidthRatio * maxDim / 2

  const votes = new Map<string, number>()

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const index = (y * imgWidth + x) * 4
      if (data[index + 3] < 128) continue

      // 检查像素是否在窄条范围内
      const dx = (x - startX - centerX) * scaleX
      const dy = (y - startY - centerY) * scaleY
      // 垂直于 stripAngle 方向的距离
      const perpDist = Math.abs(-sinA * dx + cosA * dy)

      if (perpDist > halfStripWidth) continue

      const r = data[index], g = data[index + 1], b = data[index + 2]
      const quantKey = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
      let hex = colorCache.get(quantKey)
      if (hex === undefined) {
        hex = findNearestColor({ r, g, b }, paletteId, allowedSeries).hex
        colorCache.set(quantKey, hex)
      }

      // 窄条内越靠近中心权重越高（高斯衰减）
      const alongDist = Math.abs(cosA * dx + sinA * dy)
      const stripWeight = Math.exp(-(alongDist * alongDist) / twoSigmaSq)

      votes.set(hex, (votes.get(hex) ?? 0) + stripWeight)
    }
  }

  if (votes.size === 0) {
    // 窄条内没有有效像素，退回到高斯加权平均 → 映射到调色板色
    const rgb = {
      r: Math.round(rWeightedSum / totalWeight),
      g: Math.round(gWeightedSum / totalWeight),
      b: Math.round(bWeightedSum / totalWeight),
    }
    return findNearestColor(rgb, paletteId, allowedSeries).hex
  }

  let bestHex = ''
  let maxVotes = 0
  for (const [hex, count] of votes) {
    if (count > maxVotes) {
      maxVotes = count
      bestHex = hex
    }
  }
  return bestHex
}

/**
 * 两遍可分离 Box Blur（水平→垂直），边界 clamp，只模糊 RGB，alpha 保持原值
 */
export function applyBoxBlur(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray {
  if (radius < 0) throw new RangeError('applyBoxBlur: radius must be >= 0')
  const temp = new Uint8ClampedArray(data.length)
  const output = new Uint8ClampedArray(data.length)
  const count = radius * 2 + 1

  // 水平方向
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rSum = 0, gSum = 0, bSum = 0
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = Math.max(0, Math.min(width - 1, x + dx))
        const i = (y * width + nx) * 4
        rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2]
      }
      const i = (y * width + x) * 4
      temp[i] = Math.round(rSum / count)
      temp[i + 1] = Math.round(gSum / count)
      temp[i + 2] = Math.round(bSum / count)
      temp[i + 3] = data[i + 3]
    }
  }

  // 垂直方向
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rSum = 0, gSum = 0, bSum = 0
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = Math.max(0, Math.min(height - 1, y + dy))
        const i = (ny * width + x) * 4
        rSum += temp[i]; gSum += temp[i + 1]; bSum += temp[i + 2]
      }
      const i = (y * width + x) * 4
      output[i] = Math.round(rSum / count)
      output[i + 1] = Math.round(gSum / count)
      output[i + 2] = Math.round(bSum / count)
      output[i + 3] = data[i + 3]
    }
  }

  return output
}

/**
 * preprocessed 模式的块内主色计算：32 级量化统计主色，修复 dominant 在真实照片中的退化问题
 */
function calculateCellQuantizedDominant(
  data: Uint8ClampedArray,
  imgWidth: number,
  startX: number,
  startY: number,
  blockWidth: number,
  blockHeight: number
): RgbColor | null {
  const endX = Math.min(startX + blockWidth, imgWidth)
  const endY = Math.min(startY + blockHeight, Math.floor(data.length / 4 / imgWidth))

  const colorCounts = new Map<number, { count: number; r: number; g: number; b: number }>()
  let pixelCount = 0

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const index = (y * imgWidth + x) * 4
      if (data[index + 3] < 128) continue
      const r = data[index], g = data[index + 1], b = data[index + 2]
      const quantKey = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
      const existing = colorCounts.get(quantKey)
      if (existing) {
        existing.count++
      } else {
        colorCounts.set(quantKey, {
          count: 1,
          r: (r >> 3) * 8 + 4,
          g: (g >> 3) * 8 + 4,
          b: (b >> 3) * 8 + 4,
        })
      }
      pixelCount++
    }
  }

  if (pixelCount === 0) return null

  let maxCount = 0
  let best: { count: number; r: number; g: number; b: number } | null = null
  for (const entry of colorCounts.values()) {
    if (entry.count > maxCount) {
      maxCount = entry.count
      best = entry
    }
  }
  return best ? { r: best.r, g: best.g, b: best.b } : null
}

/**
 * 核心像素化函数
 * 接收原始像素数据，输出匹配后的 HEX 二维数组
 */
export function pixelateFromImageData(options: PixelateOptions): PixelateResult {
  const startTime = Date.now()
  const { imageData, imageWidth, imageHeight, gridWidth, gridHeight, mode, paletteId, allowedSeries, weightedMedianConfig, adaptiveConfig, gaussianWeightedConfig, edgeAwareConfig } = options

  const blockWidth = imageWidth / gridWidth
  const blockHeight = imageHeight / gridHeight

  const cellData: string[][] = []

  // 调色板投票缓存，需要投票的模式共享
  const needVoteCache = mode === 'weighted-median' || mode === 'edge-aware'
  const colorCache = needVoteCache ? new Map<number, string>() : null

  for (let gy = 0; gy < gridHeight; gy++) {
    const row: string[] = []
    const startY = Math.floor(gy * blockHeight)
    const currentBlockHeight = Math.max(1, Math.ceil((gy + 1) * blockHeight) - startY)

    for (let gx = 0; gx < gridWidth; gx++) {
      const startX = Math.floor(gx * blockWidth)
      const currentBlockWidth = Math.max(1, Math.ceil((gx + 1) * blockWidth) - startX)

      if (mode === 'adaptive') {
        const rgb = calculateCellAdaptive(
          imageData,
          imageWidth,
          startX,
          startY,
          currentBlockWidth,
          currentBlockHeight,
          adaptiveConfig
        )
        row.push(rgb ? findNearestColor(rgb, paletteId, allowedSeries).hex : '')
      } else if (mode === 'weighted-median') {
        const hex = calculateCellWeightedMedian(
          imageData,
          imageWidth,
          startX,
          startY,
          currentBlockWidth,
          currentBlockHeight,
          paletteId,
          colorCache!,
          allowedSeries,
          weightedMedianConfig
        )
        row.push(hex ?? '')
      } else if (mode === 'gaussian-weighted') {
        const rgb = calculateCellGaussianWeighted(
          imageData,
          imageWidth,
          startX,
          startY,
          currentBlockWidth,
          currentBlockHeight,
          gaussianWeightedConfig
        )
        row.push(rgb ? findNearestColor(rgb, paletteId, allowedSeries).hex : '')
      } else if (mode === 'edge-aware') {
        const hex = calculateCellEdgeAware(
          imageData,
          imageWidth,
          startX,
          startY,
          currentBlockWidth,
          currentBlockHeight,
          paletteId,
          colorCache!,
          allowedSeries,
          edgeAwareConfig
        )
        row.push(hex ?? '')
      } else {
        const representativeRgb = calculateCellRepresentativeColor(
          imageData,
          imageWidth,
          startX,
          startY,
          currentBlockWidth,
          currentBlockHeight,
          mode,
          adaptiveConfig
        )
        if (representativeRgb) {
          const match = findNearestColor(representativeRgb, paletteId, allowedSeries)
          row.push(match.hex)
        } else {
          row.push('')
        }
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
 * 从图片路径加载并像素化。
 * H5 和 App（webview）均通过浏览器 canvas API 处理；小程序使用 uni 离屏 canvas 降级。
 */
export async function pixelateImage(options: {
  imagePath: string
  gridWidth: number
  gridHeight: number
  mode: PixelationMode
  paletteId: string
  allowedSeries?: string[]
  weightedMedianConfig?: WeightedMedianConfig
  adaptiveConfig?: AdaptiveConfig
  gaussianWeightedConfig?: GaussianWeightedConfig
  edgeAwareConfig?: EdgeAwareConfig
}): Promise<PixelateResult> {
  const { imagePath, gridWidth, gridHeight, mode, paletteId, allowedSeries, weightedMedianConfig, adaptiveConfig, gaussianWeightedConfig, edgeAwareConfig } = options

  // H5 和 App 均为 webview，走浏览器 canvas 流程
  // App 端：WebView 对 file:// 本地路径有安全限制，new Image() 无法直接加载相册文件；
  //         需先用 uni.getFileSystemManager().readFile 读取 base64，再作为 data URL 加载
  if (typeof document !== 'undefined' && typeof Image !== 'undefined') {
    // 尝试将本地文件转为 base64 data URL（App 端 getFileSystemManager 可用；H5 无此 API 则降级为原路径）
    const resolveImageSrc = (): Promise<string> => {
      try {
        const fs = (uni as any)?.getFileSystemManager?.()
        if (!fs) return Promise.resolve(imagePath)
        return new Promise((res) => {
          fs.readFile({
            filePath: imagePath,
            encoding: 'base64',
            success: (r: any) => {
              const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpeg'
              const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
              res(`data:${mime};base64,${r.data}`)
            },
            fail: () => res(imagePath),
          })
        })
      } catch {
        return Promise.resolve(imagePath)
      }
    }

    const src = await resolveImageSrc()
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const maxDim = 1024
          let drawWidth = img.naturalWidth || img.width
          let drawHeight = img.naturalHeight || img.height
          if (drawWidth > maxDim || drawHeight > maxDim) {
            const scale = maxDim / Math.max(drawWidth, drawHeight)
            drawWidth = Math.round(drawWidth * scale)
            drawHeight = Math.round(drawHeight * scale)
          }
          const canvas = document.createElement('canvas')
          canvas.width = drawWidth
          canvas.height = drawHeight
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, drawWidth, drawHeight)
          const imageDataObj = ctx.getImageData(0, 0, drawWidth, drawHeight)
          resolve(pixelateFromImageData({
            imageData: imageDataObj.data,
            imageWidth: drawWidth,
            imageHeight: drawHeight,
            gridWidth,
            gridHeight,
            mode,
            paletteId,
            allowedSeries,
            weightedMedianConfig,
            adaptiveConfig,
            gaussianWeightedConfig,
            edgeAwareConfig,
          }))
        } catch (err) {
          reject(err)
        }
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = src
    })
  }

  // 小程序降级：uni 离屏 canvas
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
        try {
          const offscreen = (uni as any).createOffscreenCanvas({ type: '2d', width: drawWidth, height: drawHeight })
          if (!offscreen) {
            reject(new Error('createOffscreenCanvas 不可用'))
            return
          }
          const ctx = offscreen.getContext('2d')
          const img = offscreen.createImage()
          img.onload = () => {
            ctx.drawImage(img, 0, 0, drawWidth, drawHeight)
            const imageDataObj = ctx.getImageData(0, 0, drawWidth, drawHeight)
            resolve(pixelateFromImageData({
              imageData: imageDataObj.data,
              imageWidth: drawWidth,
              imageHeight: drawHeight,
              gridWidth,
              gridHeight,
              mode,
              paletteId,
              allowedSeries,
              weightedMedianConfig,
              adaptiveConfig,
              gaussianWeightedConfig,
              edgeAwareConfig,
            }))
          }
          img.onerror = () => reject(new Error('图片加载失败'))
          img.src = imagePath
        } catch (e) {
          reject(e)
        }
      },
      fail: () => reject(new Error('图片信息获取失败')),
    })
  })
}

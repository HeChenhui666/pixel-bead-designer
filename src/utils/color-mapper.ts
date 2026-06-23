// color-mapper.ts — Oklab 色差算法（TS 版，三端通用）
// 移植自 perler-beads/src/utils/pixelation.ts

import colorSystemMapping from '../assets/colorSystemMapping.json'

export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface OklabColor {
  L: number
  a: number
  b: number
}

export interface MatchResult {
  hex: string
  code: string
  distance: number
}

export type PaletteId = 'MARD' | 'COCO' | '漫漫' | '盼盼' | '咪小窝'

type ColorMappingData = Record<string, Record<string, string>>
const typedMapping = colorSystemMapping as ColorMappingData

// --- sRGB → Linear → Oklab 转换 ---

function srgbChannelToLinear(channel: number): number {
  const normalized = channel / 255
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4)
}

export function srgbToOklab(rgb: RgbColor): OklabColor {
  const r = srgbChannelToLinear(rgb.r)
  const g = srgbChannelToLinear(rgb.g)
  const b = srgbChannelToLinear(rgb.b)

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  const lRoot = Math.cbrt(l)
  const mRoot = Math.cbrt(m)
  const sRoot = Math.cbrt(s)

  return {
    L: 0.2104542553 * lRoot + 0.7936177850 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.4285922050 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.8086757660 * sRoot,
  }
}

export function oklabDistance(a: OklabColor, b: OklabColor): number {
  const dL = a.L - b.L
  const da = a.a - b.a
  const db = a.b - b.b
  return Math.sqrt(dL * dL + da * da + db * db)
}

// --- Hex ↔ RGB 转换 ---

export function hexToRgb(hex: string): RgbColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  }
}

export function rgbToHex(rgb: RgbColor): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase()
}

// --- 色卡缓存 ---

interface PaletteEntry {
  hex: string
  rgb: RgbColor
  oklab: OklabColor
  codes: Record<string, string>
}

const paletteCache = new Map<string, PaletteEntry[]>()

function getPaletteEntries(paletteId: string, allowedSeries?: string[]): PaletteEntry[] {
  const cacheKey = allowedSeries && allowedSeries.length > 0
    ? `${paletteId}:${allowedSeries.slice().sort().join(',')}`
    : paletteId
  const cached = paletteCache.get(cacheKey)
  if (cached) return cached

  const entries: PaletteEntry[] = []
  for (const [hex, codes] of Object.entries(typedMapping)) {
    if (!codes[paletteId]) continue
    // 色系过滤：如果指定了 allowedSeries，只保留色号前缀匹配的条目
    if (allowedSeries && allowedSeries.length > 0) {
      const code = codes[paletteId]
      const series = extractSeries(code)
      if (!series || !allowedSeries.includes(series)) continue
    }
    const rgb = hexToRgb(hex)
    if (!rgb) continue
    entries.push({
      hex: hex.toUpperCase(),
      rgb,
      oklab: srgbToOklab(rgb),
      codes,
    })
  }

  paletteCache.set(cacheKey, entries)
  return entries
}

/**
 * 从色号中提取色系标识（取第一个字母前缀）
 * 例如 "A01" → "A", "B12" → "B", "DH15" → "DH", "IC04" → "IC"
 * 纯数字色号返回 null
 */
function extractSeries(code: string): string | null {
  const match = code.match(/^([A-Za-z]+)/)
  return match ? match[1].toUpperCase() : null
}

/**
 * 获取指定品牌下所有可用的色系列表（去重、排序）
 */
export function getSeriesList(paletteId: string): string[] {
  const seriesSet = new Set<string>()
  for (const codes of Object.values(typedMapping)) {
    const code = codes[paletteId]
    if (!code) continue
    const series = extractSeries(code)
    if (series) seriesSet.add(series)
  }
  return Array.from(seriesSet).sort()
}

// --- 最近邻匹配 ---

export function findNearestColor(rgb: RgbColor, paletteId: string, allowedSeries?: string[]): MatchResult {
  const entries = getPaletteEntries(paletteId, allowedSeries)
  if (entries.length === 0) {
    return { hex: '#000000', code: '?', distance: Infinity }
  }

  const targetOklab = srgbToOklab(rgb)
  let minDistance = Infinity
  let bestEntry = entries[0]

  for (const entry of entries) {
    const distance = oklabDistance(targetOklab, entry.oklab)
    if (distance < minDistance) {
      minDistance = distance
      bestEntry = entry
      if (distance === 0) break
    }
  }

  return {
    hex: bestEntry.hex,
    code: bestEntry.codes[paletteId] || '?',
    distance: minDistance,
  }
}

// --- 辅助：获取指定品牌的所有色号列表 ---

export function getColorList(paletteId: string, allowedSeries?: string[]): Array<{ hex: string; code: string }> {
  const entries = getPaletteEntries(paletteId, allowedSeries)
  return entries.map((entry) => ({
    hex: entry.hex,
    code: entry.codes[paletteId] || '?',
  }))
}

// --- 辅助：获取所有可用 HEX 值 ---

export function getAllHexValues(): string[] {
  return Object.keys(typedMapping)
}

// --- 辅助：通过 HEX 获取指定品牌色号 ---

export function getColorCodeByHex(hex: string, paletteId: string): string {
  const normalizedHex = hex.toUpperCase()
  const mapping = typedMapping[normalizedHex]
  if (mapping && mapping[paletteId]) {
    return mapping[paletteId]
  }
  return '?'
}

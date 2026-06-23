import { describe, it, expect } from 'vitest'
import {
  srgbToOklab,
  oklabDistance,
  hexToRgb,
  rgbToHex,
  findNearestColor,
  getColorList,
  getColorCodeByHex,
} from '../utils/color-mapper'

describe('hexToRgb / rgbToHex', () => {
  it('正确解析 HEX 为 RGB', () => {
    expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 })
    expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 })
    expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 })
  })

  it('无效 HEX 返回 null', () => {
    expect(hexToRgb('invalid')).toBeNull()
    expect(hexToRgb('#GGG')).toBeNull()
  })

  it('RGB → HEX 往返一致', () => {
    const rgb = { r: 128, g: 64, b: 32 }
    const hex = rgbToHex(rgb)
    const back = hexToRgb(hex)
    expect(back).toEqual(rgb)
  })
})

describe('srgbToOklab', () => {
  it('黑色 → Oklab L≈0', () => {
    const oklab = srgbToOklab({ r: 0, g: 0, b: 0 })
    expect(oklab.L).toBeCloseTo(0, 2)
  })

  it('白色 → Oklab L≈1', () => {
    const oklab = srgbToOklab({ r: 255, g: 255, b: 255 })
    expect(oklab.L).toBeCloseTo(1, 1)
  })

  it('纯红 → a > 0', () => {
    const oklab = srgbToOklab({ r: 255, g: 0, b: 0 })
    expect(oklab.a).toBeGreaterThan(0)
  })

  it('纯绿 → a < 0', () => {
    const oklab = srgbToOklab({ r: 0, g: 255, b: 0 })
    expect(oklab.a).toBeLessThan(0)
  })
})

describe('oklabDistance', () => {
  it('相同颜色距离为 0', () => {
    const color = srgbToOklab({ r: 128, g: 64, b: 32 })
    expect(oklabDistance(color, color)).toBeCloseTo(0, 10)
  })

  it('黑白距离最大', () => {
    const black = srgbToOklab({ r: 0, g: 0, b: 0 })
    const white = srgbToOklab({ r: 255, g: 255, b: 255 })
    const distance = oklabDistance(black, white)
    expect(distance).toBeGreaterThan(0.9)
  })

  it('相近颜色距离小', () => {
    const c1 = srgbToOklab({ r: 200, g: 100, b: 50 })
    const c2 = srgbToOklab({ r: 205, g: 105, b: 55 })
    expect(oklabDistance(c1, c2)).toBeLessThan(0.05)
  })
})

describe('findNearestColor', () => {
  it('精确匹配已知颜色', () => {
    // 从色卡中取一个已知 HEX 进行精确匹配
    const colorList = getColorList('MARD')
    if (colorList.length > 0) {
      const knownColor = colorList[0]
      const rgb = hexToRgb(knownColor.hex)!
      const result = findNearestColor(rgb, 'MARD')
      expect(result.hex).toBe(knownColor.hex)
      expect(result.distance).toBeCloseTo(0, 5)
    }
  })

  it('中间色匹配到最近邻', () => {
    // 一个不在色卡中的颜色，应该匹配到某个有效色号
    const result = findNearestColor({ r: 128, g: 128, b: 128 }, 'MARD')
    expect(result.hex).toMatch(/^#[0-9A-F]{6}$/)
    expect(result.code).not.toBe('?')
    expect(result.distance).toBeLessThan(0.1)
  })

  it('不同品牌返回对应色号', () => {
    const colorList = getColorList('COCO')
    if (colorList.length > 0) {
      const knownColor = colorList[0]
      const rgb = hexToRgb(knownColor.hex)!
      const result = findNearestColor(rgb, 'COCO')
      expect(result.code).toBe(knownColor.code)
    }
  })
})

describe('getColorList', () => {
  it('MARD 品牌返回非空列表', () => {
    const list = getColorList('MARD')
    expect(list.length).toBeGreaterThan(0)
    expect(list[0]).toHaveProperty('hex')
    expect(list[0]).toHaveProperty('code')
  })

  it('所有品牌都有色号', () => {
    const brands = ['MARD', 'COCO', '漫漫', '盼盼', '咪小窝'] as const
    for (const brand of brands) {
      const list = getColorList(brand)
      expect(list.length).toBeGreaterThan(0)
    }
  })
})

describe('getColorCodeByHex', () => {
  it('已知 HEX 返回正确色号', () => {
    const list = getColorList('MARD')
    if (list.length > 0) {
      const code = getColorCodeByHex(list[0].hex, 'MARD')
      expect(code).toBe(list[0].code)
    }
  })

  it('未知 HEX 返回 ?', () => {
    expect(getColorCodeByHex('#ZZZZZZ', 'MARD')).toBe('?')
  })
})

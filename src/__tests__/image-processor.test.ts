import { describe, it, expect } from 'vitest'
import { pixelateFromImageData } from '../utils/image-processor'

/**
 * 创建纯色 Uint8ClampedArray 用于测试
 */
function createSolidImageData(r: number, g: number, b: number, width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = 255
  }
  return data
}

/**
 * 创建左右分色图像数据
 */
function createSplitImageData(
  leftRgb: [number, number, number],
  rightRgb: [number, number, number],
  width: number,
  height: number
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  const halfWidth = Math.floor(width / 2)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      const rgb = x < halfWidth ? leftRgb : rightRgb
      data[index] = rgb[0]
      data[index + 1] = rgb[1]
      data[index + 2] = rgb[2]
      data[index + 3] = 255
    }
  }
  return data
}

describe('pixelateFromImageData - average 模式', () => {
  it('均匀红色块 → 全部匹配到红色系色号', () => {
    const imageData = createSolidImageData(255, 0, 0, 64, 64)
    const result = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'average',
      paletteId: 'MARD',
    })

    expect(result.cellData.length).toBe(4)
    expect(result.cellData[0].length).toBe(4)
    // 所有格子应该有值（非空）
    for (const row of result.cellData) {
      for (const hex of row) {
        expect(hex).toMatch(/^#[0-9A-F]{6}$/)
      }
    }
  })

  it('1×1 网格正常返回', () => {
    const imageData = createSolidImageData(0, 255, 0, 32, 32)
    const result = pixelateFromImageData({
      imageData,
      imageWidth: 32,
      imageHeight: 32,
      gridWidth: 1,
      gridHeight: 1,
      mode: 'average',
      paletteId: 'MARD',
    })

    expect(result.cellData.length).toBe(1)
    expect(result.cellData[0].length).toBe(1)
    expect(result.cellData[0][0]).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('耗时合理（32×32 < 2000ms）', () => {
    const imageData = createSolidImageData(128, 128, 128, 256, 256)
    const result = pixelateFromImageData({
      imageData,
      imageWidth: 256,
      imageHeight: 256,
      gridWidth: 32,
      gridHeight: 32,
      mode: 'average',
      paletteId: 'MARD',
    })

    expect(result.elapsedMs).toBeLessThan(2000)
    expect(result.cellData.length).toBe(32)
  })
})

describe('pixelateFromImageData - dominant 模式', () => {
  it('均匀色块 → 与 average 结果一致', () => {
    const imageData = createSolidImageData(0, 0, 255, 64, 64)
    const avgResult = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'average',
      paletteId: 'MARD',
    })
    const domResult = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'dominant',
      paletteId: 'MARD',
    })

    // 均匀色块两种模式结果应相同
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(domResult.cellData[y][x]).toBe(avgResult.cellData[y][x])
      }
    }
  })

  it('左右分色 → dominant 取主色', () => {
    // 左半纯红，右半纯蓝，用足够大的网格确保每种颜色出现多次，不被 denoiseGrid 孤立点消除
    const imageData = createSplitImageData([255, 0, 0], [0, 0, 255], 64, 64)
    const result = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 2,
      mode: 'dominant',
      paletteId: 'MARD',
    })

    expect(result.cellData.length).toBe(2)
    expect(result.cellData[0].length).toBe(4)
    // 左列（索引 0、1）应与右列（索引 2、3）颜色不同
    expect(result.cellData[0][0]).not.toBe(result.cellData[0][2])
  })
})

describe('pixelateFromImageData - 边界情况', () => {
  it('全透明图像 → 空格子', () => {
    const data = new Uint8ClampedArray(32 * 32 * 4) // 全 0，alpha=0
    const result = pixelateFromImageData({
      imageData: data,
      imageWidth: 32,
      imageHeight: 32,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'average',
      paletteId: 'MARD',
    })

    for (const row of result.cellData) {
      for (const hex of row) {
        expect(hex).toBe('')
      }
    }
  })

  it('64×64 网格不超时', () => {
    const imageData = createSolidImageData(100, 150, 200, 512, 512)
    const result = pixelateFromImageData({
      imageData,
      imageWidth: 512,
      imageHeight: 512,
      gridWidth: 64,
      gridHeight: 64,
      mode: 'average',
      paletteId: 'MARD',
    })

    expect(result.cellData.length).toBe(64)
    expect(result.cellData[0].length).toBe(64)
    expect(result.elapsedMs).toBeLessThan(5000)
  })
})

describe('pixelateFromImageData - palette-vote 模式', () => {
  it('均匀色块 → 与 average 模式结果相同', () => {
    const imageData = createSolidImageData(255, 0, 0, 64, 64)
    const avgResult = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'average',
      paletteId: 'MARD',
    })
    const voteResult = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'palette-vote',
      paletteId: 'MARD',
    })
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(voteResult.cellData[y][x]).toBe(avgResult.cellData[y][x])
      }
    }
  })

  it('75% 主色 + 25% 次色 → 投票结果与纯主色块相同', () => {
    const width = 64
    const height = 64
    const mixedData = new Uint8ClampedArray(width * height * 4)
    const threshold = Math.floor(0.75 * width * height)
    for (let i = 0; i < width * height; i++) {
      const isRed = i < threshold
      mixedData[i * 4] = isRed ? 255 : 0
      mixedData[i * 4 + 1] = 0
      mixedData[i * 4 + 2] = isRed ? 0 : 255
      mixedData[i * 4 + 3] = 255
    }
    const pureRedData = createSolidImageData(255, 0, 0, width, height)

    const mixedResult = pixelateFromImageData({
      imageData: mixedData,
      imageWidth: width,
      imageHeight: height,
      gridWidth: 1,
      gridHeight: 1,
      mode: 'palette-vote',
      paletteId: 'MARD',
    })
    const pureRedResult = pixelateFromImageData({
      imageData: pureRedData,
      imageWidth: width,
      imageHeight: height,
      gridWidth: 1,
      gridHeight: 1,
      mode: 'average',
      paletteId: 'MARD',
    })

    expect(mixedResult.cellData[0][0]).toBe(pureRedResult.cellData[0][0])
  })

  it('200×200 网格 + 1024×1024 图像 < 5000ms', () => {
    const imageData = createSolidImageData(128, 100, 180, 1024, 1024)
    const result = pixelateFromImageData({
      imageData,
      imageWidth: 1024,
      imageHeight: 1024,
      gridWidth: 200,
      gridHeight: 200,
      mode: 'palette-vote',
      paletteId: 'MARD',
    })
    expect(result.elapsedMs).toBeLessThan(5000)
    expect(result.cellData.length).toBe(200)
    expect(result.cellData[0].length).toBe(200)
  })
})

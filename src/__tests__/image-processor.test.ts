import { describe, it, expect } from 'vitest'
import { pixelateFromImageData, applyBoxBlur } from '../utils/image-processor'

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

describe('pixelateFromImageData - adaptive 模式', () => {
  it('均匀色块（方差=0）→ 与 average 模式结果相同', () => {
    const imageData = createSolidImageData(100, 150, 200, 64, 64)
    const avgResult = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'average',
      paletteId: 'MARD',
    })
    const adaptiveResult = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'adaptive',
      paletteId: 'MARD',
    })
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(adaptiveResult.cellData[y][x]).toBe(avgResult.cellData[y][x])
      }
    }
  })

  it('高方差色块（黑白分割）→ 每格返回有效的调色板色', () => {
    const imageData = createSplitImageData([0, 0, 0], [255, 255, 255], 64, 64)
    const result = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'adaptive',
      paletteId: 'MARD',
    })
    for (const row of result.cellData) {
      for (const hex of row) {
        expect(hex).toMatch(/^#[0-9A-F]{6}$/)
      }
    }
  })

  it('200×200 网格 + 1024×1024 图像 < 5000ms', () => {
    const imageData = createSolidImageData(100, 150, 200, 1024, 1024)
    const result = pixelateFromImageData({
      imageData,
      imageWidth: 1024,
      imageHeight: 1024,
      gridWidth: 200,
      gridHeight: 200,
      mode: 'adaptive',
      paletteId: 'MARD',
    })
    expect(result.elapsedMs).toBeLessThan(5000)
    expect(result.cellData.length).toBe(200)
    expect(result.cellData[0].length).toBe(200)
  })
})

describe('applyBoxBlur', () => {
  it('均匀图像模糊后像素值不变', () => {
    const data = createSolidImageData(100, 150, 200, 16, 16)
    const result = applyBoxBlur(data, 16, 16, 2)
    for (let i = 0; i < 16 * 16; i++) {
      expect(result[i * 4]).toBe(100)
      expect(result[i * 4 + 1]).toBe(150)
      expect(result[i * 4 + 2]).toBe(200)
    }
  })

  it('不修改原始 imageData', () => {
    const data = createSolidImageData(255, 0, 0, 8, 8)
    const original = new Uint8ClampedArray(data)
    applyBoxBlur(data, 8, 8, 2)
    expect(data).toEqual(original)
  })

  it('左右分色图像：中间边界像素被混合，两端像素基本不变', () => {
    // 8×1 图像：左 4 像素纯红，右 4 像素纯蓝
    const data = createSplitImageData([255, 0, 0], [0, 0, 255], 8, 1)
    const result = applyBoxBlur(data, 8, 1, 2)
    // 最左像素应仍接近红色（R 通道高）
    expect(result[0]).toBeGreaterThan(150)
    // 最右像素应仍接近蓝色（B 通道高）
    expect(result[7 * 4 + 2]).toBeGreaterThan(150)
    // 边界处（索引 3）应是混合色（R 和 B 都有值）
    expect(result[3 * 4]).toBeGreaterThan(0)
    expect(result[3 * 4 + 2]).toBeGreaterThan(0)
  })
})

describe('pixelateFromImageData - preprocessed 模式', () => {
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
    const prepResult = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'preprocessed',
      paletteId: 'MARD',
    })
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(prepResult.cellData[y][x]).toBe(avgResult.cellData[y][x])
      }
    }
  })

  it('左右分色 → 两列颜色不同', () => {
    const imageData = createSplitImageData([255, 0, 0], [0, 0, 255], 64, 64)
    const result = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 2,
      mode: 'preprocessed',
      paletteId: 'MARD',
    })
    expect(result.cellData[0][0]).not.toBe(result.cellData[0][2])
  })

  it('200×200 网格 + 1024×1024 图像 < 5000ms', () => {
    const imageData = createSolidImageData(128, 128, 128, 1024, 1024)
    const result = pixelateFromImageData({
      imageData,
      imageWidth: 1024,
      imageHeight: 1024,
      gridWidth: 200,
      gridHeight: 200,
      mode: 'preprocessed',
      paletteId: 'MARD',
    })
    expect(result.elapsedMs).toBeLessThan(5000)
    expect(result.cellData.length).toBe(200)
    expect(result.cellData[0].length).toBe(200)
  })
})

describe('pixelateFromImageData - weighted-median 模式', () => {
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
    const wmResult = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'weighted-median',
      paletteId: 'MARD',
    })
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(wmResult.cellData[y][x]).toBe(avgResult.cellData[y][x])
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
      mode: 'weighted-median',
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

  it('左右分色 → 边界处两列颜色不同', () => {
    const imageData = createSplitImageData([255, 0, 0], [0, 0, 255], 64, 64)
    const result = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 2,
      mode: 'weighted-median',
      paletteId: 'MARD',
    })

    expect(result.cellData.length).toBe(2)
    expect(result.cellData[0].length).toBe(4)
    expect(result.cellData[0][0]).not.toBe(result.cellData[0][2])
  })

  it('全透明图像 → 空格子', () => {
    const data = new Uint8ClampedArray(32 * 32 * 4)
    const result = pixelateFromImageData({
      imageData: data,
      imageWidth: 32,
      imageHeight: 32,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'weighted-median',
      paletteId: 'MARD',
    })
    for (const row of result.cellData) {
      for (const hex of row) {
        expect(hex).toBe('')
      }
    }
  })

  it('200×200 网格 + 1024×1024 图像 < 5000ms', () => {
    const imageData = createSolidImageData(128, 128, 128, 1024, 1024)
    const result = pixelateFromImageData({
      imageData,
      imageWidth: 1024,
      imageHeight: 1024,
      gridWidth: 200,
      gridHeight: 200,
      mode: 'weighted-median',
      paletteId: 'MARD',
    })
    expect(result.elapsedMs).toBeLessThan(5000)
    expect(result.cellData.length).toBe(200)
    expect(result.cellData[0].length).toBe(200)
  })
})

describe('pixelateFromImageData - gaussian-weighted 模式', () => {
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
    const gwResult = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'gaussian-weighted',
      paletteId: 'MARD',
    })
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(gwResult.cellData[y][x]).toBe(avgResult.cellData[y][x])
      }
    }
  })

  it('左右分色 → 边界处两列颜色不同', () => {
    const imageData = createSplitImageData([255, 0, 0], [0, 0, 255], 64, 64)
    const result = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 2,
      mode: 'gaussian-weighted',
      paletteId: 'MARD',
    })
    expect(result.cellData[0][0]).not.toBe(result.cellData[0][2])
  })

  it('全透明图像 → 空格子', () => {
    const data = new Uint8ClampedArray(32 * 32 * 4)
    const result = pixelateFromImageData({
      imageData: data,
      imageWidth: 32,
      imageHeight: 32,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'gaussian-weighted',
      paletteId: 'MARD',
    })
    for (const row of result.cellData) {
      for (const hex of row) {
        expect(hex).toBe('')
      }
    }
  })

  it('自定义 sigma 参数生效', () => {
    const imageData = createSolidImageData(128, 128, 128, 64, 64)
    const defaultResult = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'gaussian-weighted',
      paletteId: 'MARD',
    })
    const customResult = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'gaussian-weighted',
      paletteId: 'MARD',
      gaussianWeightedConfig: { sigma: 1.0 },
    })
    // 均匀色块下，不同 sigma 结果应相同
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(customResult.cellData[y][x]).toBe(defaultResult.cellData[y][x])
      }
    }
  })

  it('200×200 网格 + 1024×1024 图像 < 5000ms', () => {
    const imageData = createSolidImageData(128, 128, 128, 1024, 1024)
    const result = pixelateFromImageData({
      imageData,
      imageWidth: 1024,
      imageHeight: 1024,
      gridWidth: 200,
      gridHeight: 200,
      mode: 'gaussian-weighted',
      paletteId: 'MARD',
    })
    expect(result.elapsedMs).toBeLessThan(5000)
    expect(result.cellData.length).toBe(200)
    expect(result.cellData[0].length).toBe(200)
  })
})

describe('pixelateFromImageData - edge-aware 模式', () => {
  it('均匀色块 → 与 average 模式结果相同', () => {
    const imageData = createSolidImageData(100, 150, 200, 64, 64)
    const avgResult = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'average',
      paletteId: 'MARD',
    })
    const eaResult = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'edge-aware',
      paletteId: 'MARD',
    })
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(eaResult.cellData[y][x]).toBe(avgResult.cellData[y][x])
      }
    }
  })

  it('左右分色 → 边界处两列颜色不同', () => {
    const imageData = createSplitImageData([255, 0, 0], [0, 0, 255], 64, 64)
    const result = pixelateFromImageData({
      imageData,
      imageWidth: 64,
      imageHeight: 64,
      gridWidth: 4,
      gridHeight: 2,
      mode: 'edge-aware',
      paletteId: 'MARD',
    })
    expect(result.cellData[0][0]).not.toBe(result.cellData[0][2])
  })

  it('全透明图像 → 空格子', () => {
    const data = new Uint8ClampedArray(32 * 32 * 4)
    const result = pixelateFromImageData({
      imageData: data,
      imageWidth: 32,
      imageHeight: 32,
      gridWidth: 4,
      gridHeight: 4,
      mode: 'edge-aware',
      paletteId: 'MARD',
    })
    for (const row of result.cellData) {
      for (const hex of row) {
        expect(hex).toBe('')
      }
    }
  })

  it('200×200 网格 + 1024×1024 图像 < 5000ms', () => {
    const imageData = createSolidImageData(128, 128, 128, 1024, 1024)
    const result = pixelateFromImageData({
      imageData,
      imageWidth: 1024,
      imageHeight: 1024,
      gridWidth: 200,
      gridHeight: 200,
      mode: 'edge-aware',
      paletteId: 'MARD',
    })
    expect(result.elapsedMs).toBeLessThan(5000)
    expect(result.cellData.length).toBe(200)
    expect(result.cellData[0].length).toBe(200)
  })
})

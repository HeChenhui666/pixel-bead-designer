import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { PixelationMode } from '../utils/image-processor'

/** weighted-median 模式的可调参数 */
export interface WeightedMedianConfig {
  /** 中心区域像素的投票权重，默认 3 */
  centerWeight: number
  /** 外围像素的投票权重，默认 1 */
  edgeWeight: number
  /** 中心区域占块的比例（0.1~0.9），默认 0.4 表示 40%×40% */
  centerRatio: number
}

export const DEFAULT_WEIGHTED_MEDIAN_CONFIG: WeightedMedianConfig = {
  centerWeight: 3,
  edgeWeight: 1,
  centerRatio: 0.4,
}

/** adaptive 模式的可调参数 */
export interface AdaptiveConfig {
  /** 方差阈值：低于此值用全块平均，高于此值用中心子块平均。默认 2000 */
  varianceThreshold: number
  /** 背景色距离阈值（Oklab）：小于此值的像素视为背景被过滤。默认 0.03 */
  bgDistThreshold: number
  /** 高方差时中心子块占比（0.1~0.9），默认 0.5 表示 50%×50% */
  centerRatio: number
}

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  varianceThreshold: 2000,
  bgDistThreshold: 0.03,
  centerRatio: 0.5,
}

/** gaussian-weighted 模式的可调参数 */
export interface GaussianWeightedConfig {
  /** 高斯核标准差（sigma），控制权重衰减速度。默认 0.4 */
  sigma: number
}

export const DEFAULT_GAUSSIAN_WEIGHTED_CONFIG: GaussianWeightedConfig = {
  sigma: 0.4,
}

/** edge-aware 模式的可调参数 */
export interface EdgeAwareConfig {
  /** 梯度阈值：低于此值认为块内无边缘，用全块平均。默认 50 */
  gradientThreshold: number
  /** 沿梯度方向采样的窄条宽度占比（0.1~0.9），默认 0.3 表示 30% */
  stripWidth: number
}

export const DEFAULT_EDGE_AWARE_CONFIG: EdgeAwareConfig = {
  gradientThreshold: 50,
  stripWidth: 0.3,
}

export const useConfigStore = defineStore('config', () => {
  const defaultGridSize = ref(32)
  const defaultPalette = ref('MARD')
  const pixelationMode = ref<PixelationMode>('adaptive')
  const weightedMedianConfig = ref<WeightedMedianConfig>({ ...DEFAULT_WEIGHTED_MEDIAN_CONFIG })
  const adaptiveConfig = ref<AdaptiveConfig>({ ...DEFAULT_ADAPTIVE_CONFIG })
  const gaussianWeightedConfig = ref<GaussianWeightedConfig>({ ...DEFAULT_GAUSSIAN_WEIGHTED_CONFIG })
  const edgeAwareConfig = ref<EdgeAwareConfig>({ ...DEFAULT_EDGE_AWARE_CONFIG })
  // 每个品牌选中的色系列表，空数组表示不限制（使用全部色系）
  const selectedSeries = ref<Record<string, string[]>>({})
  function loadFromStorage() {
    try {
      const saved = uni.getStorageSync('app_config')
      if (saved) {
        const config = JSON.parse(saved)
        if (config.defaultGridSize) defaultGridSize.value = config.defaultGridSize
        if (config.defaultPalette) defaultPalette.value = config.defaultPalette
        if (config.pixelationMode) pixelationMode.value = config.pixelationMode
        if (config.weightedMedianConfig) weightedMedianConfig.value = config.weightedMedianConfig
        if (config.adaptiveConfig) adaptiveConfig.value = config.adaptiveConfig
        if (config.gaussianWeightedConfig) gaussianWeightedConfig.value = config.gaussianWeightedConfig
        if (config.edgeAwareConfig) edgeAwareConfig.value = config.edgeAwareConfig
        if (config.selectedSeries) selectedSeries.value = config.selectedSeries
      }
    } catch {
      // ignore parse errors, use defaults
    }
  }

  function saveToStorage() {
    try {
      uni.setStorageSync('app_config', JSON.stringify({
        defaultGridSize: defaultGridSize.value,
        defaultPalette: defaultPalette.value,
        pixelationMode: pixelationMode.value,
        weightedMedianConfig: weightedMedianConfig.value,
        adaptiveConfig: adaptiveConfig.value,
        gaussianWeightedConfig: gaussianWeightedConfig.value,
        edgeAwareConfig: edgeAwareConfig.value,
        selectedSeries: selectedSeries.value,
      }))
    } catch {
      // ignore storage errors
    }
  }

  watch([defaultGridSize, defaultPalette, pixelationMode, weightedMedianConfig, adaptiveConfig, gaussianWeightedConfig, edgeAwareConfig, selectedSeries], () => {
    saveToStorage()
  }, { deep: true })

  loadFromStorage()

  return {
    defaultGridSize,
    defaultPalette,
    pixelationMode,
    weightedMedianConfig,
    adaptiveConfig,
    gaussianWeightedConfig,
    edgeAwareConfig,
    selectedSeries,
  }
})

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { PixelationMode } from '../utils/image-processor'

export const useConfigStore = defineStore('config', () => {
  const defaultGridSize = ref(32)
  const defaultPalette = ref('MARD')
  const pixelationMode = ref<PixelationMode>('adaptive')
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
        selectedSeries: selectedSeries.value,
      }))
    } catch {
      // ignore storage errors
    }
  }

  watch([defaultGridSize, defaultPalette, pixelationMode, selectedSeries], () => {
    saveToStorage()
  }, { deep: true })

  loadFromStorage()

  return {
    defaultGridSize,
    defaultPalette,
    pixelationMode,
    selectedSeries,
  }
})

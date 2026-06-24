<template>
  <view class="param-panel">
    <!-- 网格尺寸 -->
    <view class="section">
      <text class="section-title">网格尺寸</text>
      <view class="preset-row">
        <view v-for="preset in presets" :key="preset.label" class="preset-btn"
          :class="{ active: isActivePreset(preset) }" @click="selectPreset(preset)">
          <text class="preset-label">{{ preset.label }}</text>
          <text class="preset-size">{{ preset.width }}×{{ preset.height }}</text>
        </view>
      </view>
      <view v-if="isCustom" class="custom-input-row">
        <view class="input-group">
          <text class="input-label">宽</text>
          <input type="number" :value="projectStore.gridWidth" class="size-input" @input="onWidthInput" />
        </view>
        <text class="input-separator">×</text>
        <view class="input-group">
          <text class="input-label">高</text>
          <input type="number" :value="projectStore.gridHeight" class="size-input" @input="onHeightInput" />
        </view>
      </view>
    </view>

    <!-- 像素化模式 -->
    <view class="section">
      <text class="section-title">像素化模式</text>
      <view class="mode-row">
        <view class="mode-btn" :class="{ active: configStore.pixelationMode === 'adaptive' }"
          @click="configStore.pixelationMode = 'adaptive'">
          <text>自适应</text>
        </view>
        <view class="mode-btn" :class="{ active: configStore.pixelationMode === 'average' }"
          @click="configStore.pixelationMode = 'average'">
          <text>平均色</text>
        </view>
      </view>
    </view>

    <!-- 品牌选择 -->
    <view class="section">
      <text class="section-title">拼豆品牌</text>
      <view class="brand-row">
        <view v-for="brand in brands" :key="brand" class="brand-tag"
          :class="{ active: projectStore.paletteId === brand }" @click="projectStore.paletteId = brand">
          <text>{{ brand }}</text>
        </view>
      </view>
    </view>

    <!-- 色系选择（仅对有字母前缀色号的品牌显示） -->
    <view v-if="currentSeriesList.length > 0" class="section">
      <view class="series-header">
        <text class="section-title">色系选择</text>
        <view class="series-toggle-all" @click="toggleAllSeries">
          <text class="series-toggle-text">{{ isAllSeriesSelected ? '取消全选' : '全选' }}</text>
        </view>
      </view>
      <view class="series-row">
        <view v-for="series in currentSeriesList" :key="series" class="series-tag"
          :class="{ active: isSeriesSelected(series) }" @click="toggleSeries(series)">
          <text>{{ series }}系</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectStore } from '../stores/useProjectStore'
import { useConfigStore } from '../stores/useConfigStore'
import { getSeriesList } from '../utils/color-mapper'
import type { PaletteId } from '../stores/useProjectStore'

const projectStore = useProjectStore()
const configStore = useConfigStore()

interface Preset {
  label: string
  width: number
  height: number
}

const presets: Preset[] = [
  { label: '小图', width: 32, height: 32 },
  { label: '中图', width: 48, height: 48 },
  { label: '大图', width: 98, height: 98 },
  { label: '自定义', width: 0, height: 0 },
]

const brands: PaletteId[] = ['MARD', 'COCO', '漫漫', '盼盼', '咪小窝']

const isCustom = ref(false)

// 当前品牌可用的色系列表
const currentSeriesList = computed(() => getSeriesList(projectStore.paletteId))

// 当前品牌已选中的色系
const currentSelectedSeries = computed(() => configStore.selectedSeries[projectStore.paletteId] || [])

const isAllSeriesSelected = computed(() => {
  const list = currentSeriesList.value
  const selected = currentSelectedSeries.value
  return list.length > 0 && selected.length === list.length
})

function isSeriesSelected(series: string): boolean {
  return currentSelectedSeries.value.includes(series)
}

function toggleSeries(series: string) {
  const paletteId = projectStore.paletteId
  const current = [...(configStore.selectedSeries[paletteId] || [])]
  const index = current.indexOf(series)
  if (index >= 0) {
    current.splice(index, 1)
  } else {
    current.push(series)
  }
  configStore.selectedSeries[paletteId] = current
}

function toggleAllSeries() {
  const paletteId = projectStore.paletteId
  if (isAllSeriesSelected.value) {
    configStore.selectedSeries[paletteId] = []
  } else {
    configStore.selectedSeries[paletteId] = [...currentSeriesList.value]
  }
}

function isActivePreset(preset: Preset): boolean {
  if (preset.width === 0) return isCustom.value
  return !isCustom.value && projectStore.gridWidth === preset.width && projectStore.gridHeight === preset.height
}

function selectPreset(preset: Preset) {
  if (preset.width === 0) {
    isCustom.value = true
    return
  }
  isCustom.value = false
  projectStore.setGridSize(preset.width, preset.height)
}

function clampSize(value: number): number {
  return Math.min(398, Math.max(2, Math.round(value)))
}

function onWidthInput(event: any) {
  const value = clampSize(Number(event.detail.value))
  projectStore.setGridSize(value, projectStore.gridHeight)
}

function onHeightInput(event: any) {
  const value = clampSize(Number(event.detail.value))
  projectStore.setGridSize(projectStore.gridWidth, value)
}
</script>

<style scoped>
.param-panel {
  padding: 16px;
}

.section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 14px;
  color: #666666;
  margin-bottom: 8px;
  display: block;
}

.preset-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 16px;
  border-radius: 8px;
  background-color: #f5f5f5;
  min-width: 72px;
}

.preset-btn.active {
  background-color: #007AFF;
}

.preset-btn.active .preset-label,
.preset-btn.active .preset-size {
  color: #ffffff;
}

.preset-label {
  font-size: 14px;
  color: #1a1a1a;
}

.preset-size {
  font-size: 12px;
  color: #666666;
  margin-top: 2px;
}

.custom-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.input-label {
  font-size: 14px;
  color: #666666;
}

.size-input {
  width: 64px;
  height: 36px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
}

.input-separator {
  font-size: 16px;
  color: #999999;
}

.mode-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mode-btn {
  flex: 1;
  padding: 10px;
  text-align: center;
  border-radius: 8px;
  background-color: #f5f5f5;
  font-size: 14px;
  color: #1a1a1a;
}

.mode-btn.active {
  background-color: #007AFF;
  color: #ffffff;
}

.brand-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.brand-tag {
  padding: 6px 14px;
  border-radius: 999px;
  background-color: #f5f5f5;
  font-size: 13px;
  color: #1a1a1a;
}

.brand-tag.active {
  background-color: #007AFF;
  color: #ffffff;
}

.series-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.series-toggle-all {
  padding: 2px 10px;
  border-radius: 999px;
  background-color: #f0f0f0;
}

.series-toggle-text {
  font-size: 12px;
  color: #007AFF;
}

.series-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.series-tag {
  padding: 5px 12px;
  border-radius: 999px;
  background-color: #f5f5f5;
  font-size: 13px;
  color: #1a1a1a;
}

.series-tag.active {
  background-color: #007AFF;
  color: #ffffff;
}
</style>

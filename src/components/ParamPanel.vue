<template>
  <view class="param-panel">
    <!-- 网格尺寸 -->
    <view class="section">
      <text class="section-title">网格尺寸</text>
      <view class="preset-row">
        <view v-for="preset in presets.slice(0, 3)" :key="preset.label" class="preset-btn"
          :class="{ active: isActivePreset(preset) }" @click="selectPreset(preset)">
          <text class="preset-label">{{ preset.label }}</text>
          <text class="preset-size">{{ preset.width }}×{{ preset.height }}</text>
        </view>
      </view>
      <view class="custom-preset-row">
        <view class="preset-btn custom-btn"
          :class="{ active: isCustom }" @click="selectPreset(presets[3])">
          <text class="preset-label">自定义</text>
          <text v-if="!isCustom" class="preset-size">自定义尺寸</text>
          <view v-if="isCustom" class="custom-input-inline">
            <view class="input-group">
              <text class="input-label">宽</text>
              <input type="number" v-model.number="localWidth" class="size-input" />
            </view>
            <text class="input-separator">×</text>
            <view class="input-group">
              <text class="input-label">高</text>
              <input type="number" v-model.number="localHeight" class="size-input" />
            </view>
          </view>
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
        <view class="mode-btn" :class="{ active: configStore.pixelationMode === 'weighted-median' }"
          @click="configStore.pixelationMode = 'weighted-median'">
          <text>加权中值</text>
        </view>
        <view class="mode-btn" :class="{ active: configStore.pixelationMode === 'gaussian-weighted' }"
          @click="configStore.pixelationMode = 'gaussian-weighted'">
          <text>高斯加权</text>
        </view>
        <view class="mode-btn" :class="{ active: configStore.pixelationMode === 'edge-aware' }"
          @click="configStore.pixelationMode = 'edge-aware'">
          <text>边缘感知</text>
        </view>
      </view>
    </view>

    <!-- 加权中值参数 -->
    <view v-if="configStore.pixelationMode === 'weighted-median'" class="section">
      <text class="section-title">加权中值参数</text>
      <view class="param-row">
        <text class="param-label">中心权重</text>
        <view class="slider-group">
          <input
            type="number"
            :value="configStore.weightedMedianConfig.centerWeight"
            class="param-input"
            @input="updateWmConfig('centerWeight', $event)"
          />
        </view>
      </view>
      <view class="param-row">
        <text class="param-label">外围权重</text>
        <view class="slider-group">
          <input
            type="number"
            :value="configStore.weightedMedianConfig.edgeWeight"
            class="param-input"
            @input="updateWmConfig('edgeWeight', $event)"
          />
        </view>
      </view>
      <view class="param-row">
        <text class="param-label">中心区域</text>
        <view class="slider-group">
          <input
            type="number"
            :value="Math.round(configStore.weightedMedianConfig.centerRatio * 100)"
            class="param-input"
            @input="updateCenterRatio($event)"
          />
          <text class="param-unit">%</text>
        </view>
      </view>
      <view class="param-hint-row">
        <text class="param-hint">中心/外围权重比越大 → 边界越清晰</text>
      </view>
      <view class="param-hint-row">
        <text class="param-hint">中心区域越小 → 加权聚焦越集中</text>
      </view>
      <view class="reset-row">
        <view class="reset-btn" @click="resetWeightedMedianConfig()">
          <text class="reset-btn-text">恢复初始值</text>
        </view>
      </view>
    </view>

    <!-- 自适应参数 -->
    <view v-if="configStore.pixelationMode === 'adaptive'" class="section">
      <text class="section-title">自适应参数</text>
      <view class="param-row">
        <text class="param-label">方差阈值</text>
        <view class="slider-group">
          <input
            type="number"
            :value="configStore.adaptiveConfig.varianceThreshold"
            class="param-input"
            @input="updateAdaptiveConfig('varianceThreshold', $event)"
          />
        </view>
      </view>
      <view class="param-row">
        <text class="param-label">背景距离</text>
        <view class="slider-group">
          <input
            type="digit"
            :value="configStore.adaptiveConfig.bgDistThreshold"
            class="param-input"
            @input="updateAdaptiveBgDist($event)"
          />
        </view>
      </view>
      <view class="param-row">
        <text class="param-label">中心区域</text>
        <view class="slider-group">
          <input
            type="number"
            :value="Math.round(configStore.adaptiveConfig.centerRatio * 100)"
            class="param-input"
            @input="updateAdaptiveCenterRatio($event)"
          />
          <text class="param-unit">%</text>
        </view>
      </view>
      <view class="param-hint-row">
        <text class="param-hint">方差阈值越低 → 更多块用中心子块（边界更清晰）</text>
      </view>
      <view class="param-hint-row">
        <text class="param-hint">背景距离越高 → 更多像素被当作背景过滤（杂色更少）</text>
      </view>
      <view class="param-hint-row">
        <text class="param-hint">中心区域越小 → 高方差块取样更集中</text>
      </view>
      <view class="reset-row">
        <view class="reset-btn" @click="resetAdaptiveConfig()">
          <text class="reset-btn-text">恢复初始值</text>
        </view>
      </view>
    </view>

    <!-- 高斯加权参数 -->
    <view v-if="configStore.pixelationMode === 'gaussian-weighted'" class="section">
      <text class="section-title">高斯加权参数</text>
      <view class="param-row">
        <text class="param-label">Sigma</text>
        <view class="slider-group">
          <input
            type="digit"
            :value="configStore.gaussianWeightedConfig.sigma"
            class="param-input"
            @input="updateGaussianSigma($event)"
          />
        </view>
      </view>
      <view class="param-hint-row">
        <text class="param-hint">Sigma 越小 → 权重衰减越快，越聚焦中心（边界清晰）</text>
      </view>
      <view class="param-hint-row">
        <text class="param-hint">Sigma 越大 → 权重分布越均匀，越接近全块平均（平滑还原）</text>
      </view>
      <view class="reset-row">
        <view class="reset-btn" @click="resetGaussianWeightedConfig()">
          <text class="reset-btn-text">恢复初始值</text>
        </view>
      </view>
    </view>

    <!-- 边缘感知参数 -->
    <view v-if="configStore.pixelationMode === 'edge-aware'" class="section">
      <text class="section-title">边缘感知参数</text>
      <view class="param-row">
        <text class="param-label">梯度阈值</text>
        <view class="slider-group">
          <input
            type="number"
            :value="configStore.edgeAwareConfig.gradientThreshold"
            class="param-input"
            @input="updateEdgeAwareConfig('gradientThreshold', $event)"
          />
        </view>
      </view>
      <view class="param-row">
        <text class="param-label">窄条宽度</text>
        <view class="slider-group">
          <input
            type="number"
            :value="Math.round(configStore.edgeAwareConfig.stripWidth * 100)"
            class="param-input"
            @input="updateEdgeAwareStripWidth($event)"
          />
          <text class="param-unit">%</text>
        </view>
      </view>
      <view class="param-hint-row">
        <text class="param-hint">梯度阈值越低 → 更多块被识别为有边缘（边界更敏感）</text>
      </view>
      <view class="param-hint-row">
        <text class="param-hint">窄条宽度越小 → 沿边缘取样更精准，边界线更保留</text>
      </view>
      <view class="reset-row">
        <view class="reset-btn" @click="resetEdgeAwareConfig()">
          <text class="reset-btn-text">恢复初始值</text>
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

    <!-- 色系选择 -->
    <view v-if="currentSeriesList.length > 0" class="section">
      <view class="series-header">
        <text class="section-title">色系选择</text>
        <view class="series-toggle-all" @click="toggleAllSeries()">
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
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '../stores/useProjectStore'
import { useConfigStore, DEFAULT_WEIGHTED_MEDIAN_CONFIG, DEFAULT_ADAPTIVE_CONFIG, DEFAULT_GAUSSIAN_WEIGHTED_CONFIG, DEFAULT_EDGE_AWARE_CONFIG } from '../stores/useConfigStore'
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

// 本地临时变量，用于 v-model 绑定
const localWidth = ref(projectStore.gridWidth)
const localHeight = ref(projectStore.gridHeight)

// 监听 store 变化，同步到本地变量（当用户点击预设按钮时）
watch(() => projectStore.gridWidth, (newVal) => {
  if (!isCustom.value) {
    localWidth.value = newVal
  }
})

watch(() => projectStore.gridHeight, (newVal) => {
  if (!isCustom.value) {
    localHeight.value = newVal
  }
})

// 监听本地变量变化，更新 store（当用户在自定义模式下输入时）
watch(localWidth, (newVal) => {
  if (isCustom.value && !isNaN(newVal)) {
    const clampedValue = clampSize(newVal)
    console.log('[ParamPanel] 宽度变化:', newVal, '→', clampedValue)
    projectStore.setGridSize(clampedValue, projectStore.gridHeight)
  }
})

watch(localHeight, (newVal) => {
  if (isCustom.value && !isNaN(newVal)) {
    const clampedValue = clampSize(newVal)
    console.log('[ParamPanel] 高度变化:', newVal, '→', clampedValue)
    projectStore.setGridSize(projectStore.gridWidth, clampedValue)
  }
})

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
    // 取消全选：清空当前品牌的色系选择
    configStore.selectedSeries = {
      ...configStore.selectedSeries,
      [paletteId]: [],
    }
  } else {
    // 全选：选中所有可用的色系
    configStore.selectedSeries = {
      ...configStore.selectedSeries,
      [paletteId]: [...currentSeriesList.value],
    }
  }
}

function isActivePreset(preset: Preset): boolean {
  if (preset.width === 0) return isCustom.value
  return !isCustom.value && projectStore.gridWidth === preset.width && projectStore.gridHeight === preset.height
}

function selectPreset(preset: Preset) {
  if (preset.width === 0) {
    isCustom.value = true
    // 点击自定义按钮时，确保 store 中的宽高值被正确读取
    console.log('[ParamPanel] 切换到自定义模式，当前 store 宽高:', projectStore.gridWidth, '×', projectStore.gridHeight)
    return
  }
  isCustom.value = false
  projectStore.setGridSize(preset.width, preset.height)
}

function clampSize(value: number): number {
  if (isNaN(value) || value < 2) return 2
  if (value > 398) return 398
  return Math.round(value)
}

function updateWmConfig(key: 'centerWeight' | 'edgeWeight', event: any) {
  const raw = Number(event.detail?.value ?? event.target?.value ?? 0)
  const value = Math.max(1, Math.round(raw))
  configStore.weightedMedianConfig = {
    ...configStore.weightedMedianConfig,
    [key]: value,
  }
}

function updateCenterRatio(event: any) {
  const raw = Number(event.detail?.value ?? event.target?.value ?? 50)
  const percent = Math.max(10, Math.min(90, Math.round(raw)))
  const ratio = percent / 100
  configStore.weightedMedianConfig = {
    ...configStore.weightedMedianConfig,
    centerRatio: ratio,
  }
}

function updateAdaptiveConfig(key: 'varianceThreshold', event: any) {
  const raw = Number(event.detail?.value ?? event.target?.value ?? 0)
  const value = Math.max(100, Math.round(raw))
  configStore.adaptiveConfig = {
    ...configStore.adaptiveConfig,
    [key]: value,
  }
}

function updateAdaptiveBgDist(event: any) {
  const raw = Number(event.detail?.value ?? event.target?.value ?? 0.03)
  const value = Math.max(0.001, Math.min(0.5, raw))
  configStore.adaptiveConfig = {
    ...configStore.adaptiveConfig,
    bgDistThreshold: value,
  }
}

function updateAdaptiveCenterRatio(event: any) {
  const raw = Number(event.detail?.value ?? event.target?.value ?? 50)
  const percent = Math.max(10, Math.min(90, Math.round(raw)))
  const ratio = percent / 100
  configStore.adaptiveConfig = {
    ...configStore.adaptiveConfig,
    centerRatio: ratio,
  }
}

function resetWeightedMedianConfig() {
  configStore.weightedMedianConfig = { ...DEFAULT_WEIGHTED_MEDIAN_CONFIG }
}

function resetAdaptiveConfig() {
  configStore.adaptiveConfig = { ...DEFAULT_ADAPTIVE_CONFIG }
}

function updateGaussianSigma(event: any) {
  const raw = Number(event.detail?.value ?? event.target?.value ?? 0.4)
  const value = Math.max(0.1, Math.min(2.0, raw))
  configStore.gaussianWeightedConfig = {
    ...configStore.gaussianWeightedConfig,
    sigma: value,
  }
}

function resetGaussianWeightedConfig() {
  configStore.gaussianWeightedConfig = { ...DEFAULT_GAUSSIAN_WEIGHTED_CONFIG }
}

function updateEdgeAwareConfig(key: 'gradientThreshold', event: any) {
  const raw = Number(event.detail?.value ?? event.target?.value ?? 0)
  const value = Math.max(1, Math.round(raw))
  configStore.edgeAwareConfig = {
    ...configStore.edgeAwareConfig,
    [key]: value,
  }
}

function updateEdgeAwareStripWidth(event: any) {
  const raw = Number(event.detail?.value ?? event.target?.value ?? 30)
  const percent = Math.max(10, Math.min(90, Math.round(raw)))
  const ratio = percent / 100
  configStore.edgeAwareConfig = {
    ...configStore.edgeAwareConfig,
    stripWidth: ratio,
  }
}

function resetEdgeAwareConfig() {
  configStore.edgeAwareConfig = { ...DEFAULT_EDGE_AWARE_CONFIG }
}
</script>

<style scoped>
.param-panel {
  padding: 12px 16px 24px;
}

.section {
  margin-bottom: 18px;
}

.section-title {
  font-size: 13px;
  color: #9ca3af;
  margin-bottom: 10px;
  display: block;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.preset-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.custom-preset-row {
  margin-top: 10px;
}

.preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 14px;
  border-radius: 12px;
  background-color: #e8e4e0;
  min-width: 70px;
  transition: all 0.25s ease;
  border: 1.5px solid #d8d4d0;
}

.custom-btn {
  width: 100%;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
}

.preset-btn.active {
  background-color: #d4f0f0;
  border-color: #6bb3b3;
  box-shadow: 0 2px 8px rgba(126, 200, 200, 0.2);
}

.preset-btn.active .preset-label,
.preset-btn.active .preset-size {
  color: #4a8a8a;
  font-weight: 600;
}

.preset-label {
  font-size: 13px;
  color: #5a5a5a;
  font-weight: 500;
}

.preset-size {
  font-size: 10px;
  color: #8a8a8a;
  margin-top: 2px;
}

.custom-input-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.input-label {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 500;
}

.size-input {
  width: 60px;
  height: 36px;
  border: 1.5px solid #e8e4e0;
  border-radius: 10px;
  text-align: center;
  font-size: 14px;
  color: #4a4a4a;
  background-color: #fefcfb;
  transition: all 0.25s ease;
}

.size-input:focus {
  border-color: #7ec8c8;
  box-shadow: 0 0 0 3px rgba(126, 200, 200, 0.15);
}

.input-separator {
  font-size: 16px;
  color: #d1cdc8;
}

.mode-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.mode-btn {
  flex: 1;
  padding: 10px;
  text-align: center;
  border-radius: 12px;
  background-color: #e8e4e0;
  font-size: 13px;
  color: #5a5a5a;
  font-weight: 500;
  transition: all 0.25s ease;
  border: 1.5px solid #d8d4d0;
}

.mode-btn.active {
  background-color: #d4f0f0;
  border-color: #6bb3b3;
  color: #4a8a8a;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(126, 200, 200, 0.2);
}

.brand-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.brand-tag {
  padding: 7px 14px;
  border-radius: 18px;
  background-color: #e8e4e0;
  font-size: 12px;
  color: #5a5a5a;
  font-weight: 500;
  transition: all 0.25s ease;
  border: 1.5px solid #d8d4d0;
}

.brand-tag.active {
  background-color: #fde0e2;
  border-color: #f09ea3;
  color: #c06065;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(255, 182, 185, 0.25);
}

.series-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.series-toggle-all {
  padding: 4px 12px;
  border-radius: 20px;
  background-color: #e8e4e0;
  border: 1.5px solid #d8d4d0;
  transition: all 0.25s ease;
}

.series-toggle-text {
  font-size: 12px;
  color: #6bb3b3;
  font-weight: 600;
}

.series-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.series-tag {
  padding: 6px 14px;
  border-radius: 20px;
  background-color: #ece8e4;
  font-size: 13px;
  color: #5a5a5a;
  font-weight: 500;
  transition: all 0.25s ease;
  border: 1.5px solid #dcd8d4;
}

.series-tag.active {
  background-color: #d4f0f0;
  border-color: #6bb3b3;
  color: #4a8a8a;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(126, 200, 200, 0.2);
}

.param-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.param-label {
  font-size: 13px;
  color: #4a4a4a;
  font-weight: 500;
  min-width: 70px;
}

.slider-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.param-input {
  width: 60px;
  height: 36px;
  border: 1.5px solid #e8e4e0;
  border-radius: 10px;
  text-align: center;
  font-size: 14px;
  color: #4a4a4a;
  background-color: #fefcfb;
  transition: all 0.25s ease;
}

.param-input:focus {
  border-color: #7ec8c8;
  box-shadow: 0 0 0 3px rgba(126, 200, 200, 0.15);
}

.param-unit {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 500;
}

.param-hint-row {
  margin-bottom: 4px;
}

.param-hint {
  font-size: 11px;
  color: #b0a8a0;
}

.reset-row {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

.reset-btn {
  padding: 6px 20px;
  border-radius: 16px;
  background-color: #e8e4e0;
  border: 1.5px solid #d8d4d0;
  transition: all 0.25s ease;
}

.reset-btn:active {
  background-color: #dcd8d4;
  transform: scale(0.97);
}

.reset-btn-text {
  font-size: 12px;
  color: #6bb3b3;
  font-weight: 600;
}
</style>

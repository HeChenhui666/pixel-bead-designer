<template>
  <view class="param-panel">
    <!-- 网格尺寸 -->
    <view class="card">
      <view class="card-header">
        <view class="card-dot" />
        <text class="card-title">网格尺寸</text>
      </view>
      <view class="preset-row">
        <view v-for="preset in presets.slice(0, 4)" :key="preset.label" class="preset-btn"
          :class="{ active: isActivePreset(preset) }" @click="selectPreset(preset)">
          <text class="preset-label">{{ preset.label }}</text>
          <text class="preset-size">{{ preset.width }}×{{ preset.height }}</text>
        </view>
      </view>
      <view class="custom-preset-row">
        <view class="preset-btn custom-btn"
          :class="{ active: isCustom }" @click="selectPreset(presets[4])">
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

    <!-- 像素化模式（图片模式专用） -->
    <view v-if="!props.blankMode" class="card">
      <view class="card-header">
        <view class="card-dot" />
        <text class="card-title">像素化模式</text>
      </view>
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
    <view v-if="!props.blankMode && configStore.pixelationMode === 'weighted-median'" class="card">
      <view class="card-header">
        <view class="card-dot accent" />
        <text class="card-title">加权中值参数</text>
      </view>
      <view class="param-row">
        <text class="param-label">中心权重</text>
        <view class="slider-group">
          <input type="number" :value="configStore.weightedMedianConfig.centerWeight"
            class="param-input" @input="updateWmConfig('centerWeight', $event)" />
        </view>
      </view>
      <view class="param-row">
        <text class="param-label">外围权重</text>
        <view class="slider-group">
          <input type="number" :value="configStore.weightedMedianConfig.edgeWeight"
            class="param-input" @input="updateWmConfig('edgeWeight', $event)" />
        </view>
      </view>
      <view class="param-row">
        <text class="param-label">中心区域</text>
        <view class="slider-group">
          <input type="number" :value="Math.round(configStore.weightedMedianConfig.centerRatio * 100)"
            class="param-input" @input="updateCenterRatio($event)" />
          <text class="param-unit">%</text>
        </view>
      </view>
      <view class="hints">
        <text class="param-hint">中心/外围权重比越大 → 边界越清晰</text>
        <text class="param-hint">中心区域越小 → 加权聚焦越集中</text>
      </view>
      <view class="reset-row">
        <view class="reset-btn" @click="resetWeightedMedianConfig()">
          <text class="reset-btn-text">恢复初始值</text>
        </view>
      </view>
    </view>

    <!-- 自适应参数 -->
    <view v-if="!props.blankMode && configStore.pixelationMode === 'adaptive'" class="card">
      <view class="card-header">
        <view class="card-dot accent" />
        <text class="card-title">自适应参数</text>
      </view>
      <view class="param-row">
        <text class="param-label">方差阈值</text>
        <view class="slider-group">
          <input type="number" :value="configStore.adaptiveConfig.varianceThreshold"
            class="param-input" @input="updateAdaptiveConfig('varianceThreshold', $event)" />
        </view>
      </view>
      <view class="param-row">
        <text class="param-label">背景距离</text>
        <view class="slider-group">
          <input type="digit" :value="configStore.adaptiveConfig.bgDistThreshold"
            class="param-input" @input="updateAdaptiveBgDist($event)" />
        </view>
      </view>
      <view class="param-row">
        <text class="param-label">中心区域</text>
        <view class="slider-group">
          <input type="number" :value="Math.round(configStore.adaptiveConfig.centerRatio * 100)"
            class="param-input" @input="updateAdaptiveCenterRatio($event)" />
          <text class="param-unit">%</text>
        </view>
      </view>
      <view class="hints">
        <text class="param-hint">方差阈值越低 → 更多块用中心子块（边界更清晰）</text>
        <text class="param-hint">背景距离越高 → 更多像素被当作背景过滤（杂色更少）</text>
        <text class="param-hint">中心区域越小 → 高方差块取样更集中</text>
      </view>
      <view class="reset-row">
        <view class="reset-btn" @click="resetAdaptiveConfig()">
          <text class="reset-btn-text">恢复初始值</text>
        </view>
      </view>
    </view>

    <!-- 高斯加权参数 -->
    <view v-if="!props.blankMode && configStore.pixelationMode === 'gaussian-weighted'" class="card">
      <view class="card-header">
        <view class="card-dot accent" />
        <text class="card-title">高斯加权参数</text>
      </view>
      <view class="param-row">
        <text class="param-label">Sigma</text>
        <view class="slider-group">
          <input type="digit" :value="configStore.gaussianWeightedConfig.sigma"
            class="param-input" @input="updateGaussianSigma($event)" />
        </view>
      </view>
      <view class="hints">
        <text class="param-hint">Sigma 越小 → 权重衰减越快，越聚焦中心（边界清晰）</text>
        <text class="param-hint">Sigma 越大 → 权重分布越均匀，越接近全块平均（平滑还原）</text>
      </view>
      <view class="reset-row">
        <view class="reset-btn" @click="resetGaussianWeightedConfig()">
          <text class="reset-btn-text">恢复初始值</text>
        </view>
      </view>
    </view>

    <!-- 边缘感知参数 -->
    <view v-if="!props.blankMode && configStore.pixelationMode === 'edge-aware'" class="card">
      <view class="card-header">
        <view class="card-dot accent" />
        <text class="card-title">边缘感知参数</text>
      </view>
      <view class="param-row">
        <text class="param-label">梯度阈值</text>
        <view class="slider-group">
          <input type="number" :value="configStore.edgeAwareConfig.gradientThreshold"
            class="param-input" @input="updateEdgeAwareConfig('gradientThreshold', $event)" />
        </view>
      </view>
      <view class="param-row">
        <text class="param-label">窄条宽度</text>
        <view class="slider-group">
          <input type="number" :value="Math.round(configStore.edgeAwareConfig.stripWidth * 100)"
            class="param-input" @input="updateEdgeAwareStripWidth($event)" />
          <text class="param-unit">%</text>
        </view>
      </view>
      <view class="hints">
        <text class="param-hint">梯度阈值越低 → 更多块被识别为有边缘（边界更敏感）</text>
        <text class="param-hint">窄条宽度越小 → 沿边缘取样更精准，边界线更保留</text>
      </view>
      <view class="reset-row">
        <view class="reset-btn" @click="resetEdgeAwareConfig()">
          <text class="reset-btn-text">恢复初始值</text>
        </view>
      </view>
    </view>

    <!-- 品牌选择 -->
    <view class="card">
      <view class="card-header">
        <view class="card-dot pink" />
        <text class="card-title">拼豆品牌</text>
      </view>
      <view class="brand-row">
        <view v-for="brand in brands" :key="brand" class="brand-tag"
          :class="{ active: projectStore.paletteId === brand }" @click="projectStore.paletteId = brand">
          <text>{{ brand }}</text>
        </view>
      </view>
    </view>

    <!-- 色系选择 -->
    <view v-if="currentSeriesList.length > 0" class="card">
      <view class="card-header">
        <view class="card-dot" />
        <text class="card-title">色系选择</text>
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

const props = withDefaults(defineProps<{ blankMode?: boolean }>(), { blankMode: false })

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
  { label: '超大图', width: 158, height: 158 },
  { label: '自定义', width: 0, height: 0 },
]

const brands: PaletteId[] = ['MARD', 'COCO', '漫漫', '盼盼', '咪小窝']

const isCustom = ref(false)
const localWidth = ref(projectStore.gridWidth)
const localHeight = ref(projectStore.gridHeight)

watch(() => projectStore.gridWidth, (newVal) => {
  if (!isCustom.value) localWidth.value = newVal
})

watch(() => projectStore.gridHeight, (newVal) => {
  if (!isCustom.value) localHeight.value = newVal
})

watch(localWidth, (newVal) => {
  if (isCustom.value && !isNaN(newVal)) {
    projectStore.setGridSize(clampSize(newVal), projectStore.gridHeight)
  }
})

watch(localHeight, (newVal) => {
  if (isCustom.value && !isNaN(newVal)) {
    projectStore.setGridSize(projectStore.gridWidth, clampSize(newVal))
  }
})

const currentSeriesList = computed(() => getSeriesList(projectStore.paletteId))
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
  if (index >= 0) current.splice(index, 1)
  else current.push(series)
  configStore.selectedSeries[paletteId] = current
}

function toggleAllSeries() {
  const paletteId = projectStore.paletteId
  if (isAllSeriesSelected.value) {
    configStore.selectedSeries = { ...configStore.selectedSeries, [paletteId]: [] }
  } else {
    configStore.selectedSeries = { ...configStore.selectedSeries, [paletteId]: [...currentSeriesList.value] }
  }
}

function isActivePreset(preset: Preset): boolean {
  if (preset.width === 0) return isCustom.value
  return !isCustom.value && projectStore.gridWidth === preset.width && projectStore.gridHeight === preset.height
}

function selectPreset(preset: Preset) {
  if (preset.width === 0) { isCustom.value = true; return }
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
  configStore.weightedMedianConfig = { ...configStore.weightedMedianConfig, [key]: Math.max(1, Math.round(raw)) }
}

function updateCenterRatio(event: any) {
  const raw = Number(event.detail?.value ?? event.target?.value ?? 50)
  configStore.weightedMedianConfig = { ...configStore.weightedMedianConfig, centerRatio: Math.max(10, Math.min(90, Math.round(raw))) / 100 }
}

function updateAdaptiveConfig(key: 'varianceThreshold', event: any) {
  const raw = Number(event.detail?.value ?? event.target?.value ?? 0)
  configStore.adaptiveConfig = { ...configStore.adaptiveConfig, [key]: Math.max(100, Math.round(raw)) }
}

function updateAdaptiveBgDist(event: any) {
  const raw = Number(event.detail?.value ?? event.target?.value ?? 0.03)
  configStore.adaptiveConfig = { ...configStore.adaptiveConfig, bgDistThreshold: Math.max(0.001, Math.min(0.5, raw)) }
}

function updateAdaptiveCenterRatio(event: any) {
  const raw = Number(event.detail?.value ?? event.target?.value ?? 50)
  configStore.adaptiveConfig = { ...configStore.adaptiveConfig, centerRatio: Math.max(10, Math.min(90, Math.round(raw))) / 100 }
}

function resetWeightedMedianConfig() { configStore.weightedMedianConfig = { ...DEFAULT_WEIGHTED_MEDIAN_CONFIG } }
function resetAdaptiveConfig() { configStore.adaptiveConfig = { ...DEFAULT_ADAPTIVE_CONFIG } }

function updateGaussianSigma(event: any) {
  const raw = Number(event.detail?.value ?? event.target?.value ?? 0.4)
  configStore.gaussianWeightedConfig = { ...configStore.gaussianWeightedConfig, sigma: Math.max(0.1, Math.min(2.0, raw)) }
}

function resetGaussianWeightedConfig() { configStore.gaussianWeightedConfig = { ...DEFAULT_GAUSSIAN_WEIGHTED_CONFIG } }

function updateEdgeAwareConfig(key: 'gradientThreshold', event: any) {
  const raw = Number(event.detail?.value ?? event.target?.value ?? 0)
  configStore.edgeAwareConfig = { ...configStore.edgeAwareConfig, [key]: Math.max(1, Math.round(raw)) }
}

function updateEdgeAwareStripWidth(event: any) {
  const raw = Number(event.detail?.value ?? event.target?.value ?? 30)
  configStore.edgeAwareConfig = { ...configStore.edgeAwareConfig, stripWidth: Math.max(10, Math.min(90, Math.round(raw))) / 100 }
}

function resetEdgeAwareConfig() { configStore.edgeAwareConfig = { ...DEFAULT_EDGE_AWARE_CONFIG } }
</script>

<style scoped>
.param-panel {
  padding: 8rpx 32rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 白色卡片 */
.card {
  background: #ffffff;
  border-radius: 36rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.05), 0 0 0 2rpx rgba(0, 0, 0, 0.03);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 28rpx;
}

.card-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 6rpx;
  background: #7ec8c8;
  flex-shrink: 0;
}

.card-dot.accent {
  background: #a8d8d8;
}

.card-dot.pink {
  background: #ffb6b9;
}

.card-title {
  font-size: 26rpx;
  color: #6b6b6b;
  font-weight: 600;
  letter-spacing: 0.6rpx;
  flex: 1;
}

/* 预设按钮 */
.preset-row {
  display: flex;
  gap: 20rpx;
  flex-wrap: wrap;
}

.custom-preset-row {
  margin-top: 20rpx;
}

.preset-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 12rpx;
  border-radius: 24rpx;
  background-color: #f7f5f3;
  transition: all 0.22s ease;
  border: 3rpx solid #ede9e4;
}

.preset-btn:active {
  transform: scale(0.96);
}

.custom-btn {
  width: 100%;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 28rpx;
}

.preset-btn.active {
  background: linear-gradient(135deg, rgba(126, 200, 200, 0.14) 0%, rgba(107, 179, 179, 0.08) 100%);
  border-color: #7ec8c8;
}

.preset-btn.active .preset-label,
.preset-btn.active .preset-size {
  color: #4a8a8a;
  font-weight: 600;
}

.preset-label {
  font-size: 26rpx;
  color: #5a5a5a;
  font-weight: 500;
}

.preset-size {
  font-size: 20rpx;
  color: #9ca3af;
  margin-top: 6rpx;
}

.custom-input-inline {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.input-label {
  font-size: 26rpx;
  color: #9ca3af;
  font-weight: 500;
}

.size-input {
  width: 120rpx;
  height: 72rpx;
  border: 3rpx solid #ede9e4;
  border-radius: 20rpx;
  text-align: center;
  font-size: 28rpx;
  color: #4a4a4a;
  background-color: #fefcfb;
  transition: all 0.22s ease;
}

.size-input:focus {
  border-color: #7ec8c8;
  box-shadow: 0 0 0 6rpx rgba(126, 200, 200, 0.15);
}

.input-separator {
  font-size: 32rpx;
  color: #d1cdc8;
}

/* 模式按钮 */
.mode-row {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.mode-btn {
  flex: 1;
  padding: 20rpx 16rpx;
  text-align: center;
  border-radius: 24rpx;
  background-color: #f7f5f3;
  font-size: 24rpx;
  color: #6b6b6b;
  font-weight: 500;
  transition: all 0.22s ease;
  border: 3rpx solid #ede9e4;
}

.mode-btn:active {
  transform: scale(0.96);
}

.mode-btn.active {
  background: linear-gradient(135deg, rgba(126, 200, 200, 0.14) 0%, rgba(107, 179, 179, 0.08) 100%);
  border-color: #7ec8c8;
  color: #4a8a8a;
  font-weight: 600;
}

/* 品牌标签 */
.brand-row {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.brand-tag {
  padding: 16rpx 32rpx;
  border-radius: 40rpx;
  background-color: #f7f5f3;
  font-size: 26rpx;
  color: #6b6b6b;
  font-weight: 500;
  transition: all 0.22s ease;
  border: 3rpx solid #ede9e4;
}

.brand-tag:active {
  transform: scale(0.96);
}

.brand-tag.active {
  background: linear-gradient(135deg, rgba(255, 182, 185, 0.2) 0%, rgba(255, 154, 158, 0.12) 100%);
  border-color: #ffb6b9;
  color: #c06065;
  font-weight: 700;
}

/* 色系 */
.series-toggle-all {
  margin-left: auto;
  padding: 6rpx 24rpx;
  border-radius: 32rpx;
  background: rgba(126, 200, 200, 0.12);
  border: 2rpx solid rgba(126, 200, 200, 0.3);
  transition: all 0.22s ease;
}

.series-toggle-text {
  font-size: 22rpx;
  color: #6bb3b3;
  font-weight: 600;
}

.series-row {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.series-tag {
  padding: 12rpx 28rpx;
  border-radius: 40rpx;
  background-color: #f7f5f3;
  font-size: 24rpx;
  color: #6b6b6b;
  font-weight: 500;
  transition: all 0.22s ease;
  border: 3rpx solid #ede9e4;
}

.series-tag:active {
  transform: scale(0.96);
}

.series-tag.active {
  background: linear-gradient(135deg, rgba(126, 200, 200, 0.14) 0%, rgba(107, 179, 179, 0.08) 100%);
  border-color: #7ec8c8;
  color: #4a8a8a;
  font-weight: 600;
}

/* 参数行 */
.param-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.param-label {
  font-size: 26rpx;
  color: #5a5a5a;
  font-weight: 500;
  min-width: 140rpx;
}

.slider-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.param-input {
  width: 144rpx;
  height: 76rpx;
  border: 3rpx solid #ede9e4;
  border-radius: 20rpx;
  text-align: center;
  font-size: 28rpx;
  color: #4a4a4a;
  background-color: #fafaf9;
  transition: all 0.22s ease;
}

.param-input:focus {
  border-color: #7ec8c8;
  box-shadow: 0 0 0 6rpx rgba(126, 200, 200, 0.15);
}

.param-unit {
  font-size: 26rpx;
  color: #9ca3af;
  font-weight: 500;
}

.hints {
  background: rgba(126, 200, 200, 0.06);
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.param-hint {
  font-size: 22rpx;
  color: #9ca3af;
  line-height: 1.5;
}

.reset-row {
  display: flex;
  justify-content: center;
}

.reset-btn {
  padding: 14rpx 44rpx;
  border-radius: 32rpx;
  background: #f7f5f3;
  border: 3rpx solid #ede9e4;
  transition: all 0.22s ease;
}

.reset-btn:active {
  background: #ede9e4;
  transform: scale(0.97);
}

.reset-btn-text {
  font-size: 24rpx;
  color: #6bb3b3;
  font-weight: 600;
}
</style>

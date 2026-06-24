<template>
  <view class="page-palette">
    <view class="header">
      <text class="header-title">色卡</text>
    </view>

    <!-- 品牌切换 Tab -->
    <view class="brand-tabs">
      <view
        v-for="brand in brands"
        :key="brand"
        class="brand-tab"
        :class="{ active: selectedBrand === brand }"
        @click="selectBrand(brand)"
      >
        <text class="brand-tab-text">{{ brand }}</text>
      </view>
    </view>

    <!-- 搜索框 -->
    <view class="search-bar">
      <text class="search-icon">🔍</text>
      <input
        v-model="searchKeyword"
        class="search-input"
        placeholder="搜索色号..."
        placeholder-class="search-placeholder"
      />
      <view v-if="searchKeyword" class="search-clear" @click="searchKeyword = ''">
        <text class="search-clear-text">✕</text>
      </view>
    </view>

    <!-- 颜色统计行 -->
    <view class="palette-meta">
      <text class="palette-meta-text">{{ filteredColors.length }} 种颜色</text>
      <text v-if="isCurrentBrand" class="palette-meta-active">· 当前图纸品牌</text>
    </view>

    <!-- 色块网格 -->
    <scroll-view scroll-y class="color-grid-scroll">
      <view class="color-grid">
        <view
          v-for="item in filteredColors"
          :key="item.hex"
          class="color-cell"
          :class="{ 'in-use': usedHexes.has(item.hex) }"
          @click="onColorCellTap(item)"
        >
          <view class="cell-swatch" :style="{ backgroundColor: item.hex }">
            <text v-if="usedHexes.has(item.hex)" class="cell-usage-dot">●</text>
          </view>
          <text class="cell-code">{{ item.code }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 颜色详情弹窗 -->
    <view v-if="selectedColor" class="detail-mask" @click="selectedColor = null">
      <view class="detail-dialog" @click.stop>
        <view class="detail-swatch" :style="{ backgroundColor: selectedColor.hex }" />
        <view class="detail-info">
          <text class="detail-code">{{ selectedColor.code }}</text>
          <text class="detail-hex">{{ selectedColor.hex }}</text>
          <text v-if="usedHexes.has(selectedColor.hex)" class="detail-usage">
            图纸中使用 {{ projectStore.colorSummary[selectedColor.hex] }} 颗
          </text>
          <text v-else class="detail-not-used">图纸中未使用</text>
        </view>
        <view class="detail-close" @click="selectedColor = null">
          <text class="detail-close-text">✕</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useProjectStore } from '../../stores/useProjectStore'
import { getColorList } from '../../utils/color-mapper'
import type { PaletteId } from '../../stores/useProjectStore'

const projectStore = useProjectStore()

const brands: PaletteId[] = ['MARD', 'COCO', '漫漫', '盼盼', '咪小窝']
const selectedBrand = ref<PaletteId>(projectStore.paletteId)
const searchKeyword = ref('')
const selectedColor = ref<{ hex: string; code: string } | null>(null)

onShow(() => {
  // 每次进入页面同步到当前图纸品牌
  selectedBrand.value = projectStore.paletteId
})

const isCurrentBrand = computed(() => selectedBrand.value === projectStore.paletteId)

const allColors = computed(() => getColorList(selectedBrand.value))

const filteredColors = computed(() => {
  const kw = searchKeyword.value.trim().toUpperCase()
  if (!kw) return allColors.value
  return allColors.value.filter(
    (c) => c.code.toUpperCase().includes(kw) || c.hex.toUpperCase().includes(kw)
  )
})

const usedHexes = computed(() => new Set(Object.keys(projectStore.colorSummary)))

function selectBrand(brand: PaletteId) {
  selectedBrand.value = brand
  searchKeyword.value = ''
}

function onColorCellTap(item: { hex: string; code: string }) {
  selectedColor.value = item
}
</script>

<style scoped>
.page-palette {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 50px - env(safe-area-inset-bottom));
  background-color: #f8f8f8;
  padding-top: env(safe-area-inset-top);
  overflow: auto;
}

.header {
  padding: 16px 20px 8px;
  background-color: #ffffff;
}

.header-title {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
}

/* 品牌 Tab */
.brand-tabs {
  display: flex;
  background-color: #ffffff;
  padding: 0 12px 12px;
  gap: 8px;
  overflow-x: auto;
  flex-shrink: 0;
}

.brand-tab {
  padding: 6px 14px;
  border-radius: 999px;
  background-color: #f0f0f0;
  flex-shrink: 0;
}

.brand-tab.active {
  background-color: #007AFF;
}

.brand-tab-text {
  font-size: 13px;
  color: #1a1a1a;
}

.brand-tab.active .brand-tab-text {
  color: #ffffff;
  font-weight: 600;
}

/* 搜索 */
.search-bar {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border-top: 1px solid #f0f0f0;
  padding: 8px 16px;
  gap: 8px;
  flex-shrink: 0;
}

.search-icon {
  font-size: 14px;
}

.search-input {
  flex: 1;
  font-size: 14px;
  color: #1a1a1a;
  height: 32px;
}

.search-placeholder {
  color: #cccccc;
}

.search-clear {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #cccccc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-clear-text {
  font-size: 10px;
  color: #ffffff;
}

/* 统计行 */
.palette-meta {
  padding: 6px 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.palette-meta-text {
  font-size: 12px;
  color: #999999;
}

.palette-meta-active {
  font-size: 12px;
  color: #007AFF;
}

/* 色块网格 */
.color-grid-scroll {
  flex: 1;
}

.color-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 8px 12px 24px;
  gap: 10px;
}

.color-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 52px;
}

.cell-swatch {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1.5px solid rgba(0, 0, 0, 0.08);
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 2px;
}

.color-cell.in-use .cell-swatch {
  border-color: #007AFF;
  border-width: 2px;
}

.cell-usage-dot {
  font-size: 8px;
  color: #007AFF;
  line-height: 1;
}

.cell-code {
  font-size: 10px;
  color: #666666;
  text-align: center;
  line-height: 1.2;
  word-break: break-all;
}

.color-cell.in-use .cell-code {
  color: #007AFF;
  font-weight: 600;
}

/* 详情弹窗 */
.detail-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 50;
  display: flex;
  align-items: flex-end;
}

.detail-dialog {
  width: 100%;
  background-color: #ffffff;
  border-radius: 20px 20px 0 0;
  padding: 24px 20px calc(24px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
}

.detail-swatch {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  border: 1.5px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.detail-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-code {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
}

.detail-hex {
  font-size: 13px;
  color: #999999;
}

.detail-usage {
  font-size: 13px;
  color: #007AFF;
  margin-top: 2px;
}

.detail-not-used {
  font-size: 13px;
  color: #cccccc;
  margin-top: 2px;
}

.detail-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-close-text {
  font-size: 12px;
  color: #666666;
}
</style>

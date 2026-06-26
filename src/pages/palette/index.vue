<template>
  <view class="page-palette" :style="{ height: `calc(100vh - 50px - ${safeBottom}px)` }">
    <!-- 顶部安全区域占位 -->
    <view class="safe-top-placeholder" :style="{ height: safeTop + 'px' }" />

    <!-- 吸顶区域容器 -->
    <view class="sticky-header-wrapper">
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
          placeholder="输入色卡号搜索，如 A01..."
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

    <CustomTabBar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useProjectStore } from '../../stores/useProjectStore'
import { useSafeArea } from '../../utils/useSafeArea'
import { getColorList } from '../../utils/color-mapper'
import type { PaletteId } from '../../stores/useProjectStore'
import CustomTabBar from '../../custom-tab-bar/index.vue'

const projectStore = useProjectStore()
const { safeTop, safeBottom } = useSafeArea()

const brands: PaletteId[] = ['MARD', 'COCO', '漫漫', '盼盼', '咪小窝']
const selectedBrand = ref<PaletteId>(projectStore.paletteId)
const searchKeyword = ref('')
const selectedColor = ref<{ hex: string; code: string } | null>(null)

onShow(() => {
  projectStore.currentTab = 1
  selectedBrand.value = projectStore.paletteId
})

const isCurrentBrand = computed(() => selectedBrand.value === projectStore.paletteId)

const allColors = computed(() => getColorList(selectedBrand.value))

const filteredColors = computed(() => {
  const kw = searchKeyword.value.trim().toUpperCase()
  if (!kw) return allColors.value
  // 仅按色卡号（code）搜索
  return allColors.value.filter((c) => c.code.toUpperCase().includes(kw))
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
/* 顶部安全区域占位 */
.safe-top-placeholder {
  flex-shrink: 0;
  background: linear-gradient(180deg, #fdf9f5 0%, #faf5f0 100%);
  position: relative;
  z-index: 20;
}

/* 吸顶区域容器 */
.sticky-header-wrapper {
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(180deg, #fdf9f5 0%, #faf5f0 100%);
}

.page-palette {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #fdf9f5 0%, #faf5f0 100%);
  overflow: auto;
  box-sizing: border-box;
}

.header {
  padding: 20px 22px 10px;
  background: transparent;
}

.header-title {
  font-size: 24px;
  font-weight: 700;
  color: #4a4a4a;
}

/* 品牌 Tab */
.brand-tabs {
  display: flex;
  background-color: #fefcfb;
  padding: 0 14px 14px;
  gap: 10px;
  overflow-x: auto;
  flex-shrink: 0;
}

.brand-tab {
  padding: 8px 18px;
  border-radius: 20px;
  background-color: #f8f6f4;
  flex-shrink: 0;
  transition: all 0.25s ease;
  border: 1.5px solid transparent;
}

.brand-tab.active {
  background-color: #ffe8e9;
  border-color: #ffb6b9;
}

.brand-tab-text {
  font-size: 13px;
  color: #4a4a4a;
  font-weight: 500;
}

.brand-tab.active .brand-tab-text {
  color: #d4767a;
  font-weight: 600;
}

/* 搜索 */
.search-bar {
  display: flex;
  align-items: center;
  padding: 10px 18px;
  gap: 10px;
  flex-shrink: 0;
  border-bottom: 1px solid #efe9e3;
}

.search-icon {
  font-size: 15px;
  opacity: 0.6;
}

.search-input {
  flex: 1;
  font-size: 14px;
  color: #4a4a4a;
  height: 36px;
  background-color: #f8f6f4;
  border-radius: 18px;
  padding: 0 16px;
  border: 1.5px solid transparent;
  transition: all 0.25s ease;
}

.search-input:focus {
  border-color: #7ec8c8;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(126, 200, 200, 0.1);
}

.search-placeholder {
  color: #c0c4cc;
}

.search-clear {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: #e8e4e0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
}

.search-clear:active {
  background-color: #d1cdc8;
}

.search-clear-text {
  font-size: 10px;
  color: #9ca3af;
}

/* 统计行 */
.palette-meta {
  padding: 8px 18px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.palette-meta-text {
  font-size: 12px;
  color: #b0a8a0;
}

.palette-meta-active {
  font-size: 12px;
  color: #7ec8c8;
  font-weight: 500;
}

/* 色块网格 */
.color-grid-scroll {
  flex: 1;
}

.color-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 10px 14px 28px;
  gap: 7px;
}

.color-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: calc((100% - 35px) / 6);
}

.cell-swatch {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  border: 1.5px solid rgba(0, 0, 0, 0.06);
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 3px;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.color-cell.in-use .cell-swatch {
  border-color: #7ec8c8;
  border-width: 2px;
  box-shadow: 0 2px 12px rgba(126, 200, 200, 0.2);
}

.cell-usage-dot {
  font-size: 8px;
  color: #7ec8c8;
  line-height: 1;
}

.cell-code {
  font-size: 10px;
  color: #9ca3af;
  text-align: center;
  line-height: 1.2;
  word-break: break-all;
  font-weight: 500;
}

.color-cell.in-use .cell-code {
  color: #7ec8c8;
  font-weight: 600;
}

/* 详情弹窗 */
.detail-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.25);
  z-index: 50;
  display: flex;
  align-items: flex-end;
}

.detail-dialog {
  width: 100%;
  background-color: #fefcfb;
  border-radius: 24px 24px 0 0;
  padding: 28px 22px calc(28px + 50px + env(safe-area-inset-bottom, 0px));
  display: flex;
  align-items: center;
  gap: 18px;
  position: relative;
  box-shadow: 0 -4px 24px rgba(126, 200, 200, 0.12);
}

.detail-swatch {
  width: 68px;
  height: 68px;
  border-radius: 16px;
  border: 1.5px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.detail-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detail-code {
  font-size: 22px;
  font-weight: 700;
  color: #4a4a4a;
}

.detail-hex {
  font-size: 13px;
  color: #b0a8a0;
}

.detail-usage {
  font-size: 13px;
  color: #7ec8c8;
  margin-top: 3px;
  font-weight: 500;
}

.detail-not-used {
  font-size: 13px;
  color: #d1cdc8;
  margin-top: 3px;
}

.detail-close {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #f8f6f4;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
}

.detail-close:active {
  background-color: #f0eeeb;
}

.detail-close-text {
  font-size: 12px;
  color: #9ca3af;
}
</style>
ENDOFFILE; __aone_exit=$?; pwd -P > '/var/folders/g9/4wc_h0_d12l4s9d6wdbt0glw0000gn/T/aone-copilot-cwd-1782455892060-91tccqaxnpg.txt' 2>/dev/null; exit $__aone_exit
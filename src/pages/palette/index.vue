<template>
  <view class="page-palette" :style="{ height: `calc(100vh - 50px - ${safeBottom}px)` }">
    <!-- 顶部安全区域占位 -->
    <view class="safe-top-placeholder" :style="{ height: safeTop + 'px' }" />

    <!-- 吸顶卡片容器 -->
    <view class="sticky-card-wrapper">
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

      <!-- 搜索卡片 -->
      <view class="search-card">
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
        <view class="meta-badge">
          <text class="meta-count">{{ filteredColors.length }}</text>
          <text class="meta-label">种颜色</text>
        </view>
        <text v-if="isCurrentBrand" class="palette-meta-active">当前图纸品牌</text>
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
            <view v-if="usedHexes.has(item.hex)" class="cell-usage-badge">
              <text class="cell-usage-dot">●</text>
              <text class="cell-usage-text">使用中</text>
            </view>
          </view>
          <text class="cell-code">{{ item.code }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 颜色详情弹窗 -->
    <view v-if="selectedColor" class="detail-mask" @click="selectedColor = null">
      <view class="detail-dialog" @click.stop>
        <view class="detail-header">
          <text class="detail-title">颜色详情</text>
          <view class="detail-close" @click="selectedColor = null">
            <text class="detail-close-text">✕</text>
          </view>
        </view>
        <view class="detail-content">
          <view class="detail-swatch" :style="{ backgroundColor: selectedColor.hex }" />
          <view class="detail-info">
            <text class="detail-code">{{ selectedColor.code }}</text>
            <text class="detail-hex">{{ selectedColor.hex }}</text>
            <view v-if="usedHexes.has(selectedColor.hex)" class="detail-usage-card">
              <text class="detail-usage-icon">✨</text>
              <text class="detail-usage-text">
                图纸中使用 <text class="detail-usage-count">{{ projectStore.colorSummary[selectedColor.hex] }}</text> 颗
              </text>
            </view>
            <view v-else class="detail-not-used-card">
              <text class="detail-not-used-icon">🌸</text>
              <text class="detail-not-used-text">图纸中暂未使用</text>
            </view>
          </view>
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

/* 吸顶卡片容器 */
.sticky-card-wrapper {
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(180deg, #fdf9f5 0%, #faf5f0 100%);
  padding-bottom: 12px;
}

.page-palette {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #fdf9f5 0%, #faf5f0 100%);
  overflow: auto;
  box-sizing: border-box;
}

/* 品牌 Tab */
.brand-tabs {
  display: flex;
  padding: 12px 16px 10px;
  gap: 10px;
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
}

.brand-tabs::-webkit-scrollbar {
  display: none;
}

.brand-tab {
  padding: 10px 20px;
  border-radius: 24px;
  background-color: #ffffff;
  flex-shrink: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid #f0ebe5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.brand-tab:active {
  transform: scale(0.95);
}

.brand-tab.active {
  background: linear-gradient(135deg, #7ec8c8 0%, #6bb3b3 100%);
  border-color: #7ec8c8;
  box-shadow: 0 4px 16px rgba(126, 200, 200, 0.35);
}

.brand-tab-text {
  font-size: 13px;
  color: #6b6b6b;
  font-weight: 500;
  transition: all 0.3s ease;
}

.brand-tab.active .brand-tab-text {
  color: #ffffff;
  font-weight: 600;
}

/* 搜索卡片 */
.search-card {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
  flex-shrink: 0;
  background-color: #ffffff;
  border-radius: 20px;
  margin: 0 16px 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  border: 2px solid #f5f0ea;
}

.search-icon {
  font-size: 16px;
  opacity: 0.7;
  transition: all 0.3s ease;
}

.search-input {
  flex: 1;
  font-size: 14px;
  color: #4a4a4a;
  height: 32px;
  background-color: transparent;
  border: none;
  outline: none;
}

.search-input:focus {
  border: none;
  outline: none;
}

.search-placeholder {
  color: #c0c4cc;
}

.search-clear {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #f0ebe5;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.search-clear:active {
  background-color: #e8e0d8;
  transform: scale(0.9);
}

.search-clear-text {
  font-size: 11px;
  color: #9ca3af;
}

/* 统计行 */
.palette-meta {
  padding: 0 16px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.meta-badge {
  display: flex;
  align-items: baseline;
  background-color: #ffffff;
  padding: 6px 14px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1.5px solid #f5f0ea;
}

.meta-count {
  font-size: 16px;
  font-weight: 700;
  color: #7ec8c8;
  line-height: 1;
}

.meta-label {
  font-size: 11px;
  color: #b0a8a0;
  margin-left: 4px;
}

.palette-meta-active {
  font-size: 11px;
  color: #7ec8c8;
  font-weight: 500;
  background-color: rgba(126, 200, 200, 0.12);
  padding: 4px 12px;
  border-radius: 12px;
}

/* 色块网格 */
.color-grid-scroll {
  flex: 1;
}

.color-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 12px 14px 32px;
  gap: 10px;
}

.color-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 0 0 calc(16.666% - 8.333px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.color-cell:active {
  transform: scale(0.92);
}

.cell-swatch {
  width: 50px;
  height: 50px;
  border-radius: 16px;
  border: 2px solid rgba(0, 0, 0, 0.04);
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 4px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.color-cell.in-use .cell-swatch {
  border-color: #7ec8c8;
  border-width: 2.5px;
  box-shadow: 0 4px 16px rgba(126, 200, 200, 0.28);
}

.cell-usage-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  background-color: rgba(126, 200, 200, 0.95);
  padding: 2px 6px;
  border-radius: 10px;
  backdrop-filter: blur(4px);
}

.cell-usage-dot {
  font-size: 7px;
  color: #ffffff;
  line-height: 1;
}

.cell-usage-text {
  font-size: 8px;
  color: #ffffff;
  line-height: 1;
  font-weight: 600;
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
  background-color: rgba(0, 0, 0, 0.28);
  z-index: 50;
  display: flex;
  align-items: flex-end;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.detail-dialog {
  width: 100%;
  background-color: #ffffff;
  border-radius: 28px 28px 0 0;
  padding: 0 0 calc(28px + 50px + env(safe-area-inset-bottom, 0px));
  position: relative;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.12);
  animation: slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 16px;
  border-bottom: 1px solid #f5f0ea;
}

.detail-title {
  font-size: 18px;
  font-weight: 700;
  color: #4a4a4a;
}

.detail-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #f8f6f4;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.detail-close:active {
  background-color: #f0eeeb;
  transform: scale(0.9);
}

.detail-close-text {
  font-size: 13px;
  color: #9ca3af;
}

.detail-content {
  padding: 22px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.detail-swatch {
  width: 76px;
  height: 76px;
  border-radius: 20px;
  border: 2px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

.detail-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-code {
  font-size: 24px;
  font-weight: 700;
  color: #4a4a4a;
  letter-spacing: 0.5px;
}

.detail-hex {
  font-size: 13px;
  color: #b0a8a0;
  font-family: monospace;
}

.detail-usage-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, rgba(126, 200, 200, 0.12) 0%, rgba(107, 179, 179, 0.08) 100%);
  padding: 12px 16px;
  border-radius: 16px;
  border: 1.5px solid rgba(126, 200, 200, 0.25);
}

.detail-usage-icon {
  font-size: 16px;
}

.detail-usage-text {
  font-size: 13px;
  color: #5a5a5a;
  line-height: 1.4;
}

.detail-usage-count {
  font-size: 15px;
  font-weight: 700;
  color: #7ec8c8;
}

.detail-not-used-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #f8f6f4;
  padding: 12px 16px;
  border-radius: 16px;
  border: 1.5px solid #efe9e3;
}

.detail-not-used-icon {
  font-size: 16px;
}

.detail-not-used-text {
  font-size: 13px;
  color: #b0a8a0;
  line-height: 1.4;
}
</style>
ENDOFFILE; __aone_exit=$?; pwd -P > '/var/folders/g9/4wc_h0_d12l4s9d6wdbt0glw0000gn/T/aone-copilot-cwd-1782455892060-91tccqaxnpg.txt' 2>/dev/null; exit $__aone_exit
<template>
  <view class="page-palette" :style="{ height: `calc(100vh - 160rpx - ${safeBottom}px)` }">
    <!-- 顶部安全区域占位 -->
    <view class="safe-top-placeholder" :style="{ height: safeTop + 'px' }" />

    <!-- 吸顶卡片容器 -->
    <view class="sticky-card-wrapper">
      <view class="header">
        <text class="header-title">色卡库</text>
        <view class="meta-badge">
          <text class="meta-count">{{ filteredColors.length }}</text>
          <text class="meta-label"> 种颜色</text>
        </view>
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
          <view v-if="isCurrentBrand && selectedBrand === brand" class="current-dot" />
        </view>
      </view>

      <!-- 搜索卡片 -->
      <view class="search-card">
        <uni-icons type="search" size="16" color="#b0a8a0" />
        <input
          v-model="searchKeyword"
          class="search-input"
          placeholder="输入色卡号搜索，如 A01..."
          placeholder-class="search-placeholder"
        />
        <view v-if="searchKeyword" class="search-clear" @click="searchKeyword = ''">
          <uni-icons type="closeempty" size="12" color="#9ca3af" />
        </view>
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
        <view class="drag-handle" />
        <view class="detail-header">
          <text class="detail-title">颜色详情</text>
          <view class="detail-close" @click="selectedColor = null">
            <uni-icons type="closeempty" size="15" color="#9ca3af" />
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
  projectStore.currentTab = 2
  selectedBrand.value = projectStore.paletteId
})

const isCurrentBrand = computed(() => selectedBrand.value === projectStore.paletteId)
const allColors = computed(() => getColorList(selectedBrand.value))

const filteredColors = computed(() => {
  const kw = searchKeyword.value.trim().toUpperCase()
  if (!kw) return allColors.value
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
.safe-top-placeholder {
  flex-shrink: 0;
  background: linear-gradient(180deg, #fdf9f5 0%, #faf5f0 100%);
  position: relative;
  z-index: 20;
}

.sticky-card-wrapper {
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(180deg, #fdf9f5 0%, #faf5f0 100%);
  padding-bottom: 20rpx;
}

.page-palette {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #fdf9f5 0%, #faf5f0 100%);
  overflow: auto;
  box-sizing: border-box;
}

/* 标题行 */
.header {
  padding: 36rpx 36rpx 24rpx;
  display: flex;
  align-items: baseline;
  gap: 20rpx;
}

.header-title {
  font-size: 52rpx;
  font-weight: 800;
  color: #3d3d3d;
  letter-spacing: -1rpx;
}

.meta-badge {
  display: flex;
  align-items: baseline;
}

.meta-count {
  font-size: 30rpx;
  font-weight: 700;
  color: #7ec8c8;
}

.meta-label {
  font-size: 24rpx;
  color: #b0a8a0;
}

/* 品牌 Tab */
.brand-tabs {
  display: flex;
  padding: 0 32rpx 20rpx;
  gap: 16rpx;
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
}

.brand-tabs::-webkit-scrollbar { display: none; }

.brand-tab {
  position: relative;
  padding: 18rpx 36rpx;
  border-radius: 44rpx;
  background-color: #ffffff;
  flex-shrink: 0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 3rpx solid #ede9e3;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.brand-tab:active { transform: scale(0.95); }

.brand-tab.active {
  background: linear-gradient(135deg, #7ec8c8 0%, #5ab0b0 100%);
  border-color: #7ec8c8;
  box-shadow: 0 8rpx 28rpx rgba(126, 200, 200, 0.35);
}

.brand-tab-text {
  font-size: 26rpx;
  color: #6b6b6b;
  font-weight: 500;
  transition: all 0.25s ease;
}

.brand-tab.active .brand-tab-text {
  color: #ffffff;
  font-weight: 700;
}

.current-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
}

/* 搜索卡片 */
.search-card {
  display: flex;
  align-items: center;
  padding: 22rpx 32rpx;
  gap: 20rpx;
  flex-shrink: 0;
  background-color: #ffffff;
  border-radius: 36rpx;
  margin: 0 32rpx 20rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.05), 0 0 0 2rpx rgba(0, 0, 0, 0.03);
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #4a4a4a;
  height: 64rpx;
  background-color: transparent;
  border: none;
  outline: none;
}

.search-placeholder { color: #c0c4cc; }

.search-clear {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background-color: #f0ebe5;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.22s ease;
}

.search-clear:active {
  background-color: #e5e0d8;
  transform: scale(0.9);
}

/* 色块网格 */
.color-grid-scroll { flex: 1; }

.color-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx 28rpx 64rpx;
  gap: 20rpx;
}

.color-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  flex: 0 0 calc(16.666% - 16.666rpx);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.color-cell:active { transform: scale(0.9); }

.cell-swatch {
  width: 100rpx;
  height: 100rpx;
  border-radius: 32rpx;
  border: 4rpx solid rgba(0, 0, 0, 0.04);
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 8rpx;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.08);
}

.color-cell.in-use .cell-swatch {
  border-color: #7ec8c8;
  border-width: 5rpx;
  box-shadow: 0 8rpx 28rpx rgba(126, 200, 200, 0.3);
}

.cell-usage-badge {
  background-color: rgba(126, 200, 200, 0.92);
  padding: 4rpx 10rpx;
  border-radius: 16rpx;
}

.cell-usage-text {
  font-size: 14rpx;
  color: #ffffff;
  line-height: 1;
  font-weight: 700;
}

.cell-code {
  font-size: 20rpx;
  color: #9ca3af;
  text-align: center;
  line-height: 1.2;
  word-break: break-all;
  font-weight: 500;
}

.color-cell.in-use .cell-code {
  color: #7ec8c8;
  font-weight: 700;
}

/* 详情弹窗 */
.detail-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.28);
  z-index: 50;
  display: flex;
  align-items: flex-end;
  animation: fadeIn 0.22s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.detail-dialog {
  width: 100%;
  background-color: #ffffff;
  border-radius: 56rpx 56rpx 0 0;
  padding: 0 0 calc(56rpx + 160rpx + env(safe-area-inset-bottom, 0px));
  position: relative;
  box-shadow: 0 -16rpx 64rpx rgba(0, 0, 0, 0.1);
  animation: slideUp 0.32s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.drag-handle {
  width: 72rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: #ede9e3;
  margin: 24rpx auto 8rpx;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 40rpx 28rpx;
  border-bottom: 2rpx solid #f5f0ea;
}

.detail-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #4a4a4a;
}

.detail-close {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background-color: #f5f2ef;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.22s ease;
}

.detail-close:active {
  background-color: #ede9e4;
  transform: scale(0.9);
}

.detail-content {
  padding: 40rpx;
  display: flex;
  align-items: center;
  gap: 36rpx;
}

.detail-swatch {
  width: 152rpx;
  height: 152rpx;
  border-radius: 44rpx;
  border: 4rpx solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.1);
}

.detail-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.detail-code {
  font-size: 48rpx;
  font-weight: 800;
  color: #3d3d3d;
  letter-spacing: 1rpx;
}

.detail-hex {
  font-size: 26rpx;
  color: #b0a8a0;
  font-family: monospace;
}

.detail-usage-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: rgba(126, 200, 200, 0.1);
  padding: 20rpx 28rpx;
  border-radius: 28rpx;
  border: 2rpx solid rgba(126, 200, 200, 0.2);
}

.detail-usage-icon, .detail-not-used-icon { font-size: 30rpx; }

.detail-usage-text {
  font-size: 26rpx;
  color: #5a5a5a;
  line-height: 1.4;
}

.detail-usage-count {
  font-size: 30rpx;
  font-weight: 700;
  color: #7ec8c8;
}

.detail-not-used-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background-color: #f8f6f4;
  padding: 20rpx 28rpx;
  border-radius: 28rpx;
  border: 2rpx solid #ede9e3;
}

.detail-not-used-text {
  font-size: 26rpx;
  color: #b0a8a0;
  line-height: 1.4;
}
</style>

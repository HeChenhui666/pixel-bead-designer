<template>
  <view class="page-wrapper">
    <view class="page-history" :style="{ paddingTop: safeTop + 'px', paddingBottom: `calc(160rpx + ${safeBottom}px)` }">
      <view class="header">
        <text class="header-title">草稿箱</text>
        <text class="header-sub">{{ historyList.length > 0 ? `${historyList.length} 个草稿` : '暂无草稿' }}</text>
      </view>

      <!-- 空状态 -->
      <view v-if="historyList.length === 0" class="empty-state">
        <view class="empty-icon-wrap">
          <uni-icons type="folder-add" size="40" color="#b8d8d8" />
        </view>
        <text class="empty-text">草稿箱是空的</text>
        <text class="empty-sub">生成图纸后保存，这里会留存记录</text>
        <view class="empty-btn" @tap="goToUpload()">
          <uni-icons type="image" size="16" color="#ffffff" />
          <text class="empty-btn-text">去上传图片</text>
        </view>
      </view>

      <!-- 历史列表 -->
      <scroll-view v-else class="history-list" scroll-y>
        <view
          v-for="item in historyList"
          :key="item.id"
          class="history-item"
          @tap="handleLoad(item.id)"
        >
          <!-- 缩略图预览 -->
          <view class="thumb-wrapper">
            <canvas
              :canvas-id="'thumb_' + item.id"
              :id="'thumb_' + item.id"
              class="thumb-canvas"
              style="width: 120rpx; height: 120rpx;"
            />
          </view>

          <!-- 信息区 -->
          <view class="item-info">
            <text class="item-title">{{ item.title }}</text>
            <view class="item-tags">
              <view class="item-tag">
                <text class="item-tag-text">{{ item.gridWidth }}×{{ item.gridHeight }}</text>
              </view>
              <view class="item-tag brand">
                <text class="item-tag-text">{{ item.paletteId }}</text>
              </view>
            </view>
          </view>

          <!-- 删除按钮 -->
          <view class="delete-btn" @tap.stop="handleDelete(item.id)">
            <uni-icons type="trash" size="16" color="#ffb6b9" />
          </view>
        </view>
      </scroll-view>
    </view>

    <CustomTabBar />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, getCurrentInstance } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useProjectStore } from '../../stores/useProjectStore'
import { useSafeArea } from '../../utils/useSafeArea'
import CustomTabBar from '../../custom-tab-bar/index.vue'

const instance = getCurrentInstance()
const { safeTop, safeBottom } = useSafeArea()

interface HistoryItem {
  id: string
  title: string
  createdAt: number
  gridWidth: number
  gridHeight: number
  paletteId: string
  cellDataSnapshot: string[][]
}

const projectStore = useProjectStore()
const historyList = ref<HistoryItem[]>([])

onMounted(() => { refreshList() })

onShow(() => {
  projectStore.currentTab = 1
  refreshList()
})

function refreshList() {
  historyList.value = projectStore.loadHistoryList()
  nextTick(() => { renderAllThumbnails() })
}

function renderAllThumbnails() {
  for (const item of historyList.value) renderThumbnail(item)
}

function renderThumbnail(item: HistoryItem) {
  const thumbSize = 60
  const cellSize = Math.min(
    Math.floor(thumbSize / item.gridWidth),
    Math.floor(thumbSize / item.gridHeight)
  ) || 1

  // #ifdef H5
  const canvasEl = document.getElementById('thumb_' + item.id) as HTMLCanvasElement | null
  if (!canvasEl) return
  canvasEl.width = thumbSize
  canvasEl.height = thumbSize
  const ctx = canvasEl.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#FAFAFA'
  ctx.fillRect(0, 0, thumbSize, thumbSize)
  for (let y = 0; y < item.gridHeight; y++) {
    for (let x = 0; x < item.gridWidth; x++) {
      const hex = item.cellDataSnapshot[y]?.[x]
      if (hex) { ctx.fillStyle = hex; ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize) }
    }
  }
  // #endif

  // #ifndef H5
  const ctx = uni.createCanvasContext('thumb_' + item.id, instance?.proxy)
  ctx.setFillStyle('#FAFAFA')
  ctx.fillRect(0, 0, thumbSize, thumbSize)
  for (let y = 0; y < item.gridHeight; y++) {
    for (let x = 0; x < item.gridWidth; x++) {
      const hex = item.cellDataSnapshot[y]?.[x]
      if (hex) { ctx.setFillStyle(hex); ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize) }
    }
  }
  ctx.draw()
  // #endif
}

function handleLoad(id: string) {
  const success = projectStore.loadFromHistory(id)
  if (success) {
    uni.navigateTo({ url: '/pages/editor/index' })
  } else {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function handleDelete(id: string) {
  uni.showModal({
    title: '确认删除',
    content: '删除后无法恢复，确定要删除这条记录吗？',
    success: (res) => {
      if (res.confirm) {
        projectStore.deleteHistory(id)
        refreshList()
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    },
  })
}

function goToUpload() {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style scoped>
.page-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(180deg, #fdf9f5 0%, #faf5f0 100%);
}

.page-history {
  display: flex;
  flex-direction: column;
  flex: 1;
  box-sizing: border-box;
}

.header {
  padding: 44rpx 44rpx 32rpx;
  border-bottom: 2rpx solid #ede9e3;
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

.header-sub {
  font-size: 26rpx;
  color: #b0a8a0;
  font-weight: 500;
}

.history-list {
  flex: 1;
  padding: 28rpx 32rpx;
}

.history-item {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border-radius: 40rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.05), 0 0 0 2rpx rgba(0, 0, 0, 0.03);
  transition: all 0.22s ease;
}

.history-item:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.thumb-wrapper {
  width: 124rpx;
  height: 124rpx;
  border-radius: 28rpx;
  overflow: hidden;
  background-color: #f5f2ef;
  flex-shrink: 0;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.thumb-canvas {
  width: 124rpx;
  height: 124rpx;
}

.item-info {
  flex: 1;
  margin-left: 28rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16rpx;
}

.item-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #3d3d3d;
}

.item-tags {
  display: flex;
  gap: 12rpx;
}

.item-tag {
  padding: 6rpx 20rpx;
  border-radius: 20rpx;
  background: rgba(126, 200, 200, 0.1);
  border: 2rpx solid rgba(126, 200, 200, 0.2);
}

.item-tag.brand {
  background: rgba(255, 182, 185, 0.1);
  border-color: rgba(255, 182, 185, 0.3);
}

.item-tag-text {
  font-size: 22rpx;
  color: #7ea8a8;
  font-weight: 600;
}

.item-tag.brand .item-tag-text {
  color: #c08888;
}

.delete-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  background-color: rgba(255, 182, 185, 0.1);
  flex-shrink: 0;
  margin-left: 20rpx;
  transition: all 0.22s ease;
}

.delete-btn:active {
  background-color: rgba(255, 154, 158, 0.2);
  transform: scale(0.94);
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64rpx;
  gap: 0;
}

.empty-icon-wrap {
  width: 176rpx;
  height: 176rpx;
  border-radius: 56rpx;
  background: rgba(126, 200, 200, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
}

.empty-text {
  font-size: 36rpx;
  color: #4a4a4a;
  margin-bottom: 16rpx;
  font-weight: 700;
}

.empty-sub {
  font-size: 26rpx;
  color: #b0a8a0;
  margin-bottom: 64rpx;
  text-align: center;
  line-height: 1.6;
}

.empty-btn {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 28rpx 72rpx;
  border-radius: 52rpx;
  background: linear-gradient(135deg, #7ec8c8 0%, #5ab0b0 100%);
  box-shadow: 0 12rpx 40rpx rgba(126, 200, 200, 0.35);
  transition: all 0.22s ease;
}

.empty-btn:active { transform: scale(0.96); }

.empty-btn-text {
  font-size: 32rpx;
  color: #ffffff;
  font-weight: 600;
}
</style>

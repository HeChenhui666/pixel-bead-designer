<template>
  <view class="page-wrapper">
    <view class="page-history" :style="{ paddingTop: safeTop + 'px', paddingBottom: `calc(50px + ${safeBottom}px)` }">
      <view class="header">
        <text class="header-title">草稿箱</text>
      </view>

      <!-- 空状态 -->
      <view v-if="historyList.length === 0" class="empty-state">
        <text class="empty-icon">📦</text>
        <text class="empty-text">草稿箱是空的</text>
        <text class="empty-sub">生成图纸后保存，这里会留存记录</text>
        <view class="empty-btn" @tap="goToUpload()">
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
              style="width: 60px; height: 60px;"
            />
          </view>

          <!-- 信息区 -->
          <view class="item-info">
            <text class="item-title">{{ item.title }}</text>
            <text class="item-meta">{{ item.gridWidth }}×{{ item.gridHeight }} · {{ item.paletteId }}</text>
          </view>

          <!-- 删除按钮 -->
          <view class="delete-btn" @tap.stop="handleDelete(item.id)">
            <text class="delete-icon">✕</text>
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

onMounted(() => {
  refreshList()
})

onShow(() => {
  projectStore.currentTab = 2
  refreshList()
})

function refreshList() {
  historyList.value = projectStore.loadHistoryList()
  nextTick(() => {
    renderAllThumbnails()
  })
}

function renderAllThumbnails() {
  for (const item of historyList.value) {
    renderThumbnail(item)
  }
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
      if (hex) {
        ctx.fillStyle = hex
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
      }
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
      if (hex) {
        ctx.setFillStyle(hex)
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
      }
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
  background: transparent;
  box-sizing: border-box;
}

.header {
  padding: 20px 22px;
  background: transparent;
  border-bottom: 1px solid #efe9e3;
}

.header-title {
  font-size: 24px;
  font-weight: 700;
  color: #4a4a4a;
}

.history-list {
  flex: 1;
  padding: 14px;
}

.history-item {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: 0 2px 12px rgba(126, 200, 200, 0.08);
  transition: all 0.25s ease;
  border: 1.5px solid transparent;
}

.history-item:active {
  transform: scale(0.98);
  border-color: #e8f6f6;
}

.thumb-wrapper {
  width: 62px;
  height: 62px;
  border-radius: 12px;
  overflow: hidden;
  background-color: #f8f6f4;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.thumb-canvas {
  width: 62px;
  height: 62px;
}

.item-info {
  flex: 1;
  margin-left: 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.item-title {
  font-size: 15px;
  font-weight: 600;
  color: #4a4a4a;
  margin-bottom: 5px;
}

.item-meta {
  font-size: 12px;
  color: #b0a8a0;
}

.delete-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #f8f6f4;
  flex-shrink: 0;
  margin-left: 10px;
  transition: all 0.25s ease;
}

.delete-btn:active {
  background-color: #ffe8e9;
}

.delete-icon {
  font-size: 14px;
  color: #ff9a9e;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.empty-icon {
  font-size: 52px;
  margin-bottom: 14px;
  opacity: 0.8;
}

.empty-text {
  font-size: 18px;
  color: #4a4a4a;
  margin-bottom: 6px;
  font-weight: 600;
}

.empty-sub {
  font-size: 14px;
  color: #b0a8a0;
  margin-bottom: 28px;
}

.empty-btn {
  padding: 13px 36px;
  border-radius: 24px;
  background: linear-gradient(135deg, #7ec8c8 0%, #a8d8d8 100%);
  box-shadow: 0 4px 16px rgba(126, 200, 200, 0.3);
  transition: all 0.25s ease;
}

.empty-btn:active {
  transform: scale(0.96);
}

.empty-btn-text {
  font-size: 16px;
  color: #ffffff;
  font-weight: 600;
}
</style>

<template>
  <view class="page-history" :style="{ paddingTop: safeTop + 'px', height: `calc(100vh - 50px - ${safeBottom}px)` }">
    <view class="header">
      <text class="header-title">草稿箱</text>
    </view>

    <!-- 空状态 -->
    <view v-if="historyList.length === 0" class="empty-state">
      <text class="empty-icon">📦</text>
      <text class="empty-text">草稿箱是空的</text>
      <text class="empty-sub">生成图纸后保存，这里会留存记录</text>
      <view class="empty-btn" @click="goToUpload">
        <text class="empty-btn-text">去上传图片</text>
      </view>
    </view>

    <!-- 历史列表 -->
    <scroll-view v-else class="history-list" scroll-y>
      <view
        v-for="item in historyList"
        :key="item.id"
        class="history-item"
        @click="handleLoad(item.id)"
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
        <view class="delete-btn" @click.stop="handleDelete(item.id)">
          <text class="delete-icon">✕</text>
        </view>
      </view>
    </scroll-view>

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
.page-history {
  display: flex;
  flex-direction: column;
  background-color: #f8f8f8;
  overflow: auto;
  box-sizing: border-box;
}

.header {
  padding: 16px 20px;
  background-color: #ffffff;
  border-bottom: 1px solid #eeeeee;
}

.header-title {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
}

.history-list {
  flex: 1;
  padding: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.thumb-wrapper {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background-color: #fafafa;
  flex-shrink: 0;
}

.thumb-canvas {
  width: 60px;
  height: 60px;
}

.item-info {
  flex: 1;
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.item-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.item-meta {
  font-size: 12px;
  color: #999999;
}

.delete-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #f5f5f5;
  flex-shrink: 0;
  margin-left: 8px;
}

.delete-icon {
  font-size: 14px;
  color: #cc3333;
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
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 18px;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.empty-sub {
  font-size: 14px;
  color: #999999;
  margin-bottom: 24px;
}

.empty-btn {
  padding: 12px 32px;
  border-radius: 8px;
  background-color: #007AFF;
}

.empty-btn-text {
  font-size: 16px;
  color: #ffffff;
  font-weight: 600;
}
</style>

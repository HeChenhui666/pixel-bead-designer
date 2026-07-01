<template>
  <view class="page-wrapper">
    <view class="page-history" :style="{ paddingTop: safeTop + 'px', paddingBottom: `calc(80px + ${safeBottom}px)` }">
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
              style="width: 60px; height: 60px;"
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
  projectStore.currentTab = 2
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
  padding: 22px 22px 16px;
  border-bottom: 1px solid #ede9e3;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.header-title {
  font-size: 26px;
  font-weight: 800;
  color: #3d3d3d;
  letter-spacing: -0.5px;
}

.header-sub {
  font-size: 13px;
  color: #b0a8a0;
  font-weight: 500;
}

.history-list {
  flex: 1;
  padding: 14px 16px;
}

.history-item {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border-radius: 20px;
  padding: 14px;
  margin-bottom: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.03);
  transition: all 0.22s ease;
}

.history-item:active {
  transform: scale(0.98);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
}

.thumb-wrapper {
  width: 62px;
  height: 62px;
  border-radius: 14px;
  overflow: hidden;
  background-color: #f5f2ef;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
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
  gap: 8px;
}

.item-title {
  font-size: 15px;
  font-weight: 600;
  color: #3d3d3d;
}

.item-tags {
  display: flex;
  gap: 6px;
}

.item-tag {
  padding: 3px 10px;
  border-radius: 10px;
  background: rgba(126, 200, 200, 0.1);
  border: 1px solid rgba(126, 200, 200, 0.2);
}

.item-tag.brand {
  background: rgba(255, 182, 185, 0.1);
  border-color: rgba(255, 182, 185, 0.3);
}

.item-tag-text {
  font-size: 11px;
  color: #7ea8a8;
  font-weight: 600;
}

.item-tag.brand .item-tag-text {
  color: #c08888;
}

.delete-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background-color: rgba(255, 182, 185, 0.1);
  flex-shrink: 0;
  margin-left: 10px;
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
  padding: 32px;
  gap: 0;
}

.empty-icon-wrap {
  width: 88px;
  height: 88px;
  border-radius: 28px;
  background: rgba(126, 200, 200, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.empty-text {
  font-size: 18px;
  color: #4a4a4a;
  margin-bottom: 8px;
  font-weight: 700;
}

.empty-sub {
  font-size: 13px;
  color: #b0a8a0;
  margin-bottom: 32px;
  text-align: center;
  line-height: 1.6;
}

.empty-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 36px;
  border-radius: 26px;
  background: linear-gradient(135deg, #7ec8c8 0%, #5ab0b0 100%);
  box-shadow: 0 6px 20px rgba(126, 200, 200, 0.35);
  transition: all 0.22s ease;
}

.empty-btn:active { transform: scale(0.96); }

.empty-btn-text {
  font-size: 16px;
  color: #ffffff;
  font-weight: 600;
}
</style>

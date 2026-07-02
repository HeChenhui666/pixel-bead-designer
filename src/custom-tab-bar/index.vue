<template>
  <view class="tab-bar-wrap" :style="{ paddingBottom: safeBottom + 'px' }">
    <view class="custom-tab-bar">
      <view
        class="slide-indicator"
        :style="indicatorStyle"
      />

      <view
        v-for="(tab, index) in tabs"
        :key="tab.path"
        class="tab-item"
        @click="switchTab(index)"
      >
        <uni-icons
          :type="tab.icon"
          :size="current === index ? 22 : 20"
          :color="current === index ? '#ffffff' : '#b0a8a0'"
        />
        <text class="tab-label" :class="{ active: current === index }">{{ tab.text }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../stores/useProjectStore'
import { useSafeArea } from '../utils/useSafeArea'

const projectStore = useProjectStore()
const { safeBottom } = useSafeArea()

const current = computed(() => projectStore.currentTab)

const indicatorStyle = computed(() => {
  return { transform: `translateX(calc(${current.value} * 100%))` }
})

const tabs = [
  { path: '/pages/index/index', text: '首页', icon: 'image' },
  { path: '/pages/history/index', text: '草稿箱', icon: 'list' },
  { path: '/pages/palette/index', text: '色卡', icon: 'color' },
  { path: '/pages/about/index', text: '关于', icon: 'info' },
]

function switchTab(index: number) {
  if (current.value === index) return
  projectStore.currentTab = index
  uni.switchTab({ url: tabs[index].path })
}
</script>

<style scoped>
.tab-bar-wrap {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
  padding-left: 28rpx;
  padding-right: 28rpx;
  padding-top: 16rpx;
  background: transparent;
  pointer-events: none;
}

.custom-tab-bar {
  position: relative;
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 56rpx;
  padding: 12rpx;
  box-shadow:
    0 16rpx 64rpx rgba(126, 200, 200, 0.18),
    0 4rpx 24rpx rgba(0, 0, 0, 0.08),
    0 0 0 2rpx rgba(126, 200, 200, 0.10);
  pointer-events: auto;
  overflow: hidden;
}

.slide-indicator {
  position: absolute;
  width: calc(25% - 6rpx);
  top: 12rpx;
  bottom: 12rpx;
  left: 12rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #7ec8c8 0%, #5ab0b0 100%);
  box-shadow: 0 8rpx 28rpx rgba(126, 200, 200, 0.45);
  pointer-events: none;
  z-index: 0;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 16rpx 8rpx;
  position: relative;
  z-index: 1;
}

.tab-label {
  font-size: 20rpx;
  color: #b0a8a0;
  font-weight: 500;
  line-height: 1;
  transition: color 0.28s ease, font-weight 0.28s ease;
}

.tab-label.active {
  color: #ffffff;
  font-weight: 700;
}
</style>

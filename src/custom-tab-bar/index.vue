<template>
  <view class="tab-bar-wrap" :style="{ paddingBottom: safeBottom + 'px' }">
    <view class="custom-tab-bar">
      <!-- 滑动高亮指示器 -->
      <view
        class="slide-indicator"
        :style="{ transform: `translateX(calc(${current} * 100%))` }"
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

const tabs = [
  { path: '/pages/index/index', text: '首页', icon: 'image' },
  { path: '/pages/palette/index', text: '色卡', icon: 'color' },
  { path: '/pages/history/index', text: '草稿箱', icon: 'list' },
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
  padding-left: 14px;
  padding-right: 14px;
  padding-top: 8px;
  background: transparent;
  pointer-events: none;
}

.custom-tab-bar {
  position: relative;
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 28px;
  padding: 6px;
  box-shadow:
    0 8px 32px rgba(126, 200, 200, 0.18),
    0 2px 12px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(126, 200, 200, 0.10);
  pointer-events: auto;
  overflow: hidden;
}

/* 滑动指示器
   width: calc(25% - 3px) 是精确计算值：
   容器 padding=6px，每个 tab 宽=(W-12)/4，
   translateX(100%) = 指示器自身宽度 = (W/4 - 3px)，
   恰好等于一个 tab 的步长，四个 tab 位置均精确对齐。 */
.slide-indicator {
  position: absolute;
  width: calc(25% - 3px);
  top: 6px;
  bottom: 6px;
  left: 6px;
  border-radius: 20px;
  background: linear-gradient(135deg, #7ec8c8 0%, #5ab0b0 100%);
  box-shadow: 0 4px 14px rgba(126, 200, 200, 0.45);
  transition: transform 0.38s cubic-bezier(0.35, 0, 0.25, 1);
  will-change: transform;
  pointer-events: none;
  z-index: 0;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 8px 4px;
  position: relative;
  z-index: 1;
}

.tab-label {
  font-size: 10px;
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

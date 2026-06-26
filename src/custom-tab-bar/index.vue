<template>
  <view class="custom-tab-bar" :style="{ height: `calc(50px + ${safeBottom}px)`, paddingBottom: safeBottom + 'px' }">
    <view
      v-for="(tab, index) in tabs"
      :key="tab.path"
      class="tab-item"
      :class="{ active: current === index }"
      @click="switchTab(index)"
    >
      <text class="tab-icon">{{ tab.icon }}</text>
      <text class="tab-label">{{ tab.text }}</text>
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
  { path: '/pages/index/index', text: '图片', icon: '🖼️' },
  { path: '/pages/palette/index', text: '色卡', icon: '🎨' },
  { path: '/pages/history/index', text: '草稿箱', icon: '📂' },
]

function switchTab(index: number) {
  if (current.value === index) return
  projectStore.currentTab = index
  uni.switchTab({ url: tabs[index].path })
}
</script>

<style scoped>
.custom-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, #fdf9f5 0%, #faf5f0 100%);
  border-top: 1px solid #efe9e3;
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 999;
  box-shadow: 0 -4px 20px rgba(126, 200, 200, 0.08);
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 1;
  padding: 8px 0;
  transition: all 0.3s ease;
}

.tab-icon {
  font-size: 24px;
  line-height: 1;
  opacity: 0.5;
  transition: all 0.3s ease;
  filter: grayscale(0.3);
}

.tab-item.active .tab-icon {
  opacity: 1;
  filter: grayscale(0);
  transform: translateY(-2px);
}

.tab-label {
  font-size: 11px;
  color: #b0a8a0;
  line-height: 1;
  transition: all 0.3s ease;
  font-weight: 500;
}

.tab-item.active .tab-label {
  color: #7ec8c8;
  font-weight: 600;
}
</style>

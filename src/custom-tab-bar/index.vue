<template>
  <view class="custom-tab-bar">
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
interface Props {
  /** 当前选中的 tab 索引（0=图片, 1=色卡, 2=草稿箱） */
  current?: number
}

const props = withDefaults(defineProps<Props>(), {
  current: 0,
})

const tabs = [
  { path: '/pages/index/index', text: '图片', icon: '🖼️' },
  { path: '/pages/palette/index', text: '色卡', icon: '🎨' },
  { path: '/pages/history/index', text: '草稿箱', icon: '📂' },
]

function switchTab(index: number) {
  if (props.current === index) return
  uni.switchTab({ url: tabs[index].path })
}
</script>

<style scoped>
.custom-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(50px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background-color: #ffffff;
  border-top: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 999;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  padding: 4px 0;
}

.tab-icon {
  font-size: 22px;
  line-height: 1;
  opacity: 0.6;
}

.tab-item.active .tab-icon {
  opacity: 1;
}

.tab-label {
  font-size: 10px;
  color: #999999;
  line-height: 1;
}

.tab-item.active .tab-label {
  color: #007AFF;
  font-weight: 600;
}
</style>

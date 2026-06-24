<template>
  <view class="page-index">
    <!-- 顶部图片预览区 -->
    <view class="top-section">
      <ImagePicker v-model="projectStore.sourceImage" @error="onImageError" />
    </view>

    <!-- 参数面板 -->
    <scroll-view scroll-y class="params-scroll">
      <ParamPanel />
    </scroll-view>

    <!-- 底部生成按钮 -->
    <view class="bottom-action">
      <view
        class="generate-btn"
        :class="{ disabled: !projectStore.hasImage }"
        @click="handleGenerate"
      >
        <text class="btn-text">生成图纸</text>
      </view>
    </view>
    <CustomTabBar :current="0" />
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { useProjectStore } from '../../stores/useProjectStore'
import ImagePicker from '../../components/ImagePicker.vue'
import ParamPanel from '../../components/ParamPanel.vue'
import CustomTabBar from '../../custom-tab-bar/index.vue'

const projectStore = useProjectStore()

onShow(() => {
  // 自定义 tabBar 通过 prop 控制选中态，无需额外处理
})

function onImageError(message: string) {
  uni.showToast({ title: message, icon: 'none' })
}

function handleGenerate() {
  if (!projectStore.hasImage) return
  projectStore.pendingGenerate = true
  uni.navigateTo({ url: '/pages/editor/index' })
}
</script>

<style scoped>
.page-index {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 50px - var(--safe-bottom, 0px));
  background-color: #ffffff;
  padding-top: var(--safe-top, 0px);
  overflow: auto;
}

.top-section {
  padding: 16px;
  flex-shrink: 0;
}

.params-scroll {
  flex: 1;
}

.bottom-action {
  padding: 16px;
  padding-bottom: calc(16px + var(--safe-bottom, 0px));
  flex-shrink: 0;
}

.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-radius: 8px;
  background-color: #007AFF;
}

.generate-btn.disabled {
  background-color: #cccccc;
}

.btn-text {
  font-size: 16px;
  color: #ffffff;
  font-weight: 600;
}
</style>

<template>
  <view class="page-wrapper">
    <view class="page-index" :style="{ paddingTop: safeTop + 'px', paddingBottom: `calc(50px + ${safeBottom}px)` }">
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
          @tap="handleGenerate()"
        >
          <text class="btn-text">生成图纸</text>
        </view>
      </view>
    </view>

    <CustomTabBar />
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { useProjectStore } from '../../stores/useProjectStore'
import { useSafeArea } from '../../utils/useSafeArea'
import ImagePicker from '../../components/ImagePicker.vue'
import ParamPanel from '../../components/ParamPanel.vue'
import CustomTabBar from '../../custom-tab-bar/index.vue'

const projectStore = useProjectStore()
const { safeTop, safeBottom } = useSafeArea()

onShow(() => {
  projectStore.currentTab = 0
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
.page-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #ffffff;
}

.page-index {
  display: flex;
  flex-direction: column;
  flex: 1;
  background-color: #ffffff;
  box-sizing: border-box;
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

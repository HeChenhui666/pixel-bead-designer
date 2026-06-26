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
  background: linear-gradient(180deg, #fdf9f5 0%, #faf5f0 100%);
}

.page-index {
  display: flex;
  flex-direction: column;
  flex: 1;
  background: transparent;
  box-sizing: border-box;
}

.top-section {
  padding: 20px 16px;
  flex-shrink: 0;
}

.params-scroll {
  flex: 1;
}

.bottom-action {
  padding: 16px 20px 24px;
  flex-shrink: 0;
}

.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  border-radius: 26px;
  background: linear-gradient(135deg, #7ec8c8 0%, #a8d8d8 100%);
  box-shadow: 0 4px 16px rgba(126, 200, 200, 0.3);
  transition: all 0.3s ease;
}

.generate-btn:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(126, 200, 200, 0.2);
}

.generate-btn.disabled {
  background: linear-gradient(135deg, #d1d5db 0%, #e5e7eb 100%);
  box-shadow: none;
}

.btn-text {
  font-size: 16px;
  color: #ffffff;
  font-weight: 600;
  letter-spacing: 1px;
}
</style>

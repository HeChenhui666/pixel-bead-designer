<template>
  <view class="page-wrapper">
    <view class="page-index" :style="{ paddingTop: safeTop + 'px', paddingBottom: `calc(50px + ${safeBottom}px)` }">
      <!-- 图片上传区 -->
      <view class="upload-section">
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

.upload-section {
  padding: 16px 16px 12px;
  flex-shrink: 0;
}

.image-size-hint {
  margin-top: 8px;
  padding: 6px 12px;
  background-color: rgba(126, 200, 200, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.size-text {
  font-size: 13px;
  color: #5a9e9e;
  font-weight: 500;
}

.params-scroll {
  flex: 1;
  margin: 0 4px;
}

.bottom-action {
  padding: 16px 16px calc(24px + env(safe-area-inset-bottom, 0px));
  flex-shrink: 0;
  background: linear-gradient(180deg, rgba(253, 249, 245, 0) 0%, rgba(253, 249, 245, 0.95) 30%, #fdf9f5 100%);
}

.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  border-radius: 26px;
  background: linear-gradient(135deg, #7ec8c8 0%, #6bb3b3 100%);
  box-shadow: 0 6px 20px rgba(126, 200, 200, 0.35);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.generate-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 100%);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.generate-btn:active {
  transform: scale(0.97);
  box-shadow: 0 3px 12px rgba(126, 200, 200, 0.25);
}

.generate-btn:active::before {
  opacity: 1;
}

.generate-btn.disabled {
  background: linear-gradient(135deg, #d1d5db 0%, #e5e7eb 100%);
  box-shadow: none;
  cursor: not-allowed;
}

.generate-btn.disabled:active {
  transform: none;
}

.btn-text {
  font-size: 17px;
  color: #ffffff;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>

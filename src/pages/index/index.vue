<template>
  <view class="page-wrapper">
    <view class="page-index" :style="{ paddingTop: safeTop + 'px', paddingBottom: `calc(80px + ${safeBottom}px)` }">
      <!-- 顶部标题区 -->
      <view class="app-header">
        <view class="header-main">
          <text class="app-title">拼豆图纸</text>
          <text class="app-subtitle">将图片一键转为拼豆图纸</text>
        </view>
      </view>

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
          <uni-icons v-if="projectStore.hasImage" type="compose" size="18" color="#ffffff" />
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

/* 顶部标题区 */
.app-header {
  padding: 20px 20px 12px;
  flex-shrink: 0;
}

.header-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-title {
  font-size: 26px;
  font-weight: 800;
  color: #3d3d3d;
  letter-spacing: -0.5px;
}

.app-subtitle {
  font-size: 13px;
  color: #b0a8a0;
  font-weight: 400;
}

.upload-section {
  padding: 0 16px 12px;
  flex-shrink: 0;
}

.params-scroll {
  flex: 1;
  margin: 0 4px;
}

.bottom-action {
  padding: 12px 16px calc(20px + env(safe-area-inset-bottom, 0px));
  flex-shrink: 0;
  background: linear-gradient(180deg, rgba(253, 249, 245, 0) 0%, rgba(253, 249, 245, 0.95) 30%, #fdf9f5 100%);
}

.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 54px;
  border-radius: 27px;
  background: linear-gradient(135deg, #7ec8c8 0%, #5ab0b0 100%);
  box-shadow: 0 6px 24px rgba(126, 200, 200, 0.40);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.generate-btn:active {
  transform: scale(0.97);
  box-shadow: 0 3px 14px rgba(126, 200, 200, 0.30);
}

.generate-btn.disabled {
  background: linear-gradient(135deg, #d1d5db 0%, #e5e7eb 100%);
  box-shadow: none;
}

.generate-btn.disabled:active {
  transform: none;
}

.btn-text {
  font-size: 17px;
  color: #ffffff;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}
</style>

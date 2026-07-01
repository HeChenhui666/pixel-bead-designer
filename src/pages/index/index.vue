<template>
  <view class="page-wrapper">
    <view class="page-index" :style="{ paddingTop: safeTop + 'px', paddingBottom: `calc(160rpx + ${safeBottom}px)` }">

      <!-- 顶部标题区 -->
      <view
        class="app-header"
        :style="{ paddingRight: capsuleRight > 20 ? capsuleRight + 'px' : '40rpx' }"
      >
        <view class="header-main">
          <text class="app-title">拼豆图纸生成</text>
          <text class="app-subtitle">{{
            mode === 'blank' ? '创建空白画布' :
              mode === 'image' ? '将图片一键转为拼豆图纸' : '选择一种方式开始吧！' }}</text>
        </view>
        <view v-if="mode !== 'choose'" class="back-chip" @tap="resetMode()">
          <uni-icons type="back" size="13" color="#7ec8c8" />
          <text class="back-chip-text">重新选择</text>
        </view>
      </view>

      <!-- ===== 选择模式 ===== -->
      <view v-if="mode === 'choose'" class="choose-section">
        <view class="option-card" @tap="enterImageMode()">
          <view class="option-icon-wrap teal">
            <uni-icons type="image" size="26" color="#ffffff" />
          </view>
          <view class="option-content">
            <text class="option-title">选择图片</text>
            <text class="option-desc">从相册或相机导入图片，自动转换为拼豆图纸</text>
          </view>
          <uni-icons type="forward" size="15" color="#c8c0b8" />
        </view>

        <view class="option-card" @tap="enterBlankMode()">
          <view class="option-icon-wrap pink">
            <uni-icons type="compose" size="26" color="#ffffff" />
          </view>
          <view class="option-content">
            <text class="option-title">创建空白画布</text>
            <text class="option-desc">选择尺寸和色系，从零手动绘制拼豆图纸</text>
          </view>
          <uni-icons type="forward" size="15" color="#c8c0b8" />
        </view>
      </view>

      <!-- ===== 图片模式 ===== -->
      <view v-if="mode === 'image'" class="mode-content">
        <view class="upload-section">
          <ImagePicker v-model="projectStore.sourceImage" @error="onImageError" />
        </view>
        <scroll-view scroll-y class="params-scroll">
          <ParamPanel />
        </scroll-view>
        <view class="bottom-action">
          <view class="generate-btn" :class="{ disabled: !projectStore.hasImage }" @tap="handleGenerate()">
            <uni-icons v-if="projectStore.hasImage" type="compose" size="18" color="#ffffff" />
            <text class="btn-text">生成图纸</text>
          </view>
        </view>
      </view>

      <!-- ===== 空白画布模式 ===== -->
      <view v-if="mode === 'blank'" class="mode-content">
        <scroll-view scroll-y class="params-scroll">
          <ParamPanel :blank-mode="true" />
        </scroll-view>
        <view class="bottom-action">
          <view class="generate-btn" @tap="handleCreateBlankCanvas()">
            <uni-icons type="compose" size="18" color="#ffffff" />
            <text class="btn-text">创建空白画布</text>
          </view>
        </view>
      </view>

    </view>

    <CustomTabBar />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useProjectStore } from '../../stores/useProjectStore'
import { useSafeArea } from '../../utils/useSafeArea'
import ImagePicker from '../../components/ImagePicker.vue'
import ParamPanel from '../../components/ParamPanel.vue'
import CustomTabBar from '../../custom-tab-bar/index.vue'

const projectStore = useProjectStore()
const { safeTop, safeBottom, capsuleRight, capsuleBottom } = useSafeArea()

type Mode = 'choose' | 'image' | 'blank'
const mode = ref<Mode>('choose')

onShow(() => {
  projectStore.currentTab = 0
})

function enterImageMode() {
  mode.value = 'image'
}

function enterBlankMode() {
  mode.value = 'blank'
}

function resetMode() {
  mode.value = 'choose'
  projectStore.sourceImage = ''
}

function onImageError(message: string) {
  uni.showToast({ title: message, icon: 'none' })
}

function handleGenerate() {
  if (!projectStore.hasImage) return
  projectStore.pendingGenerate = true
  uni.navigateTo({ url: '/pages/editor/index' })
}

function handleCreateBlankCanvas() {
  projectStore.sourceImage = ''
  projectStore.resetGrid()
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
  padding: 40rpx 40rpx 24rpx;
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.header-main {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.app-title {
  font-size: 52rpx;
  font-weight: 800;
  color: #3d3d3d;
  letter-spacing: -1rpx;
}

.app-subtitle {
  font-size: 26rpx;
  color: #b0a8a0;
  font-weight: 400;
}

/* 返回 chip */
.back-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  border-radius: 40rpx;
  background: rgba(126, 200, 200, 0.1);
  border: 2rpx solid rgba(126, 200, 200, 0.3);
  margin-top: 8rpx;
}

.back-chip-text {
  font-size: 24rpx;
  color: #7ec8c8;
  font-weight: 500;
}

/* 选择模式 */
.choose-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 48rpx 32rpx;
  gap: 24rpx;
}

.option-card {
  display: flex;
  align-items: center;
  gap: 28rpx;
  padding: 36rpx 32rpx;
  background: #ffffff;
  border-radius: 40rpx;
  box-shadow:
    0 4rpx 32rpx rgba(0, 0, 0, 0.06),
    0 0 0 2rpx rgba(0, 0, 0, 0.03);
  transition: all 0.22s ease;
}

.option-card:active {
  transform: scale(0.975);
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
  background-color: #f9f9f9;
}

.option-icon-wrap {
  width: 104rpx;
  height: 104rpx;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.option-icon-wrap.teal {
  background: linear-gradient(135deg, #7ec8c8 0%, #5ab0b0 100%);
  box-shadow: 0 8rpx 24rpx rgba(126, 200, 200, 0.4);
}

.option-icon-wrap.pink {
  background: linear-gradient(135deg, #ffb6b9 0%, #f0909a 100%);
  box-shadow: 0 8rpx 24rpx rgba(255, 182, 185, 0.4);
}

.option-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.option-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #3d3d3d;
}

.option-desc {
  font-size: 24rpx;
  color: #b0a8a0;
  line-height: 1.5;
}

/* 图片 & 空白画布模式公共容器 */
.mode-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.upload-section {
  padding: 0 32rpx 24rpx;
  flex-shrink: 0;
}

.params-scroll {
  flex: 1;
  margin: 0 8rpx;
}

.bottom-action {
  padding: 24rpx 32rpx calc(40rpx + env(safe-area-inset-bottom, 0px));
  flex-shrink: 0;
  background: linear-gradient(180deg, rgba(253, 249, 245, 0) 0%, rgba(253, 249, 245, 0.95) 30%, #fdf9f5 100%);
}

.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  height: 108rpx;
  border-radius: 54rpx;
  background: linear-gradient(135deg, #7ec8c8 0%, #5ab0b0 100%);
  box-shadow: 0 12rpx 48rpx rgba(126, 200, 200, 0.40);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.generate-btn:active {
  transform: scale(0.97);
  box-shadow: 0 6rpx 28rpx rgba(126, 200, 200, 0.30);
}

.generate-btn.disabled {
  background: linear-gradient(135deg, #d1d5db 0%, #e5e7eb 100%);
  box-shadow: none;
}

.generate-btn.disabled:active {
  transform: none;
}

.btn-text {
  font-size: 34rpx;
  color: #ffffff;
  font-weight: 700;
  letter-spacing: 3rpx;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.08);
}
</style>

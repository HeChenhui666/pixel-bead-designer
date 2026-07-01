<template>
  <view class="page-about" :style="{ paddingTop: safeTop + 'px', paddingBottom: `calc(160rpx + ${safeBottom}px)` }">
    <view class="about-container">
      <!-- 应用图标与名称 -->
      <view class="app-header">
        <view class="icon-glow-wrap">
          <view class="icon-glow" />
          <view class="app-icon-wrap">
            <text class="app-icon">🎨</text>
          </view>
        </view>
        <text class="app-name">拼豆图纸生成器</text>
        <view class="version-chip">
          <text class="version-chip-text">v1.0.0</text>
        </view>
      </view>

      <!-- 版本信息卡片 -->
      <view class="info-card">
        <view class="card-title-row">
          <view class="card-dot" />
          <text class="card-title">版本信息</text>
        </view>
        <view class="info-row">
          <text class="info-label">当前版本</text>
          <text class="info-value">v1.0.0</text>
        </view>
        <view class="info-divider" />
        <view class="info-row">
          <text class="info-label">发布日期</text>
          <text class="info-value">2026-06-26</text>
        </view>
      </view>

      <!-- 联系方式卡片 -->
      <view class="info-card">
        <view class="card-title-row">
          <view class="card-dot pink" />
          <text class="card-title">联系方式</text>
        </view>
        <view class="info-row" @tap="copyWechat()">
          <text class="info-label">微信号</text>
          <view class="info-value-wrap">
            <text class="info-value highlight">chenhui6677889</text>
            <uni-icons type="paperplane" size="14" color="#7ec8c8" />
          </view>
        </view>
      </view>

      <!-- 仓库地址卡片 -->
      <view class="info-card">
        <view class="card-title-row">
          <view class="card-dot" />
          <text class="card-title">开源仓库</text>
        </view>
        <view class="repo-link" @tap="copyRepo()">
          <text class="repo-url">github.com/HeChenhui666/pixel-bead-designer</text>
        </view>
      </view>

      <!-- 底部说明 -->
      <view class="footer-note">
        <text class="footer-text">感谢使用，如有问题欢迎反馈 💬</text>
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
import CustomTabBar from '../../custom-tab-bar/index.vue'

const projectStore = useProjectStore()
const { safeTop, safeBottom } = useSafeArea()

const REPO_URL = 'https://github.com/HeChenhui666/pixel-bead-designer'

onShow(() => {
  projectStore.currentTab = 3
})

function copyWechat() {
  uni.setClipboardData({
    data: 'chenhui6677889',
    success: () => {
      uni.showToast({ title: '微信号已复制', icon: 'none' })
    },
  })
}

function copyRepo() {
  uni.setClipboardData({
    data: REPO_URL,
    success: () => {
      uni.showToast({ title: '链接已复制', icon: 'none' })
    },
  })
}

</script>

<style scoped>
.page-about {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(180deg, #fdf9f5 0%, #faf5f0 100%);
}

.about-container {
  flex: 1;
  padding: 48rpx 40rpx;
}

/* 顶部应用头 */
.app-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 56rpx;
  padding-top: 24rpx;
  gap: 24rpx;
}

.icon-glow-wrap {
  position: relative;
  width: 180rpx;
  height: 180rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-glow {
  position: absolute;
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(126, 200, 200, 0.25) 0%, rgba(126, 200, 200, 0) 70%);
}

.app-icon-wrap {
  width: 144rpx;
  height: 144rpx;
  border-radius: 44rpx;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 48rpx rgba(126, 200, 200, 0.2), 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.app-icon {
  font-size: 72rpx;
  line-height: 1;
}

.app-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #3d3d3d;
  letter-spacing: -0.6rpx;
}

.version-chip {
  background: rgba(126, 200, 200, 0.12);
  border: 2rpx solid rgba(126, 200, 200, 0.25);
  border-radius: 24rpx;
  padding: 8rpx 28rpx;
}

.version-chip-text {
  font-size: 24rpx;
  color: #7ec8c8;
  font-weight: 600;
}

/* 信息卡片 */
.info-card {
  background-color: #ffffff;
  border-radius: 40rpx;
  padding: 36rpx 36rpx 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.05), 0 0 0 2rpx rgba(0, 0, 0, 0.03);
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 28rpx;
}

.card-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 6rpx;
  background: #7ec8c8;
  flex-shrink: 0;
}

.card-dot.pink {
  background: #ffb6b9;
}

.card-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #6b6b6b;
  flex: 1;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}

.info-divider {
  height: 2rpx;
  background: #f5f2ef;
  margin: 8rpx 0;
}

.info-label {
  font-size: 28rpx;
  color: #9ca3af;
}

.info-value {
  font-size: 28rpx;
  color: #4a4a4a;
  font-weight: 500;
}

.info-value.highlight {
  color: #7ec8c8;
}

.info-value-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}


.repo-link {
  padding: 20rpx 24rpx;
  background-color: #f8f6f4;
  border-radius: 24rpx;
  transition: background-color 0.18s ease;
}

.repo-link:active {
  background-color: #ede9e4;
}

.repo-url {
  font-size: 24rpx;
  color: #7ec8c8;
  word-break: break-all;
  line-height: 1.6;
  font-family: monospace;
}

/* 底部 */
.footer-note {
  margin-top: 56rpx;
  text-align: center;
}

.footer-text {
  font-size: 26rpx;
  color: #c0b8b0;
}
</style>

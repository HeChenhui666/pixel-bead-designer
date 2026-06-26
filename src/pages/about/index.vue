<template>
  <view class="page-about" :style="{ paddingTop: safeTop + 'px', paddingBottom: `calc(50px + ${safeBottom}px)` }">
    <view class="about-container">
      <!-- 应用图标与名称 -->
      <view class="app-header">
        <view class="app-icon">🎨</view>
        <text class="app-name">拼豆图纸生成器</text>
        <text class="app-version">v1.0.0</text>
      </view>

      <!-- 版本信息卡片 -->
      <view class="info-card">
        <text class="card-title">版本信息</text>
        <view class="info-row">
          <text class="info-label">当前版本</text>
          <text class="info-value">v1.0.0</text>
        </view>
        <view class="info-row">
          <text class="info-label">发布日期</text>
          <text class="info-value">2026-06-26</text>
        </view>
      </view>

      <!-- 联系方式卡片 -->
      <view class="info-card">
        <text class="card-title">联系方式</text>
        <view class="info-row">
          <text class="info-label">微信号</text>
          <text class="info-value highlight" @click="copyWechat">chenhui6677889</text>
        </view>
        <text class="copy-hint" v-if="showCopyHint">已复制到剪贴板</text>
      </view>

      <!-- 仓库地址卡片 -->
      <view class="info-card">
        <text class="card-title">开源仓库</text>
        <view class="repo-link" @click="openRepo">
          <text class="repo-url">https://github.com/HeChenhui666/pixel-bead-designer</text>
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
const showCopyHint = ref(false)

onShow(() => {
  projectStore.currentTab = 3
})

function copyWechat() {
  uni.setClipboardData({
    data: 'chenhui6677889',
    success: () => {
      showCopyHint.value = true
      setTimeout(() => {
        showCopyHint.value = false
      }, 2000)
    },
  })
}

function openRepo() {
  // #ifdef H5
  window.open('https://github.com/HeChenhui666/pixel-bead-designer', '_blank')
  // #endif
  // #ifndef H5
  uni.setClipboardData({
    data: 'https://github.com/HeChenhui666/pixel-bead-designer',
    success: () => {
      uni.showToast({ title: '链接已复制，请在浏览器中打开', icon: 'none' })
    },
  })
  // #endif
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
  padding: 24px 20px;
}

.app-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
  padding-top: 16px;
}

.app-icon {
  font-size: 56px;
  margin-bottom: 12px;
}

.app-name {
  font-size: 22px;
  font-weight: 700;
  color: #4a4a4a;
  margin-bottom: 6px;
}

.app-version {
  font-size: 13px;
  color: #b0a8a0;
  font-weight: 500;
}

.info-card {
  background-color: #ffffff;
  border-radius: 16px;
  padding: 18px 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(126, 200, 200, 0.06);
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #7ec8c8;
  margin-bottom: 14px;
  display: block;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.info-label {
  font-size: 14px;
  color: #9ca3af;
}

.info-value {
  font-size: 14px;
  color: #4a4a4a;
  font-weight: 500;
}

.info-value.highlight {
  color: #7ec8c8;
}

.copy-hint {
  font-size: 12px;
  color: #7ec8c8;
  margin-top: 6px;
  display: block;
  text-align: right;
}

.repo-link {
  padding: 10px 14px;
  background-color: #f8f6f4;
  border-radius: 10px;
}

.repo-url {
  font-size: 12px;
  color: #7ec8c8;
  word-break: break-all;
  line-height: 1.5;
}

.footer-note {
  margin-top: 32px;
  text-align: center;
}

.footer-text {
  font-size: 13px;
  color: #b0a8a0;
}
</style>

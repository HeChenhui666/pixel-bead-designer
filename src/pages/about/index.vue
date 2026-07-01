<template>
  <view class="page-about" :style="{ paddingTop: safeTop + 'px', paddingBottom: `calc(80px + ${safeBottom}px)` }">
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
        <view class="info-row" @click="copyWechat">
          <text class="info-label">微信号</text>
          <view class="info-value-wrap">
            <text class="info-value highlight">chenhui6677889</text>
            <uni-icons type="paperplane" size="14" color="#7ec8c8" />
          </view>
        </view>
        <view v-if="showCopyHint" class="copy-hint-chip">
          <uni-icons type="checkbox" size="13" color="#7ec8c8" />
          <text class="copy-hint-text">已复制到剪贴板</text>
        </view>
      </view>

      <!-- 仓库地址卡片 -->
      <view class="info-card" @click="openRepo">
        <view class="card-title-row">
          <view class="card-dot" />
          <text class="card-title">开源仓库</text>
          <uni-icons type="right" size="14" color="#b0a8a0" />
        </view>
        <view class="repo-link">
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
const showCopyHint = ref(false)

onShow(() => {
  projectStore.currentTab = 3
})

function copyWechat() {
  uni.setClipboardData({
    data: 'chenhui6677889',
    success: () => {
      showCopyHint.value = true
      setTimeout(() => { showCopyHint.value = false }, 2000)
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

/* 顶部应用头 */
.app-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 28px;
  padding-top: 12px;
  gap: 12px;
}

.icon-glow-wrap {
  position: relative;
  width: 90px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-glow {
  position: absolute;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(126, 200, 200, 0.25) 0%, rgba(126, 200, 200, 0) 70%);
}

.app-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 22px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 24px rgba(126, 200, 200, 0.2), 0 2px 8px rgba(0, 0, 0, 0.06);
}

.app-icon {
  font-size: 36px;
  line-height: 1;
}

.app-name {
  font-size: 20px;
  font-weight: 700;
  color: #3d3d3d;
  letter-spacing: -0.3px;
}

.version-chip {
  background: rgba(126, 200, 200, 0.12);
  border: 1px solid rgba(126, 200, 200, 0.25);
  border-radius: 12px;
  padding: 4px 14px;
}

.version-chip-text {
  font-size: 12px;
  color: #7ec8c8;
  font-weight: 600;
}

/* 信息卡片 */
.info-card {
  background-color: #ffffff;
  border-radius: 20px;
  padding: 18px 18px 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.03);
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.card-dot {
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background: #7ec8c8;
  flex-shrink: 0;
}

.card-dot.pink {
  background: #ffb6b9;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #6b6b6b;
  flex: 1;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.info-divider {
  height: 1px;
  background: #f5f2ef;
  margin: 4px 0;
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

.info-value-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.copy-hint-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 5px 12px;
  background: rgba(126, 200, 200, 0.1);
  border-radius: 10px;
  align-self: flex-start;
}

.copy-hint-text {
  font-size: 12px;
  color: #7ec8c8;
  font-weight: 500;
}

.repo-link {
  padding: 10px 12px;
  background-color: #f8f6f4;
  border-radius: 12px;
}

.repo-url {
  font-size: 12px;
  color: #7ec8c8;
  word-break: break-all;
  line-height: 1.6;
  font-family: monospace;
}

/* 底部 */
.footer-note {
  margin-top: 28px;
  text-align: center;
}

.footer-text {
  font-size: 13px;
  color: #c0b8b0;
}
</style>

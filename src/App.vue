<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";

onLaunch(() => {
  // H5 端通过 JS 注入安全距离 CSS 变量
  // #ifdef H5
  const windowInfo = uni.getWindowInfo();
  const safeTop = windowInfo.statusBarHeight || 0;
  const safeBottom = windowInfo.safeArea?.bottom || 0;
  document.documentElement.style.setProperty('--safe-top', `${safeTop}px`);
  document.documentElement.style.setProperty('--safe-bottom', `${safeBottom}px`);
  // #endif

  // App 端：首页渲染完毕后，在后台预加载其余 tab 页面
  // 避免首次点击 tab 时页面从零冷启动
  // #ifdef APP-PLUS
  setTimeout(() => {
    uni.preloadPage({ url: '/pages/palette/index' })
    uni.preloadPage({ url: '/pages/history/index' })
    uni.preloadPage({ url: '/pages/about/index' })
  }, 800)
  // #endif
});

onShow(() => {});
onHide(() => {});
</script>

<style>
/* 预加载 uni-icons 字体：在 App 启动时即触发字体加载，
   避免首次渲染 uni-icons 组件时产生可见的图标空白/卡顿 */
@font-face {
  font-family: uniicons;
  src: url('@dcloudio/uni-ui/lib/uni-icons/uniicons.ttf') format('truetype');
  font-display: swap;
}

/* 全局 box-sizing（兼容小程序） */
view, text, image, input, scroll-view, button, form, label, navigator, rich-text, canvas, video, audio, swiper, swiper-item, picker, textarea {
  box-sizing: border-box;
}

uni-page-body {
  overflow: hidden;
  height: 100%;
}

/* 小程序端通过 env() 获取安全距离，H5 端由 JS 注入覆盖 */
page {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}
</style>

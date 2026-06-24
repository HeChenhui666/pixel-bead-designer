<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";

onLaunch(() => {
  console.log("App Launch");

  // App 端隐藏原生 tabBar，由自定义 CustomTabBar 接管
  // #ifndef H5
  uni.hideTabBar({ fail: () => {} });
  // #endif

  // 注入全局安全距离 CSS 变量（兼容 App/H5/小程序）
  const sysInfo = uni.getSystemInfoSync();
  const safeTop = sysInfo.statusBarHeight || 0;
  const safeBottom = sysInfo.safeAreaInsets?.bottom || 0;

  // #ifdef H5
  document.documentElement.style.setProperty('--safe-top', `${safeTop}px`);
  document.documentElement.style.setProperty('--safe-bottom', `${safeBottom}px`);
  // #endif
});

onShow(() => {
  console.log("App Show");
  // 每次显示时重新隐藏原生 tabBar（防止切换回来时恢复）
  // #ifndef H5
  uni.hideTabBar({ fail: () => {} });
  // #endif
});

onHide(() => {
  console.log("App Hide");
});
</script>

<style>
uni-page-body {
  overflow: hidden;
  height: 100%;
}

/* 全局安全距离变量兜底值 */
page {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}
</style>

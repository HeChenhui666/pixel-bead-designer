<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";

onLaunch(() => {
  console.log("App Launch");

  // H5 端通过 JS 注入安全距离 CSS 变量
  // #ifdef H5
  const sysInfo = uni.getSystemInfoSync();
  const safeTop = sysInfo.statusBarHeight || 0;
  const safeBottom = sysInfo.safeAreaInsets?.bottom || 0;
  document.documentElement.style.setProperty('--safe-top', `${safeTop}px`);
  document.documentElement.style.setProperty('--safe-bottom', `${safeBottom}px`);
  // #endif
});

onShow(() => {
  console.log("App Show");
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

/* 小程序端通过 env() 获取安全距离，H5 端由 JS 注入覆盖 */
page {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}
</style>

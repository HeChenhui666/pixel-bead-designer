<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";

onLaunch(() => {
  const sysInfo = uni.getSystemInfoSync();
  const statusBarHeight = sysInfo.statusBarHeight || 0;
  const safeAreaBottom = sysInfo.safeAreaInsets?.bottom || 0;

  // H5 和 App 均为 webview，document 可用；小程序无 document，跳过
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--status-bar-height', `${statusBarHeight}px`);
    document.documentElement.style.setProperty('--safe-area-bottom', `${safeAreaBottom}px`);
  }
});
</script>

<style>
uni-page-body {
  overflow: hidden;
  height: 100%;
}
</style>

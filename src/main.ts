import { createSSRApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import UniIcons from '@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue'

export function createApp() {
  const app = createSSRApp(App);
  const pinia = createPinia();
  app.use(pinia);
  app.component('uni-icons', UniIcons);
  return {
    app,
  };
}

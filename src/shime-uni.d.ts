export {}

declare module "vue" {
  type Hooks = App.AppInstance & Page.PageInstance;
  interface ComponentCustomOptions extends Hooks {}
  interface GlobalComponents {
    UniIcons: typeof import('@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue')['default']
  }
}
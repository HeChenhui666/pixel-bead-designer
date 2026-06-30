# 拼豆图纸生成器 (Pixel Bead Designer)

一款基于 uni-app 开发的跨平台拼豆图纸生成工具，支持上传照片自动生成拼豆网格图纸，提供编辑、导出和分享功能。

## ✨ 功能特性

- **图片转图纸**：上传任意照片，自动转换为拼豆网格图纸
- **多品牌色卡**：支持主流拼豆品牌色卡切换与搜索
- **可视化编辑**：支持画笔模式、单格编辑、撤销/重做操作
- **颜色统计**：实时统计图纸使用的颜色种类和数量
- **草稿管理**：保存和管理历史图纸草稿
- **长图导出**：支持导出高清长图用于打印或分享
- **原图对比**：一键对比原图与生成效果
- **跨平台支持**：支持 H5、微信小程序、App（iOS/Android）等多端运行

## 🛠️ 技术栈

- **框架**：Vue 3 + TypeScript
- **构建工具**：Vite 7.3.3
- **跨平台框架**：uni-app (DCloudio)
- **状态管理**：Pinia
- **国际化**：vue-i18n
- **测试框架**：Vitest

## 📦 项目结构

```
pixel-bead-designer/
├── src/
│   ├── components/          # 公共组件
│   │   ├── GridCanvas.vue       # 网格画布核心组件
│   │   ├── ImagePicker.vue      # 图片选择器
│   │   ├── ParamPanel.vue       # 参数配置面板
│   │   ├── ColorPicker.vue      # 颜色选择器
│   │   ├── ResizableColorPicker.vue  # 可调整大小的颜色选择器
│   │   └── ColorSummary.vue     # 颜色统计摘要
│   ├── custom-tab-bar/      # 自定义底部导航栏
│   ├── pages/               # 页面目录
│   │   ├── index/               # 首页 - 图片上传与参数设置
│   │   ├── editor/              # 编辑器 - 图纸编辑与导出
│   │   ├── palette/             # 色卡 - 品牌色卡浏览与搜索
│   │   ├── history/             # 草稿箱 - 历史记录管理
│   │   └── about/               # 关于页面
│   ├── stores/              # Pinia 状态管理
│   ├── utils/               # 工具函数
│   ├── App.vue              # 应用根组件
│   ├── main.ts              # 应用入口
│   ├── manifest.json        # uni-app 应用配置
│   └── pages.json           # 页面路由配置
├── package.json
├── vite.config.ts
├── tsconfig.json
└── vitest.config.ts
```

## 🚀 快速开始

### 环境要求

- Node.js >= 16
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# H5 开发
npm run dev:h5

# 微信小程序开发
npm run dev:mp-weixin

# App 开发
npm run dev:app
```

### 生产构建

```bash
# H5 构建
npm run build:h5

# 微信小程序构建
npm run build:mp-weixin

# App 构建
npm run build:app
```

### 类型检查

```bash
npm run type-check
```

## 📱 支持平台

| 平台 | 命令 | 说明 |
|------|------|------|
| H5 | `dev:h5` / `build:h5` | Web 浏览器运行 |
| 微信小程序 | `dev:mp-weixin` / `build:mp-weixin` | 微信开发者工具 |
| App (Android) | `dev:app-android` / `build:app-android` | Android 真机/模拟器 |
| App (iOS) | `dev:app-ios` / `build:app-ios` | iOS 真机/模拟器 |
| 支付宝小程序 | `dev:mp-alipay` / `build:mp-alipay` | 支付宝开发者工具 |
| 百度小程序 | `dev:mp-baidu` / `build:mp-baidu` | 百度开发者工具 |
| 抖音小程序 | `dev:mp-toutiao` / `build:mp-toutiao` | 抖音开发者工具 |
| QQ 小程序 | `dev:mp-qq` / `build:mp-qq` | QQ 开发者工具 |
| 快手小程序 | `dev:mp-kuaishou` / `build:mp-kuaishou` | 快手开发者工具 |
| 鸿蒙应用 | `dev:mp-harmony` / `build:mp-harmony` | HarmonyOS 平台 |

## 🔧 权限说明

### Android
- `READ_MEDIA_IMAGES`：读取相册图片
- `WRITE_EXTERNAL_STORAGE`：保存图纸到本地
- `CAMERA`：拍照生成图纸

### iOS
- 相册访问权限：用于选择照片生成拼豆图纸
- 相册写入权限：用于保存生成的拼豆图纸到相册
- 相机权限：用于拍照生成拼豆图纸

## 📄 License

MIT

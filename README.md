# 灵感一拼 - 拼豆图纸生成器

一款基于 uni-app 开发的微信小程序，支持上传照片自动生成拼豆网格图纸，提供编辑、导出和分享功能。

**微信小程序名称：灵感一拼**

## ✨ 功能特性

- **图片转图纸**：上传任意照片，自动转换为拼豆网格图纸
- **多品牌色卡**：支持主流拼豆品牌色卡切换与搜索
- **可视化编辑**：支持画笔模式、单格编辑、撤销/重做操作
- **颜色统计**：实时统计图纸使用的颜色种类和数量
- **草稿管理**：保存和管理历史图纸草稿
- **长图导出**：支持导出高清长图用于打印或分享
- **原图对比**：一键对比原图与生成效果
- **微信小程序专属**：专为微信小程序优化，流畅体验

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
# 微信小程序开发
npm run dev:mp-weixin
```

### 生产构建

```bash
# 微信小程序构建
npm run build:mp-weixin
```

### 类型检查

```bash
npm run type-check
```

## 📱 支持平台

目前仅支持**微信小程序**平台。

| 平台 | 命令 | 说明 |
|------|------|------|
| 微信小程序 | `dev:mp-weixin` / `build:mp-weixin` | 微信开发者工具预览与发布 |

## 🔧 权限说明

### 微信小程序
- 相册访问权限：用于选择照片生成拼豆图纸
- 相册写入权限：用于保存生成的拼豆图纸到相册
- 相机权限：用于拍照生成拼豆图纸

## 📄 License

MIT

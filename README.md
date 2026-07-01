# 灵感一拼 · 拼豆图纸生成器

> 一款基于 uni-app 开发的跨平台应用，支持将照片一键转换为拼豆网格图纸，也可从零创建空白画布手动绘制。

**微信小程序名称：灵感一拼**

---

## ✨ 功能特性

### 图片转图纸
- 从相册或相机选取照片，自动像素化为拼豆网格图纸
- 5 种像素化算法可选（自适应 / 平均色 / 加权中值 / 高斯加权 / 边缘感知），适配不同图片风格
- 支持预设网格尺寸（32×32 / 48×48 / 98×98 / 158×158）及自定义尺寸

### 空白画布
- 选择网格尺寸与色系后直接创建空白画布，手动逐格绘制

### 可视化编辑
- 手势缩放 / 拖移，流畅浏览大尺寸图纸
- 画笔涂色 / 橡皮擦除 / 单格颜色选择
- 撤销 / 重做（最多 20 步历史）
- 原图对比：一键叠加半透明原图校验还原效果
- 实时颜色统计：展示各颜色用量，辅助备料

### 多品牌色卡
- 内置 5 大主流拼豆品牌色卡：**MARD、COCO、漫漫、盼盼、咪小窝**
- 支持按色系筛选与颜色关键字搜索
- 色卡页可查看每种颜色的编号、名称与 RGB 值

### 草稿管理
- 生成的图纸可保存为草稿，支持缩略图预览
- 随时从草稿箱加载继续编辑，或一键删除

### 导出分享
- 导出高清长图（含颜色统计表），可保存到相册或直接分享

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Vue 3 + TypeScript |
| 跨平台 | uni-app (DCloudio) |
| 构建 | Vite |
| 状态管理 | Pinia |
| UI 组件 | @dcloudio/uni-ui（uni-icons） |
| 样式预处理 | Sass |
| 类型检查 | vue-tsc |
| 单元测试 | Vitest |

---

## 📦 项目结构

```
pixel-bead-designer/
├── src/
│   ├── components/
│   │   ├── GridCanvas.vue          # 网格画布（缩放 / 绘制 / 渲染核心）
│   │   ├── ImagePicker.vue         # 图片选择与预览
│   │   ├── ParamPanel.vue          # 参数配置面板（尺寸 / 算法 / 品牌 / 色系）
│   │   ├── ColorPicker.vue         # 颜色选择器
│   │   ├── ResizableColorPicker.vue
│   │   └── ColorSummary.vue        # 颜色用量统计
│   ├── custom-tab-bar/
│   │   └── index.vue               # 悬浮胶囊底部导航栏
│   ├── pages/
│   │   ├── index/                  # 首页（选择图片 / 创建空白画布）
│   │   ├── editor/                 # 编辑器（绘制 / 统计 / 导出）
│   │   ├── palette/                # 色卡库（浏览 / 搜索）
│   │   ├── history/                # 草稿箱
│   │   └── about/                  # 关于
│   ├── stores/
│   │   ├── useProjectStore.ts      # 项目状态（网格 / 图片 / 历史）
│   │   └── useConfigStore.ts       # 算法参数配置
│   ├── utils/
│   │   ├── image-processor.ts      # 图片像素化核心算法
│   │   ├── color-mapper.ts         # 颜色匹配与色卡映射
│   │   ├── export-helper.ts        # 长图导出
│   │   ├── useSafeArea.ts          # 安全区域 / 胶囊按钮适配
│   │   └── platform.ts             # 平台工具
│   ├── App.vue
│   ├── main.ts
│   ├── manifest.json
│   └── pages.json
├── package.json
├── vite.config.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# H5（浏览器预览，推荐用于快速调试）
npm run dev:h5

# 微信小程序（需配合微信开发者工具）
npm run dev:mp-weixin
```

### 生产构建

```bash
# H5
npm run build:h5

# 微信小程序
npm run build:mp-weixin
```

### 类型检查

```bash
npm run type-check
```

---

## 📱 支持平台

| 平台 | 开发命令 | 构建命令 | 说明 |
|------|---------|---------|------|
| H5 | `dev:h5` | `build:h5` | 浏览器直接访问 |
| 微信小程序 | `dev:mp-weixin` | `build:mp-weixin` | 需微信开发者工具导入 `dist/dev/mp-weixin` |
| App（Android / iOS） | `dev:app` | `build:app` | 需 HBuilderX 打包 |

> 主要适配目标为**微信小程序**，H5 端功能完整可用，App 端未经充分测试。

---

## 🔧 权限说明（微信小程序）

| 权限 | 用途 |
|------|------|
| `wx.chooseMedia` | 从相册 / 相机选取图片 |
| `wx.saveImageToPhotosAlbum` | 导出图纸保存到相册 |
| `wx.setClipboardData` | 复制联系方式 / 仓库链接 |

---

## 🧩 像素化算法说明

| 算法 | 适用场景 |
|------|---------|
| **自适应** | 综合效果最佳，自动识别边缘与平坦区域分别处理 |
| **平均色** | 速度最快，适合色块简单、对比强烈的图片 |
| **加权中值** | 边界保留好，适合人像、卡通图 |
| **高斯加权** | 颜色过渡自然，适合渐变图片 |
| **边缘感知** | 细节丰富，适合线稿 / 建筑等有明显边缘的图片 |

---

## 📄 License

MIT

---

## 🙋 联系作者

微信号：`chenhui6677889`

开源仓库：[github.com/HeChenhui666/pixel-bead-designer](https://github.com/HeChenhui666/pixel-bead-designer)

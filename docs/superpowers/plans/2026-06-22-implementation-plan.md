# 拼豆图纸生成器 · 实现计划

**日期**：2026-06-22  
**基于**：[设计规格文档](./docs/superpowers/specs/2026-06-22-pixel-bead-designer-design.md)  
**状态**：待执行

---

## 概述

本文档是设计规格的**可执行实现计划**，将 8 周开发周期拆解为具体任务、技术要点和验收标准。每个任务包含：做什么、怎么做、用什么工具、如何验证完成。

---

## W1：项目骨架与图片选取（第 1 周）

### 目标
搭建 UniApp x 项目框架，完成 4 Tab 页面结构和图片选取预览功能。

### 任务清单

#### T1.1 初始化 UniApp x 项目
- **做什么**：使用 HBuilderX 或 CLI 创建 UniApp x 项目，配置 Vue 3 + Pinia + TypeScript
- **技术要点**：
  - 选择 `uni-app x` 模板（非普通 uni-app）
  - 安装依赖：`pinia`、`@dcloudio/uni-ui`
  - 配置 `pages.json`：4 个 Tab 页面 + tabBar 图标
  - 配置 `manifest.json`：App 端权限（相册读取、文件保存）
- **验收标准**：项目可在 HBuilderX 中运行到 H5/App 模拟器，4 个 Tab 正常切换
- **分步执行**：
  1. `npx degit dcloudio/uni-preset-vue#vite-ts pixel-bead-designer` 或 HBuilderX 新建
  2. `npm install pinia @dcloudio/uni-ui`
  3. 编辑 `src/pages.json`，添加 4 个页面路由和 tabBar 配置
  4. 编辑 `src/manifest.json`，添加 `permissions.android.READ_MEDIA_IMAGES` 和 `WRITE_EXTERNAL_STORAGE`
  5. 运行到 H5 验证 Tab 切换

#### T1.2 创建目录结构
- **做什么**：按设计规格建立标准目录
- **目录结构**：
  ```
  src/
    pages/
      index.vue        # Tab「图片」
      editor.vue       # Tab「编辑」（默认页）
      palette.vue      # Tab「色卡」
      history.vue      # Tab「历史」
    components/
      GridCanvas.vue
      ColorBottomSheet.vue
      ImagePicker.vue
      ParamPanel.vue
      ColorSummary.vue
      ActionBar.vue
    stores/
      useProjectStore.ts
      useConfigStore.ts
    utils/
      color-mapper.ts      # Oklab 色差算法（TS 版，H5 验证用）
      image-processor.ts   # 像素化逻辑（TS 版，H5 验证用）
      export-helper.ts
      platform.ts
    assets/
      colorSystemMapping.json  # 从 perler-beads 复制
    static/
      tab-icons/             # 4 个 Tab 图标（image.png, edit.png, palette.png, history.png）
  ```
- **验收标准**：目录结构与设计规格一致，所有占位文件已创建
- **分步执行**：
  1. 创建所有目录：`mkdir -p src/{pages,components,stores,utils,assets,static/tab-icons}`
  2. 创建占位 `.vue` 文件（含基础 `<template><view>Page Name</view></template>`）
  3. 创建占位 `.ts` 文件（导出空函数或空对象）
  4. 准备 4 个 Tab 图标 PNG（建议 81×81px，灰色未选中 + 蓝色选中两套）

#### T1.3 实现 Pinia Store
- **做什么**：定义 `useProjectStore` 和 `useConfigStore`
- **文件路径**：`src/stores/useProjectStore.ts`、`src/stores/useConfigStore.ts`
- **接口定义**：
  ```typescript
  // useProjectStore.ts
  export interface CellSnapshot {
    cellData: string[][]
    timestamp: number
  }

  export interface ProjectState {
    sourceImage: string           // 图片临时路径或 Base64
    gridWidth: number             // 默认 32
    gridHeight: number            // 默认 32
    cellData: string[][]          // HEX 二维数组，初始为空
    colorSummary: Record<string, number>  // hex → 用量
    paletteId: 'MARD' | 'COCO' | '漫漫' | '盼盼' | '咪小窝'
    history: CellSnapshot[]       // 撤销栈，最多 20 步
    isGenerating: boolean         // 生成中标记
  }

  // useConfigStore.ts
  export interface ConfigState {
    defaultGridSize: number       // 默认 32
    defaultPalette: string        // 默认 'MARD'
    pixelationMode: 'dominant' | 'average'  // 默认 'average'
  }
  ```
- **技术要点**：
  - 使用 `defineStore('project', () => { ... })` Setup Store 语法
  - `cellData` 初始化为 `Array.from({ length: 32 }, () => Array(32).fill(''))`
  - `history` 限制最多 20 条，超出时 shift() 移除最旧
  - 提供 `pushHistory()`、`undo()`、`redo()` action
- **验收标准**：Store 可在任意页面中读写，类型正确，无 TS 报错
- **分步执行**：
  1. 在 `main.ts` 中注册 Pinia：`app.use(createPinia())`
  2. 编写 `useProjectStore.ts`，包含 state + getters + actions
  3. 编写 `useConfigStore.ts`，包含 state + 持久化到 Storage
  4. 在 `editor.vue` 中测试读写 store

#### T1.4 实现图片选取组件 `ImagePicker.vue`
- **做什么**：封装图片选择 + 大小校验 + 预览
- **文件路径**：`src/components/ImagePicker.vue`
- **Props / Emits**：
  ```typescript
  // Props
  interface Props {
    modelValue?: string  // v-model 绑定图片路径
    maxSizeMB?: number   // 默认 10
  }
  // Emits
  emit('update:modelValue', path: string)
  emit('error', message: string)
  ```
- **技术要点**：
  - 调用 `uni.chooseImage({ count: 1, sizeType: ['compressed'] })`
  - 通过 `uni.getFileInfo` 或 `File.size` 校验文件大小 > 10MB 时拒绝并 Toast 提示
  - 选中后写入 `useProjectStore.sourceImage`
  - 显示缩略图预览（`<image :src="modelValue" mode="aspectFit" />`）
  - 条件编译：H5 端降级为 `<input type="file" accept="image/*">`
- **验收标准**：可选取图片、超限拒绝、预览正常显示
- **分步执行**：
  1. 创建组件骨架，定义 props/emits
  2. 实现 `chooseImage()` 方法，封装 uni API
  3. 添加文件大小校验逻辑
  4. 添加 H5 条件编译分支
  5. 在 `index.vue` 中引入测试

#### T1.5 实现 `ParamPanel.vue`
- **做什么**：网格尺寸预设 + 像素化模式 + 品牌选择面板
- **文件路径**：`src/components/ParamPanel.vue`
- **UI 结构**：
  - 网格尺寸：4 个预设按钮（16×16 / 32×32 / 48×48 / 自定义）+ 自定义输入框（8–64）
  - 像素化模式：两个 Radio（平均色 / 主色）
  - 品牌选择：5 个品牌 Tag 切换
- **技术要点**：
  - 双向绑定到 `useProjectStore`（gridWidth/gridHeight/paletteId）和 `useConfigStore`（pixelationMode）
  - 自定义尺寸输入校验范围 8–64
  - 品牌切换时触发色卡数据重新加载
- **验收标准**：参数可选择，值正确写入 store
- **分步执行**：
  1. 创建组件，布局三个参数区块
  2. 绑定 store 读写
  3. 添加自定义尺寸输入校验
  4. 在 `index.vue` 中引入测试

#### T1.6 实现 `index.vue`（图片 Tab）
- **做什么**：组合 `ImagePicker` + `ParamPanel` + 生成按钮
- **文件路径**：`src/pages/index.vue`
- **UI 结构**：
  - 顶部：图片预览区（无图时显示引导卡片：居中「📷 上传图片」主按钮 + 底部三个快捷入口）
  - 中部：`ParamPanel`
  - 底部：「生成图纸」主按钮（disabled 当无图片时）
- **技术要点**：
  - 点击生成 → 设置 `store.isGenerating = true` → 跳转到 `editor.vue` Tab（`uni.switchTab`）
  - 引导卡片三个快捷入口分别跳转到 history/palette/index 自身参数区
- **验收标准**：参数可选择，点击生成后切换到编辑 Tab
- **分步执行**：
  1. 布局页面结构
  2. 引入 ImagePicker + ParamPanel
  3. 实现引导卡片逻辑（watch store.sourceImage）
  4. 实现生成按钮跳转逻辑

#### T1.7 实现 `editor.vue` 引导态
- **做什么**：无图片时显示引导卡片，有图片时显示 GridCanvas 占位
- **文件路径**：`src/pages/editor.vue`
- **技术要点**：
  - 居中显示「📷 上传图片」主按钮（点击 switchTab 到 index）
  - 底部三个快捷入口：历史 / 色卡 / 参数设置
  - 有图片时隐藏引导，显示 `<GridCanvas />` 占位组件
- **验收标准**：首次打开显示引导，上传图片后引导消失
- **分步执行**：
  1. 创建页面骨架
  2. 实现引导卡片 UI
  3. 添加条件渲染逻辑
  4. 测试切换流程

### W1 交付物
- ✅ 可运行的 UniApp x 项目框架
- ✅ 4 Tab 页面结构完整
- ✅ 图片选取 + 预览功能可用
- ✅ Pinia Store 定义完成
- ✅ ParamPanel 参数面板可用

---

## W2：像素化算法 + Oklab 色差匹配（H5 验证）

### 目标
在 H5 端用纯 TS 实现核心算法，通过单元测试验证准确率。

### 任务清单

#### T2.1 复制色卡数据
- **做什么**：从 `perler-beads` 项目获取 `colorSystemMapping.json`
- **文件路径**：`src/assets/colorSystemMapping.json`
- **数据结构**：
  ```json
  {
    "#FF0000": { "MARD": "A01", "COCO": "E02", "漫漫": "E2", "盼盼": "65", "咪小窝": "77" },
    "#00FF00": { "MARD": "B03", ... }
  }
  ```
- **技术要点**：
  - 共 290 色，5 个品牌
  - 同时生成类型定义文件 `src/assets/colorSystemMapping.d.ts`
  - 导出辅助函数 `getColorList(paletteId)` 返回 `{ hex, code }[]`
- **验收标准**：JSON 格式正确，可被 TS 导入，类型安全
- **分步执行**：
  1. 从 perler-beads 仓库下载 JSON 文件
  2. 放入 `src/assets/`
  3. 编写 `.d.ts` 类型声明
  4. 编写 `getColorList()` 工具函数
  5. 在测试文件中验证导入

#### T2.2 实现 Oklab 色差算法 `color-mapper.ts`
- **做什么**：移植 `perler-beads` 的 Oklab 算法到 TS
- **文件路径**：`src/utils/color-mapper.ts`
- **接口定义**：
  ```typescript
  export interface RgbColor { r: number; g: number; b: number }
  export interface OklabColor { L: number; a: number; b: number }
  export interface MatchResult {
    hex: string          // 匹配到的 HEX
    code: string         // 品牌色号，如 "A01"
    distance: number     // Oklab 距离
  }

  export function srgbToOklab(rgb: RgbColor): OklabColor
  export function oklabDistance(a: OklabColor, b: OklabColor): number
  export function findNearestColor(
    rgb: RgbColor,
    paletteId: 'MARD' | 'COCO' | '漫漫' | '盼盼' | '咪小窝'
  ): MatchResult
  ```
- **技术要点**：
  - sRGB → Linear RGB：gamma 解码（分段公式）
  - Linear RGB → Oklab：矩阵乘法（固定系数）
  - 欧氏距离：`Math.sqrt(dL² + da² + db²)`
  - 290 色线性扫描，预计算所有色的 Oklab 值缓存
  - 首次调用时构建缓存，后续直接查表
- **验收标准**：单元测试覆盖 10+ 已知颜色对，误差 < 3（Oklab 单位）
- **分步执行**：
  1. 实现 `srgbToLinear()` gamma 解码
  2. 实现 `linearToOklab()` 矩阵转换
  3. 实现 `oklabDistance()` 欧氏距离
  4. 实现 `findNearestColor()` 线性扫描 + 缓存
  5. 编写单元测试验证

#### T2.3 实现像素化算法 `image-processor.ts`
- **做什么**：将图片按网格尺寸分块采样
- **文件路径**：`src/utils/image-processor.ts`
- **接口定义**：
  ```typescript
  export type PixelationMode = 'average' | 'dominant'

  export interface PixelateOptions {
    imagePath: string        // 图片路径或 Base64
    gridWidth: number
    gridHeight: number
    mode: PixelationMode
  }

  export interface PixelateResult {
    cellData: string[][]     // HEX 二维数组 [y][x]
    elapsedMs: number        // 耗时
  }

  export function pixelateImage(options: PixelateOptions): Promise<PixelateResult>
  ```
- **技术要点**：
  - 加载图片到离屏 Canvas，调用 `getImageData()` 获取 `Uint8ClampedArray`
  - 计算 `blockW = canvas.width / gridWidth`，`blockH = canvas.height / gridHeight`
  - average 模式：累加区域内所有像素 RGB，除以像素数
  - dominant 模式：用 Map 统计颜色频次，取最高（量化到 8-bit 减少 key 数量）
  - 每个格子的平均 RGB 再调用 `findNearestColor()` 得到 HEX
  - 性能目标：32×32 < 500ms（H5 Chrome）
- **验收标准**：对测试图片生成结果与 `perler-beads` 输出视觉一致
- **分步执行**：
  1. 实现图片加载到 Canvas 的工具函数
  2. 实现 `sampleBlockAverage()` 区域采样
  3. 实现 `sampleBlockDominant()` 主色提取
  4. 组合为 `pixelateImage()` 主函数
  5. 添加计时逻辑
  6. 编写单元测试

#### T2.4 编写 Jest 单元测试
- **做什么**：验证算法正确性
- **文件路径**：`src/__tests__/color-mapper.test.ts`、`src/__tests__/image-processor.test.ts`
- **测试用例**：
  - `color-mapper.test.ts`：
    - `srgbToOklab`：已知 RGB(255,0,0) → 已知 Oklab 值（容差 0.01）
    - `oklabDistance`：相同色距离为 0，黑白距离最大
    - `findNearestColor`：纯色 #FF0000 → MARD A01（精确匹配）
    - `findNearestColor`：中间色 → 最近邻色号（手动验证）
  - `image-processor.test.ts`：
    - average 模式：均匀红色块 → 全部 #FF0000
    - dominant 模式：红蓝各半 → 取出现次数多的
    - 边界：1×1 网格正常返回，64×64 网格不超时
    - 耗时断言：32×32 < 500ms
- **验收标准**：全部测试通过，覆盖率 > 80%
- **分步执行**：
  1. 配置 Jest + ts-jest（`jest.config.ts`）
  2. 编写 color-mapper 测试
  3. 编写 image-processor 测试（准备测试用纯色 PNG）
  4. 运行 `npm test`，修复失败用例
  5. 检查覆盖率报告

#### T2.5 H5 端集成验证
- **做什么**：在 `editor.vue` 中调用算法，渲染到 Canvas
- **文件路径**：`src/pages/editor.vue`
- **技术要点**：
  - watch `store.sourceImage`，有值时自动触发 `pixelateImage()`
  - 结果写入 `store.cellData`
  - 简单 Canvas 渲染：遍历 cellData，`ctx.fillStyle = hex; ctx.fillRect(x*cellSize, y*cellSize, cellSize, cellSize)`
  - 显示生成耗时（Toast 或页面内文字）
  - 生成期间显示 Loading 状态
- **验收标准**：H5 端可完整走通「选图→生成→显示」流程，耗时 < 2s
- **分步执行**：
  1. 在 editor.vue 中添加 Canvas 元素
  2. 实现 `renderGrid()` 绘制函数
  3. 添加 watch 触发自动生成
  4. 添加 Loading 状态
  5. 真机 H5 浏览器测试完整流程

### W2 交付物
- ✅ Oklab 色差算法 TS 实现 + 单元测试
- ✅ 像素化算法 TS 实现 + 单元测试
- ✅ H5 端端到端验证通过
- ✅ 算法准确率报告（记录 10 组测试颜色的匹配结果）

---

## W3：UTs 移植 + App 端 Canvas 渲染

### 目标
将核心算法移植到 UTs，实现 App 原生高性能渲染。

### 任务清单

#### T3.1 UTs 图像处理模块 `image-processor.uts`
- **做什么**：将 TS 像素化逻辑改写为 UTs
- **文件路径**：`src/utils/image-processor.uts`
- **接口定义**（与 TS 版保持一致）：
  ```typescript
  // UTs 语法，类型需使用 UTs 支持的类型
  export function pixelateImage(
    imagePath: string,
    gridWidth: number,
    gridHeight: number,
    mode: string  // 'average' | 'dominant'
  ): UTSJSONObject  // { cellData: string[][], elapsedMs: number }
  ```
- **技术要点**：
  - 使用 `UTSBitmap` 加载图片并读取像素（App 端原生 API）
  - 若 `UTSBitmap` 不可用，降级为离屏 `canvas` + `getImageData`
  - 像素缓冲使用 `Uint8ClampedArray`，避免逐像素 JS 桥接
  - 循环必须用 `for (let i = 0; ...)` 而非 `forEach/map`
  - 临时变量及时置 null，减少 GC 压力
  - 函数内部计时使用 `Date.now()`
- **验收标准**：App 端 32×32 生成 < 1s（中端 Android）
- **分步执行**：
  1. 查阅 UniApp x UTs Bitmap API 文档，确认可用接口
  2. 实现图片加载 + 像素读取
  3. 移植 `sampleBlockAverage` / `sampleBlockDominant`
  4. 组合主函数，添加计时
  5. 在 App 模拟器中测试性能，记录耗时
  6. 若 UTs Bitmap 不可用，立即切换离屏 Canvas 方案

#### T3.2 UTs 色差算法 `color-distance.uts`
- **做什么**：将 Oklab 算法改写为 UTs
- **文件路径**：`src/utils/color-distance.uts`
- **接口定义**：
  ```typescript
  export function findNearestColorUTS(
    r: number, g: number, b: number,
    paletteId: string
  ): UTSJSONObject  // { hex: string, code: string, distance: number }
  ```
- **技术要点**：
  - 数学运算直接用 `number` 原生类型，避免对象封装
  - 290 色 Oklab 预计算值硬编码为常量数组（避免运行时 JSON 解析）
  - 返回 `UTSJSONObject` 或自定义 struct，减少 GC
  - sRGB→Linear gamma 解码用条件分支而非 Math.pow（UTs 中 Math.pow 较慢）
- **验收标准**：单格匹配 < 0.5ms，结果与 TS 版一致（误差 < 0.001）
- **分步执行**：
  1. 将 290 色 Oklab 预计算值生成为 UTs 常量数组（脚本辅助）
  2. 移植 gamma 解码 + 矩阵转换
  3. 实现线性扫描
  4. 对比 TS 版输出，验证一致性
  5. 性能测试：循环 1000 次取平均耗时

#### T3.3 实现 `GridCanvas.vue`（App 端）
- **做什么**：Canvas 三次 drawPass 渲染
- **文件路径**：`src/components/GridCanvas.vue`
- **Props**：
  ```typescript
  interface Props {
    cellData: string[][]
    gridWidth: number
    gridHeight: number
    selectedCell?: { x: number, y: number } | null
  }
  // Emits
  emit('cellClick', { x: number, y: number })
  ```
- **技术要点**：
  - Canvas 尺寸 = gridWidth × cellPixelSize（cellPixelSize 默认 20px）
  - **Pass 1（色块）**：遍历 cellData，`ctx.fillStyle = hex; ctx.fillRect(...)`
  - **Pass 2（网格线）**：`ctx.strokeStyle = '#E0E0E0'; ctx.lineWidth = 1`，绘制横竖线
  - **Pass 3（高亮）**：选中格 `ctx.strokeStyle = '#007AFF'; ctx.lineWidth = 2; ctx.strokeRect(...)`
  - 缩放/平移：外层 `<view>` 绑定 `transform: scale(${scale}) translate(${tx}px, ${ty}px)`，Canvas 本身不重绘
  - 局部重绘：暴露 `redrawCell(x, y)` 方法，只清除并重绘单个格子区域
  - 条件编译：`#ifdef APP-PLUS` 使用 `uni.createCanvasContext` 或原生 Canvas API
- **验收标准**：32×32 图纸流畅渲染，缩放/平移无卡顿，点击事件坐标准确
- **分步执行**：
  1. 创建组件骨架，定义 props/emits
  2. 实现 `drawColorLayer()` Pass 1
  3. 实现 `drawGridLines()` Pass 2
  4. 实现 `drawHighlight()` Pass 3
  5. 实现 `redrawCell()` 局部重绘
  6. 添加触摸事件 → 坐标转换 → emit cellClick
  7. 在 editor.vue 中集成测试

#### T3.4 条件编译适配层 `platform.ts`
- **做什么**：统一平台差异接口
- **文件路径**：`src/utils/platform.ts`
- **接口定义**：
  ```typescript
  export type Platform = 'app' | 'mp-weixin' | 'h5'

  export function getPlatform(): Platform
  export function createCanvasContext(canvasId: string): any
  export function loadImage(path: string): Promise<{ width: number, height: number }>
  export function saveImageToAlbum(tempPath: string): Promise<void>
  ```
- **技术要点**：
  - `getPlatform()`：通过条件编译返回字面量
  - `createCanvasContext()`：App 用 `uni.createCanvasContext`，小程序用 `wx.createCanvasContext`，H5 用 `canvas.getContext('2d')`
  - `loadImage()`：App 用 UTs Bitmap，小程序用 `wx.getImageInfo`，H5 用 `new Image()`
  - 所有函数导出统一签名，调用方无需感知平台差异
- **验收标准**：各平台调用同一接口，底层自动适配，无运行时报错
- **分步执行**：
  1. 实现 `getPlatform()`
  2. 实现 `createCanvasContext()` 三分支
  3. 实现 `loadImage()` 三分支
  4. 实现 `saveImageToAlbum()` 三分支
  5. 在各平台分别验证

### W3 交付物
- ✅ UTs 图像处理 + 色差算法
- ✅ App 端 GridCanvas 渲染
- ✅ 平台适配层
- ✅ App 端性能基准报告（32×32 耗时、内存峰值）

---

## W4：小程序条件编译 + Worker

### 目标
完成 MP-WEIXIN 端适配，图像处理迁移到 Worker 避免 UI 卡顿。

### 任务清单

#### T4.1 小程序 Canvas 适配
- **做什么**：`GridCanvas.vue` 添加 `#ifdef MP-WEIXIN` 分支
- **文件路径**：`src/components/GridCanvas.vue`（在 T3.3 基础上扩展）
- **技术要点**：
  - 使用 `canvas.getContext('2d')`（新 API，基础库 ≥ 2.9.0）
  - 若需兼容旧版，降级为 `wx.createCanvasContext(canvasId)`
  - 小程序 Canvas 不支持 `OffscreenCanvas`，导出时用 `wx.canvasToTempFilePath`
  - 注意：小程序 Canvas 的 `drawImage` 需要先 `wx.getImageInfo` 获取本地路径
  - 触摸事件使用 `bindtouchstart/bindtouchmove/bindtouchend`
  - 坐标转换需考虑 Canvas 实际渲染尺寸与 CSS 尺寸的比值（`dpr`）
- **验收标准**：小程序模拟器中图纸正常渲染，点击坐标准确
- **分步执行**：
  1. 在 GridCanvas.vue 中添加 `#ifdef MP-WEIXIN` 条件块
  2. 实现小程序 Canvas 初始化（`onReady` 中获取 context）
  3. 移植三个 drawPass 到小程序 API
  4. 实现触摸事件 → 网格坐标转换
  5. 在微信开发者工具中测试渲染和交互

#### T4.2 Worker 图像处理
- **做什么**：将像素化 + 色差匹配移入 Worker
- **文件路径**：`src/workers/image-processor.js`、`src/utils/worker-bridge.ts`
- **Worker 消息协议**：
  ```typescript
  // 主线程 → Worker
  interface WorkerRequest {
    type: 'pixelate'
    imageData: ArrayBuffer   // RGBA 像素数据
    width: number
    height: number
    gridWidth: number
    gridHeight: number
    mode: 'average' | 'dominant'
    paletteData: Array<{ hex: string, r: number, g: number, b: number, code: string }>
  }

  // Worker → 主线程
  interface WorkerResponse {
    type: 'result' | 'progress'
    cellData?: string[][]
    progress?: number        // 0-100
    elapsedMs?: number
  }
  ```
- **技术要点**：
  - Worker 文件放在 `src/workers/`，构建时自动复制到输出目录
  - 主线程通过 `uni.createWorker()` 或 `new Worker()` 创建
  - 传输 `ArrayBuffer` 时使用 `Transferable` 避免内存拷贝
  - Worker 内每处理完一行发送 progress 消息，主线程更新进度条
  - 支持取消：主线程发送 `{ type: 'cancel' }`，Worker 检查标志位提前退出
  - `worker-bridge.ts` 封装创建/销毁/消息监听逻辑，对外暴露 Promise 接口
- **验收标准**：32×32 生成期间 UI 不卡顿，进度条可实时更新，取消功能可用
- **分步执行**：
  1. 创建 Worker 文件，移植 pixelateImage + findNearestColor 纯函数
  2. 实现消息收发协议
  3. 添加 progress 上报（每行完成后）
  4. 添加 cancel 支持
  5. 编写 `worker-bridge.ts` 封装层
  6. 在 editor.vue 中替换直接调用为 Worker 调用
  7. 测试 UI 流畅度和进度条

#### T4.3 小程序包体积优化
- **做什么**：确保主包 < 2MB
- **技术要点**：
  - `colorSystemMapping.json`（约 30KB）放入分包 `pages-sub/` 或按需从云存储加载
  - 图片资源使用 TinyPNG 压缩，Tab 图标改用 SVG 或 Base64 内联
  - 移除未使用的 npm 依赖（`npm prune --production`）
  - 开启小程序代码压缩和 Tree Shaking
  - 检查 `node_modules` 中是否有大文件被误打包
- **验收标准**：主包大小 < 2MB，色卡数据可正常加载
- **分步执行**：
  1. 运行构建，检查 `unpackage/dist/dev/mp-weixin` 目录大小
  2. 分析各文件占比（`du -sh *`）
  3. 将 colorSystemMapping.json 移入分包
  4. 压缩图片资源
  5. 清理无用依赖
  6. 重新构建验证大小

### W4 交付物
- ✅ 小程序端可运行版本
- ✅ Worker 图像处理（含进度和取消）
- ✅ 包体积 < 2MB

---

## W5：缩放/平移/单格编辑/色号统计

### 目标
完成核心交互功能，形成完整编辑原型。

### 任务清单

#### T5.1 缩放手势
- **做什么**：双指捏合缩放 + 鼠标滚轮（H5）
- **文件路径**：`src/components/GridCanvas.vue`（扩展 T3.3）
- **状态变量**：
  ```typescript
  const scale = ref(1)         // 当前缩放比，范围 [0.5, 5]
  const translateX = ref(0)    // 平移偏移 X
  const translateY = ref(0)    // 平移偏移 Y
  const lastPinchDistance = ref(0)  // 上一次双指距离
  ```
- **技术要点**：
  - 监听 `@touchstart`：记录双指初始距离 `lastPinchDistance`
  - 监听 `@touchmove`：计算当前双指距离，`deltaScale = currentDist / lastPinchDistance`，更新 `scale`
  - 缩放中心点 = 双指中点相对于 Canvas 容器的坐标，同步调整 `translateX/Y` 保持视觉锚点不变
  - 限制 `scale` 在 `[0.5, 5]` 范围内
  - H5 端额外监听 `wheel` 事件，`deltaY > 0` 缩小，`< 0` 放大
  - 应用方式：外层容器 `style="transform: translate(${tx}px, ${ty}px) scale(${scale}); transform-origin: 0 0;"`
  - Canvas 本身不重绘，仅 CSS 变换
- **验收标准**：缩放平滑，边界限制生效，缩放中心点正确
- **分步执行**：
  1. 添加 scale/translate 响应式变量
  2. 实现 touchstart 记录初始距离
  3. 实现 touchmove 计算缩放比 + 锚点修正
  4. 添加 scale 边界 clamp
  5. 绑定容器 transform style
  6. H5 端添加 wheel 事件
  7. 真机测试双指缩放体验

#### T5.2 平移手势
- **做什么**：单指拖拽平移
- **文件路径**：`src/components/GridCanvas.vue`（扩展 T5.1）
- **状态变量**：
  ```typescript
  const isDragging = ref(false)
  const dragStartX = ref(0)
  const dragStartY = ref(0)
  const startTranslateX = ref(0)
  const startTranslateY = ref(0)
  ```
- **技术要点**：
  - `@touchstart`：若单指，记录起始点和当前 translate 值，`isDragging = true`
  - `@touchmove`：若 `isDragging`，计算偏移量 `dx = currentX - dragStartX`，更新 `translateX = startTranslateX + dx`
  - `@touchend`：`isDragging = false`
  - 边界检测：平移后 Canvas 可视区域不能超出容器边界（计算 Canvas 实际尺寸 × scale 与容器尺寸的差值）
  - 与缩放联动：缩放时同步修正 translate，避免画布飞出视野
  - 区分单击和拖拽：touchend 时若移动距离 < 5px 视为点击，触发 cellClick；否则视为拖拽
- **验收标准**：拖拽流畅，与缩放互不冲突，边界限制生效，点击/拖拽正确区分
- **分步执行**：
  1. 添加拖拽状态变量
  2. 实现 touchstart/touchmove/touchend 拖拽逻辑
  3. 实现边界检测函数 `clampTranslate()`
  4. 在缩放逻辑中调用 `clampTranslate()`
  5. 实现点击/拖拽区分（移动距离阈值 5px）
  6. 真机测试拖拽 + 缩放组合操作

#### T5.3 单格点击换色
- **做什么**：点击格子 → 弹出 `ColorBottomSheet` → 选色 → 更新 store → 局部重绘
- **文件路径**：`src/pages/editor.vue`、`src/components/GridCanvas.vue`
- **坐标转换公式**：
  ```typescript
  function screenToGrid(screenX: number, screenY: number): { x: number, y: number } | null {
    // 1. 减去容器偏移
    const canvasX = (screenX - containerLeft - translateX.value) / scale.value
    const canvasY = (screenY - containerTop - translateY.value) / scale.value
    // 2. 转换为网格坐标
    const cellSize = canvasWidth / gridWidth
    const gx = Math.floor(canvasX / cellSize)
    const gy = Math.floor(canvasY / cellSize)
    // 3. 边界检查
    if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return null
    return { x: gx, y: gy }
  }
  ```
- **技术要点**：
  - GridCanvas emit `cellClick` 时传递屏幕坐标，editor.vue 中转换为网格坐标
  - 转换需考虑：容器位置、translate 偏移、scale 缩放、Canvas CSS 尺寸与实际像素尺寸的比值
  - 选中后设置 `selectedCell`，GridCanvas Pass 3 绘制高亮边框
  - 弹出 `ColorBottomSheet`，传入当前格颜色
  - 选色回调：先 `pushHistory()` 保存快照，再更新 `store.cellData[y][x]`，再调用 `gridCanvas.redrawCell(x, y)`
- **验收标准**：点击准确（含缩放/平移状态下），换色即时生效，撤销可用
- **分步执行**：
  1. 实现 `screenToGrid()` 坐标转换函数
  2. 在 editor.vue 中处理 cellClick 事件
  3. 集成 ColorBottomSheet（T5.4 完成后）
  4. 实现选色 → pushHistory → 更新 store → redrawCell 流程
  5. 测试各种缩放/平移状态下的点击准确性

#### T5.4 `ColorBottomSheet.vue`
- **做什么**：底部抽屉换色面板
- **文件路径**：`src/components/ColorBottomSheet.vue`
- **Props / Emits**：
  ```typescript
  interface Props {
    visible: boolean
    currentHex: string
    paletteId: string
  }
  emit('update:visible', value: boolean)
  emit('select', hex: string, code: string)
  ```
- **UI 结构**：
  - 遮罩层（半透明黑色，点击关闭）
  - 抽屉容器（从底部滑入，高度 60vh，圆角顶部）
  - 顶部栏：当前格颜色预览（40×40 色块 + HEX 文字 + 品牌色号）+ 关闭按钮
  - 品牌筛选 Tab：5 个品牌标签横向滚动
  - 色卡网格：7 列，每格 36×36，间距 4px，可上滑展开全部 290 色
  - 选中态：色块外加 2px 蓝色边框
- **技术要点**：
  - 动画：`transition: transform 0.3s ease-out`，visible 时 `translateY(0)`，否则 `translateY(100%)`
  - 色卡数据从 `colorSystemMapping.json` 按当前 paletteId 过滤
  - 使用 `<scroll-view scroll-y>` 实现色卡区域滚动
  - 点击遮罩或关闭按钮 emit `update:visible(false)`
  - 点击色块 emit `select(hex, code)`
- **验收标准**：色卡完整显示 290 色，筛选可用，动画流畅，选中反馈明确
- **分步执行**：
  1. 创建组件骨架，实现遮罩 + 抽屉容器
  2. 实现滑入/滑出动画
  3. 实现顶部当前颜色预览
  4. 实现品牌筛选 Tab
  5. 实现色卡网格渲染 + 滚动
  6. 实现选中态样式
  7. 在 editor.vue 中集成测试

#### T5.5 色号统计 `ColorSummary.vue`
- **做什么**：实时统计各色号用量
- **文件路径**：`src/components/ColorSummary.vue`
- **Props**：
  ```typescript
  interface Props {
    cellData: string[][]
    paletteId: string
  }
  ```
- **UI 结构**：
  - 标题行：「配色统计」+ 总用色数
  - 列表：每行 = 色块(24×24) + 品牌色号 + 数量 + 占比进度条
  - 按用量降序排列
  - 底部：总计格子数 + 用色种类数
- **技术要点**：
  - 使用 `computed` 监听 `cellData` 变化，自动重新统计
  - 统计逻辑：遍历二维数组，`Record<hex, count>` 累加
  - 过滤空字符串（未填充的格子）
  - 排序：`Object.entries(countMap).sort((a, b) => b[1] - a[1])`
  - 占比 = count / totalCells × 100%
  - 性能优化：cellData 变化时用 `watchEffect` 防抖 100ms 再统计
- **验收标准**：统计数据准确，编辑后实时更新，排序正确
- **分步执行**：
  1. 创建组件，定义 props
  2. 实现 computed 统计逻辑
  3. 实现列表渲染 UI
  4. 添加防抖优化
  5. 在 editor.vue 或独立面板中集成测试

#### T5.6 撤销/重做 `ActionBar.vue`
- **做什么**：操作栏 + 撤销栈管理
- **文件路径**：`src/components/ActionBar.vue`
- **UI 结构**：
  - 水平排列：撤销按钮 | 重做按钮 | 分隔线 | 导出按钮 | 分享按钮
  - 撤销/重做按钮：禁用态灰色，可用态蓝色图标
  - 固定在编辑器底部，不随 Canvas 滚动
- **技术要点**：
  - 撤销栈存储在 `useProjectStore.history`（已在 T1.3 定义）
  - `pushHistory()`：深拷贝当前 `cellData`（`JSON.parse(JSON.stringify(cellData))`），push 入栈，超 20 条 shift
  - `undo()`：pop 栈顶恢复到 cellData，同时将当前状态 push 到 redoStack
  - `redo()`：pop redoStack 恢复，push 到 history
  - redoStack 单独维护在 store 中，任何新操作清空 redoStack
  - 按钮 disabled 状态绑定栈是否为空
  - 导出/分享按钮点击 emit 对应事件
- **验收标准**：撤销/重做正确，不超过 20 步，新操作清空 redo，按钮状态正确
- **分步执行**：
  1. 在 useProjectStore 中添加 redoStack + undo/redo action
  2. 创建 ActionBar 组件 UI
  3. 绑定 undo/redo 按钮到 store action
  4. 实现 disabled 状态计算
  5. 添加导出/分享按钮 emit
  6. 在 editor.vue 中集成，测试撤销/重做流程

### W5 交付物
- ✅ 缩放/平移手势（含边界检测和点击/拖拽区分）
- ✅ 单格换色 + 底部抽屉（含坐标转换）
- ✅ 色号统计面板（实时、防抖）
- ✅ 撤销/重做功能（20 步上限 + redo 栈）
- ✅ 完整交互原型

---

## W6：导出 PNG/长图/历史记录

### 目标
实现图纸导出、长图拼接和历史记录持久化。

### 任务清单

#### T6.1 图纸 PNG 导出
- **做什么**：将当前 Canvas 内容保存为 PNG
- **文件路径**：`src/utils/export-helper.ts`
- **接口定义**：
  ```typescript
  export interface ExportOptions {
    canvasId: string
    gridWidth: number
    gridHeight: number
    cellPixelSize?: number  // 默认 20，导出时可用更高分辨率如 40
  }

  export function exportGridPNG(options: ExportOptions): Promise<string>  // 返回临时文件路径
  ```
- **技术要点**：
  - **App 端**：`uni.canvasToTempFilePath({ canvasId, fileType: 'png', quality: 1 })` → `uni.saveImageToPhotosAlbum({ filePath })`
  - **小程序端**：`wx.canvasToTempFilePath({ canvas, fileType: 'png' })` → `wx.saveImageToPhotosAlbum({ filePath })`，需先授权 `scope.writePhotosAlbum`
  - **H5 端**：`canvas.toDataURL('image/png')` → 创建 `<a>` 标签设置 `download="bead-grid.png"` → `click()` 触发下载
  - 导出分辨率：使用离屏 Canvas 按 `gridWidth × exportCellSize` 重新绘制（不依赖屏幕 Canvas），确保导出清晰
  - 错误处理：保存失败时 Toast 提示，不崩溃
- **验收标准**：三端均可保存清晰 PNG，失败有友好提示
- **分步执行**：
  1. 实现 `renderToOffscreenCanvas()` 离屏重绘函数
  2. 实现 App 端导出分支
  3. 实现小程序端导出分支（含权限检查）
  4. 实现 H5 端导出分支
  5. 添加错误处理 + Toast
  6. 在 ActionBar 导出按钮中调用测试

#### T6.2 长图导出（图纸 + 配色表）
- **做什么**：离屏 Canvas 拼接上图下色号统计
- **文件路径**：`src/utils/export-helper.ts`（扩展 T6.1）
- **接口定义**：
  ```typescript
  export interface LongImageOptions extends ExportOptions {
    colorSummary: Array<{ hex: string, code: string, count: number }>
    paletteId: string
  }

  export function exportLongImage(options: LongImageOptions): Promise<string>
  ```
- **布局规格**：
  - 总宽度 = gridWidth × exportCellSize + padding × 2（padding = 40px）
  - 图纸区域高度 = gridHeight × exportCellSize
  - 间距 = 30px
  - 配色表区域：每行 = 色块(30×30) + 间距(10) + 色号文字 + 间距(20) + 数量文字，行高 40px
  - 配色表高度 = ceil(用色种类数 / 3) × 40（3列布局）
  - 底部留白 = 40px
- **技术要点**：
  - 创建离屏 Canvas，尺寸 = 总宽度 × 总高度
  - 白色背景填充
  - 上部：调用 `renderToOffscreenCanvas()` 绘制图纸（含网格线）
  - 下部：遍历 colorSummary，绘制色块 + `fillText` 色号 + 数量
  - 文字使用 `ctx.font = '14px sans-serif'`，颜色 `#333`
  - 条件编译：App 用 UTs 离屏 Canvas，小程序用 `wx.createCanvasContext`（注意小程序离屏 Canvas 限制），H5 用标准 `document.createElement('canvas')`
- **验收标准**：长图布局合理，文字清晰可读，三端均可导出
- **分步执行**：
  1. 计算长图总尺寸
  2. 实现离屏 Canvas 创建（三端适配）
  3. 绘制图纸区域
  4. 绘制配色表区域（色块 + 文字）
  5. 导出为 PNG（复用 T6.1 逻辑）
  6. 真机验证文字清晰度

#### T6.3 分享功能
- **做什么**：系统分享 / 小程序分享
- **文件路径**：`src/utils/export-helper.ts`（扩展）
- **接口定义**：
  ```typescript
  export function shareImage(filePath: string, title?: string): Promise<void>
  ```
- **技术要点**：
  - **App 端**：`uni.share({ provider: 'weixin', scene: 'WXSceneSession', type: 1, imageUrl: filePath, title })`，若微信未安装降级为系统分享 `plus.share.sendWithSystem`
  - **小程序端**：先确保文件为临时路径，在页面 `onShareAppMessage` 中返回 `{ title, imageUrl: filePath }`；或在按钮点击时调用 `wx.shareAppMessage`（需用户触发）
  - **H5 端**：`navigator.clipboard.write()` 复制图片到剪贴板（需 HTTPS），或降级为下载
  - 分享前检查文件是否存在，不存在则 Toast 提示
- **验收标准**：App 可分享到微信/系统，小程序可分享给好友，H5 可复制或下载
- **分步执行**：
  1. 实现 App 端分享（微信 + 系统降级）
  2. 实现小程序端分享（onShareAppMessage + 按钮触发）
  3. 实现 H5 端分享（剪贴板 + 下载降级）
  4. 添加文件存在性检查
  5. 在 ActionBar 分享按钮中调用测试

#### T6.4 历史记录持久化
- **做什么**：保存作品元数据 + 缩略图，支持列表展示和删除
- **文件路径**：`src/stores/useProjectStore.ts`（扩展）、`src/pages/history.vue`
- **数据结构**：
  ```typescript
  export interface HistoryItem {
    id: string                // UUID
    title: string             // 自动生成：日期 + 网格尺寸，如 "2026-06-22 32×32"
    createdAt: number         // 时间戳
    gridWidth: number
    gridHeight: number
    paletteId: string
    thumbPath: string         // 本地缩略图文件路径
    cellDataSnapshot: string[][]  // 完整网格数据（用于恢复编辑）
  }
  ```
- **存储策略**：
  - 元数据列表：`uni.setStorageSync('history_list', HistoryItem[])`（不含 cellDataSnapshot，仅存引用）
  - cellDataSnapshot：单独存储 `uni.setStorageSync('history_data_${id}', cellData)`，避免单条 Storage 过大
  - 缩略图：导出 128×128 PNG 保存到 `uni.env.USER_DATA_PATH/history-thumbs/${id}.png`
  - 超过 20 条：自动删除最旧记录的 Storage 数据 + 缩略图文件
- **history.vue UI**：
  - 列表项：缩略图(64×64) + 标题 + 日期 + 网格尺寸 + 删除按钮
  - 点击列表项：恢复 cellData 到 store，跳转到 editor Tab
  - 空状态：居中图标 + "暂无作品，去创作第一张图纸吧" + 跳转按钮
  - 左滑删除或长按删除确认弹窗
- **验收标准**：历史可保存/读取/恢复/删除，超限自动清理，缩略图正确显示
- **分步执行**：
  1. 在 useProjectStore 中添加 `saveToHistory()` / `loadFromHistory()` / `deleteHistory()` action
  2. 实现缩略图生成（小尺寸离屏 Canvas 导出）
  3. 实现自动清理逻辑（超 20 条删最旧）
  4. 创建 history.vue 列表页 UI
  5. 实现点击恢复 + 跳转 editor
  6. 实现删除功能（含确认弹窗）
  7. 实现空状态 UI
  8. 端到端测试：生成 → 保存 → 查看列表 → 恢复 → 删除

### W6 交付物
- ✅ PNG 导出（三端，含离屏重绘）
- ✅ 长图导出（图纸 + 配色表拼接）
- ✅ 分享功能（三端适配）
- ✅ 历史记录 CRUD（含缩略图 + 自动清理）

---

## W7：UI 精修/多端样式/动效

### 目标
打磨视觉体验，确保多端一致性。

### 任务清单

#### T7.1 全局样式体系
- **做什么**：定义设计 Token，统一管理视觉变量
- **文件路径**：`src/uni.scss`、`src/styles/variables.scss`
- **Token 定义**：
  ```scss
  // 颜色
  $color-primary: #007AFF;
  $color-primary-light: #E8F4FF;
  $color-bg: #FFFFFF;
  $color-bg-secondary: #F5F5F5;
  $color-text: #1A1A1A;
  $color-text-secondary: #666666;
  $color-border: #E0E0E0;
  $color-error: #FF3B30;

  // 字号
  $font-size-title: 18px;
  $font-size-body: 14px;
  $font-size-caption: 12px;

  // 间距（4px 基准网格）
  $spacing-xs: 4px;
  $spacing-sm: 8px;
  $spacing-md: 16px;
  $spacing-lg: 24px;
  $spacing-xl: 32px;

  // 圆角
  $radius-sm: 4px;    // 色块
  $radius-md: 8px;    // 按钮
  $radius-lg: 12px;   // 卡片、底部抽屉
  $radius-full: 999px; // Tag、圆形按钮

  // 阴影
  $shadow-card: 0 2px 8px rgba(0, 0, 0, 0.08);
  $shadow-sheet: 0 -4px 16px rgba(0, 0, 0, 0.12);
  ```
- **技术要点**：
  - 写入 `src/uni.scss`（UniApp 全局 SCSS 变量，自动注入所有组件）
  - 深色模式预留：使用 CSS Variables `var(--color-primary)` 包裹，后续可通过媒体查询切换
  - 安全区域：定义 `$safe-area-bottom: env(safe-area-inset-bottom)` 用于底部固定元素
- **验收标准**：样式变量统一管理，修改一处全局生效，所有组件引用变量而非硬编码值
- **分步执行**：
  1. 创建 `src/styles/variables.scss`，定义所有 Token
  2. 在 `src/uni.scss` 中 `@import './styles/variables.scss'`
  3. 全局搜索替换各组件中的硬编码颜色/字号/间距为变量
  4. 验证编译无报错，视觉无变化

#### T7.2 组件样式精修
- **做什么**：逐个组件对齐设计规范
- **文件路径**：各组件 `.vue` 文件的 `<style>` 部分
- **精修清单**：
  - **GridCanvas**：
    - 网格线：`strokeStyle = '#E8E8E8'`，`lineWidth = 0.5`（视觉上 1px）
    - 色块间隙：绘制时留 0.5px 间隙，避免色块粘连
    - 高亮边框：`strokeStyle = '#007AFF'`，`lineWidth = 2`，虚线可选
    - Canvas 背景：`#FAFAFA`（非纯白，减少刺眼）
  - **ColorBottomSheet**：
    - 色块大小：36×36，圆角 `$radius-sm`
    - 选中态：2px `$color-primary` 边框 + 轻微放大 `scale(1.1)`
    - 抽屉顶部圆角 `$radius-lg`，阴影 `$shadow-sheet`
    - 滑入动画：`cubic-bezier(0.32, 0.72, 0, 1)` 更自然
  - **ParamPanel**：
    - 预设按钮：未选中 `$color-bg-secondary` + `$color-text-secondary`，选中 `$color-primary` + 白色文字
    - 自定义输入框：边框 `$color-border`，聚焦时 `$color-primary`
    - Radio 样式：自定义圆形选中态，非原生
  - **ActionBar**：
    - 图标按钮：44×44 点击热区，图标 24×24
    - 禁用态：`opacity: 0.3`
    - 底部分割线：`$color-border`
    - 固定在底部，高度 56px + `$safe-area-bottom`
  - **ImagePicker**：
    - 预览区：圆角 `$radius-lg`，边框 `$color-border`，虚线边框当无图时
    - 上传按钮：主色填充，圆角 `$radius-md`，高度 48px
- **验收标准**：与设计稿/竞品（如 PixelBead App）视觉对齐，细节精致
- **分步执行**：
  1. 按上述清单逐个组件修改样式
  2. 每个组件修改后在 H5 + App 模拟器中对比验证
  3. 重点关注色块间隙、高亮效果、动画曲线等细节
  4. 截图记录修改前后对比

#### T7.3 加载态与错误提示
- **做什么**：完善所有异步操作的反馈机制
- **文件路径**：`src/components/LoadingOverlay.vue`（新建）、各页面
- **新增组件 `LoadingOverlay.vue`**：
  ```typescript
  interface Props {
    visible: boolean
    progress?: number      // 0-100，有值时显示进度条
    message?: string       // 提示文字，默认 "处理中..."
    cancellable?: boolean  // 是否显示取消按钮
  }
  emit('cancel')
  ```
  - 全屏半透明遮罩 + 居中卡片
  - 有 progress 时显示环形进度条或线性进度条
  - 可取消时显示「取消」按钮
- **各场景接入**：
  - 图片生成中：`LoadingOverlay` + progress（Worker 上报）+ 可取消
  - 导出中：`LoadingOverlay` + message "正在导出..." + 不可取消
  - 保存历史中：轻量 Toast `uni.showToast({ title: '已保存', icon: 'success' })`
  - 错误场景：
    - 图片 > 10MB：`uni.showToast({ title: '图片过大，请压缩后重试', icon: 'none' })`
    - 导出失败：`uni.showToast({ title: '导出失败，请重试', icon: 'none' })`
    - Canvas 内存不足：弹窗提示 + 建议降低网格尺寸
  - 空状态（history.vue）：居中插画 + 文案 + CTA 按钮
- **验收标准**：所有异步操作有明确反馈，错误提示友好可理解，无静默失败
- **分步执行**：
  1. 创建 LoadingOverlay 组件
  2. 在 editor.vue 生成流程中接入（含进度和取消）
  3. 在导出流程中接入
  4. 在各错误点添加 Toast/弹窗
  5. 完善 history.vue 空状态
  6. 全流程测试反馈体验

#### T7.4 多端样式兼容
- **做什么**：修复 App/小程序/H5 样式差异
- **常见问题与修复方案**：
  | 问题 | 平台 | 修复方案 |
  |------|------|----------|
  | iPhone 底部横条遮挡 | App/iOS | 底部固定元素加 `padding-bottom: env(safe-area-inset-bottom)` |
  | iPhone 刘海区状态栏重叠 | App/iOS | 页面顶部加 `padding-top: var(--status-bar-height)` |
  | 小程序 cover-view 层级异常 | MP-WEIXIN | ColorBottomSheet 改用 `wx.createSelectorQuery` 定位，或用同层渲染 |
  | H5 滚动穿透（抽屉打开时背景可滚动） | H5 | 抽屉打开时 `document.body.style.overflow = 'hidden'`，关闭时恢复 |
  | 字体渲染模糊 | App/Android | Canvas 绘制文字时使用 `ctx.scale(dpr, dpr)` + 字号除以 dpr |
  | 小程序 input 样式不一致 | MP-WEIXIN | 使用 uni-ui 的 `uni-easyinput` 替代原生 input |
  | 深色模式文字不可读 | 全平台 | 检测系统深色模式，切换 CSS Variables |
- **验收标准**：三端真机/模拟器视觉一致，无遮挡、无模糊、无穿透
- **分步执行**：
  1. 准备测试设备清单（iPhone SE、小米中端、微信开发者工具、Chrome）
  2. 逐设备运行，截图记录样式问题
  3. 按上表逐一修复
  4. 修复后回归验证所有设备
  5. 建立多端样式检查 Checklist 文档

### W7 交付物
- ✅ 设计 Token 体系（uni.scss + variables.scss）
- ✅ 组件样式精修完成（5 个核心组件）
- ✅ 加载/错误/空状态完善（LoadingOverlay + Toast + 空状态）
- ✅ 多端视觉一致性验证（3 端 × 主流设备）

---

## W8：真机测试/兼容修复/发布准备

### 目标
全面测试，修复问题，准备上线。

### 任务清单

#### T8.1 真机测试矩阵
- **做什么**：覆盖主流设备，验证核心流程
- **测试设备清单**：
  | 平台 | 设备 | 系统版本 | 优先级 |
  |------|------|----------|--------|
  | Android | 小米 Redmi Note 12 | MIUI 14 / Android 13 | P0 |
  | Android | 华为 Mate 40 | HarmonyOS 3 | P0 |
  | Android | OPPO A78 | ColorOS 13 / Android 12 | P1 |
  | iOS | iPhone SE (2022) | iOS 17 | P0 |
  | iOS | iPhone 14 | iOS 17 | P0 |
  | 微信 | 小米 + iPhone 各 1 台 | 微信 8.0+ | P0 |
- **测试用例（每设备执行）**：
  1. 选取图片（相册 + 拍照）→ 预览正常
  2. 选择 32×32 + average + MARD → 生成图纸 → 耗时记录
  3. 双指缩放 + 单指拖拽 → 流畅无卡顿
  4. 点击格子换色 → 即时生效 → 撤销/重做正确
  5. 导出 PNG → 保存到相册 → 打开验证清晰度
  6. 导出长图 → 保存 → 验证配色表文字可读
  7. 分享 → 微信好友接收 → 可打开查看
  8. 保存历史 → 返回列表 → 恢复编辑 → 删除
  9. 切换品牌 → 色卡更新 → 重新生成
  10. 超大图片（>10MB）→ 拒绝提示
- **验收标准**：所有 P0 设备核心流程无崩溃、无明显卡顿（帧率 ≥ 30fps）、功能完整
- **分步执行**：
  1. 准备测试设备，安装对应平台构建包
  2. 按测试用例逐设备执行，记录结果到 `docs/test-report-w8.md`
  3. 标记 Pass/Fail/Issue，Issue 附截图和复现步骤
  4. 汇总问题列表，按严重程度分级（P0/P1/P2）

#### T8.2 性能基准验证
- **做什么**：量化性能指标，确保达标
- **测试工具**：
  - App：Android Profiler / Xcode Instruments
  - 小程序：微信开发者工具 Performance 面板
  - H5：Chrome DevTools Performance
- **指标与阈值**：
  | 指标 | 阈值 | 测试条件 |
  |------|------|----------|
  | 32×32 生成耗时 | < 2s | 中端 Android（Redmi Note 12） |
  | 48×48 生成耗时 | < 5s | 中端 Android |
  | Canvas 渲染帧率 | ≥ 30fps | 缩放/平移操作中 |
  | PNG 导出耗时 | < 3s | 32×32 图纸 |
  | 长图导出耗时 | < 5s | 32×32 + 20 色配色表 |
  | 内存峰值 | < 200MB | 48×48 生成 + 编辑全程 |
  | 冷启动时间 | < 3s | App 首次打开 |
  | 小程序主包大小 | < 2MB | 构建产物 |
- **验收标准**：全部指标达标，未达标项有明确优化方案或降级策略
- **分步执行**：
  1. 在测试设备上运行性能测试脚本（手动计时 + Profiler）
  2. 记录每项指标实际值
  3. 对比阈值，标记达标/未达标
  4. 未达标项分析瓶颈（CPU/内存/IO），制定优化方案
  5. 输出 `docs/performance-report-w8.md`

#### T8.3 兼容性修复
- **做什么**：修复 T8.1/T8.2 发现的问题
- **常见修复项**：
  | 问题 | 原因 | 修复方案 |
  |------|------|----------|
  | 特定机型 Canvas 白屏 | GPU 驱动不支持某些 Canvas API | 降级为软件渲染或降低 Canvas 尺寸 |
  | 小程序 Worker 通信超时 | 大数据传输阻塞 | 分片传输 + 增加超时重试 |
  | 图片 EXIF 旋转未处理 | 手机拍照图片带旋转元数据 | 读取 EXIF orientation，Canvas 绘制前旋转修正 |
  | 深色模式文字不可读 | 未适配系统深色主题 | 监听 `prefers-color-scheme`，切换 CSS Variables |
  | iOS 保存图片权限弹窗不出现 | 未提前请求权限 | 在 `manifest.json` 添加 `NSPhotoLibraryAddUsageDescription` |
  | 小程序基础库版本过低 | 用户微信版本旧 | 检测基础库版本，低版本提示升级或降级功能 |
  | Android 返回键退出丢失编辑状态 | 页面销毁未保存 | `onHide` 时自动保存到临时 Storage |
- **Bug 分级与处理**：
  - **P0（阻塞发布）**：崩溃、数据丢失、核心功能不可用 → 必须修复
  - **P1（严重影响体验）**：明显卡顿、样式错乱、偶发失败 → 尽量修复
  - **P2（轻微问题）**：文案不准确、动画不够流畅 → 记录后续迭代
- **验收标准**：P0 Bug 清零，P1 Bug 修复率 ≥ 90%
- **分步执行**：
  1. 从测试报告中提取 Bug 列表
  2. 按优先级排序，P0 先行
  3. 逐个修复，修复后回归验证
  4. 更新测试报告状态
  5. P2 Bug 录入 Issue Tracker 后续跟进

#### T8.4 发布准备
- **做什么**：打包、审核素材、提交上线
- **App 端发布清单**：
  - [ ] Android APK（测试用）+ AAB（Google Play）
  - [ ] iOS IPA（TestFlight 测试 + App Store 提审）
  - [ ] 应用图标：1024×1024 PNG（无透明度）
  - [ ] 启动图：各尺寸适配
  - [ ] 应用商店截图：5 张（iPhone 6.7" + 5.5" + Android 手机）
  - [ ] 应用描述：中文 + 英文，突出核心功能
  - [ ] 隐私政策 URL（托管在 GitHub Pages 或独立域名）
  - [ ] 版本号：1.0.0，更新日志
  - [ ] App Store 类目：工具 > 设计
  - [ ] Google Play 类目：艺术与设计
- **小程序端发布清单**：
  - [ ] 提审包上传至微信公众平台
  - [ ] 类目选择：工具 > 图片/视频
  - [ ] 服务标签：图片处理、设计工具
  - [ ] 隐私协议弹窗（首次使用时展示）
  - [ ] 功能页面截图（审核用）
  - [ ] 版本号：1.0.0
- **H5 端（可选）**：
  - [ ] 部署到 Vercel / Netlify / 自有服务器
  - [ ] 配置 HTTPS + 域名
  - [ ] SEO meta 标签
- **验收标准**：所有平台提交审核，审核通过后正式上线
- **分步执行**：
  1. 准备应用图标、启动图、截图等素材
  2. 编写应用描述和隐私政策
  3. 构建 App 发布包（HBuilderX 云打包或本地签名）
  4. 提交 App Store / Google Play 审核
  5. 构建小程序提审包，提交微信审核
  6. 跟踪审核状态，处理驳回反馈
  7. 审核通过后发布，监控线上数据

### W8 交付物
- ✅ 真机测试报告（`docs/test-report-w8.md`）
- ✅ 性能基准报告（`docs/performance-report-w8.md`）
- ✅ P0/P1 Bug 修复完成
- ✅ 发布包 + 审核素材齐全
- ✅ 各平台提交审核

---

## 关键技术决策备忘

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 色差算法 | Oklab 线性扫描 | 290 色 < 1ms/格，KD-Tree 收益不明显 |
| Canvas 渲染 | 单 Canvas 三次 drawPass | 避免小程序多 Canvas 兼容问题 |
| 缩放实现 | 容器 transform | 不触发 Canvas 重绘，性能好 |
| 历史存储 | Storage + 本地文件 | 元数据小用 Storage，缩略图用文件 |
| 小程序计算 | Worker | 避免 UI 线程阻塞 |
| 色卡数据 | 直接复用 JSON | 290 色体积小，无需后端 |

---

## 风险预案

| 风险 | 概率 | 影响 | 预案 |
|------|------|------|------|
| UTs Bitmap API 不稳定 | 中 | 高 | 降级为 JS Canvas，W3 预留 2 天 buffer |
| 小程序 Canvas 大尺寸白屏 | 高 | 高 | 分块渲染 + 降低默认网格尺寸 |
| Oklab 色差结果与预期偏差 | 低 | 中 | 提供手动校准入口，允许用户微调 |
| 历史记录膨胀 | 中 | 低 | 严格 20 条上限 + 自动清理 |
| App 审核被拒 | 低 | 高 | 提前准备隐私政策 + 功能说明视频 |

---

## 附录：参考资源

- **色卡数据**：`perler-beads/colorSystemMapping.json`
- **Oklab 算法**：`perler-beads/src/color.ts`
- **小程序 Canvas**：`perlerBeadsApplet/pages/canvas/`
- **色号统计 UI**：`PixelBead/components/ColorStats.vue`
- **UniApp x 文档**：https://uniapp.dcloud.net.cn/tutorial/

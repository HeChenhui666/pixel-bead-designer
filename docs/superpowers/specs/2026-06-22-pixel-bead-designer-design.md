# 拼豆图纸生成器 · 设计规格

**日期**：2026-06-22  
**项目**：pixel-bead-designer  
**技术栈**：UniApp x + Vue 3 + UTs + Pinia  
**目标平台**：Android/iOS App（优先）→ 微信小程序 → H5（算法验证）

---

## 1. 产品定位

用户上传照片，自动生成可购买拼豆颜色的网格图纸，支持缩放、编辑单格颜色、导出长图分享。

核心体验路径：上传图片 → 自动生成图纸 → 手动微调 → 导出/分享。

---

## 2. 导航结构

底部 4 个固定 Tab，编辑器为核心：

| Tab | 图标 | 内容 |
|-----|------|------|
| 图片 | 🖼️ | 图片上传 + 参数设置 + 生成入口 |
| 编辑 | ✏️ | GridCanvas 主编辑器（默认 Tab） |
| 色卡 | 🎨 | 290 色网格 + 品牌切换 |
| 历史 | 🕒 | 作品列表 + 缩略图 |

首次打开 App（无图片时），「编辑」Tab 显示**引导卡片**：居中「📷 上传图片」主按钮 + 底部历史/色卡/参数三个快捷入口。

---

## 3. 整体架构

```
┌─────────────────────────────────────────────────────┐
│ UI 层（Vue 页面 + 组件）                              │
│  index.vue  editor.vue  palette.vue  history.vue    │
├─────────────────────────────────────────────────────┤
│ 状态层（Pinia）                                       │
│  useProjectStore   useConfigStore                    │
├────────────────────────┬────────────────────────────┤
│ 算法层（UTs）           │ 工具层（TS）                │
│  image-processor.uts   │  color-mapper.ts            │
│  color-distance.uts    │  export-helper.ts           │
│                        │  platform.ts                │
├────────────────────────┴────────────────────────────┤
│ 数据层                                               │
│  colorSystemMapping.json（290 色 × 5 品牌，直接复用）│
└─────────────────────────────────────────────────────┘
```

### 核心数据流

```
用户上传图片
  → image-processor.uts 像素化（Uint8ClampedArray）
  → color-mapper.ts Oklab 色差匹配
  → cellData[][] 写入 useProjectStore
  → GridCanvas.vue 读取 store 渲染 Canvas
  → 用户编辑格子 → store 更新单格 → Canvas 局部重绘
  → 导出：离屏 Canvas 高分辨率重绘 → 保存文件
```

---

## 4. 色彩数据与算法

**数据来源**：直接复用 `perler-beads` 项目的 `colorSystemMapping.json`。

- 结构：`{ "#HEX": { "MARD": "A01", "COCO": "E02", "漫漫": "E2", "盼盼": "65", "咪小窝": "77" } }`
- 共 290 种颜色，覆盖 5 个国内主流品牌

**色差算法**：Oklab 色彩空间（移植自 `perler-beads`）

```typescript
// sRGB → Linear → Oklab → 欧氏距离
function colorDistance(rgb1: RgbColor, rgb2: RgbColor): number
```

- 290 色线性扫描，无需 KD-Tree（< 1ms/格，已验证）
- 对每个像素块采样平均 RGB，再做 Oklab 最近邻匹配
- 结果写入 `cellData[y][x]`（HEX 字符串）

**像素化模式**：

| 模式 | 说明 |
|------|------|
| 平均色（average） | 真实还原，适合照片 |
| 主色（dominant） | 卡通效果，适合简单图案 |

---

## 5. 页面与组件

### 页面

```
pages/
  index.vue      ← Tab「图片」
  editor.vue     ← Tab「编辑」（启动默认页）
  palette.vue    ← Tab「色卡」
  history.vue    ← Tab「历史」
```

### 关键组件

```
components/
  GridCanvas.vue         ← Canvas 渲染 + 手势交互
  ColorBottomSheet.vue   ← 底部抽屉换色面板
  ImagePicker.vue        ← 图片选择 + 预处理
  ParamPanel.vue         ← 网格尺寸 / 模式 / 品牌
  ColorSummary.vue       ← 色号用量统计
  ActionBar.vue          ← 撤销/重做/导出
```

### 状态模型

```typescript
// useProjectStore
interface ProjectState {
  sourceImage: string
  gridWidth: number            // 默认 32
  gridHeight: number           // 默认 32
  cellData: string[][]         // HEX 二维数组
  colorSummary: Map<string, number>  // hex → 用量
  paletteId: 'MARD' | 'COCO' | '漫漫' | '盼盼' | '咪小窝'
  history: CellSnapshot[]      // 撤销栈，最多 20 步
}

// useConfigStore
interface ConfigState {
  defaultGridSize: number
  defaultPalette: string
  pixelationMode: 'dominant' | 'average'
}
```

---

## 6. GridCanvas 渲染策略

- **三次 drawPass（单 Canvas）**：色块 → 网格线 → 交互高亮，顺序叠绘（避免小程序多 Canvas 兼容问题）
- **缩放/平移**：操作容器 `transform`，不触发 Canvas 重绘
- **局部重绘**：单格修改只重绘对应矩形区域
- **导出**：离屏 Canvas 按目标分辨率完整重绘

### 单格换色交互

用户点击任意格子 → 底部弹出 `ColorBottomSheet`：

1. 顶部显示当前格颜色（HEX + 品牌色号）
2. 290 色网格（可上滑展开全部）
3. 选色后写入 store，触发局部 Canvas 重绘
4. 支持撤销（快照入栈）

---

## 7. 网格尺寸预设

| 预设 | 尺寸 | 适用场景 |
|------|------|----------|
| 小图 | 16 × 16 | 图标、像素头像 |
| 中图（默认） | 32 × 32 | 日常创作 |
| 大图 | 48 × 48 | 精细场景 |
| 自定义 | 8–64 | 手动输入 |

---

## 8. 导出方案

| 类型 | 实现 |
|------|------|
| 图纸 PNG | `uni.canvasToTempFilePath` → 系统相册/分享 |
| 长图（图纸 + 配色表） | 离屏 Canvas 拼接，上图下色号统计 |
| 小程序 | 生成临时文件 → `wx.shareAppMessage` |
| H5 | `canvas.toDataURL()` → `<a download>` |

历史记录：保存元数据 + 缩略图路径，超过 20 条自动清理最旧。

---

## 9. 错误处理

| 场景 | 处理 |
|------|------|
| 图片 > 10MB | 选图时拒绝，提示压缩 |
| 像素化 > 3s | 进度条 + 可取消 |
| Canvas 内存不足 | 降级小网格，提示用户 |
| 导出失败 | Toast 报错，不崩溃 |
| 历史过多 | 超 20 条自动删旧缩略图 |

---

## 10. 多端条件编译

```
#ifdef APP-PLUS
  UTs 原生 Bitmap / 离屏 Canvas
#endif

#ifdef MP-WEIXIN
  wx.createCanvasContext + Worker
#endif

#ifdef H5
  标准 Canvas2D（算法验证用）
#endif
```

---

## 11. 测试策略

| 层次 | 方式 |
|------|------|
| 算法层 | Jest 单元测试（H5 build），验证色差匹配准确率 |
| 渲染层 | 模拟器截图对比（App-PLUS + MP-WEIXIN） |
| 导出层 | 真机验证文件保存与分享 |
| 性能基准 | 32×32 生成 < 2s（中端 Android） |

---

## 12. 参考项目与可复用资产

| 项目 | 复用内容 |
|------|----------|
| `perler-beads` | `colorSystemMapping.json`、Oklab 算法、像素化逻辑 |
| `perlerBeadsApplet` | 小程序 Canvas 渲染、导出长图实现 |
| `PixelBead` | 色号统计与配色表生成 UI |
| `perler-beads-ai` | 参考 AI 预处理思路（可选扩展） |

---

## 13. 开发阶段规划（8 周）

| 周 | 核心任务 | 交付物 |
|----|----------|--------|
| W1 | UniApp x 项目骨架、页面结构、图片选取预览 | 可运行框架 |
| W2 | 像素化算法 + Oklab 色差匹配（H5 验证） | 通过测试的算法库 |
| W3 | UTs 移植 + App 端 Canvas 渲染 | App 原生图纸生成 |
| W4 | MP-WEIXIN 条件编译 + Worker | 小程序可运行版 |
| W5 | 缩放/平移/单格编辑/色号统计 | 完整交互原型 |
| W6 | 导出 PNG/长图/历史记录 | 可导出分享版本 |
| W7 | UI 精修/多端样式/动效 | 成熟 UI 体验 |
| W8 | 真机测试/兼容修复/发布准备 | 线上发布版本 |

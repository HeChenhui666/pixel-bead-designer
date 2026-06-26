<template>
  <view class="page-editor" :style="{ paddingTop: safeTop + 'px', paddingBottom: `calc(56px + ${safeBottom}px)`, '--safe-top': safeTop + 'px', '--safe-bottom': safeBottom + 'px' }">
    <view class="editor-container">
      <!-- 生成中 Loading -->
      <view v-if="projectStore.isGenerating" class="loading-overlay">
        <text class="loading-text">正在生成图纸...</text>
        <text v-if="generateElapsed > 0" class="loading-sub">{{ generateElapsed }}ms</text>
      </view>

      <!-- 操作按钮栏（左上角返回+右侧操作，生成中 / 选格时隐藏） -->
      <view v-if="!projectStore.selectedCell && !projectStore.isGenerating" class="action-bar">
        <view class="action-btn back-action-btn" @click="handleBack()">
          <text class="action-btn-text">‹ 返回</text>
        </view>
        <view class="action-row">
          <view class="action-btn" @click="showStats = !showStats">
            <text class="action-btn-text">📊 统计</text>
          </view>
          <view class="action-btn" @click="handleExportLong()">
            <text class="action-btn-text">💾 导出</text>
          </view>
          <view class="action-btn" @click="handleSaveHistory()">
            <text class="action-btn-text">📁 保存</text>
          </view>
        </view>
      </view>

      <!-- GridCanvas 组件 -->
      <GridCanvas ref="gridCanvasRef" :cell-data="projectStore.cellData" :grid-width="projectStore.gridWidth"
        :grid-height="projectStore.gridHeight" :selected-cell="projectStore.selectedCell"
        :compare-image="isComparing ? projectStore.sourceImage : ''"
        :brush-mode="brushMode"
        :canvas-hidden="canvasShouldHide"
        @cell-click="onCellClick($event)"
        @brush-paint="onBrushPaint($event)" />

      <!-- 生成耗时提示 -->
      <view v-if="!projectStore.isGenerating && generateElapsed > 0" class="elapsed-hint">
        <text>生成耗时 {{ generateElapsed }}ms · {{ projectStore.gridWidth }}×{{ projectStore.gridHeight }}</text>
      </view>



      <!-- 撤销重做栏（页面中下方，不固定） -->
      <view v-if="!projectStore.selectedCell && !projectStore.isGenerating" class="undo-redo-bar">
        <view class="undo-redo-btn" :class="{ active: isComparing }" @touchstart.prevent="startCompare()"
          @touchend.prevent="stopCompare()">
          <text class="undo-redo-text">👁</text>
        </view>
        <view class="undo-redo-btn" :class="{ disabled: !projectStore.canUndo }" @click="handleUndo()">
          <text class="undo-redo-text">↩</text>
        </view>
        <view class="undo-redo-btn" :class="{ disabled: !projectStore.canRedo }" @click="handleRedo()">
          <text class="undo-redo-text">↪</text>
        </view>
      </view>

      <!-- 色号统计侧边抽屉 -->
      <view class="stats-drawer-mask" :class="{ visible: showStats }" @click="showStats = false" />
      <view class="stats-drawer" :class="{ open: showStats }">
        <view class="drawer-header">
          <text class="drawer-title">色号统计</text>
          <view class="drawer-close" @click="showStats = false">
            <text class="drawer-close-text">✕</text>
          </view>
        </view>
        <scroll-view scroll-y class="drawer-body">
          <ColorSummary :color-summary="projectStore.colorSummary" :palette-id="projectStore.paletteId"
            @color-tap="onStatsColorTap($event)" />
        </scroll-view>
      </view>

      <!-- 导出预览弹窗 -->
      <view v-if="previewDataUrl" class="preview-mask" @click="cancelPreview()">
        <view class="preview-dialog" @click.stop>
          <view class="preview-header">
            <text class="preview-title">导出预览</text>
            <view class="preview-close" @click="cancelPreview()">
              <text class="preview-close-text">✕</text>
            </view>
          </view>
          <scroll-view scroll-y class="preview-body">
            <image :src="previewDataUrl" mode="widthFix" class="preview-image" />
          </scroll-view>
          <view class="preview-footer">
            <view class="preview-btn cancel" @click="cancelPreview()">
              <text class="preview-btn-text">取消</text>
            </view>
            <view class="preview-btn confirm" @click="confirmExport()">
              <text class="preview-btn-text-confirm">确认导出</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部色板（选中格子时显示） -->
      <view v-if="projectStore.selectedCell" class="color-palette-bar" :style="{ height: paletteHeight + 'px' }">
        
        <view class="palette-header">
          <text class="cell-coords">选中 ({{ projectStore.selectedCell.x }}, {{ projectStore.selectedCell.y }})</text>
          <!-- 拖动手柄 -->
          <view class="palette-drag-handle" @touchstart.prevent="onDragStart($event)" @touchmove.prevent="onDragMove($event)"
            @touchend="onDragEnd()">
            <view class="drag-indicator" />
          </view>
          <view class="clear-selection-btn" @click="clearSelection()">
            <text class="clear-text">✕</text>
          </view>
        </view>
        <scroll-view scroll-y class="palette-grid-scroll" :style="{ flex: 1 }">
          <view class="palette-grid">
            <view v-for="color in paletteColors" :key="color.hex" class="palette-swatch"
              :class="{ active: isCurrentCellColor(color.hex) }" :style="{ backgroundColor: color.hex }"
              @click="onColorSelect(color.hex)">
              <text class="swatch-code">{{ color.code }}</text>
              <text v-if="isCurrentCellColor(color.hex)" class="swatch-check">✓</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 画笔色卡选择面板 -->
      <view v-if="showBrushPalette" class="brush-palette-panel" @touchmove.stop.prevent>
        <view class="brush-palette-header">
          <text class="brush-palette-title">选择画笔颜色</text>
          <view class="brush-palette-close" @click="showBrushPalette = false">
            <text class="brush-palette-close-text">✕</text>
          </view>
        </view>
        <scroll-view scroll-y class="brush-palette-scroll" :enhanced="true" :show-scrollbar="false">
          <view class="brush-palette-grid">
            <view
              v-for="color in paletteColors"
              :key="color.hex"
              class="brush-swatch"
              :class="{ active: brushColor === color.hex }"
              :style="{ backgroundColor: color.hex }"
              @click="selectBrushColor(color.hex)"
            >
              <text class="brush-swatch-code">{{ color.code }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 底部工具条 -->
      <view v-if="!projectStore.isGenerating" class="editor-toolbar">
        <view class="toolbar-item" :class="{ active: brushMode }" @click="toggleBrushMode()">
          <view class="toolbar-icon">🖌️</view>
          <text class="toolbar-label">画笔</text>
        </view>
      </view>
    </view>

    <!-- 退出确认弹窗（未保存时触发） -->
    <!-- touchstart/end.stop 防止触摸事件穿透到下方 Canvas（App 端 z-index 不能完全阻断触摸路由） -->
    <view
      v-if="showBackConfirm"
      class="confirm-mask"
      @touchstart.stop
      @touchmove.stop.prevent
      @touchend.stop
      @click.stop
    >
      <view class="confirm-dialog" @touchstart.stop @touchend.stop @click.stop>
        <text class="confirm-title">是否保存到草稿箱？</text>
        <text class="confirm-msg">当前图纸尚未保存，退出后将无法恢复。</text>
        <view class="confirm-buttons">
          <view class="confirm-btn-discard" @click="doBack()">
            <text class="confirm-btn-discard-text">直接退出</text>
          </view>
          <view class="confirm-btn-save" @click="saveAndBack()">
            <text class="confirm-btn-save-text">保存并退出</text>
          </view>
        </view>
        <view class="confirm-cancel" @click="cancelBack()">
          <text class="confirm-cancel-text">继续编辑</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { onShow, onBackPress } from '@dcloudio/uni-app'
import { useProjectStore } from '../../stores/useProjectStore'
import { useConfigStore } from '../../stores/useConfigStore'
import { useSafeArea } from '../../utils/useSafeArea'
import { pixelateImage } from '../../utils/image-processor'
import { getColorList, getColorCodeByHex } from '../../utils/color-mapper'
import { generateLongImagePreview } from '../../utils/export-helper'
import GridCanvas from '../../components/GridCanvas.vue'
import ColorSummary from '../../components/ColorSummary.vue'

const projectStore = useProjectStore()
const configStore = useConfigStore()
const { safeTop, safeBottom } = useSafeArea()

const generateElapsed = ref(0)
const gridCanvasRef = ref<InstanceType<typeof GridCanvas> | null>(null)
const showStats = ref(false)
const previewDataUrl = ref('')
const isComparing = ref(false)
let pendingExportOptions: Parameters<typeof generateLongImagePreview>[0] | null = null

// 画笔模式
const brushMode = ref(false)
const brushColor = ref('')
const showBrushPalette = ref(false)

// 小程序端 canvas 层级遮挡：稍后定义（依赖 showBackConfirm 等变量）

function toggleBrushMode() {
  if (brushMode.value) {
    // 关闭画笔
    brushMode.value = false
    showBrushPalette.value = false
    projectStore.selectedCell = null
  } else {
    // 开启画笔：先弹出色卡选择
    showBrushPalette.value = true
  }
}

function selectBrushColor(hex: string) {
  brushColor.value = hex
  showBrushPalette.value = false
  brushMode.value = true
  projectStore.selectedCell = null
}

function onBrushPaint(payload: { x: number; y: number }) {
  if (!brushMode.value || !brushColor.value) return
  // 先增量绘制单格（避免 watch 触发全量重绘闪烁），再更新 store 数据
  gridCanvasRef.value?.paintCell(payload.x, payload.y, brushColor.value)
  projectStore.updateCell(payload.x, payload.y, brushColor.value)
  hasSavedCurrentWork.value = false
}

// 色卡浮层高度拖动
const DEFAULT_PALETTE_HEIGHT = 160
const paletteHeight = ref(DEFAULT_PALETTE_HEIGHT)
let dragStartY = 0
let dragStartHeight = 0

function onDragStart(event: TouchEvent) {
  dragStartY = event.touches[0].clientY
  dragStartHeight = paletteHeight.value
}

function onDragMove(event: TouchEvent) {
  const deltaY = dragStartY - event.touches[0].clientY
  const screenHeight = uni.getWindowInfo().windowHeight
  const maxHeight = screenHeight * 0.8
  const newHeight = Math.min(maxHeight, Math.max(DEFAULT_PALETTE_HEIGHT, dragStartHeight + deltaY))
  paletteHeight.value = newHeight
}

function onDragEnd() {
  // 拖动结束，无需额外处理
}

function startCompare() {
  isComparing.value = true
}

function stopCompare() {
  isComparing.value = false
}

// 未保存状态追踪
const hasSavedCurrentWork = ref(true)
const showBackConfirm = ref(false)

// 弹窗/抽屉/面板显示时隐藏 canvas，解决原生组件层级遮挡
const canvasShouldHide = computed(() => showBackConfirm.value || showStats.value || !!previewDataUrl.value || showBrushPalette.value)

// 是否有可展示的内容（含从草稿箱加载的情形，此时 hasImage=false）
const hasContent = computed(() =>
  projectStore.hasImage || projectStore.cellData.some(row => row.some(hex => !!hex))
)

// ===== 返回导航 =====
function handleBack() {
  if (!hasSavedCurrentWork.value && hasContent.value) {
    showBackConfirm.value = true
  } else {
    uni.navigateBack()
  }
}

function saveAndBack() {
  projectStore.saveToHistory()
  showBackConfirm.value = false
  uni.navigateBack()
}

function doBack() {
  showBackConfirm.value = false
  uni.navigateBack()
}

function cancelBack() {
  showBackConfirm.value = false
}

// 拦截 Android 物理返回键 / iOS 手势返回
onBackPress(() => {
  if (!hasSavedCurrentWork.value && hasContent.value) {
    showBackConfirm.value = true
    return true
  }
  return false
})

// 当前品牌的颜色列表（仅显示图纸中已使用的颜色 + 常用色）
const paletteColors = computed(() => {
  const allowedSeries = configStore.selectedSeries[projectStore.paletteId] || []
  const allColors = getColorList(projectStore.paletteId, allowedSeries.length > 0 ? allowedSeries : undefined)
  // 优先显示图纸中已使用的颜色
  const usedHexes = new Set(Object.keys(projectStore.colorSummary))
  const usedColors = allColors.filter((c) => usedHexes.has(c.hex))
  const unusedColors = allColors.filter((c) => !usedHexes.has(c.hex))
  return [...usedColors, ...unusedColors]
})

function isCurrentCellColor(hex: string): boolean {
  if (!projectStore.selectedCell) return false
  const { x, y } = projectStore.selectedCell
  return projectStore.cellData[y]?.[x] === hex
}

function onColorSelect(hex: string) {
  if (!projectStore.selectedCell) return
  const { x, y } = projectStore.selectedCell
  projectStore.updateCell(x, y, hex)
  hasSavedCurrentWork.value = false
}

function clearSelection() {
  projectStore.selectedCell = null
}

function handleUndo() {
  if (!projectStore.canUndo) return
  projectStore.undo()
  hasSavedCurrentWork.value = false
  nextTick(() => gridCanvasRef.value?.refresh())
}

function handleRedo() {
  if (!projectStore.canRedo) return
  projectStore.redo()
  hasSavedCurrentWork.value = false
  nextTick(() => gridCanvasRef.value?.refresh())
}

function onStatsColorTap(hex: string) {
  const count = projectStore.colorSummary[hex] || 0
  uni.showToast({ title: `${hex} 共 ${count} 颗`, icon: 'none' })
}

async function handleExportLong() {
  try {
    const summaryList = Object.entries(projectStore.colorSummary)
      .map(([hex, count]) => ({ hex, code: '', count }))
      .sort((a, b) => b.count - a.count)
    const colorCodeMap: Record<string, string> = {}
    for (const item of summaryList) {
      item.code = getColorCodeByHex(item.hex, projectStore.paletteId)
      colorCodeMap[item.hex] = item.code
    }
    const options = {
      cellData: projectStore.cellData,
      gridWidth: projectStore.gridWidth,
      gridHeight: projectStore.gridHeight,
      colorSummary: summaryList,
      paletteId: projectStore.paletteId,
      colorCodeMap,
    }

    // 生成预览图后弹窗展示，用户确认后保存到相册
    const previewPath = await generateLongImagePreview(options) as unknown as string
    if (previewPath) {
      previewDataUrl.value = previewPath
      pendingExportOptions = options
      return
    }
  } catch (err) {
    console.error('导出失败:', err)
  }
}

function cancelPreview() {
  previewDataUrl.value = ''
  pendingExportOptions = null
}

async function confirmExport() {
  if (!pendingExportOptions) return
  const filePath = previewDataUrl.value
  const options = pendingExportOptions
  cancelPreview()
  try {
    // 直接将预览图保存到相册
    if (filePath) {
      await new Promise<void>((resolve, reject) => {
        uni.saveImageToPhotosAlbum({
          filePath,
          success: () => {
            uni.showToast({ title: '已保存到相册', icon: 'success' })
            resolve()
          },
          fail: (err: any) => {
            // 权限不足时引导用户授权
            if (err.errMsg?.includes('auth deny') || err.errMsg?.includes('auth denied')) {
              uni.showModal({
                title: '提示',
                content: '需要您授权保存到相册',
                confirmText: '去授权',
                success: (modalRes: any) => {
                  if (modalRes.confirm) {
                    uni.openSetting()
                  }
                },
              })
            } else {
              uni.showToast({ title: '保存失败', icon: 'none' })
            }
            reject(err)
          },
        })
      })
    }
  } catch (err) {
    console.error('导出失败:', err)
  }
}

function handleSaveHistory() {
  projectStore.saveToHistory()
  hasSavedCurrentWork.value = true
  uni.showToast({ title: '已保存到草稿箱', icon: 'success' })
}

let hasGeneratedForCurrentImage = false
let lastSourceImage = ''
// 每次 generateGrid 调用递增，只有最新一次能写入结果并关闭 loading
let currentGenerateId = 0

onShow(() => {
  setTimeout(() => {
    checkAndGenerate()
  }, 100)
})

function checkAndGenerate() {
  if (!projectStore.hasImage) {
    hasGeneratedForCurrentImage = false
    lastSourceImage = ''
    return
  }

  const imageChanged = projectStore.sourceImage !== lastSourceImage
  const gridEmpty = isEmptyGrid()
  // pendingGenerate 由 index 页"生成图纸"按钮设置，确保参数变化后必须重新生成
  const userRequested = projectStore.pendingGenerate

  if (userRequested || imageChanged || gridEmpty) {
    lastSourceImage = projectStore.sourceImage
    hasGeneratedForCurrentImage = false
    generateGrid()
  } else if (!hasGeneratedForCurrentImage) {
    hasGeneratedForCurrentImage = true
    // 从草稿箱加载：数据已保存，重置标志
    hasSavedCurrentWork.value = true
    gridCanvasRef.value?.refresh()
  }
}

function isEmptyGrid(): boolean {
  const data = projectStore.cellData
  if (data.length === 0) return true
  for (const row of data) {
    for (const hex of row) {
      if (hex) return false
    }
  }
  return true
}

async function generateGrid() {
  // 消费请求标志，并抢占生成 ID
  projectStore.pendingGenerate = false
  const myId = ++currentGenerateId
  projectStore.isGenerating = true
  generateElapsed.value = 0

  try {
    const result = await pixelateImage({
      imagePath: projectStore.sourceImage,
      gridWidth: projectStore.gridWidth,
      gridHeight: projectStore.gridHeight,
      mode: configStore.pixelationMode,
      paletteId: projectStore.paletteId,
      allowedSeries: configStore.selectedSeries[projectStore.paletteId] || [],
    })

    // 如果期间有更新的一次 generateGrid 已启动，丢弃旧结果
    if (myId !== currentGenerateId) return

    projectStore.setCellData(result.cellData)
    generateElapsed.value = result.elapsedMs
    hasGeneratedForCurrentImage = true
    hasSavedCurrentWork.value = false

    await nextTick()
    gridCanvasRef.value?.refresh()
  } catch (err) {
    if (myId !== currentGenerateId) return
    console.error('生成图纸失败:', err)
    uni.showToast({ title: '生成失败，请重试', icon: 'none' })
  } finally {
    // 只有最新一次负责关闭 loading，避免旧请求提前关闭 loading
    if (myId === currentGenerateId) {
      projectStore.isGenerating = false
    }
  }
}

function onCellClick(payload: { x: number; y: number }) {
  if (brushMode.value) return
  projectStore.selectedCell = payload
}

</script>

<style scoped>
.page-editor {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #fdf9f5 0%, #faf5f0 100%);
  overflow: hidden;
  min-height: calc(100vh - var(--safe-top, 0px) - var(--safe-bottom, 0px) - 56px);
}

.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(254, 252, 251, 0.92);
  z-index: 30;
}

.loading-text {
  font-size: 16px;
  color: #4a4a4a;
  font-weight: 500;
}

.loading-sub {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 8px;
}

.elapsed-hint {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #b0a8a0;
  pointer-events: none;
}

.color-palette-bar {
  position: fixed;
  bottom: calc(56px + var(--safe-bottom, 0px));
  left: 0;
  right: 0;
  background-color: #fefcfb;
  border-top: 1px solid #f0ebe6;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 20px rgba(126, 200, 200, 0.1);
  z-index: 40;
  display: flex;
  flex-direction: column;
}

.palette-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #f5f2ef;
  flex-shrink: 0;
  position: relative;
}

.cell-coords {
  font-size: 13px;
  color: #7ec8c8;
  font-weight: 600;
  flex-shrink: 0;
}

.palette-drag-handle {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  cursor: grab;
}

.drag-indicator {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background-color: #e8e4e0;
}

.clear-selection-btn {
  margin-left: auto;
  padding: 5px 14px;
  border-radius: 16px;
  background-color: #f8f6f4;
  flex-shrink: 0;
  transition: all 0.25s ease;
}

.clear-text {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}

.palette-grid-scroll {
  flex: 1;
  min-height: 0;
}

.palette-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 14px;
}

.palette-swatch {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  position: relative;
  transition: all 0.25s ease;
}

.palette-swatch.active {
  border-color: #7ec8c8;
  box-shadow: 0 0 0 3px rgba(126, 200, 200, 0.2);
}

.swatch-code {
  font-size: 8px;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  line-height: 1;
  pointer-events: none;
}

.swatch-check {
  position: absolute;
  top: -5px;
  right: -5px;
  font-size: 9px;
  color: #ffffff;
  background-color: #7ec8c8;
  border-radius: 50%;
  width: 15px;
  height: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-shadow: none;
}

.action-bar {
  position: fixed;
  top: calc(var(--safe-top, 0px) + 10px);
  left: 14px;
  right: 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  z-index: 36;
}

.action-row {
  display: flex;
  justify-content: flex-start;
  gap: 10px;
}

.back-action-btn {
  /* 返回按钮无需特殊样式，和 action-btn 共用即可 */
}

.action-btn {
  padding: 7px 16px;
  border-radius: 20px;
  background-color: rgba(254, 252, 251, 0.95);
  box-shadow: 0 2px 12px rgba(126, 200, 200, 0.15);
  transition: all 0.25s ease;
}

.action-btn:active {
  transform: scale(0.96);
}

.action-btn.disabled {
  opacity: 0.4;
}

.action-btn-text {
  font-size: 12px;
  color: #7ec8c8;
  font-weight: 600;
}

.undo-redo-bar {
  position: absolute;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 30;
}

.undo-redo-btn {
  padding: 10px 20px;
  border-radius: 22px;
  background-color: rgba(254, 252, 251, 0.95);
  box-shadow: 0 2px 12px rgba(126, 200, 200, 0.15);
  transition: all 0.25s ease;
}

.undo-redo-btn:active {
  transform: scale(0.95);
}

.undo-redo-btn.disabled {
  opacity: 0.35;
}

.undo-redo-btn.active {
  background-color: #7ec8c8;
}

.undo-redo-btn.active .undo-redo-text {
  color: #ffffff;
}

.undo-redo-text {
  font-size: 14px;
  color: #7ec8c8;
  font-weight: 600;
}

.stats-drawer-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.2);
  z-index: 44;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.stats-drawer-mask.visible {
  opacity: 1;
  pointer-events: auto;
}

.stats-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  background-color: #fefcfb;
  z-index: 45;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  padding-top: var(--safe-top, 0px);
  box-shadow: -4px 0 20px rgba(126, 200, 200, 0.12);
}

.stats-drawer.open {
  transform: translateX(0);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px;
  border-bottom: 1px solid #f5f2ef;
  flex-shrink: 0;
}

.drawer-title {
  font-size: 17px;
  font-weight: 700;
  color: #4a4a4a;
}

.drawer-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #f8f6f4;
  transition: all 0.25s ease;
}

.drawer-close:active {
  background-color: #f0eeeb;
}

.drawer-close-text {
  font-size: 14px;
  color: #9ca3af;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
}

.guide-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.guide-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 32px;
  border-radius: 20px;
  background-color: #fefcfb;
  box-shadow: 0 4px 16px rgba(126, 200, 200, 0.1);
  margin-bottom: 32px;
}

.guide-icon {
  font-size: 56px;
  margin-bottom: 16px;
}

.guide-title {
  font-size: 18px;
  color: #4a4a4a;
  text-align: center;
  margin-bottom: 24px;
  font-weight: 600;
}

.guide-btn {
  padding: 12px 40px;
  border-radius: 24px;
  background: linear-gradient(135deg, #7ec8c8 0%, #a8d8d8 100%);
  box-shadow: 0 4px 16px rgba(126, 200, 200, 0.3);
}

.guide-btn-text {
  font-size: 16px;
  color: #ffffff;
  font-weight: 600;
}

.quick-entries {
  display: flex;
  gap: 24px;
}

.quick-entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.entry-icon {
  font-size: 28px;
}

.entry-label {
  font-size: 13px;
  color: #9ca3af;
}

.preview-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-dialog {
  width: 90vw;
  max-width: 400px;
  max-height: 80vh;
  background-color: #fefcfb;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(126, 200, 200, 0.15);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid #f5f2ef;
  flex-shrink: 0;
}

.preview-title {
  font-size: 16px;
  font-weight: 700;
  color: #4a4a4a;
}

.preview-close {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #f8f6f4;
  transition: all 0.25s ease;
}

.preview-close:active {
  background-color: #f0eeeb;
}

.preview-close-text {
  font-size: 13px;
  color: #9ca3af;
}

.preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  justify-content: center;
}

.preview-image {
  width: 100%;
  border-radius: 12px;
}

.preview-footer {
  display: flex;
  gap: 12px;
  padding: 14px 18px;
  border-top: 1px solid #f5f2ef;
  flex-shrink: 0;
}

.preview-btn {
  flex: 1;
  padding: 11px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
}

.preview-btn.cancel {
  background-color: #f8f6f4;
}

.preview-btn.confirm {
  background: linear-gradient(135deg, #7ec8c8 0%, #a8d8d8 100%);
  box-shadow: 0 2px 12px rgba(126, 200, 200, 0.25);
}

.preview-btn-text {
  font-size: 15px;
  color: #9ca3af;
  font-weight: 500;
}

.preview-btn-text-confirm {
  font-size: 15px;
  color: #ffffff;
  font-weight: 600;
}

/* 退出确认弹窗 */
.confirm-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.25);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-dialog {
  width: 80vw;
  max-width: 320px;
  background-color: #fefcfb;
  border-radius: 20px;
  padding: 28px 22px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 8px 32px rgba(126, 200, 200, 0.15);
}

.confirm-title {
  font-size: 17px;
  font-weight: 700;
  color: #4a4a4a;
  margin-bottom: 10px;
  text-align: center;
}

.confirm-msg {
  font-size: 14px;
  color: #9ca3af;
  text-align: center;
  margin-bottom: 22px;
  line-height: 1.6;
}

.confirm-buttons {
  display: flex;
  gap: 12px;
  width: 100%;
  margin-bottom: 14px;
}

.confirm-btn-discard {
  flex: 1;
  padding: 12px 0;
  border-radius: 14px;
  background-color: #f8f6f4;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
}

.confirm-btn-discard-text {
  font-size: 15px;
  color: #9ca3af;
  font-weight: 500;
}

.confirm-btn-save {
  flex: 1;
  padding: 12px 0;
  border-radius: 14px;
  background: linear-gradient(135deg, #7ec8c8 0%, #a8d8d8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(126, 200, 200, 0.25);
}

.confirm-btn-save-text {
  font-size: 15px;
  color: #ffffff;
  font-weight: 600;
}

.confirm-cancel {
  padding: 8px 24px;
}

.confirm-cancel-text {
  font-size: 14px;
  color: #7ec8c8;
  font-weight: 500;
}

/* 底部工具条 */
.editor-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(56px + var(--safe-bottom, 0px));
  padding-bottom: var(--safe-bottom, 0px);
  background-color: rgba(254, 252, 251, 0.95);
  backdrop-filter: blur(12px);
  border-top: 1px solid #f0ebe6;
  display: flex;
  align-items: center;
  z-index: 50;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  box-shadow: 0 -4px 20px rgba(126, 200, 200, 0.08);
}

.editor-toolbar::-webkit-scrollbar {
  display: none;
}

.toolbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 8px 18px;
  border-radius: 12px;
  flex-shrink: 0;
  transition: all 0.25s ease;
}

.toolbar-item:active {
  background-color: rgba(126, 200, 200, 0.1);
}

.toolbar-icon {
  font-size: 20px;
  line-height: 1;
}

.toolbar-label {
  font-size: 10px;
  color: #9ca3af;
  line-height: 1;
  font-weight: 500;
}

.toolbar-item.active {
  background-color: rgba(126, 200, 200, 0.15);
}

.toolbar-item.active .toolbar-label {
  color: #7ec8c8;
  font-weight: 600;
}

/* 画笔色卡选择面板 */
.brush-palette-panel {
  position: fixed;
  bottom: calc(56px + var(--safe-bottom, 0px));
  left: 0;
  right: 0;
  height: 40vh;
  background-color: #fefcfb;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 20px rgba(126, 200, 200, 0.12);
  z-index: 55;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.brush-palette-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid #f5f2ef;
  flex-shrink: 0;
}

.brush-palette-title {
  font-size: 14px;
  font-weight: 600;
  color: #4a4a4a;
}

.brush-palette-close {
  padding: 5px 12px;
  border-radius: 14px;
  background-color: #f8f6f4;
  transition: all 0.25s ease;
}

.brush-palette-close:active {
  background-color: #f0eeeb;
}

.brush-palette-close-text {
  font-size: 12px;
  color: #9ca3af;
}

.brush-palette-scroll {
  flex: 1;
  min-height: 0;
}

.brush-palette-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 14px;
}

.brush-swatch {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  transition: all 0.25s ease;
}

.brush-swatch.active {
  border-color: #7ec8c8;
  box-shadow: 0 0 0 3px rgba(126, 200, 200, 0.2);
}

.brush-swatch-code {
  font-size: 8px;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  line-height: 1;
  pointer-events: none;
}
</style>

<template>
  <view class="page-editor">
    <view class="editor-container">
      <!-- 生成中 Loading -->
      <view v-if="projectStore.isGenerating" class="loading-overlay">
        <text class="loading-text">正在生成图纸...</text>
        <text v-if="generateElapsed > 0" class="loading-sub">{{ generateElapsed }}ms</text>
      </view>

      <!-- 返回按钮（左上角，生成中隐藏） -->
      <view v-if="!projectStore.isGenerating" class="back-btn" @click="handleBack">
        <text class="back-btn-text">‹ 返回</text>
      </view>

      <!-- GridCanvas 组件 -->
      <GridCanvas ref="gridCanvasRef" :cell-data="projectStore.cellData" :grid-width="projectStore.gridWidth"
        :grid-height="projectStore.gridHeight" :selected-cell="projectStore.selectedCell"
        :compare-image="isComparing ? projectStore.sourceImage : ''"
        :brush-mode="brushMode"
        @cell-click="onCellClick"
        @brush-paint="onBrushPaint" />

      <!-- 生成耗时提示 -->
      <view v-if="!projectStore.isGenerating && generateElapsed > 0" class="elapsed-hint">
        <text>生成耗时 {{ generateElapsed }}ms · {{ projectStore.gridWidth }}×{{ projectStore.gridHeight }}</text>
      </view>

      <!-- 操作按钮栏（右侧，生成中 / 选格时隐藏） -->
      <view v-if="!projectStore.selectedCell && !projectStore.isGenerating" class="action-bar">
        <view class="action-btn" @click="showStats = !showStats">
          <text class="action-btn-text">📊 统计</text>
        </view>
        <view class="action-btn" @click="handleExportLong">
          <text class="action-btn-text">💾 导出</text>
        </view>
        <view class="action-btn" @click="handleSaveHistory">
          <text class="action-btn-text">📁 保存</text>
        </view>
      </view>

      <!-- 撤销重做栏（页面中下方，不固定） -->
      <view v-if="!projectStore.selectedCell && !projectStore.isGenerating" class="undo-redo-bar">
        <view class="undo-redo-btn" :class="{ active: isComparing }" @touchstart.prevent="startCompare"
          @touchend.prevent="stopCompare" @mousedown.prevent="startCompare" @mouseup.prevent="stopCompare"
          @mouseleave.prevent="stopCompare">
          <text class="undo-redo-text">👁</text>
        </view>
        <view class="undo-redo-btn" :class="{ disabled: !projectStore.canUndo }" @click="handleUndo">
          <text class="undo-redo-text">↩</text>
        </view>
        <view class="undo-redo-btn" :class="{ disabled: !projectStore.canRedo }" @click="handleRedo">
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
            @color-tap="onStatsColorTap" />
        </scroll-view>
      </view>

      <!-- 导出预览弹窗 -->
      <view v-if="previewDataUrl" class="preview-mask" @click="cancelPreview">
        <view class="preview-dialog" @click.stop>
          <view class="preview-header">
            <text class="preview-title">导出预览</text>
            <view class="preview-close" @click="cancelPreview">
              <text class="preview-close-text">✕</text>
            </view>
          </view>
          <scroll-view scroll-y class="preview-body">
            <image :src="previewDataUrl" mode="widthFix" class="preview-image" />
          </scroll-view>
          <view class="preview-footer">
            <view class="preview-btn cancel" @click="cancelPreview">
              <text class="preview-btn-text">取消</text>
            </view>
            <view class="preview-btn confirm" @click="confirmExport">
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
          <view class="palette-drag-handle" @touchstart.prevent="onDragStart" @touchmove.prevent="onDragMove"
            @touchend="onDragEnd">
            <view class="drag-indicator" />
          </view>
          <view class="clear-selection-btn" @click="clearSelection">
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
        <view class="toolbar-item" :class="{ active: brushMode }" @click="toggleBrushMode">
          <view class="toolbar-icon">🖌️</view>
          <text class="toolbar-label">画笔</text>
        </view>
      </view>
    </view>

    <!-- 退出确认弹窗（未保存时触发） -->
    <view v-if="showBackConfirm" class="confirm-mask" @click.stop>
      <view class="confirm-dialog">
        <text class="confirm-title">是否保存到草稿箱？</text>
        <text class="confirm-msg">当前图纸尚未保存，退出后将无法恢复。</text>
        <view class="confirm-buttons">
          <view class="confirm-btn-discard" @click="doBack">
            <text class="confirm-btn-discard-text">直接退出</text>
          </view>
          <view class="confirm-btn-save" @click="saveAndBack">
            <text class="confirm-btn-save-text">保存并退出</text>
          </view>
        </view>
        <view class="confirm-cancel" @click="cancelBack">
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
import { pixelateImage } from '../../utils/image-processor'
import { getColorList } from '../../utils/color-mapper'
import { exportLongImage, generateLongImagePreview } from '../../utils/export-helper'
import GridCanvas from '../../components/GridCanvas.vue'
import ColorSummary from '../../components/ColorSummary.vue'

const projectStore = useProjectStore()
const configStore = useConfigStore()

const generateElapsed = ref(0)
const gridCanvasRef = ref<InstanceType<typeof GridCanvas> | null>(null)
const showStats = ref(false)
const previewDataUrl = ref('')
const isComparing = ref(false)
let pendingExportOptions: Parameters<typeof exportLongImage>[0] | null = null

// 画笔模式
const brushMode = ref(false)
const brushColor = ref('')
const showBrushPalette = ref(false)

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
  // @ts-ignore 条件编译：H5/App 二选一
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : uni.getSystemInfoSync().windowHeight
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

// #ifndef H5
// 拦截 Android 物理返回键 / iOS 手势返回
onBackPress(() => {
  if (!hasSavedCurrentWork.value && hasContent.value) {
    showBackConfirm.value = true
    return true
  }
  return false
})
// #endif

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
    const { getColorCodeByHex } = await import('../../utils/color-mapper')
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

    // H5 端先预览，非 H5 端直接导出
    // #ifdef H5
    const dataUrl = generateLongImagePreview(options)
    if (dataUrl) {
      previewDataUrl.value = dataUrl
      pendingExportOptions = options
      return
    }
    // #endif

    await exportLongImage(options)
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
  const options = pendingExportOptions
  cancelPreview()
  try {
    await exportLongImage(options)
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
  height: calc(100vh - 56px - var(--safe-bottom, 0px));
  background-color: #fafafa;
  padding-top: var(--safe-top, 0px);
  overflow: hidden;
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
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 30;
}

.loading-text {
  font-size: 16px;
  color: #1a1a1a;
}

.loading-sub {
  font-size: 14px;
  color: #666666;
  margin-top: 8px;
}

.elapsed-hint {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 13px;
  color: #999999;
  pointer-events: none;
}

.color-palette-bar {
  position: fixed;
  bottom: calc(56px + var(--safe-bottom, 0px));
  left: 0;
  right: 0;
  background-color: #ffffff;
  border-top: 1px solid #e8e8e8;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
  padding-bottom: var(--safe-bottom, 0px);
  z-index: 40;
  display: flex;
  flex-direction: column;
}

.palette-header {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  position: relative;
}

.cell-coords {
  font-size: 13px;
  color: #666666;
  font-weight: 500;
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
  background-color: #d0d0d0;
}

.clear-selection-btn {
  margin-left: auto;
  padding: 4px 12px;
  border-radius: 14px;
  background-color: #f0f0f0;
  flex-shrink: 0;
}

.clear-text {
  font-size: 12px;
  color: #666666;
}

.palette-grid-scroll {
  flex: 1;
  min-height: 0;
}

.palette-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px;
}

.palette-swatch {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  position: relative;
}

.palette-swatch.active {
  border-color: #007AFF;
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.3);
}

.swatch-code {
  font-size: 8px;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  line-height: 1;
  pointer-events: none;
}

.swatch-check {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 10px;
  color: #ffffff;
  background-color: #007AFF;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-shadow: none;
}

/* 返回按钮 */
.back-btn {
  position: fixed;
  top: calc(var(--safe-top, 0px) + 8px);
  left: 12px;
  z-index: 36;
  padding: 6px 14px;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.back-btn-text {
  font-size: 14px;
  color: #007AFF;
  font-weight: 600;
}

.action-bar {
  position: fixed;
  top: calc(var(--safe-top, 0px) + 8px);
  /* 左侧为返回按钮留出空间 */
  left: 90px;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
  z-index: 35;
  padding: 0 12px;
}

.action-btn {
  padding: 6px 14px;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.action-btn.disabled {
  opacity: 0.35;
}

.action-btn-text {
  font-size: 12px;
  color: #007AFF;
  font-weight: 500;
}

.undo-redo-bar {
  position: absolute;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 30;
}

.undo-redo-btn {
  padding: 8px 18px;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.undo-redo-btn.disabled {
  opacity: 0.35;
}

.undo-redo-btn.active {
  background-color: #007AFF;
}

.undo-redo-btn.active .undo-redo-text {
  color: #ffffff;
}

.undo-redo-text {
  font-size: 13px;
  color: #007AFF;
  font-weight: 500;
}

.stats-drawer-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 44;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
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
  background-color: #ffffff;
  z-index: 45;
  transform: translateX(100%);
  transition: transform 0.25s ease;
  display: flex;
  flex-direction: column;
  padding-top: var(--safe-top, 0px);
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
}

.stats-drawer.open {
  transform: translateX(0);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.drawer-title {
  font-size: 17px;
  font-weight: 700;
  color: #1a1a1a;
}

.drawer-close {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #f5f5f5;
}

.drawer-close-text {
  font-size: 14px;
  color: #666666;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
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
  border-radius: 16px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 32px;
}

.guide-icon {
  font-size: 56px;
  margin-bottom: 16px;
}

.guide-title {
  font-size: 18px;
  color: #1a1a1a;
  text-align: center;
  margin-bottom: 24px;
}

.guide-btn {
  padding: 12px 40px;
  border-radius: 8px;
  background-color: #007AFF;
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
  color: #666666;
}

.preview-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-dialog {
  width: 90vw;
  max-width: 400px;
  max-height: 80vh;
  background-color: #ffffff;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.preview-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
}

.preview-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #f5f5f5;
}

.preview-close-text {
  font-size: 13px;
  color: #666666;
}

.preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  justify-content: center;
}

.preview-image {
  width: 100%;
  border-radius: 8px;
}

.preview-footer {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.preview-btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-btn.cancel {
  background-color: #f5f5f5;
}

.preview-btn.confirm {
  background-color: #007AFF;
}

.preview-btn-text {
  font-size: 15px;
  color: #666666;
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
  background-color: rgba(0, 0, 0, 0.45);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-dialog {
  width: 80vw;
  max-width: 320px;
  background-color: #ffffff;
  border-radius: 16px;
  padding: 24px 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.confirm-title {
  font-size: 17px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
  text-align: center;
}

.confirm-msg {
  font-size: 14px;
  color: #666666;
  text-align: center;
  margin-bottom: 20px;
  line-height: 1.5;
}

.confirm-buttons {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-bottom: 12px;
}

.confirm-btn-discard {
  flex: 1;
  padding: 11px 0;
  border-radius: 10px;
  background-color: #f2f2f2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-btn-discard-text {
  font-size: 15px;
  color: #666666;
  font-weight: 500;
}

.confirm-btn-save {
  flex: 1;
  padding: 11px 0;
  border-radius: 10px;
  background-color: #007AFF;
  display: flex;
  align-items: center;
  justify-content: center;
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
  color: #007AFF;
}

/* 底部工具条 */
.editor-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(56px + var(--safe-bottom, 0px));
  padding-bottom: var(--safe-bottom, 0px);
  background-color: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  z-index: 50;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.editor-toolbar::-webkit-scrollbar {
  display: none;
}

.toolbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 16px;
  border-radius: 8px;
  flex-shrink: 0;
  transition: background-color 0.15s ease;
}

.toolbar-item:active {
  background-color: rgba(255, 255, 255, 0.12);
}

.toolbar-icon {
  font-size: 20px;
  line-height: 1;
}

.toolbar-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1;
}

.toolbar-item.active {
  background-color: rgba(0, 122, 255, 0.3);
}

/* 画笔色卡选择面板 */
.brush-palette-panel {
  position: fixed;
  bottom: calc(56px + var(--safe-bottom, 0px));
  left: 0;
  right: 0;
  height: 40vh;
  background-color: #ffffff;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
  z-index: 55;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.brush-palette-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.brush-palette-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.brush-palette-close {
  padding: 4px 10px;
  border-radius: 12px;
  background-color: #f0f0f0;
}

.brush-palette-close-text {
  font-size: 12px;
  color: #666666;
}

.brush-palette-scroll {
  flex: 1;
  min-height: 0;
}

.brush-palette-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px;
}

.brush-swatch {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
}

.brush-swatch.active {
  border-color: #007AFF;
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.3);
}

.brush-swatch-code {
  font-size: 8px;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  line-height: 1;
  pointer-events: none;
}
</style>

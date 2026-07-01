<template>
  <view class="page-editor" :style="{ paddingTop: safeTop + 'px', paddingBottom: `calc(56px + ${safeBottom}px)`, '--safe-top': safeTop + 'px', '--safe-bottom': safeBottom + 'px' }">
    <view class="editor-container">
      <!-- 生成中 Loading -->
      <view v-if="projectStore.isGenerating" class="loading-overlay">
        <view class="loading-card">
          <view class="loading-spinner" />
          <text class="loading-text">正在生成图纸...</text>
          <text v-if="generateElapsed > 0" class="loading-sub">{{ generateElapsed }}ms</text>
        </view>
      </view>

      <!-- 操作按钮栏 -->
      <view v-if="!projectStore.selectedCell && !projectStore.isGenerating" class="action-bar">
        <view class="action-btn back-btn" @click="handleBack()">
          <uni-icons type="left" size="16" color="#5a9e9e" />
          <text class="action-btn-text">返回</text>
        </view>
        <view class="action-row">
          <view class="action-btn" @click="showStats = !showStats">
            <uni-icons type="bars" size="15" color="#5a9e9e" />
            <text class="action-btn-text">统计</text>
          </view>
          <view class="action-btn" @click="handleExportLong()">
            <uni-icons type="download" size="15" color="#5a9e9e" />
            <text class="action-btn-text">导出</text>
          </view>
          <view class="action-btn" @click="handleSaveHistory()">
            <uni-icons type="cloud-upload" size="15" color="#5a9e9e" />
            <text class="action-btn-text">保存</text>
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
        <text>{{ generateElapsed }}ms · {{ projectStore.gridWidth }}×{{ projectStore.gridHeight }}</text>
      </view>

      <!-- 撤销重做栏 -->
      <view v-if="!projectStore.selectedCell && !projectStore.isGenerating" class="undo-redo-bar">
        <view class="undo-redo-btn" :class="{ active: isComparing }" @touchstart.prevent="startCompare()"
          @touchend.prevent="stopCompare()">
          <uni-icons type="eye" :size="18" :color="isComparing ? '#ffffff' : '#7ec8c8'" />
        </view>
        <view class="undo-redo-divider" />
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
            <uni-icons type="closeempty" size="16" color="#9ca3af" />
          </view>
        </view>
        <scroll-view scroll-y class="drawer-body">
          <ColorSummary :color-summary="projectStore.colorSummary" :palette-id="projectStore.paletteId"
            @color-tap="onStatsColorTap($event)" />
        </scroll-view>
      </view>

      <!-- 导出预览弹窗 -->
      <view v-if="previewDataUrl" class="preview-mask">
        <view class="preview-overlay" @click="cancelPreview()" />
        <view class="preview-dialog" @click.stop @touchstart.stop @touchend.stop>
          <view class="preview-header">
            <text class="preview-title">导出预览</text>
            <view class="preview-close" @click="cancelPreview()">
              <uni-icons type="closeempty" size="15" color="#9ca3af" />
            </view>
          </view>
          <scroll-view scroll-y class="preview-body">
            <image :src="previewDataUrl" mode="widthFix" class="preview-image" />
          </scroll-view>
          <view class="preview-actions">
            <view class="preview-mirror-btn" :class="{ mirrored: isMirrored }" @click="toggleMirror()">
              <text class="preview-mirror-btn-text">↔ 左右镜像</text>
            </view>
            <view class="preview-guide-btn" :class="{ active: showGuideLines }" @click="toggleGuideLines()">
              <text class="preview-guide-btn-text">⊞ 辅助线</text>
            </view>
          </view>
          <view class="preview-footer">
            <view class="preview-btn cancel" @click="cancelPreview()">
              <text class="preview-btn-text">取消</text>
            </view>
            <view class="preview-btn confirm" @click="confirmExport()">
              <uni-icons type="download" size="15" color="#ffffff" />
              <text class="preview-btn-text-confirm">确认导出</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部色板（选中格子时显示） -->
      <ResizableColorPicker
        v-if="projectStore.selectedCell"
        :palette-id="projectStore.paletteId"
        :selected-hex="getCurrentCellHex()"
        :coords-text="`选中 (${projectStore.selectedCell.x}, ${projectStore.selectedCell.y})`"
        :show-close="true"
        @select="onColorSelect($event)"
        @close="clearSelection()"
      />

      <!-- 画笔色卡选择面板 -->
      <ColorPicker
        v-if="showBrushPalette"
        :palette-id="projectStore.paletteId"
        :selected-hex="brushColor"
        title="选择画笔颜色"
        @select="selectBrushColor($event)"
        @close="showBrushPalette = false"
      />

      <!-- 底部工具条 -->
      <view v-if="!projectStore.isGenerating" class="editor-toolbar">
        <view class="toolbar-item" :class="{ active: brushMode }" @click="toggleBrushMode()">
          <view class="toolbar-icon-wrap" :class="{ active: brushMode }">
            <uni-icons type="compose" :size="20" :color="brushMode ? '#ffffff' : '#9ca3af'" />
          </view>
          <text class="toolbar-label" :class="{ active: brushMode }">画笔</text>
        </view>
      </view>
    </view>

    <!-- 退出确认弹窗 -->
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
import ColorPicker from '../../components/ColorPicker.vue'
import ResizableColorPicker from '../../components/ResizableColorPicker.vue'

const projectStore = useProjectStore()
const configStore = useConfigStore()
const { safeTop, safeBottom } = useSafeArea()

const generateElapsed = ref(0)
const gridCanvasRef = ref<InstanceType<typeof GridCanvas> | null>(null)
const showStats = ref(false)
const previewDataUrl = ref('')
const isMirrored = ref(false)
const showGuideLines = ref(false)
const isComparing = ref(false)
let pendingExportOptions: Parameters<typeof generateLongImagePreview>[0] | null = null

const brushMode = ref(false)
const brushColor = ref('')
const showBrushPalette = ref(false)

function toggleBrushMode() {
  if (brushMode.value) {
    brushMode.value = false
    showBrushPalette.value = false
    projectStore.selectedCell = null
  } else {
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
  gridCanvasRef.value?.paintCell(payload.x, payload.y, brushColor.value)
  projectStore.updateCell(payload.x, payload.y, brushColor.value)
  hasSavedCurrentWork.value = false
}

const hasSavedCurrentWork = ref(true)
const showBackConfirm = ref(false)
const canvasShouldHide = computed(() => showBackConfirm.value || showStats.value || !!previewDataUrl.value)

function startCompare() { isComparing.value = true }
function stopCompare() { isComparing.value = false }

const hasContent = computed(() =>
  projectStore.hasImage || projectStore.cellData.some(row => row.some(hex => !!hex))
)

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

onBackPress(() => {
  if (!hasSavedCurrentWork.value && hasContent.value) {
    showBackConfirm.value = true
    return true
  }
  return false
})

const paletteColors = computed(() => {
  const allowedSeries = configStore.selectedSeries[projectStore.paletteId] || []
  const allColors = getColorList(projectStore.paletteId, allowedSeries.length > 0 ? allowedSeries : undefined)
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

function getCurrentCellHex(): string {
  if (!projectStore.selectedCell) return ''
  const { x, y } = projectStore.selectedCell
  return projectStore.cellData[y]?.[x] || ''
}

function onColorSelect(hex: string) {
  if (!projectStore.selectedCell) return
  const { x, y } = projectStore.selectedCell
  projectStore.updateCell(x, y, hex)
  hasSavedCurrentWork.value = false
}

function clearSelection() { projectStore.selectedCell = null }

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
    const previewPath = await generateLongImagePreview(options) as unknown as string
    if (previewPath) {
      previewDataUrl.value = previewPath
      pendingExportOptions = options
    }
  } catch (err) {
    console.error('导出失败:', err)
  }
}

function cancelPreview() {
  previewDataUrl.value = ''
  pendingExportOptions = null
  isMirrored.value = false
  showGuideLines.value = false
}

async function toggleGuideLines() {
  if (!pendingExportOptions) return
  showGuideLines.value = !showGuideLines.value
  const options = {
    ...pendingExportOptions,
    showGuideLines: showGuideLines.value,
    cellData: isMirrored.value ? pendingExportOptions.cellData.map(row => [...row].reverse()) : pendingExportOptions.cellData,
  }
  try {
    const previewPath = await generateLongImagePreview(options) as unknown as string
    if (previewPath) { previewDataUrl.value = previewPath; pendingExportOptions = { ...options } }
  } catch { showGuideLines.value = !showGuideLines.value }
}

async function toggleMirror() {
  if (!pendingExportOptions) return
  isMirrored.value = !isMirrored.value
  const mirroredCellData = pendingExportOptions.cellData.map(row => [...row].reverse())
  const options = { ...pendingExportOptions, cellData: mirroredCellData }
  try {
    const previewPath = await generateLongImagePreview(options) as unknown as string
    if (previewPath) { previewDataUrl.value = previewPath; pendingExportOptions = { ...options } }
  } catch { isMirrored.value = !isMirrored.value }
}

async function confirmExport() {
  if (!pendingExportOptions) return
  const filePath = previewDataUrl.value
  cancelPreview()
  try {
    if (filePath) {
      await new Promise<void>((resolve, reject) => {
        uni.saveImageToPhotosAlbum({
          filePath,
          success: () => { uni.showToast({ title: '已保存到相册', icon: 'success' }); resolve() },
          fail: (err: any) => {
            if (err.errMsg?.includes('auth deny') || err.errMsg?.includes('auth denied')) {
              uni.showModal({
                title: '提示', content: '需要您授权保存到相册', confirmText: '去授权',
                success: (modalRes: any) => { if (modalRes.confirm) uni.openSetting() },
              })
            } else {
              uni.showToast({ title: '保存失败', icon: 'none' })
            }
            reject(err)
          },
        })
      })
    }
  } catch (err) { console.error('导出失败:', err) }
}

function handleSaveHistory() {
  projectStore.saveToHistory()
  hasSavedCurrentWork.value = true
  uni.showToast({ title: '已保存到草稿箱', icon: 'success' })
}

let hasGeneratedForCurrentImage = false
let lastSourceImage = ''
let currentGenerateId = 0

onShow(() => { setTimeout(() => { checkAndGenerate() }, 100) })

function checkAndGenerate() {
  if (!projectStore.hasImage) { hasGeneratedForCurrentImage = false; lastSourceImage = ''; return }
  const imageChanged = projectStore.sourceImage !== lastSourceImage
  const gridEmpty = isEmptyGrid()
  const userRequested = projectStore.pendingGenerate
  if (userRequested || imageChanged || gridEmpty) {
    lastSourceImage = projectStore.sourceImage
    hasGeneratedForCurrentImage = false
    generateGrid()
  } else if (!hasGeneratedForCurrentImage) {
    hasGeneratedForCurrentImage = true
    hasSavedCurrentWork.value = true
    gridCanvasRef.value?.refresh()
  }
}

function isEmptyGrid(): boolean {
  const data = projectStore.cellData
  if (data.length === 0) return true
  for (const row of data) for (const hex of row) if (hex) return false
  return true
}

async function generateGrid() {
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
      weightedMedianConfig: configStore.weightedMedianConfig,
      adaptiveConfig: configStore.adaptiveConfig,
      gaussianWeightedConfig: configStore.gaussianWeightedConfig,
      edgeAwareConfig: configStore.edgeAwareConfig,
    })
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
    if (myId === currentGenerateId) projectStore.isGenerating = false
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
  min-height: calc(100vh - var(--safe-top, 0px) - var(--safe-bottom, 0px));
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

/* Loading */
.loading-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(254, 252, 251, 0.88);
  z-index: 30;
}

.loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  border-radius: 20px;
  padding: 32px 40px;
  box-shadow: 0 8px 32px rgba(126, 200, 200, 0.15);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(126, 200, 200, 0.2);
  border-top-color: #7ec8c8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 15px;
  color: #5a5a5a;
  font-weight: 500;
}

.loading-sub {
  font-size: 12px;
  color: #9ca3af;
}

.elapsed-hint {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: #c0b8b0;
  pointer-events: none;
  background: rgba(255,255,255,0.7);
  padding: 3px 10px;
  border-radius: 10px;
}

/* 操作按钮栏 */
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
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 14px;
  border-radius: 20px;
  background-color: rgba(255, 253, 251, 0.96);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(126, 200, 200, 0.12);
  transition: all 0.22s ease;
}

.action-btn:active {
  transform: scale(0.95);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
}

.back-btn {
  padding: 8px 16px;
}

.action-btn-text {
  font-size: 12px;
  color: #5a9e9e;
  font-weight: 600;
}

/* 撤销重做栏 */
.undo-redo-bar {
  position: absolute;
  bottom: 72px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  background: rgba(255, 253, 251, 0.96);
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(126, 200, 200, 0.18), 0 0 0 1px rgba(126, 200, 200, 0.1);
  overflow: hidden;
  z-index: 30;
}

.undo-redo-btn {
  padding: 11px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.22s ease;
  min-width: 52px;
}

.undo-redo-btn:active {
  background: rgba(126, 200, 200, 0.1);
}

.undo-redo-btn.disabled {
  opacity: 0.3;
}

.undo-redo-btn.active {
  background: linear-gradient(135deg, #7ec8c8, #5ab0b0);
}

.undo-redo-divider {
  width: 1px;
  height: 20px;
  background: #ede9e4;
  flex-shrink: 0;
}

.undo-redo-text {
  font-size: 17px;
  color: #7ec8c8;
  font-weight: 600;
  line-height: 1;
}

/* 统计抽屉 */
.stats-drawer-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
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
  top: 0; right: 0; bottom: 0;
  width: 280px;
  background-color: #fefcfb;
  z-index: 45;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  padding-top: var(--safe-top, 0px);
  box-shadow: -6px 0 24px rgba(126, 200, 200, 0.14);
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
  background-color: #f5f2ef;
  transition: all 0.22s ease;
}

.drawer-close:active { background-color: #ede9e4; }

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
}

/* 导出预览弹窗 */
.preview-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.32);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 0;
}

.preview-dialog {
  position: relative;
  z-index: 1;
  width: 90vw;
  max-width: 400px;
  max-height: 80vh;
  background-color: #ffffff;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.14);
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
  background-color: #f5f2ef;
  transition: all 0.22s ease;
}

.preview-close:active { background-color: #ede9e4; }

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

.preview-actions {
  padding: 10px 18px;
  display: flex;
  justify-content: center;
  gap: 12px;
}

.preview-mirror-btn, .preview-guide-btn {
  padding: 8px 18px;
  border-radius: 16px;
  background-color: #f5f2ef;
  border: 1.5px solid transparent;
  transition: all 0.22s ease;
}

.preview-mirror-btn.mirrored {
  background-color: rgba(126, 200, 200, 0.12);
  border-color: #7ec8c8;
}

.preview-guide-btn.active {
  background-color: rgba(255, 182, 185, 0.12);
  border-color: #ffb6b9;
}

.preview-mirror-btn-text, .preview-guide-btn-text {
  font-size: 13px;
  color: #5a5a5a;
  font-weight: 500;
}

.preview-mirror-btn.mirrored .preview-mirror-btn-text { color: #5a9e9e; }
.preview-guide-btn.active .preview-guide-btn-text { color: #c06065; }

.preview-footer {
  display: flex;
  gap: 10px;
  padding: 14px 18px;
  border-top: 1px solid #f5f2ef;
  flex-shrink: 0;
}

.preview-btn {
  flex: 1;
  padding: 12px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.22s ease;
}

.preview-btn.cancel { background-color: #f5f2ef; }
.preview-btn.confirm {
  background: linear-gradient(135deg, #7ec8c8 0%, #5ab0b0 100%);
  box-shadow: 0 4px 14px rgba(126, 200, 200, 0.3);
}

.preview-btn-text { font-size: 15px; color: #9ca3af; font-weight: 500; }
.preview-btn-text-confirm { font-size: 15px; color: #ffffff; font-weight: 600; }

/* 退出确认弹窗 */
.confirm-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.28);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-dialog {
  width: 80vw;
  max-width: 320px;
  background-color: #ffffff;
  border-radius: 24px;
  padding: 28px 22px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
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
  gap: 10px;
  width: 100%;
  margin-bottom: 14px;
}

.confirm-btn-discard {
  flex: 1;
  padding: 12px 0;
  border-radius: 14px;
  background-color: #f5f2ef;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.22s ease;
}

.confirm-btn-discard-text { font-size: 15px; color: #9ca3af; font-weight: 500; }

.confirm-btn-save {
  flex: 1;
  padding: 12px 0;
  border-radius: 14px;
  background: linear-gradient(135deg, #7ec8c8 0%, #5ab0b0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(126, 200, 200, 0.3);
}

.confirm-btn-save-text { font-size: 15px; color: #ffffff; font-weight: 600; }

.confirm-cancel { padding: 8px 24px; }
.confirm-cancel-text { font-size: 14px; color: #7ec8c8; font-weight: 500; }

/* 底部工具条 */
.editor-toolbar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: calc(56px + var(--safe-bottom, 0px));
  padding-bottom: var(--safe-bottom, 0px);
  background-color: rgba(255, 253, 251, 0.96);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(230, 225, 220, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  box-shadow: 0 -4px 20px rgba(126, 200, 200, 0.1);
}

.toolbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 24px;
  border-radius: 16px;
  transition: all 0.22s ease;
}

.toolbar-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f2ef;
  transition: all 0.22s ease;
}

.toolbar-icon-wrap.active {
  background: linear-gradient(135deg, #7ec8c8, #5ab0b0);
  box-shadow: 0 4px 14px rgba(126, 200, 200, 0.4);
}

.toolbar-label {
  font-size: 10px;
  color: #9ca3af;
  font-weight: 500;
  line-height: 1;
}

.toolbar-label.active {
  color: #7ec8c8;
  font-weight: 700;
}
</style>

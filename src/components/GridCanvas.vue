<template>
  <view
    class="grid-canvas-viewport"
    id="canvasViewport"
    @touchstart.stop="onViewportTouchStart"
    @touchmove.stop.prevent="onViewportTouchMove"
    @touchend.stop="onViewportTouchEnd"
  >
    <view
      class="grid-canvas-wrapper"
      id="gridCanvasWrapper"
      :style="{
        transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
        transformOrigin: 'center center',
        transition: isAnimating ? 'transform 0.2s ease-out' : 'none',
      }"
    >
      <canvas
        canvas-id="gridCanvas"
        id="gridCanvas"
        class="grid-canvas"
        :style="{ width: displayWidth + 'px', height: displayHeight + 'px' }"
        @click.stop="handleCanvasClick"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'

interface Props {
  cellData: string[][]
  gridWidth: number
  gridHeight: number
  selectedCell?: { x: number; y: number } | null
  /** 对照原图 URL，传入后在 Canvas 上方显示半透明覆盖 */
  compareImage?: string
  /** 画笔模式：触摸移动时发射 brushPaint 事件而非缩放/平移 */
  brushMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedCell: null,
  compareImage: '',
  brushMode: false,
})

const emit = defineEmits<{
  (e: 'cellClick', payload: { x: number; y: number }): void
  (e: 'brushPaint', payload: { x: number; y: number }): void
}>()

const displayWidth = ref(300)
const displayHeight = ref(300)

// 缩放平移状态
const scale = ref(1)
const panX = ref(0)
const panY = ref(0)
const MIN_SCALE = 0.2
// 动态最大缩放：保证最大放大时每个格子至少 24px 宽，便于查看和点击
const maxScale = computed(() => {
  if (!displayWidth.value || !props.gridWidth) return 8
  const cellSize = displayWidth.value / props.gridWidth
  return Math.max(8, Math.ceil(24 / cellSize))
})

// 触摸手势追踪
let touchStartX = 0
let touchStartY = 0
let touchStartPanX = 0
let touchStartPanY = 0
let initialPinchDistance = 0
let initialScale = 1
let isPinching = false
let isDragging = false
let lastTapTime = 0
const isAnimating = ref(false)

// 平移边界约束：确保画布始终有 MIN_VISIBLE px 留在视口内
const MIN_VISIBLE = 80
function clampPan() {
  const scaledW = displayWidth.value * scale.value
  const scaledH = displayHeight.value * scale.value
  if (scaledW > MIN_VISIBLE * 2) {
    const limitX = scaledW / 2 - MIN_VISIBLE
    panX.value = Math.max(-limitX, Math.min(limitX, panX.value))
  }
  if (scaledH > MIN_VISIBLE * 2) {
    const limitY = scaledH / 2 - MIN_VISIBLE
    panY.value = Math.max(-limitY, Math.min(limitY, panY.value))
  }
}

// 根据屏幕宽度自适应计算 Canvas 显示尺寸
function updateDisplaySize() {
  const gridWidth = props.gridWidth
  const gridHeight = props.gridHeight

  // #ifdef H5
  const containerWidth = window.innerWidth - 32
  // #endif

  // #ifndef H5
  const sysInfo = uni.getSystemInfoSync()
  const containerWidth = sysInfo.windowWidth - 32
  // #endif

  // cellSize 最小为 1，避免大尺寸网格时算出 0 导致渲染崩溃
  const cellSize = Math.max(1, Math.floor(containerWidth / gridWidth))
  displayWidth.value = cellSize * gridWidth
  displayHeight.value = cellSize * gridHeight
}

// 监听数据变化重新渲染
watch(
  () => [props.cellData, props.selectedCell],
  () => {
    nextTick(() => renderGrid())
  },
  { deep: true }
)

onMounted(() => {
  updateDisplaySize()
  nextTick(() => renderGrid())

  // H5 端：在 viewport 原生 DOM 上绑定滚轮和触摸事件
  if (typeof document !== 'undefined') {
    const viewport = document.getElementById('canvasViewport')
    if (viewport) {
      // 鼠标滚轮缩放
      viewport.addEventListener('wheel', onWheelEvent, { passive: false })
      // 鼠标拖拽平移（桌面端）
      viewport.addEventListener('mousedown', onMouseDown)
      viewport.addEventListener('dblclick', onDoubleClick)
    }
  }
})

onShow(() => {
  setTimeout(() => {
    updateDisplaySize()
    nextTick(() => renderGrid())
  }, 100)
})

// 暴露方法供父组件调用
defineExpose({
  refresh: () => {
    updateDisplaySize()
    nextTick(() => renderGrid())
  },
  resetView: () => {
    scale.value = 1
    panX.value = 0
    panY.value = 0
  },
})

// === 缩放手势处理 ===
function onViewportTouchStart(event: any) {
  const touches = event.touches || []

  // 画笔模式：单指触摸开始绘制
  if (props.brushMode && touches.length === 1) {
    isDragging = false
    isPinching = false
    emitBrushAt(touches[0])
    return
  }

  if (touches.length === 2) {
    isPinching = true
    isDragging = false
    initialPinchDistance = getPinchDistance(touches)
    initialScale = scale.value
  } else if (touches.length === 1) {
    isDragging = true
    isPinching = false
    touchStartX = touches[0].clientX ?? touches[0].x ?? 0
    touchStartY = touches[0].clientY ?? touches[0].y ?? 0
    touchStartPanX = panX.value
    touchStartPanY = panY.value

    // 双击检测
    const now = Date.now()
    if (now - lastTapTime < 300) {
      isAnimating.value = true
      // 双击在"复位"与"放大到半最大倍率"之间切换
      scale.value = scale.value > 1 ? 1 : Math.round(maxScale.value / 2)
      panX.value = 0
      panY.value = 0
      setTimeout(() => { isAnimating.value = false }, 200)
    }
    lastTapTime = now
  }
}

/** 根据触摸坐标计算格子并发射 brushPaint 事件 */
function emitBrushAt(touch: any) {
  const wrapper = document.getElementById('gridCanvasWrapper')
  if (!wrapper) return
  const rect = wrapper.getBoundingClientRect()
  const offsetX = ((touch.clientX ?? touch.x ?? 0) - rect.left) / scale.value
  const offsetY = ((touch.clientY ?? touch.y ?? 0) - rect.top) / scale.value
  const cellSize = displayWidth.value / props.gridWidth
  const gridX = Math.floor(offsetX / cellSize)
  const gridY = Math.floor(offsetY / cellSize)
  if (gridX >= 0 && gridX < props.gridWidth && gridY >= 0 && gridY < props.gridHeight) {
    emit('brushPaint', { x: gridX, y: gridY })
  }
}

function onViewportTouchMove(event: any) {
  const touches = event.touches || []

  // 画笔模式：单指移动时持续绘制
  if (props.brushMode && touches.length === 1) {
    emitBrushAt(touches[0])
    return
  }

  if (isPinching && touches.length === 2) {
    const currentDistance = getPinchDistance(touches)
    scale.value = Math.min(maxScale.value, Math.max(MIN_SCALE, initialScale * (currentDistance / initialPinchDistance)))
    clampPan()
  } else if (isDragging && touches.length === 1) {
    const currentX = touches[0].clientX ?? touches[0].x ?? 0
    const currentY = touches[0].clientY ?? touches[0].y ?? 0
    panX.value = touchStartPanX + (currentX - touchStartX)
    panY.value = touchStartPanY + (currentY - touchStartY)
    clampPan()
  }
}

function onViewportTouchEnd() {
  isPinching = false
  isDragging = false
}

function getPinchDistance(touches: any[]): number {
  const dx = (touches[0].clientX ?? touches[0].x ?? 0) - (touches[1].clientX ?? touches[1].x ?? 0)
  const dy = (touches[0].clientY ?? touches[0].y ?? 0) - (touches[1].clientY ?? touches[1].y ?? 0)
  return Math.sqrt(dx * dx + dy * dy)
}

// H5 端鼠标滚轮缩放（以鼠标位置为中心，乘法步长保证各缩放层级手感一致）
function onWheelEvent(e: WheelEvent) {
  e.preventDefault()
  e.stopPropagation()

  const oldScale = scale.value
  const factor = e.deltaY > 0 ? 1 / 1.15 : 1.15
  const newScale = Math.min(maxScale.value, Math.max(MIN_SCALE, oldScale * factor))
  if (newScale === oldScale) return

  // 计算鼠标相对于 viewport 中心的偏移，使该点在缩放后保持不动
  const viewport = document.getElementById('canvasViewport')
  if (viewport) {
    const rect = viewport.getBoundingClientRect()
    const cx = e.clientX - rect.left - rect.width / 2
    const cy = e.clientY - rect.top - rect.height / 2
    const ratio = newScale / oldScale
    panX.value = cx + (panX.value - cx) * ratio
    panY.value = cy + (panY.value - cy) * ratio
  }

  scale.value = newScale
  clampPan()
}

// H5 端双击切换缩放
function onDoubleClick() {
  isAnimating.value = true
  if (scale.value > 1) {
    scale.value = 1
    panX.value = 0
    panY.value = 0
  } else {
    scale.value = Math.round(maxScale.value / 2)
  }
  clampPan()
  setTimeout(() => { isAnimating.value = false }, 200)
}

// H5 端鼠标拖拽平移
let mouseDownX = 0
let mouseDownY = 0
let mouseDownPanX = 0
let mouseDownPanY = 0
let isMouseDragging = false

function onMouseDown(e: MouseEvent) {
  // 仅左键拖拽
  if (e.button !== 0) return
  isMouseDragging = true
  mouseDownX = e.clientX
  mouseDownY = e.clientY
  mouseDownPanX = panX.value
  mouseDownPanY = panY.value

  const onMouseMove = (moveEvent: MouseEvent) => {
    if (!isMouseDragging) return
    panX.value = mouseDownPanX + (moveEvent.clientX - mouseDownX)
    panY.value = mouseDownPanY + (moveEvent.clientY - mouseDownY)
  }

  const onMouseUp = () => {
    isMouseDragging = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function handleCanvasClick(event: any) {
  // 如果正在拖拽或缩放，不触发点击
  if (isDragging && (Math.abs(panX.value - touchStartPanX) > 5 || Math.abs(panY.value - touchStartPanY) > 5)) return

  const cellSize = displayWidth.value / props.gridWidth
  let offsetX = 0
  let offsetY = 0

  // #ifdef H5
  const target = event.target || event.currentTarget
  if (target && typeof target.getBoundingClientRect === 'function') {
    const rect = target.getBoundingClientRect()
    offsetX = ((event.clientX || event.pageX || 0) - rect.left) / scale.value
    offsetY = ((event.clientY || event.pageY || 0) - rect.top) / scale.value
  } else {
    offsetX = (event.detail?.x ?? event.offsetX ?? 0) / scale.value
    offsetY = (event.detail?.y ?? event.offsetY ?? 0) / scale.value
  }
  // #endif

  // #ifndef H5
  offsetX = (event.detail?.x ?? 0) / scale.value
  offsetY = (event.detail?.y ?? 0) / scale.value
  // #endif

  const gridX = Math.floor(offsetX / cellSize)
  const gridY = Math.floor(offsetY / cellSize)

  if (gridX >= 0 && gridX < props.gridWidth && gridY >= 0 && gridY < props.gridHeight) {
    emit('cellClick', { x: gridX, y: gridY })
  }
}

function renderGrid() {
  const gridWidth = props.gridWidth
  const gridHeight = props.gridHeight
  const dispW = displayWidth.value
  const dispH = displayHeight.value
  const cellSize = dispW / gridWidth

  if (gridWidth === 0 || gridHeight === 0 || dispW === 0) return

  // #ifdef H5
  renderH5(gridWidth, gridHeight, cellSize, dispW, dispH)
  // #endif

  // #ifndef H5
  renderApp(gridWidth, gridHeight, cellSize, dispW, dispH)
  // #endif
}

// H5 端：动态创建原生 canvas，绕过 UniApp canvas 分辨率限制
function renderH5(gridWidth: number, gridHeight: number, cellSize: number, dispW: number, dispH: number) {
  const wrapper = document.getElementById('gridCanvasWrapper')
  if (!wrapper) return

  // 移除旧 canvas（保留覆盖层 img）
  const existingOverlay = wrapper.querySelector('.compare-overlay') as HTMLImageElement | null
  while (wrapper.firstChild) {
    wrapper.removeChild(wrapper.firstChild)
  }

  const nativeCanvas = document.createElement('canvas')
  nativeCanvas.id = 'gridCanvas'
  nativeCanvas.className = 'grid-canvas'
  nativeCanvas.style.width = dispW + 'px'
  nativeCanvas.style.height = dispH + 'px'
  nativeCanvas.style.cursor = 'pointer'
  nativeCanvas.addEventListener('click', (e: MouseEvent) => {
    handleNativeCanvasClick(e, nativeCanvas)
  })
  wrapper.appendChild(nativeCanvas)

  // 重新追加覆盖层（如果有）
  if (existingOverlay) {
    existingOverlay.style.width = dispW + 'px'
    existingOverlay.style.height = dispH + 'px'
    wrapper.appendChild(existingOverlay)
  } else if (props.compareImage) {
    appendCompareOverlay(wrapper, props.compareImage, dispW, dispH)
  }

  const dpr = window.devicePixelRatio || 1
  // 限制内部分辨率，避免大尺寸网格超出浏览器 Canvas 像素上限（约 16M 像素）
  const MAX_CANVAS_PIXELS = 4096 * 4096
  const rawWidth = dispW * dpr
  const rawHeight = dispH * dpr
  const totalPixels = rawWidth * rawHeight
  const effectiveDpr = totalPixels > MAX_CANVAS_PIXELS
    ? Math.sqrt(MAX_CANVAS_PIXELS / (dispW * dispH))
    : dpr
  nativeCanvas.width = Math.round(dispW * effectiveDpr)
  nativeCanvas.height = Math.round(dispH * effectiveDpr)
  const ctx = nativeCanvas.getContext('2d')!
  ctx.scale(effectiveDpr, effectiveDpr)

  drawContent(ctx, gridWidth, gridHeight, cellSize, dispW, dispH)
}

// H5 端原生 canvas 点击处理
function handleNativeCanvasClick(event: MouseEvent, canvasEl: HTMLCanvasElement) {
  if (isDragging && (Math.abs(panX.value - touchStartPanX) > 5 || Math.abs(panY.value - touchStartPanY) > 5)) return

  const rect = canvasEl.getBoundingClientRect()
  const offsetX = (event.clientX - rect.left) / scale.value
  const offsetY = (event.clientY - rect.top) / scale.value
  const cellSize = displayWidth.value / props.gridWidth

  const gridX = Math.floor(offsetX / cellSize)
  const gridY = Math.floor(offsetY / cellSize)

  if (gridX >= 0 && gridX < props.gridWidth && gridY >= 0 && gridY < props.gridHeight) {
    emit('cellClick', { x: gridX, y: gridY })
  }
}

/** 用原生 DOM 创建/更新对照覆盖层，避免与 Vue 虚拟 DOM 冲突 */
function appendCompareOverlay(wrapper: HTMLElement, src: string, width: number, height: number) {
  // 移除已有覆盖层
  const existing = wrapper.querySelector('.compare-overlay')
  if (existing) existing.remove()

  if (!src) return

  const img = document.createElement('img')
  img.className = 'compare-overlay'
  img.src = src
  img.style.width = width + 'px'
  img.style.height = height + 'px'
  img.style.position = 'absolute'
  img.style.top = '0'
  img.style.left = '0'
  img.style.opacity = '0.6'
  img.style.pointerEvents = 'none'
  img.style.borderRadius = '4px'
  img.style.objectFit = 'cover'
  wrapper.appendChild(img)
}

// 监听 compareImage prop 变化，动态更新覆盖层
watch(() => props.compareImage, (newSrc) => {
  // #ifdef H5
  const wrapper = document.getElementById('gridCanvasWrapper')
  if (!wrapper) return
  appendCompareOverlay(wrapper, newSrc, displayWidth.value, displayHeight.value)
  // #endif
})

// App/小程序端：分批绘制，避免大尺寸网格一次性发送过多 IPC 命令导致崩溃
async function renderApp(gridWidth: number, gridHeight: number, cellSize: number, dispW: number, dispH: number) {
  const ctx = uni.createCanvasContext('gridCanvas')
  if (!ctx) return

  // 每批最多 10 行，限制单次 draw() 的命令数量
  const BATCH_SIZE = 10
  for (let batchStart = 0; batchStart < gridHeight; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, gridHeight)
    for (let y = batchStart; y < batchEnd; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const hex = props.cellData[y]?.[x]
        ctx.setFillStyle(hex || '#FAFAFA')
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
      }
    }
    // reserve=true 保留上一批已绘内容，callback 等待本批渲染完成再继续
    await new Promise<void>((resolve) => ctx.draw(batchStart > 0, () => resolve()))
  }

  // cellSize < 2 时格子只有 1px，网格线会覆盖整个格子，跳过
  if (cellSize >= 2) {
    ctx.setStrokeStyle('#E8E8E8')
    ctx.setLineWidth(0.5)
    drawGridLines(ctx, gridWidth, gridHeight, cellSize, dispW, dispH)
  }

  if (props.selectedCell) {
    ctx.setStrokeStyle('#007AFF')
    ctx.setLineWidth(2)
    ctx.strokeRect(
      props.selectedCell.x * cellSize,
      props.selectedCell.y * cellSize,
      cellSize,
      cellSize
    )
  }

  if (cellSize >= 2 || props.selectedCell) {
    await new Promise<void>((resolve) => ctx.draw(true, () => resolve()))
  }
}

// H5 端通用绘制内容（原生 CanvasRenderingContext2D）
function drawContent(
  ctx: CanvasRenderingContext2D,
  gridWidth: number,
  gridHeight: number,
  cellSize: number,
  dispW: number,
  dispH: number
) {
  // Pass 1: 色块
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const hex = props.cellData[y]?.[x]
      ctx.fillStyle = hex || '#FAFAFA'
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
    }
  }

  // Pass 2: 网格线（cellSize < 2 时格子只有 1px，网格线会覆盖整个格子，跳过）
  if (cellSize >= 2) {
    ctx.strokeStyle = '#E8E8E8'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let x = 0; x <= gridWidth; x++) {
      ctx.moveTo(x * cellSize, 0)
      ctx.lineTo(x * cellSize, dispH)
    }
    for (let y = 0; y <= gridHeight; y++) {
      ctx.moveTo(0, y * cellSize)
      ctx.lineTo(dispW, y * cellSize)
    }
    ctx.stroke()
  }

  // Pass 3: 选中高亮
  if (props.selectedCell) {
    ctx.strokeStyle = '#007AFF'
    ctx.lineWidth = 2
    ctx.strokeRect(
      props.selectedCell.x * cellSize,
      props.selectedCell.y * cellSize,
      cellSize,
      cellSize
    )
  }
}

// App 端网格线绘制辅助（合并为单次 stroke，减少 IPC 命令数）
function drawGridLines(
  ctx: any,
  gridWidth: number,
  gridHeight: number,
  cellSize: number,
  dispW: number,
  dispH: number
) {
  ctx.beginPath()
  for (let x = 0; x <= gridWidth; x++) {
    ctx.moveTo(x * cellSize, 0)
    ctx.lineTo(x * cellSize, dispH)
  }
  for (let y = 0; y <= gridHeight; y++) {
    ctx.moveTo(0, y * cellSize)
    ctx.lineTo(dispW, y * cellSize)
  }
  ctx.stroke()
}
</script>

<style scoped>
.grid-canvas-viewport {
  width: 100%;
  flex: 1;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  touch-action: none;
}

.grid-canvas-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  will-change: transform;
}

.grid-canvas {
  background-color: #ffffff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.compare-overlay {
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0.6;
  pointer-events: none;
  border-radius: 4px;
}
</style>

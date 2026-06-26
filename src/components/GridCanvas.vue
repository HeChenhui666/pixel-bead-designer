<template>
  <view class="grid-canvas-viewport" id="canvasViewport">
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
        v-if="!canvasHidden"
        type="2d"
        id="gridCanvas"
        class="grid-canvas"
        :style="{ width: displayWidth + 'px', height: displayHeight + 'px' }"
        @touchstart="onCanvasTouchStart($event)"
        @touchmove.stop.prevent="onCanvasTouchMove($event)"
        @touchend="onCanvasTouchEnd($event)"
      />
      <!-- canvasHidden 时用占位 view 维持布局，避免弹窗关闭后 canvas 重新创建需重绘 -->
      <view
        v-if="canvasHidden"
        class="grid-canvas grid-canvas-placeholder"
        :style="{ width: displayWidth + 'px', height: displayHeight + 'px' }"
      />
      <image
        v-if="compareImage"
        :src="compareImage"
        mode="aspectFill"
        class="compare-overlay"
        :style="{ width: displayWidth + 'px', height: displayHeight + 'px' }"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, getCurrentInstance } from 'vue'
import { onShow } from '@dcloudio/uni-app'

const instance = getCurrentInstance()

// 画笔增量绘制计数器：paintCell 先绘制再让 updateCell 触发 watch，watch 见到计数 > 0 则跳过全量重绘
let pendingIncrementalPaints = 0

interface Props {
  cellData: string[][]
  gridWidth: number
  gridHeight: number
  selectedCell?: { x: number; y: number } | null
  /** 对照原图 URL，传入后在 Canvas 上方显示半透明覆盖 */
  compareImage?: string
  /** 画笔模式：触摸移动时发射 brushPaint 事件而非缩放/平移 */
  brushMode?: boolean
  /** 弹窗等覆盖层显示时隐藏 canvas，解决原生组件层级遮挡 */
  canvasHidden?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedCell: null,
  compareImage: '',
  brushMode: false,
  canvasHidden: false,
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

// 缓存 viewport 的屏幕坐标，用于画笔触摸坐标换算
let cachedViewportRect = { left: 0, top: 0, width: 0, height: 0 }

function updateViewportRect() {
  uni.createSelectorQuery()
    .in(instance?.proxy)
    .select('#canvasViewport')
    .boundingClientRect((data: any) => {
      if (data) cachedViewportRect = data
    })
    .exec()
}

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
  const windowInfo = uni.getWindowInfo()
  const containerWidth = windowInfo.windowWidth - 2
  // cellSize 最小为 1，避免大尺寸网格时算出 0 导致渲染崩溃
  const cellSize = Math.max(1, Math.floor(containerWidth / gridWidth))
  displayWidth.value = cellSize * gridWidth
  displayHeight.value = cellSize * gridHeight
  // 尺寸变化时重置缓存的 Canvas context，确保下次渲染时重新设置分辨率
  mpCanvasCtx = null
}

// 监听 canvasHidden 变化：隐藏后恢复显示时，canvas 元素被重建，需重置缓存并重绘
watch(() => props.canvasHidden, (newVal, oldVal) => {
  if (oldVal && !newVal) {
    mpCanvasCtx = null
    nextTick(() => renderGrid())
  }
})

// 监听数据变化重新渲染；画笔增量绘制时跳过全量重绘
watch(
  () => [props.cellData, props.selectedCell],
  (newVal, oldVal) => {
    // cellData 整体被替换（undo/redo/重新生成）时必须全量重绘
    if (newVal[0] !== oldVal[0]) {
      pendingIncrementalPaints = 0
      nextTick(() => renderGrid())
      return
    }
    // cellData 原地修改（画笔涂格）：paintCell 已增量绘制，跳过全量重绘
    if (pendingIncrementalPaints > 0) {
      pendingIncrementalPaints = Math.max(0, pendingIncrementalPaints - 1)
      return
    }
    nextTick(() => renderGrid())
  },
  { deep: true }
)

onMounted(() => {
  updateDisplaySize()
  updateViewportRect()
  nextTick(() => renderGrid())
})

onShow(() => {
  setTimeout(() => {
    updateDisplaySize()
    updateViewportRect()
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
  paintCell: (x: number, y: number, hex: string) => {
    pendingIncrementalPaints++
    renderSingleCell(x, y, hex)
  },
})

// === canvas 触摸事件处理 ===
// 小程序端 canvas 是原生组件，触摸事件必须绑在 canvas 自身上才能触发
function onCanvasTouchStart(event: any) {
  const touches = event.touches || []
  // 画笔模式：单指触摸开始绘制
  if (props.brushMode && touches.length === 1) {
    isDragging = false
    isPinching = false
    emitBrushAt(touches[0])
    return
  }
  // 画笔模式下双指仍允许缩放，需重置拖拽状态
  if (props.brushMode && touches.length === 2) {
    isDragging = false
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
    // 双击检测：在"复位"与"放大到半最大倍率"之间切换
    const now = Date.now()
    if (now - lastTapTime < 300) {
      isAnimating.value = true
      scale.value = scale.value > 1 ? 1 : Math.round(maxScale.value / 2)
      panX.value = 0
      panY.value = 0
      setTimeout(() => { isAnimating.value = false }, 200)
    }
    lastTapTime = now
  }
}

function onCanvasTouchMove(event: any) {
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

function onCanvasTouchEnd(event: any) {
  // 检测是否为"点击"（单指触摸且无明显移动），在 touchend 时发射 cellClick
  if (isDragging && !isPinching) {
    const movedX = Math.abs(panX.value - touchStartPanX)
    const movedY = Math.abs(panY.value - touchStartPanY)
    if (movedX < 5 && movedY < 5) {
      const changedTouch = event.changedTouches?.[0]
      if (changedTouch) {
        const touchX = changedTouch.clientX ?? changedTouch.x ?? 0
        const touchY = changedTouch.clientY ?? changedTouch.y ?? 0
        const vr = cachedViewportRect
        const canvasLeft = vr.left + vr.width / 2 + panX.value - displayWidth.value * scale.value / 2
        const canvasTop = vr.top + vr.height / 2 + panY.value - displayHeight.value * scale.value / 2
        const localX = (touchX - canvasLeft) / scale.value
        const localY = (touchY - canvasTop) / scale.value
        const cellSize = displayWidth.value / props.gridWidth
        const gridX = Math.floor(localX / cellSize)
        const gridY = Math.floor(localY / cellSize)
        if (gridX >= 0 && gridX < props.gridWidth && gridY >= 0 && gridY < props.gridHeight) {
          emit('cellClick', { x: gridX, y: gridY })
        }
      }
    }
  }
  isPinching = false
  isDragging = false
}

/** 根据 canvas 上的触摸坐标计算格子并发射 brushPaint 事件 */
function emitBrushAt(touch: any) {
  const touchX = touch.clientX ?? touch.x ?? 0
  const touchY = touch.clientY ?? touch.y ?? 0
  // canvas touch 的 clientX/clientY 是窗口坐标
  // 需要减去 canvas 在屏幕上的实际位置，再除以 scale 得到逻辑坐标
  const vr = cachedViewportRect
  const canvasLeft = vr.left + vr.width / 2 + panX.value - displayWidth.value * scale.value / 2
  const canvasTop = vr.top + vr.height / 2 + panY.value - displayHeight.value * scale.value / 2
  const localX = (touchX - canvasLeft) / scale.value
  const localY = (touchY - canvasTop) / scale.value
  const cellSize = displayWidth.value / props.gridWidth
  const gridX = Math.floor(localX / cellSize)
  const gridY = Math.floor(localY / cellSize)
  if (gridX >= 0 && gridX < props.gridWidth && gridY >= 0 && gridY < props.gridHeight) {
    emit('brushPaint', { x: gridX, y: gridY })
  }
}

function getPinchDistance(touches: any[]): number {
  const dx = (touches[0].clientX ?? touches[0].x ?? 0) - (touches[1].clientX ?? touches[1].x ?? 0)
  const dy = (touches[0].clientY ?? touches[0].y ?? 0) - (touches[1].clientY ?? touches[1].y ?? 0)
  return Math.sqrt(dx * dx + dy * dy)
}

// === Canvas 2D 渲染 ===

// 缓存 Canvas 2D context，避免每次渲染都重新查询
let mpCanvasCtx: CanvasRenderingContext2D | null = null

/** 获取 Canvas 2D 节点和 context */
async function getCanvasContext(): Promise<CanvasRenderingContext2D | null> {
  if (mpCanvasCtx) return mpCanvasCtx

  return new Promise((resolve) => {
    const query = uni.createSelectorQuery().in(instance?.proxy)
    query.select('#gridCanvas')
      .node()
      .exec((res: any[]) => {
        if (!res || !res[0] || !res[0].node) {
          console.warn('[GridCanvas] getCanvasContext: node not found', res)
          resolve(null)
          return
        }
        const canvasNode = res[0].node
        const dpr = uni.getWindowInfo().pixelRatio || 1
        canvasNode.width = displayWidth.value * dpr
        canvasNode.height = displayHeight.value * dpr
        const ctx = canvasNode.getContext('2d') as CanvasRenderingContext2D
        ctx.scale(dpr, dpr)
        mpCanvasCtx = ctx
        resolve(ctx)
      })
  })
}

function renderGrid() {
  const gridWidth = props.gridWidth
  const gridHeight = props.gridHeight
  const dispW = displayWidth.value
  const dispH = displayHeight.value
  const cellSize = dispW / gridWidth
  if (gridWidth === 0 || gridHeight === 0 || dispW === 0) return
  renderCanvas(gridWidth, gridHeight, cellSize, dispW, dispH)
}

async function renderCanvas(gridWidth: number, gridHeight: number, cellSize: number, dispW: number, dispH: number) {
  const ctx = await getCanvasContext()
  if (!ctx) return

  ctx.clearRect(0, 0, dispW, dispH)

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const hex = props.cellData[y]?.[x]
      ctx.fillStyle = hex || '#FAFAFA'
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
    }
  }

  // cellSize < 2 时格子只有 1px，网格线会覆盖整个格子，跳过
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

  if (props.selectedCell) {
    ctx.strokeStyle = '#7ec8c8'
    ctx.lineWidth = 2
    ctx.strokeRect(
      props.selectedCell.x * cellSize,
      props.selectedCell.y * cellSize,
      cellSize,
      cellSize
    )
  }
}

// 监听 compareImage prop 变化时触发重渲染（覆盖层通过 v-if 响应式控制）
watch(() => props.compareImage, () => {
  nextTick(() => renderGrid())
})

// 增量单格绘制：使用缓存的 Canvas 2D context 直接叠绘，避免全量重绘闪烁
function renderSingleCell(x: number, y: number, hex: string) {
  if (!mpCanvasCtx) return
  const cellSize = displayWidth.value / props.gridWidth
  mpCanvasCtx.fillStyle = hex || '#FAFAFA'
  mpCanvasCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
  if (cellSize >= 2) {
    mpCanvasCtx.strokeStyle = '#E8E8E8'
    mpCanvasCtx.lineWidth = 0.5
    mpCanvasCtx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize)
  }
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
  background-color: #fefcfb;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(126, 200, 200, 0.1);
}

.grid-canvas-placeholder {
  background-color: #fefcfb;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(126, 200, 200, 0.1);
}

.compare-overlay {
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0.5;
  border-radius: 12px;
}
</style>

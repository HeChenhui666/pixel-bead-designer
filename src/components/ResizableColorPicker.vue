<template>
  <view class="resizable-color-picker" :style="{ height: containerHeight + 'px' }">
    <view class="picker-header">
      <text v-if="coordsText" class="cell-coords">{{ coordsText }}</text>
      <!-- 拖动手柄 -->
      <view
        class="palette-drag-handle"
        @touchstart.prevent="onDragStart($event)"
        @touchmove.prevent="onDragMove($event)"
        @touchend="onDragEnd()"
      >
        <view class="drag-indicator" />
      </view>
      <view v-if="showClose" class="clear-selection-btn" @click="$emit('close')">
        <text class="clear-text">✕</text>
      </view>
    </view>
    <scroll-view scroll-y class="picker-scroll" :style="{ flex: 1 }">
      <view class="picker-grid">
        <view
          v-for="color in colorList"
          :key="color.hex"
          class="picker-swatch"
          :class="{ active: selectedHex === color.hex }"
          :style="{ backgroundColor: color.hex }"
          @click="onSelect(color.hex)"
        >
          <text class="swatch-code">{{ color.code }}</text>
          <text v-if="selectedHex === color.hex" class="swatch-check">✓</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getColorList } from '../utils/color-mapper'
import type { PaletteId } from '../stores/useProjectStore'

interface Props {
  /** 色卡品牌 ID */
  paletteId: PaletteId
  /** 当前选中的颜色 hex 值 */
  selectedHex?: string
  /** 坐标提示文字，如 "选中 (3, 5)" */
  coordsText?: string
  /** 是否显示关闭按钮 */
  showClose?: boolean
  /** 初始高度 */
  initialHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  selectedHex: '',
  coordsText: '',
  showClose: false,
  initialHeight: 200,
})

const emit = defineEmits<{
  (e: 'select', hex: string): void
  (e: 'close'): void
}>()

const colorList = computed(() => getColorList(props.paletteId))
const containerHeight = ref(props.initialHeight)

// 拖拽调整高度
let dragStartY = 0
let dragStartHeight = 0
let isDragging = false

function onDragStart(event: TouchEvent) {
  const touch = event.touches?.[0]
  if (!touch) return
  isDragging = true
  dragStartY = touch.clientY ?? touch.y ?? 0
  dragStartHeight = containerHeight.value
}

function onDragMove(event: TouchEvent) {
  if (!isDragging) return
  const touch = event.touches?.[0]
  if (!touch) return
  const currentY = touch.clientY ?? touch.y ?? 0
  const delta = dragStartY - currentY
  const newHeight = Math.max(120, Math.min(400, dragStartHeight + delta))
  containerHeight.value = newHeight
}

function onDragEnd() {
  isDragging = false
}

function onSelect(hex: string) {
  emit('select', hex)
}
</script>

<style scoped>
.resizable-color-picker {
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
  overflow: hidden;
}

.picker-header {
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

.picker-scroll {
  flex: 1;
  min-height: 0;
}

.picker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 14px;
}

.picker-swatch {
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

.picker-swatch.active {
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
</style>

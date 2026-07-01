<template>
  <view class="color-picker-panel" @touchmove.stop.prevent>
    <view class="picker-header">
      <text class="picker-title">{{ title }}</text>
      <view class="picker-close" @click="$emit('close')">
        <text class="picker-close-text">✕</text>
      </view>
    </view>
    <scroll-view scroll-y class="picker-scroll">
      <view class="picker-grid">
        <view
          v-for="item in colorList"
          :key="item.hex"
          class="picker-swatch"
          :style="{ backgroundColor: item.hex }"
          :class="{ active: selectedHex === item.hex }"
          @click="onSelect(item.hex)"
        >
          <text class="swatch-code">{{ item.code }}</text>
          <view v-if="selectedHex === item.hex" class="swatch-check">✓</view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getColorList } from '../utils/color-mapper'
import type { PaletteId } from '../stores/useProjectStore'

interface Props {
  /** 色卡品牌 ID */
  paletteId: PaletteId
  /** 当前选中的颜色 hex 值 */
  selectedHex?: string
  /** 面板标题 */
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectedHex: '',
  title: '选择颜色',
})

const emit = defineEmits<{
  (e: 'select', hex: string): void
  (e: 'close'): void
}>()

const colorList = computed(() => getColorList(props.paletteId))

function onSelect(hex: string) {
  emit('select', hex)
}
</script>

<style scoped>
.color-picker-panel {
  position: fixed;
  bottom: calc(112rpx + var(--safe-bottom, 0));
  left: 0;
  right: 0;
  height: 40vh;
  background-color: #fefcfb;
  border-radius: 40rpx 40rpx 0 0;
  box-shadow: 0 -8rpx 40rpx rgba(126, 200, 200, 0.12);
  z-index: 55;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 36rpx;
  border-bottom: 2rpx solid #f5f2ef;
  flex-shrink: 0;
}

.picker-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #4a4a4a;
}

.picker-close {
  padding: 10rpx 24rpx;
  border-radius: 28rpx;
  background-color: #f8f6f4;
  transition: all 0.25s ease;
}

.picker-close:active {
  background-color: #f0eeeb;
}

.picker-close-text {
  font-size: 24rpx;
  color: #9ca3af;
}

.picker-scroll {
  flex: 1;
  min-height: 0;
}

.picker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 24rpx 28rpx;
}

.picker-swatch {
  width: 76rpx;
  height: 76rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid transparent;
  transition: all 0.25s ease;
  position: relative;
}

.picker-swatch.active {
  border-color: #7ec8c8;
  box-shadow: 0 0 0 6rpx rgba(126, 200, 200, 0.2);
}

.swatch-code {
  font-size: 16rpx;
  color: #ffffff;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
  line-height: 1;
  pointer-events: none;
}

.swatch-check {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  font-size: 18rpx;
  color: #ffffff;
  background-color: #7ec8c8;
  border-radius: 50%;
  width: 30rpx;
  height: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  text-shadow: none;
}
</style>

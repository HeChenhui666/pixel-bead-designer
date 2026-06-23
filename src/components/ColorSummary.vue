<template>
  <view class="color-summary">
    <text class="summary-count">{{ sortedColors.length }} 种颜色</text>

    <scroll-view scroll-y class="summary-list">
      <view
        v-for="item in sortedColors"
        :key="item.hex"
        class="color-row"
        @click="$emit('colorTap', item.hex)"
      >
        <view class="color-swatch" :style="{ backgroundColor: item.hex }" />
        <view class="color-info">
          <text class="color-code">{{ item.code }}</text>
          <text class="color-hex">{{ item.hex }}</text>
        </view>
        <view class="color-usage">
          <text class="usage-count">{{ item.count }}</text>
          <text class="usage-label">颗</text>
        </view>
        <view class="usage-bar-bg">
          <view
            class="usage-bar-fill"
            :style="{ width: item.percent + '%', backgroundColor: item.hex }"
          />
        </view>
      </view>
    </scroll-view>

    <view v-if="sortedColors.length === 0" class="empty-hint">
      <text>暂无数据，请先生成图纸</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getColorCodeByHex } from '../utils/color-mapper'

interface Props {
  colorSummary: Record<string, number>
  paletteId: string
}

const props = defineProps<Props>()

defineEmits<{
  (e: 'colorTap', hex: string): void
}>()

const sortedColors = computed(() => {
  const entries = Object.entries(props.colorSummary)
  if (entries.length === 0) return []

  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  const maxCount = Math.max(...entries.map(([, count]) => count))

  return entries
    .map(([hex, count]) => ({
      hex,
      code: getColorCodeByHex(hex, props.paletteId),
      count,
      percent: maxCount > 0 ? Math.round((count / maxCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
})
</script>

<style scoped>
.color-summary {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
}

.summary-count {
  font-size: 12px;
  color: #999999;
  padding: 8px 16px 4px;
}

.summary-list {
  flex: 1;
}

.color-row {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  gap: 10px;
  position: relative;
}

.color-row:active {
  background-color: #f8f8f8;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.color-info {
  display: flex;
  flex-direction: column;
  min-width: 60px;
}

.color-code {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.color-hex {
  font-size: 11px;
  color: #999999;
}

.color-usage {
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin-left: auto;
  flex-shrink: 0;
}

.usage-count {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.usage-label {
  font-size: 11px;
  color: #999999;
}

.usage-bar-bg {
  position: absolute;
  bottom: 0;
  left: 16px;
  right: 16px;
  height: 2px;
  background-color: #f5f5f5;
  border-radius: 1px;
}

.usage-bar-fill {
  height: 100%;
  border-radius: 1px;
  opacity: 0.6;
}

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  font-size: 14px;
  color: #cccccc;
}
</style>

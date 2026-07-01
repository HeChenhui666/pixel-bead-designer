<template>
  <view class="image-picker">
    <!-- #ifdef MP-WEIXIN -->
    <view class="picker-trigger" @tap="onTapChoose()">
      <view v-if="modelValue" class="preview-container">
        <image :src="modelValue" mode="aspectFit" class="preview-image" />
        <view class="change-hint">
          <uni-icons type="camera" size="14" color="#ffffff" />
          <text class="change-hint-text">点击更换图片</text>
        </view>
      </view>
      <view v-else class="empty-state">
        <view class="empty-icon-wrap">
          <uni-icons type="image" size="36" color="#7ec8c8" />
        </view>
        <text class="empty-text">点击选择图片</text>
        <text class="empty-sub">支持从相册或拍照导入</text>
      </view>
    </view>
    <!-- #endif -->

    <!-- #ifdef H5 -->
    <view v-if="modelValue" class="preview-container" @click="onTapChoose()">
      <image :src="modelValue" mode="aspectFit" class="preview-image" />
      <view class="change-hint">
        <uni-icons type="camera" size="14" color="#ffffff" />
        <text class="change-hint-text">点击更换图片</text>
      </view>
    </view>
    <view v-else class="empty-state" @click="onTapChoose()">
      <view class="empty-icon-wrap">
        <uni-icons type="image" size="36" color="#7ec8c8" />
      </view>
      <text class="empty-text">点击选择图片</text>
      <text class="empty-sub">支持从相册或拍照导入</text>
    </view>
    <!-- #endif -->

    <!-- #ifdef H5 -->
    <input ref="fileInputRef" type="file" accept="image/*" style="display: none;" @change="(onH5FileChange as any)" />
    <!-- #endif -->

    <!-- 图片尺寸提示 -->
    <view v-if="imageSizeText" class="image-size-hint">
      <uni-icons type="info" size="13" color="#7ec8c8" />
      <text class="size-text">{{ imageSizeText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  modelValue?: string
  maxSizeMB?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  maxSizeMB: 10,
})

const emit = defineEmits<{
  'update:modelValue': [path: string]
  error: [message: string]
}>()

const choosing = ref(false)
const imageSizeText = ref('')

// #ifdef H5
const fileInputRef = ref<HTMLInputElement | null>(null)
// #endif

function formatSizeInfo(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(width, height)
  const ratioW = width / divisor
  const ratioH = height / divisor
  if (ratioW > 20 || ratioH > 20) {
    const ratio = (width / height).toFixed(2)
    return `${width}×${height} (≈${ratio}:1)`
  }
  return `${width}×${height} (${ratioW}:${ratioH})`
}

function onTapChoose() {
  if (choosing.value) return
  choosing.value = true

  // #ifdef H5
  fileInputRef.value?.click()
  // #endif

  // #ifndef H5
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    sizeType: ['compressed'],
    success: (res) => {
      const tempFile = (res.tempFiles as any[])[0]
      const tempFilePath = tempFile.tempFilePath
      const fileSize = tempFile.size || 0
      const maxBytes = props.maxSizeMB * 1024 * 1024

      if (fileSize > maxBytes) {
        emit('error', `图片大小超过 ${props.maxSizeMB}MB，请压缩后重试`)
        uni.showToast({ title: '图片过大，请压缩后重试', icon: 'none' })
      } else {
        emit('update:modelValue', tempFilePath)
        uni.getImageInfo({
          src: tempFilePath,
          success: (info) => {
            imageSizeText.value = formatSizeInfo(info.width, info.height)
          },
          fail: () => {},
        })
      }
      choosing.value = false
    },
    fail: (err) => {
      if (err?.errMsg && !err.errMsg.includes('cancel')) {
        uni.showToast({ title: '选择图片失败', icon: 'none' })
      }
      choosing.value = false
    },
  })
  // #endif
}

// #ifdef H5
function onH5FileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) {
    choosing.value = false
    return
  }

  const maxBytes = props.maxSizeMB * 1024 * 1024
  if (file.size > maxBytes) {
    emit('error', `图片大小超过 ${props.maxSizeMB}MB，请压缩后重试`)
    uni.showToast({ title: '图片过大，请压缩后重试', icon: 'none' })
    choosing.value = false
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    const dataUrl = reader.result as string
    emit('update:modelValue', dataUrl)
    const img = new Image()
    img.onload = () => {
      imageSizeText.value = formatSizeInfo(img.naturalWidth, img.naturalHeight)
    }
    img.src = dataUrl
    choosing.value = false
  }
  reader.readAsDataURL(file)
  target.value = ''
}
// #endif
</script>

<style scoped>
.image-picker {
  width: 100%;
}

.picker-trigger {
  width: 100%;
  border: none;
  border-radius: 0;
  background-color: transparent;
  line-height: normal;
  text-align: left;
}

.picker-trigger::after {
  display: none;
}

.preview-container {
  position: relative;
  width: 100%;
  border-radius: 20px;
  overflow: hidden;
  background-color: #f5f5f5;
}

.preview-image {
  width: 100%;
  height: 220px;
}

.change-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.45) 100%);
}

.change-hint-text {
  font-size: 13px;
  color: #ffffff;
  font-weight: 500;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 220px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(126, 200, 200, 0.08) 0%, rgba(168, 216, 216, 0.05) 100%);
  border: 1.5px dashed rgba(126, 200, 200, 0.4);
  gap: 0;
}

.empty-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 22px;
  background: rgba(126, 200, 200, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.empty-text {
  font-size: 16px;
  color: #5a8888;
  font-weight: 600;
  margin-bottom: 6px;
}

.empty-sub {
  font-size: 12px;
  color: #b0c8c8;
  font-weight: 400;
}

.image-size-hint {
  margin-top: 10px;
  padding: 7px 14px;
  background-color: rgba(126, 200, 200, 0.08);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.size-text {
  font-size: 12px;
  color: #5a9e9e;
  font-weight: 500;
}
</style>

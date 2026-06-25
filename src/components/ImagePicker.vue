<template>
  <view class="image-picker">
    <view v-if="modelValue" class="preview-container" @tap="onTapChoose">
      <image
        :src="modelValue"
        mode="aspectFit"
        class="preview-image"
      />
      <view class="change-hint">点击更换图片</view>
    </view>
    <view v-else class="empty-state" @tap="onTapChoose">
      <text class="empty-icon">📷</text>
      <text class="empty-text">点击上传图片</text>
    </view>
  </view>
</template>

<script setup lang="ts">
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

function onTapChoose() {
  console.log('[ImagePicker] onTapChoose triggered')

  // #ifdef H5
  triggerH5FilePicker()
  // #endif

  // #ifndef H5
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      console.log('[ImagePicker] success:', res.tempFilePaths)
      const tempFilePath = res.tempFilePaths[0]
      const fileSize = res.tempFiles?.[0]?.size || 0
      const maxBytes = props.maxSizeMB * 1024 * 1024

      if (fileSize > maxBytes) {
        emit('error', `图片大小超过 ${props.maxSizeMB}MB，请压缩后重试`)
        uni.showToast({ title: '图片过大，请压缩后重试', icon: 'none' })
        return
      }

      emit('update:modelValue', tempFilePath)
    },
    fail: (err) => {
      console.log('[ImagePicker] fail:', err)
      if (err?.errMsg && !err.errMsg.includes('cancel')) {
        uni.showToast({ title: '选择图片失败', icon: 'none' })
      }
    },
  })
  // #endif
}

// #ifdef H5
function triggerH5FilePicker() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.style.display = 'none'
  input.onchange = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    const maxBytes = props.maxSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      emit('error', `图片大小超过 ${props.maxSizeMB}MB，请压缩后重试`)
      uni.showToast({ title: '图片过大，请压缩后重试', icon: 'none' })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      emit('update:modelValue', reader.result as string)
    }
    reader.readAsDataURL(file)
    input.remove()
  }
  document.body.appendChild(input)
  input.click()
}
// #endif
</script>

<style scoped>
.image-picker {
  width: 100%;
}

.preview-container {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background-color: #f5f5f5;
}

.preview-image {
  width: 100%;
  height: 240px;
}

.change-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  text-align: center;
  font-size: 12px;
  color: #ffffff;
  background-color: rgba(0, 0, 0, 0.4);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 240px;
  border: 2px dashed #e0e0e0;
  border-radius: 12px;
  background-color: #fafafa;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 16px;
  color: #666666;
}
</style>

<template>
  <div
    ref="barWrap"
    class="aplayer-bar-wrap"
    role="slider"
    aria-label="播放进度"
    :aria-valuenow="Math.round(playProgress * 100)"
    aria-valuemin="0"
    aria-valuemax="100"
    tabindex="0"
    @mousedown="onThumbMouseDown"
    @touchstart.prevent="onThumbTouchStart"
    @keydown="onKeyDown"
  >
    <div class="aplayer-bar">
      <div class="aplayer-loaded" :style="{ width: `${loadProgress * 100}%` }"></div>
      <div class="aplayer-played" :style="{ width: `${playProgress * 100}%`, background: theme }">
        <span
          ref="thumb"
          @mouseover="thumbHovered = true"
          @mouseout="thumbHovered = false"
          class="aplayer-thumb"
          :style="{ borderColor: theme, backgroundColor: thumbHovered ? theme : '#fff' }"
        >
          <span class="aplayer-loading-icon" :style="{ backgroundColor: theme }">
            <icon type="loading" />
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { getElementViewLeft } from '../util/utils'
import Icon from './aplayer-icon.vue'

const props = withDefaults(defineProps<{
  loadProgress?: number
  playProgress?: number
  theme?: string
}>(), {
  loadProgress: 0,
  playProgress: 0,
  theme: '#41b883'
})

const emit = defineEmits<{
  dragBegin: [value: number]
  dragEnd: [value: number]
  dragging: [value: number]
}>()

const barWrap = ref<HTMLDivElement | null>(null)
const thumbHovered = ref(false)

// 提取公共方法：计算百分比
function getPercentage(clientX: number): number {
  if (!barWrap.value) return 0
  const barWidth = barWrap.value.clientWidth
  const percentage = (clientX - getElementViewLeft(barWrap.value)) / barWidth
  return Math.max(0, Math.min(1, percentage))
}

// 清理事件监听器
function cleanupMouseListeners() {
  document.removeEventListener('mousemove', onDocumentMouseMove)
  document.removeEventListener('mouseup', onDocumentMouseUp)
}

function cleanupTouchListeners() {
  document.removeEventListener('touchmove', onDocumentTouchMove)
  document.removeEventListener('touchend', onDocumentTouchEnd)
}

// 鼠标事件
function onThumbMouseDown(e: MouseEvent) {
  emit('dragBegin', getPercentage(e.clientX))
  document.addEventListener('mousemove', onDocumentMouseMove)
  document.addEventListener('mouseup', onDocumentMouseUp)
}

function onDocumentMouseMove(e: MouseEvent) {
  emit('dragging', getPercentage(e.clientX))
}

function onDocumentMouseUp(e: MouseEvent) {
  cleanupMouseListeners()
  emit('dragEnd', getPercentage(e.clientX))
}

// 触摸事件
function onThumbTouchStart(e: TouchEvent) {
  emit('dragBegin', getPercentage(e.touches[0].clientX))
  document.addEventListener('touchmove', onDocumentTouchMove, { passive: false })
  document.addEventListener('touchend', onDocumentTouchEnd)
}

function onDocumentTouchMove(e: TouchEvent) {
  e.preventDefault() // 阻止默认行为，防止页面滚动
  emit('dragging', getPercentage(e.touches[0].clientX))
}

function onDocumentTouchEnd(e: TouchEvent) {
  cleanupTouchListeners()
  emit('dragEnd', getPercentage(e.changedTouches[0].clientX))
}

// 组件卸载时清理所有事件监听器
onBeforeUnmount(() => {
  cleanupMouseListeners()
  cleanupTouchListeners()
})

// 键盘控制进度
function onKeyDown(e: KeyboardEvent) {
  const step = 0.05 // 5% 步进
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    e.preventDefault()
    const newProgress = Math.min(1, props.playProgress + step)
    emit('dragBegin', newProgress)
    emit('dragEnd', newProgress)
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
    e.preventDefault()
    const newProgress = Math.max(0, props.playProgress - step)
    emit('dragBegin', newProgress)
    emit('dragEnd', newProgress)
  }
}
</script>

<style lang="scss">
.aplayer-bar-wrap {
  margin: 0 0 0 5px;
  padding: 4px 0;
  cursor: pointer;
  flex: 1;

  .aplayer-bar {
    position: relative;
    height: 2px;
    width: 100%;
    background: #cdcdcd;

    .aplayer-loaded {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      background: #aaa;
      height: 2px;
      transition: all 0.5s ease;
      will-change: width;
    }

    .aplayer-played {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      height: 2px;
      transition: background-color .3s;
      will-change: width;

      .aplayer-thumb {
        position: absolute;
        top: 0;
        right: 5px;
        margin-top: -5px;
        margin-right: -10px;
        width: 10px;
        height: 10px;
        border: 1px solid;
        transform: scale(.8);
        will-change: transform;
        transition: transform 300ms, background-color .3s, border-color .3s;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;

        &:hover {
          transform: scale(1);
        }

        overflow: hidden;

        .aplayer-loading-icon {
          display: none;
          width: 100%;
          height: 100%;

          svg {
            position: absolute;
            animation: spin 1s linear infinite;
            fill: #ffffff;
          }
        }
      }
    }
  }
}

.aplayer-loading {
  .aplayer-bar-wrap .aplayer-bar .aplayer-thumb .aplayer-loading-icon {
    display: block;
  }

  .aplayer-info .aplayer-controller .aplayer-bar-wrap .aplayer-bar .aplayer-played .aplayer-thumb {
    transform: scale(1);
  }
}

@keyframes spin {
  0% { transform: rotate(0) }
  100% { transform: rotate(360deg) }
}
</style>

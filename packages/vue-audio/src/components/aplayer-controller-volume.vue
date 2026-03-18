<template>
  <div class="aplayer-volume-wrap">
    <icon-button
      :class="`aplayer-icon-${volumeIcon}`"
      :icon="volumeIcon"
      @click="$emit('toggleMute')"
    />
    <div
      class="aplayer-volume-bar-wrap"
      @mousedown="onBarMouseDown"
      @touchstart.prevent="onBarTouchStart"
    >
      <div class="aplayer-volume-bar" ref="bar">
        <div
          class="aplayer-volume"
          :style="{ height: muted ? 0 : `${Math.trunc(volume * 100)}%`, background: theme, borderColor: theme }"
        >
          <span class="aplayer-volume-thumb"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import IconButton from './aplayer-iconbutton.vue'
import { getElementViewTop } from '../util/utils'

const props = withDefaults(defineProps<{
  volume?: number
  muted?: boolean
  theme?: string
}>(), {
  volume: 0.8,
  muted: false,
  theme: '#41b883'
})

const emit = defineEmits<{
  toggleMute: []
  setVolume: [value: number]
}>()

const bar = ref<HTMLDivElement | null>(null)
const barHeight = 35

const volumeIcon = computed(() => {
  if (props.muted || props.volume <= 0) return 'volume-off'
  if (props.volume >= 1) return 'volume-max'        // 100%: 三个圆弧
  if (props.volume >= 0.5) return 'volume-middle'   // 50-99%: 两个圆弧
  return 'volume-small'                              // 1-49%: 一个圆弧
})

// 提取公共方法：计算音量百分比
function getVolumePercentage(clientY: number): number {
  if (!bar.value) return 0
  const percentage = (barHeight - clientY + getElementViewTop(bar.value)) / barHeight
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
function onBarMouseDown(e: MouseEvent) {
  emit('setVolume', getVolumePercentage(e.clientY))
  document.addEventListener('mousemove', onDocumentMouseMove)
  document.addEventListener('mouseup', onDocumentMouseUp)
}

function onDocumentMouseMove(e: MouseEvent) {
  emit('setVolume', getVolumePercentage(e.clientY))
}

function onDocumentMouseUp(e: MouseEvent) {
  cleanupMouseListeners()
  emit('setVolume', getVolumePercentage(e.clientY))
}

// 触摸事件
function onBarTouchStart(e: TouchEvent) {
  emit('setVolume', getVolumePercentage(e.touches[0].clientY))
  document.addEventListener('touchmove', onDocumentTouchMove)
  document.addEventListener('touchend', onDocumentTouchEnd)
}

function onDocumentTouchMove(e: TouchEvent) {
  emit('setVolume', getVolumePercentage(e.changedTouches[0].clientY))
}

function onDocumentTouchEnd(e: TouchEvent) {
  cleanupTouchListeners()
  emit('setVolume', getVolumePercentage(e.changedTouches[0].clientY))
}

// 组件卸载时清理所有事件监听器
onBeforeUnmount(() => {
  cleanupMouseListeners()
  cleanupTouchListeners()
})
</script>

<style lang="scss">
.aplayer-volume-wrap {
  position: relative;
  cursor: pointer;

  &:hover .aplayer-volume-bar-wrap {
    display: block;
  }

  // 音量图标放在底部，z-index 高于音量条背景
  > .aplayer-icon {
    position: relative;
    z-index: 2;
  }

  .aplayer-volume-bar-wrap {
    display: none;
    position: absolute;
    bottom: 15px;
    left: -1px;
    right: -1px;
    height: 45px;
    z-index: 1;
    transition: all .2s ease;

    &::after {
      content: '';
      position: absolute;
      bottom: -16px;
      left: 0;
      right: 0;
      height: 69px;
      background-color: #fff;
      box-shadow: 0 0 2px 0 rgba(0, 0, 0, 0.07), 0 0 5px 0 rgba(0, 0, 0, 0.1);
      z-index: -1;
    }

    .aplayer-volume-bar {
      position: absolute;
      bottom: 10px;
      left: 11px;
      width: 5px;
      height: 38px;
      background: #aaa;
      border-radius: 2.5px;
      z-index: 1;

      .aplayer-volume {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        border-radius: 2.5px;
        transition: height 0.1s ease, background-color .3s;
        will-change: height;

        .aplayer-volume-thumb {
          position: absolute;
          top: -3px;
          left: 50%;
          transform: translateX(-50%);
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid;
          border-color: inherit;
          background: #fff;
          box-sizing: border-box;
          cursor: pointer;
          transition: all .3s;
        }
      }
    }
  }

  &:hover .aplayer-volume-thumb {
    background: inherit;
  }
}
</style>

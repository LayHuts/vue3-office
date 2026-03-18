<template>
  <div class="aplayer-controller">
    <!-- Fixed 模式的顶部控制按钮 -->
    <div  class="aplayer-fixed-controls">
      <icon-button
        class="aplayer-icon-back"
        icon="prev"
        title="上一曲"
        @click="$emit('skipBack')"
      />
      <icon-button
        class="aplayer-icon-play"
        :icon="isPlaying ? 'pause' : 'play'"
        :title="isPlaying ? '暂停' : '播放'"
        @click="$emit('togglePlay')"
      />
      <icon-button
        class="aplayer-icon-forward"
        icon="next"
        title="下一曲"
        @click="$emit('skipForward')"
      />
      <icon-button
        v-if="fixedMode"
        class="aplayer-icon-menu"
        icon="menu"
        :class="{ 'inactive': !showList }"
        @click="$emit('toggleList')"
      />
      <icon-button
        v-if="fixedMode && enableClose"
        class="aplayer-icon-close"
        icon="close"
        title="关闭"
        @click="$emit('close')"
      />
    </div>
    <v-progress
      :load-progress="loadProgress"
      :play-progress="playProgress"
      :theme="theme"
      @drag-begin="val => $emit('dragBegin', val)"
      @drag-end="val => $emit('dragEnd', val)"
      @dragging="val => $emit('dragging', val)"
    />
    <div class="aplayer-time">
      <div class="aplayer-time-inner">
        <span class="aplayer-ptime">{{ secondToTime(stat.playedTime) }}</span>
        /
        <span class="aplayer-dtime">{{ secondToTime(stat.duration) }}</span>
      </div>
      <volume
        v-if="!isMobile"
        :volume="volume"
        :theme="theme"
        :muted="muted"
        @toggle-mute="$emit('toggleMute')"
        @set-volume="v => $emit('setVolume', v)"
      />
      <icon-button
        class="aplayer-icon-mode"
        :icon="playModeIcon"
        :title="playModeTitle"
        @click="$emit('nextMode')"
      />
      <!-- 歌词按钮（仅 fixed 模式且启用歌词时显示） -->
      <icon-button
        v-if="fixedMode && enableLrc"
        class="aplayer-icon-lrc"
        :class="{ 'inactive': !showLrc }"
        icon="lrc"
        title="歌词"
        @click="$emit('toggleLrc')"
      />
      <icon-button
        v-if="!fixedMode"
        class="aplayer-icon-menu"
        icon="menu"
        :class="{ 'inactive': !showList }"
        @click="$emit('toggleList')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import IconButton from './aplayer-iconbutton.vue'
import VProgress from './aplayer-controller-progress.vue'
import Volume from './aplayer-controller-volume.vue'
import { secondToTime } from '../util/utils'
import { type PlayStat } from './types'

const props = withDefaults(defineProps<{
  shuffle?: boolean
  repeat?: string
  stat: PlayStat
  theme?: string
  volume?: number
  muted?: boolean
  isMobile?: boolean
  showList?: boolean
  fixedMode?: boolean
  isPlaying?: boolean
  showLrc?: boolean
  enableLrc?: boolean
  enableClose?: boolean
}>(), {
  shuffle: false,
  repeat: 'repeat-all',
  theme: '#41b883',
  volume: 0.8,
  muted: false,
  isMobile: false,
  showList: true,
  fixedMode: false,
  isPlaying: false,
  showLrc: false,
  enableLrc: false,
  enableClose: true
})

defineEmits<{
  toggleList: []
  toggleMute: []
  toggleLrc: []
  setVolume: [value: number]
  dragBegin: [value: number]
  dragEnd: [value: number]
  dragging: [value: number]
  nextMode: []
  skipBack: []
  skipForward: []
  togglePlay: []
  close: []
}>()

const loadProgress = computed(() => props.stat.duration === 0 ? 0 : props.stat.loadedTime / props.stat.duration)
const playProgress = computed(() => props.stat.duration === 0 ? 0 : props.stat.playedTime / props.stat.duration)

// 播放模式图标：列表循环 -> 随机播放 -> 单曲循环
const playModeIcon = computed(() => {
  if (props.shuffle) return 'shuffle'
  if (props.repeat === 'repeat-one') return 'repeat-one'
  return 'repeat-all'
})

const playModeTitle = computed(() => {
  if (props.shuffle) return '随机播放'
  if (props.repeat === 'repeat-one') return '单曲循环'
  return '列表循环'
})
</script>

<style lang="scss">
.aplayer-controller {
  display: flex;
  align-items: center;
  position: relative;

  // 普通模式下的控制按钮容器
  .aplayer-fixed-controls {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-right: 5px;

    .aplayer-icon {
      cursor: pointer;
      transition: all 0.2s ease;

      .aplayer-fill {
        fill: #666;
      }

      &:hover {
        .aplayer-fill {
          fill: #000;
        }
      }
    }
  }

  .aplayer-time {
    display: flex;
    align-items: center;
    position: relative;
    height: 17px;
    color: #999;
    font-size: 11px;
    padding-left: 7px;

    .aplayer-volume-wrap {
      margin-left: 4px;
      margin-right: 4px;
    }

    .aplayer-icon {
      cursor: pointer;
      transition: all 0.2s ease;
      margin-left: 4px;

      &.inactive {
        opacity: .3;
      }

      .aplayer-fill {
        fill: #666;
      }

      &:hover {
        .aplayer-fill {
          fill: #000;
        }
      }

      &.aplayer-icon-menu {
        display: none;
      }

      // Fixed 模式的控制按钮（默认隐藏）
      &.aplayer-icon-back,
      &.aplayer-icon-play,
      &.aplayer-icon-forward,
      &.aplayer-icon-lrc {
        display: none;
      }
    }

    .aplayer-volume-wrap + .aplayer-icon {
      margin-left: 0;
    }

    &.aplayer-time-narrow {
      .aplayer-icon-mode {
        display: none;
      }

      .aplayer-icon-menu {
        display: none;
      }
    }
  }
}

// Fixed 模式下的按钮布局
.aplayer-fixed {
  .aplayer-info {
    .aplayer-music {
      width: calc(100% - 105px);
    }
  }

  .aplayer-controller {
    position: relative;

    // 顶部控制按钮容器
    .aplayer-fixed-controls {
      position: absolute;
      top: -40px;
      right: 0;
      display: flex;
      gap: 5px;

      .aplayer-icon {
        width: 20px;
        height: 20px;
        cursor: pointer;

        &.inactive {
          opacity: .3;
        }

        .aplayer-fill {
          fill: #666;
        }

        &:hover .aplayer-fill {
          fill: #000;
        }
      }

      .aplayer-icon-forward {
        // 使用独立的 next 图标，不需要翻转
      }
    }

    .aplayer-time {
      // 歌词按钮显示
      .aplayer-icon-lrc {
        display: block;
      }
    }
  }
}
</style>

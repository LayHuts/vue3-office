<template>
  <Transition :name="fixedMode ? '' : 'slide-v'">
    <div
      class="aplayer-list"
      :style="listHeightStyle"
      ref="listRef"
      v-show="show"
      role="listbox"
      aria-label="播放列表"
    >
      <div
        ref="scrollContainer"
        class="aplayer-list-scroll"
        :style="scrollContainerStyle"
        @scroll="onScroll"
      >
        <!-- 虚拟滚动：只渲染可见区域的项目 -->
        <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
          <ol :style="{ transform: `translateY(${offsetY}px)` }">
            <li
              v-for="(item) of visibleItems"
              :key="item.music.src || `music-${item.index}`"
              :class="{ 'aplayer-list-light': item.index === playIndex }"
              :aria-selected="item.index === playIndex ? true : undefined"
              :aria-label="`${item.music.title || 'Untitled'} - ${item.music.artist || 'Unknown'}`"
              role="option"
              tabindex="0"
              @click="$emit('selectSong', item.music)"
              @keydown.enter="$emit('selectSong', item.music)"
              @keydown.space.prevent="$emit('selectSong', item.music)"
            >
              <span class="aplayer-list-cur" :style="{ background: theme }"></span>
              <span class="aplayer-list-index">{{ item.index + 1 }}</span>
              <span class="aplayer-list-title">
                {{ item.music.title || 'Untitled' }}
                <span
                  v-if="item.index === playIndex"
                  class="aplayer-list-wave"
                  :class="{ 'aplayer-list-wave-paused': !playing }"
                >
                  <span :style="{ backgroundColor: theme }"></span>
                  <span :style="{ backgroundColor: theme }"></span>
                  <span :style="{ backgroundColor: theme }"></span>
                  <span :style="{ backgroundColor: theme }"></span>
                </span>
              </span>
              <span class="aplayer-list-author">{{ item.music.artist || 'Unknown' }}</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, type CSSProperties } from 'vue'
import type { Music } from './types'

interface VisibleItem {
  music: Music
  index: number
}

const ITEM_HEIGHT = 33 // 每项高度（包含边框）
const BUFFER_SIZE = 3  // 上下缓冲区项数

const props = withDefaults(defineProps<{
  show?: boolean
  currentMusic?: Music | null
  musicList?: Music[]
  playIndex?: number
  playing?: boolean
  theme?: string
  listMaxHeight?: number | string
  fixedMode?: boolean
}>(), {
  show: true,
  currentMusic: null,
  musicList: () => [],
  playIndex: 0,
  playing: false,
  theme: '#41b883',
  listMaxHeight: 0,
  fixedMode: false
})

defineEmits<{
  selectSong: [music: Music]
}>()

const listRef = ref<HTMLDivElement | null>(null)
const scrollContainer = ref<HTMLDivElement | null>(null)
const scrollTop = ref(0)

// 解析最大高度为数字
const maxHeightPx = computed(() => {
  if (!props.listMaxHeight) return Infinity
  if (typeof props.listMaxHeight === 'number') return props.listMaxHeight
  const match = props.listMaxHeight.match(/^(\d+)/)
  const result = match ? parseInt(match[1], 10) : Infinity
  return result
})

// 总高度
const totalHeight = computed(() => props.musicList.length * ITEM_HEIGHT - 1)

// 可见区域高度
const visibleHeight = computed(() => {
  return Math.min(totalHeight.value, maxHeightPx.value)
})

// 列表容器样式
const listHeightStyle = computed<CSSProperties>(() => ({
  height: `${Math.min(totalHeight.value, maxHeightPx.value)}px`,
  maxHeight: maxHeightPx.value === Infinity ? undefined : `${maxHeightPx.value}px`
}))

// 滚动容器样式
const scrollContainerStyle = computed<CSSProperties>(() => ({
  height: '100%',
  overflowY: props.musicList.length * ITEM_HEIGHT > maxHeightPx.value ? 'auto' : 'hidden'
}))

// 计算可见项目
const visibleItems = computed<VisibleItem[]>(() => {
  const itemCount = props.musicList.length
  if (itemCount === 0) return []

  // 小列表不使用虚拟滚动
  if (itemCount <= 50) {
    return props.musicList.map((music, index) => ({ music, index }))
  }

  const startIndex = Math.max(0, Math.floor(scrollTop.value / ITEM_HEIGHT) - BUFFER_SIZE)
  const visibleCount = Math.ceil(visibleHeight.value / ITEM_HEIGHT) + BUFFER_SIZE * 2
  const endIndex = Math.min(itemCount, startIndex + visibleCount)

  const items: VisibleItem[] = []
  for (let i = startIndex; i < endIndex; i++) {
    items.push({ music: props.musicList[i], index: i })
  }
  return items
})

// 偏移量
const offsetY = computed(() => {
  if (props.musicList.length <= 50) return 0
  const startIndex = Math.max(0, Math.floor(scrollTop.value / ITEM_HEIGHT) - BUFFER_SIZE)
  return startIndex * ITEM_HEIGHT
})

// 滚动事件处理
function onScroll(e: Event) {
  const target = e.target as HTMLElement
  scrollTop.value = target.scrollTop
}

// 当前播放歌曲变化时，滚动到可见位置
watch(() => props.playIndex, (index) => {
  if (!scrollContainer.value || props.musicList.length <= 50 || index < 0) return

  nextTick(() => {
    if (!scrollContainer.value) return
    const itemTop = index * ITEM_HEIGHT
    const itemBottom = itemTop + ITEM_HEIGHT
    const containerScrollTop = scrollContainer.value.scrollTop
    const containerHeight = scrollContainer.value.clientHeight

    if (itemTop < containerScrollTop) {
      scrollContainer.value.scrollTop = itemTop
    } else if (itemBottom > containerScrollTop + containerHeight) {
      scrollContainer.value.scrollTop = itemBottom - containerHeight
    }
  })
})
</script>

<style lang="scss">
.aplayer-list {
  overflow: hidden;

  &.slide-v-enter-active,
  &.slide-v-leave-active {
    transition: height 300ms ease;
    will-change: height;
  }

  &.slide-v-enter-from,
  &.slide-v-leave-to {
    height: 0 !important;
  }

  .aplayer-list-scroll {
    &::-webkit-scrollbar {
      width: 5px;
    }

    &::-webkit-scrollbar-track {
      background-color: #f9f9f9;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 3px;
      background-color: #eee;
    }

    &::-webkit-scrollbar-thumb:hover {
      background-color: #ccc;
    }
  }

  ol {
    list-style-type: none;
    margin: 0;
    padding: 0;

    &:hover {
      li.aplayer-list-light:not(:hover) {
        background-color: inherit;
        transition: inherit;
      }
    }

    &:not(:hover) {
      li.aplayer-list-light {
        transition: background-color .6s ease;
      }
    }

    li {
      position: relative;
      height: 32px;
      line-height: 32px;
      padding: 0 15px;
      font-size: 12px;
      border-top: 1px solid #e9e9e9;
      cursor: pointer;
      transition: all 0.2s ease;
      overflow: hidden;
      margin: 0;
      text-align: start;
      display: flex;
      box-sizing: border-box;

      &:first-child {
        border-top: none;
      }

      &:hover {
        background: #efefef;
      }

      &.aplayer-list-light {
        background: #efefef;

        .aplayer-list-cur {
          display: inline-block;
        }
      }

      .aplayer-list-cur {
        display: none;
        width: 3px;
        height: 22px;
        position: absolute;
        left: 0;
        top: 5px;
        transition: background-color .3s;
      }

      .aplayer-list-index {
        color: #666;
        margin-right: 12px;
        flex-shrink: 0;
      }

      .aplayer-list-title {
        flex-grow: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;

        .aplayer-list-wave {
          display: inline-flex;
          align-items: flex-end;
          height: 16px;
          gap: 2px;
          margin-left: 8px;
          flex-shrink: 0;

          > span {
            display: block;
            width: 3px;
            border-radius: 1px;
            background-color: #41b883;
            animation: aplayer-wave 0.6s ease-in-out infinite;
          }

          > span:nth-child(1) {
            height: 4px;
            animation-delay: 0s;
          }
          > span:nth-child(2) {
            height: 8px;
            animation-delay: 0.15s;
          }
          > span:nth-child(3) {
            height: 14px;
            animation-delay: 0.3s;
          }
          > span:nth-child(4) {
            height: 6px;
            animation-delay: 0.45s;
          }

          &.aplayer-list-wave-paused > span {
            animation-play-state: paused;
          }
        }
      }

      .aplayer-list-author {
        flex-shrink: 0;
        color: #666;
        margin-left: 8px;
      }
    }
  }
}

@keyframes aplayer-wave {
  0%, 100% {
    transform: scaleY(0.3);
  }
  50% {
    transform: scaleY(1);
  }
}
</style>

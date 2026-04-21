<template>
  <div
    ref="playerRef"
    class="aplayer"
    :class="{
      'aplayer-mini': mini,
      'aplayer-withlist': !mini && musicList.length > 0,
      'aplayer-withlrc': !mini && !fixed && (slots.display || showLrc),
      'aplayer-float': isFloatMode,
      'aplayer-loading': isPlaying && isLoading,
      'aplayer-fixed': isFixedMode,
      'aplayer-fixed-mini': isFixedMode && isFixedMini,
      [fixedPositionClass]: isFixedMode
    }"
    :style="floatStyleObj"
    @mousedown="onPlayerDragBegin"
    @touchstart="onPlayerTouchStart"
  >
    <!-- Fixed 模式：列表在 body 外部 -->
    <template v-if="isFixedMode">
      <!-- 列表（根据位置决定在上方还是下方） -->
      <music-list
        v-if="!isFixedTop"
        :show="showList && !isFixedMini"
        :current-music="currentMusic"
        :music-list="musicList"
        :play-index="playIndex"
        :playing="isPlaying"
        :list-max-height="listMaxHeight ? listMaxHeight : 250"
        :theme="currentTheme"
        :fixed-mode="true"
        @selectSong="onSelectSong"
      />

      <!-- 播放器主体容器（包含 body 和 miniswitcher） -->
      <div class="aplayer-fixed-body-wrap">
        <!-- 播放器主体 -->
        <div class="aplayer-body">
          <thumbnail
            :pic="currentMusic.pic"
            :playing="isPlaying"
            :enable-drag="false"
            :theme="currentTheme"
            @togglePlay="onThumbnailClick"
          />
          <div class="aplayer-info">
            <div class="aplayer-music">
              <span class="aplayer-title">{{ currentMusic.title || 'Untitled' }}</span>
              {{ ' ' }}
              <span class="aplayer-author">{{ currentMusic.artist || 'Unknown' }}</span>
            </div>
            <controls
              :shuffle="shouldShuffle"
              :repeat="repeatMode"
              :stat="playStat"
              :volume="audioVolume"
              :muted="isAudioMuted"
              :theme="currentTheme"
              :is-mobile="isMobile"
              :show-list="showList"
              :fixed-mode="true"
              :is-playing="isPlaying"
              :show-lrc="showFixedLrc"
              :enable-lrc="showLrc"
              :enable-close="fixedClose"
              @toggleList="showList = !showList"
              @toggleMute="toggleMute"
              @toggleLrc="toggleFixedLrc"
              @setVolume="setAudioVolume"
              @dragBegin="onProgressDragBegin"
              @dragEnd="onProgressDragEnd"
              @dragging="onProgressDragging"
              @nextMode="setNextMode"
              @skipBack="skipBack"
              @skipForward="skipForward"
              @togglePlay="toggle"
              @close="onClose"
            />
          </div>
        </div>
        <!-- 关闭按钮 - 折叠状态显示 -->
        <div v-if="fixedClose" v-show="isFixedMini" class="aplayer-close" @click="onClose" title="关闭播放器">
          <button class="aplayer-icon">
            <icon type="close" />
          </button>
        </div>
        <!-- Mini 切换按钮 - 在最右侧 -->
        <div class="aplayer-miniswitcher" @click="toggleFixedMini" :title="isFixedMini ? '展开' : '折叠'">
          <button class="aplayer-icon">
            <icon type="right" />
          </button>
        </div>
      </div>

      <!-- 列表（top 位置时在下方） -->
      <!-- 列表（top 位置时在下方） -->
      <music-list
        v-if="isFixedTop"
        :show="showList && !isFixedMini"
        :current-music="currentMusic"
        :music-list="musicList"
        :play-index="playIndex"
        :playing="isPlaying"
        :list-max-height="listMaxHeight ? listMaxHeight : 250"
        :theme="currentTheme"
        :fixed-mode="true"
        @selectSong="onSelectSong"
      />

      <!-- 歌词（使用 Teleport 渲染到 body，脱离播放器容器） -->
      <Teleport to="body">
        <lyrics
          v-if="showLrc"
          :current-music="currentMusic"
          :play-stat="playStat"
          class="aplayer-lrc-fixed"
          :class="{ 'aplayer-lrc-hide': !showFixedLrc }"
        />
      </Teleport>
    </template>

    <!-- 普通模式 -->
    <template v-else>
      <div class="aplayer-body">
        <thumbnail
          :pic="currentMusic.pic"
          :playing="isPlaying"
          :enable-drag="false"
          :theme="currentTheme"
          @togglePlay="onThumbnailClick"
        />
        <div class="aplayer-info" v-show="!mini">
          <div class="aplayer-music">
            <span class="aplayer-title">{{ currentMusic.title || 'Untitled' }}</span>
            {{ ' ' }}
            <span class="aplayer-author">{{ currentMusic.artist || 'Unknown' }}</span>
          </div>
          <slot name="display" :current-music="currentMusic" :play-stat="playStat">
            <lyrics :current-music="currentMusic" :play-stat="playStat" v-if="showLrc" />
          </slot>
          <controls
            :shuffle="shouldShuffle"
            :repeat="repeatMode"
            :stat="playStat"
            :volume="audioVolume"
            :muted="isAudioMuted"
            :theme="currentTheme"
            :is-mobile="isMobile"
            :show-list="showList"
            :is-playing="isPlaying"
            @toggleList="showList = !showList"
            @toggleMute="toggleMute"
            @setVolume="setAudioVolume"
            @dragBegin="onProgressDragBegin"
            @dragEnd="onProgressDragEnd"
            @dragging="onProgressDragging"
            @nextMode="setNextMode"
            @skipBack="skipBack"
            @skipForward="skipForward"
            @togglePlay="toggle"
          />
        </div>
      </div>
      <music-list
        :show="showList && !mini"
        :current-music="currentMusic"
        :music-list="musicList"
        :play-index="playIndex"
        :playing="isPlaying"
        :list-max-height="listMaxHeight"
        :theme="currentTheme"
        @selectSong="onSelectSong"
      />
    </template>

    <!-- Audio 元素（两种模式共用） -->
    <audio ref="audioRef"/>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, useSlots, nextTick } from 'vue';
import ColorThief from 'colorthief';
import Thumbnail from './aplayer-thumbnail.vue';
import MusicList from './aplayer-list.vue';
import Controls from './aplayer-controller.vue';
import Lyrics from './aplayer-lrc.vue';
import Icon from './aplayer-icon.vue';
import { warn } from '../util/utils';
import type { Music, PlayStat, RepeatMode, FixedPosition } from './types';

declare const VERSION: string

const props = withDefaults(defineProps<{
  music: Music
  list?: Music[]
  mini?: boolean
  showLrc?: boolean
  mutex?: boolean
  theme?: string
  listMaxHeight?: number | string
  listFolded?: boolean
  float?: boolean
  autoplay?: boolean
  controls?: boolean
  muted?: boolean
  preload?: string
  volume?: number
  shuffle?: boolean
  repeat?: string
  fixed?: boolean
  fixedPosition?: FixedPosition
  fixedClose?: boolean
}>(), {
  list: () => [],
  mini: false,
  showLrc: false,
  mutex: true,
  theme: '#41b883',
  listMaxHeight: 0,
  listFolded: false,
  float: false,
  autoplay: false,
  controls: false,
  muted: false,
  preload: '',
  volume: 0.8,
  shuffle: false,
  repeat: 'repeat-all',
  fixed: false,
  fixedPosition: 'bottom-left',
  fixedClose: true
})

const emit = defineEmits<{
  'update:music': [music: Music]
  'update:muted': [muted: boolean]
  'update:volume': [volume: number]
  'update:shuffle': [shuffle: boolean]
  'update:repeat': [repeat: string]
  abort: [event: Event]
  canPlay: [event: Event]
  canPlayThrough: [event: Event]
  durationChange: [event: Event]
  emptied: [event: Event]
  encrypted: [event: Event]
  ended: [event: Event]
  error: [event: Event]
  loadedData: [event: Event]
  loadedMetadata: [event: Event]
  loadStart: [event: Event]
  pause: [event: Event]
  play: [event: Event]
  playing: [event: Event]
  progress: [event: Event]
  rateChange: [event: Event]
  seeked: [event: Event]
  seeking: [event: Event]
  stalled: [event: Event]
  suspend: [event: Event]
  timeUpdate: [event: Event]
  volumeChange: [event: Event]
  waiting: [event: Event]
  close: []
}>()

const slots = useSlots()

const REPEAT = {
  NO_REPEAT: 'no-repeat' as RepeatMode,
  REPEAT_ONE: 'repeat-one' as RepeatMode,
  REPEAT_ALL: 'repeat-all' as RepeatMode,
}

let activeMutex: HTMLAudioElement | null = null
const picThemeCache: Record<string, string> = {}
const THUMBNAIL_SIZE = 76 // $aplayer-height

const playerRef = ref<HTMLDivElement | null>(null)
const audioRef = ref<HTMLAudioElement | null>(null)
const internalMusic = ref<Music>(props.music)
const isPlaying = ref(false)
const isSeeking = ref(false)
const wasPlayingBeforeSeeking = ref(false)
const isMobile = ref(false)
const playStat = reactive<PlayStat>({ duration: 0, loadedTime: 0, playedTime: 0 })
const showList = ref(!props.listFolded)
const floatOriginX = ref(0)
const floatOriginY = ref(0)
const floatOffsetLeft = ref(0)
const floatOffsetTop = ref(0)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const selfAdaptingTheme = ref<string | null>(null)
const internalMuted = ref(props.muted)
const internalVolume = ref(props.volume)
const isLoading = ref(false)
const internalShuffle = ref(props.shuffle)
const internalRepeat = ref(props.repeat)
const shuffledList = ref<Music[]>([])
const isFixedMini = ref(props.fixed) // fixed 模式下的 mini 状态
const showFixedLrc = ref(props.showLrc) // fixed 模式下的歌词显示状态
let audioPlayPromise: Promise<void> = Promise.resolve()
let rejectPlayPromise: (() => void) | null = null
let hls: any = null

const audio = computed(() => audioRef.value)

const currentMusic = computed({
  get: () => internalMusic.value,
  set: (val: Music) => { emit('update:music', val); internalMusic.value = val }
})

const currentTheme = computed(() => {
  const theme = selfAdaptingTheme.value || currentMusic.value.theme || props.theme
  // 如果 theme 是 'pic'，说明还在等待颜色提取，使用默认颜色
  return theme === 'pic' ? '#41b883' : theme
})
const isFloatMode = computed(() => props.float)
const musicList = computed(() => props.list)

// Fixed 模式相关
const isFixedMode = computed(() => props.fixed)
const fixedPositionClass = computed(() => props.fixed ? `aplayer-fixed-${props.fixedPosition}` : '')
const isFixedTop = computed(() => props.fixedPosition === 'top-left' || props.fixedPosition === 'top-right')

const floatStyleObj = computed(() => ({
  transform: `translate(${floatOffsetLeft.value}px, ${floatOffsetTop.value}px)`,
  webkitTransform: `translate(${floatOffsetLeft.value}px, ${floatOffsetTop.value}px)`,
}))

const playIndex = computed({
  get: () => shuffledList.value.indexOf(currentMusic.value),
  set: (val: number) => { currentMusic.value = shuffledList.value[val % shuffledList.value.length] }
})

const isAudioMuted = computed({
  get: () => internalMuted.value,
  set: (val: boolean) => { emit('update:muted', val); internalMuted.value = val }
})

const audioVolume = computed({
  get: () => internalVolume.value,
  set: (val: number) => { emit('update:volume', val); internalVolume.value = val }
})

const shouldShuffle = computed({
  get: () => internalShuffle.value,
  set: (val: boolean) => { emit('update:shuffle', val); internalShuffle.value = val }
})

const repeatMode = computed({
  get: (): RepeatMode => {
    if (internalRepeat.value === 'none' || internalRepeat.value === 'no-repeat') return REPEAT.NO_REPEAT
    if (internalRepeat.value === 'music' || internalRepeat.value === 'repeat-one') return REPEAT.REPEAT_ONE
    return REPEAT.REPEAT_ALL
  },
  set: (val: RepeatMode) => { emit('update:repeat', val); internalRepeat.value = val }
})

function onDragBegin() { floatOriginX.value = floatOffsetLeft.value; floatOriginY.value = floatOffsetTop.value }

function onDragAround({ offsetLeft, offsetTop }: { offsetLeft: number; offsetTop: number }) {
  const el = playerRef.value
  if (!el) {
    floatOffsetLeft.value = floatOriginX.value + offsetLeft
    floatOffsetTop.value = floatOriginY.value + offsetTop
    return
  }

  const rect = el.getBoundingClientRect()

  // 计算元素初始位置（不含偏移）
  const baseLeft = rect.left - floatOffsetLeft.value
  const baseTop = rect.top - floatOffsetTop.value

  // 计算新的偏移量
  let newOffsetLeft = floatOriginX.value + offsetLeft
  let newOffsetTop = floatOriginY.value + offsetTop

  // 计算新位置
  const newLeft = baseLeft + newOffsetLeft
  const newTop = baseTop + newOffsetTop

  // 边界检测：thumbnail 必须完全可见（贴边显示）
  const minLeft = 0
  const minTop = 0
  const maxLeft = window.innerWidth - THUMBNAIL_SIZE
  const maxTop = window.innerHeight - THUMBNAIL_SIZE

  if (newLeft < minLeft) newOffsetLeft = minLeft - baseLeft
  if (newLeft > maxLeft) newOffsetLeft = maxLeft - baseLeft
  if (newTop < minTop) newOffsetTop = minTop - baseTop
  if (newTop > maxTop) newOffsetTop = maxTop - baseTop

  floatOffsetLeft.value = newOffsetLeft
  floatOffsetTop.value = newOffsetTop
}

// 整个播放器可拖拽
function onPlayerDragBegin(e: MouseEvent) {
  if (!isFloatMode.value) return

  // 排除进度条和音量条的拖拽
  const target = e.target as HTMLElement
  if (target.closest('.aplayer-bar-wrap') || target.closest('.aplayer-volume-bar-wrap')) return

  isDragging.value = false
  onDragBegin()
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  document.addEventListener('mousemove', onDocumentMouseMove)
  document.addEventListener('mouseup', onDocumentMouseUp)
}

function onDocumentMouseMove(e: MouseEvent) {
  isDragging.value = true
  onDragAround({
    offsetLeft: e.clientX - dragStartX.value,
    offsetTop: e.clientY - dragStartY.value
  })
}

function onDocumentMouseUp() {
  document.removeEventListener('mouseup', onDocumentMouseUp)
  document.removeEventListener('mousemove', onDocumentMouseMove)
}

// 触摸事件支持（移动端拖拽）
function onPlayerTouchStart(e: TouchEvent) {
  if (!isFloatMode.value) return

  // 排除进度条和音量条的拖拽
  const target = e.target as HTMLElement
  if (target.closest('.aplayer-bar-wrap') || target.closest('.aplayer-volume-bar-wrap')) return

  isDragging.value = false
  onDragBegin()
  dragStartX.value = e.touches[0].clientX
  dragStartY.value = e.touches[0].clientY
  document.addEventListener('touchmove', onDocumentTouchMove, { passive: false })
  document.addEventListener('touchend', onDocumentTouchEnd)
}

function onDocumentTouchMove(e: TouchEvent) {
  e.preventDefault() // 防止页面滚动
  isDragging.value = true
  onDragAround({
    offsetLeft: e.touches[0].clientX - dragStartX.value,
    offsetTop: e.touches[0].clientY - dragStartY.value
  })
}

function onDocumentTouchEnd() {
  document.removeEventListener('touchmove', onDocumentTouchMove)
  document.removeEventListener('touchend', onDocumentTouchEnd)
}

function onThumbnailClick() {
  // 拖拽过程中不触发播放/暂停
  if (!isDragging.value) toggle()
}

function toggleFixedMini() {
  isFixedMini.value = !isFixedMini.value
}

function toggleFixedLrc() {
  showFixedLrc.value = !showFixedLrc.value
}

function onClose() {
  pause()
  emit('close')
}

function setNextMode() {
  // 列表循环 -> 随机播放 -> 单曲循环 -> 列表循环
  if (repeatMode.value === REPEAT.REPEAT_ALL && !shouldShuffle.value) {
    // 列表循环 -> 随机播放
    shouldShuffle.value = true
  } else if (shouldShuffle.value) {
    // 随机播放 -> 单曲循环
    shouldShuffle.value = false
    repeatMode.value = REPEAT.REPEAT_ONE
  } else {
    // 单曲循环 -> 列表循环
    repeatMode.value = REPEAT.REPEAT_ALL
  }
}

function thenPlay() { nextTick(() => play()) }

function toggle() { audio.value?.paused ? play() : pause() }

function play() {
  if (props.mutex) {
    if (activeMutex && activeMutex !== audioRef.value) activeMutex.pause()
    activeMutex = audioRef.value
  }
  const promise = audio.value?.play()
  if (promise) {
    audioPlayPromise = new Promise((resolve, reject) => {
      rejectPlayPromise = reject
      promise.then((res) => { rejectPlayPromise = null; resolve(res) }).catch(warn)
    })
    return audioPlayPromise
  }
}

function pause() {
  audioPlayPromise.then(() => audio.value?.pause()).catch(() => audio.value?.pause())
  if (rejectPlayPromise) { rejectPlayPromise(); rejectPlayPromise = null }
}

function onProgressDragBegin(val: number) {
  wasPlayingBeforeSeeking.value = isPlaying.value
  pause()
  isSeeking.value = true
  if (audio.value && !isNaN(audio.value.duration)) audio.value.currentTime = audio.value.duration * val
}

function onProgressDragging(val: number) {
  if (!audio.value || isNaN(audio.value.duration)) playStat.playedTime = 0
  else audio.value.currentTime = audio.value.duration * val
}

function onProgressDragEnd() {
  isSeeking.value = false
  if (wasPlayingBeforeSeeking.value) thenPlay()
}

function toggleMute() { setAudioMuted(!audio.value?.muted) }
function setAudioMuted(val: boolean) { if (audio.value) audio.value.muted = val }
function setAudioVolume(val: number) { if (audio.value) { audio.value.volume = val; if (val > 0) setAudioMuted(false) } }

function getShuffledList(): Music[] {
  if (!props.list.length) return [internalMusic.value]
  let unshuffled = [...props.list]
  if (!internalShuffle.value || unshuffled.length <= 1) return unshuffled
  let idx = unshuffled.indexOf(internalMusic.value)
  if (unshuffled.length === 2 && idx !== -1) return idx === 0 ? unshuffled : [internalMusic.value, unshuffled[0]]
  for (let i = unshuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unshuffled[i], unshuffled[j]] = [unshuffled[j], unshuffled[i]]
  }
  if (idx !== -1) {
    idx = unshuffled.indexOf(internalMusic.value)
    if (idx !== 0) [unshuffled[0], unshuffled[idx]] = [unshuffled[idx], unshuffled[0]]
  }
  return unshuffled
}

function skipBack() {
  if (shuffledList.value.length <= 1) return
  playIndex.value = playIndex.value - 1 < 0 ? shuffledList.value.length - 1 : playIndex.value - 1
  thenPlay()
}

function skipForward() {
  if (shuffledList.value.length <= 1) return
  playIndex.value = (playIndex.value + 1) % shuffledList.value.length
  thenPlay()
}

function onSelectSong(song: Music) {
  if (currentMusic.value === song) toggle()
  else { currentMusic.value = song; thenPlay() }
}

function onAudioPlay() { isPlaying.value = true }
function onAudioPause() { isPlaying.value = false }
function onAudioWaiting() { isLoading.value = true }
function onAudioCanplay() { isLoading.value = false }
function onAudioDurationChange() { if (audio.value?.duration !== 1) playStat.duration = audio.value?.duration || 0 }
function onAudioProgress() { playStat.loadedTime = audio.value?.buffered.length ? audio.value.buffered.end(audio.value.buffered.length - 1) : 0 }
function onAudioTimeUpdate() { playStat.playedTime = audio.value?.currentTime || 0 }
function onAudioSeeking() { playStat.playedTime = audio.value?.currentTime || 0 }
function onAudioSeeked() { playStat.playedTime = audio.value?.currentTime || 0 }
function onAudioVolumeChange() { audioVolume.value = audio.value?.volume || 0; isAudioMuted.value = audio.value?.muted || false }

function onAudioEnded() {
  if (repeatMode.value === REPEAT.REPEAT_ALL) {
    if (shouldShuffle.value && playIndex.value === shuffledList.value.length - 1) shuffledList.value = getShuffledList()
    playIndex.value++
    thenPlay()
  } else if (repeatMode.value === REPEAT.REPEAT_ONE) {
    thenPlay()
  } else {
    playIndex.value++
    if (playIndex.value !== 0) thenPlay()
    else if (shuffledList.value.length === 1 && audio.value) audio.value.currentTime = 0
  }
}

// 存储事件监听器引用，便于清理
const audioEventHandlers: Record<string, () => void> = {
  play: onAudioPlay,
  pause: onAudioPause,
  abort: onAudioPause,
  waiting: onAudioWaiting,
  canplay: onAudioCanplay,
  progress: onAudioProgress,
  durationchange: onAudioDurationChange,
  seeking: onAudioSeeking,
  seeked: onAudioSeeked,
  timeupdate: onAudioTimeUpdate,
  volumechange: onAudioVolumeChange,
  ended: onAudioEnded,
}

// 存储 emit 事件处理器
const emitHandlers = new Map<string, (ev: Event) => void>()

function initAudio() {
  const a = audio.value
  if (!a) return
  a.muted = props.muted
  if (props.preload) a.preload = props.preload as '' | 'none' | 'metadata' | 'auto'
  a.volume = props.volume

  // 透传原生事件
  const eventMap: Record<string, string> = {
    'abort': 'abort',
    'canplay': 'canPlay',
    'canplaythrough': 'canPlayThrough',
    'durationchange': 'durationChange',
    'emptied': 'emptied',
    'encrypted': 'encrypted',
    'ended': 'ended',
    'error': 'error',
    'loadeddata': 'loadedData',
    'loadedmetadata': 'loadedMetadata',
    'loadstart': 'loadStart',
    'pause': 'pause',
    'play': 'play',
    'playing': 'playing',
    'progress': 'progress',
    'ratechange': 'rateChange',
    'seeked': 'seeked',
    'seeking': 'seeking',
    'stalled': 'stalled',
    'suspend': 'suspend',
    'timeupdate': 'timeUpdate',
    'volumechange': 'volumeChange',
    'waiting': 'waiting'
  }
  Object.entries(eventMap).forEach(([nativeEvent, emitName]) => {
    const handler = (ev: Event) => emit(emitName as any, ev)
    emitHandlers.set(nativeEvent, handler)
    a.addEventListener(nativeEvent, handler)
  })

  // 添加内部事件处理器
  Object.entries(audioEventHandlers).forEach(([event, handler]) => {
    a.addEventListener(event, handler)
  })

  if (currentMusic.value) a.src = currentMusic.value.src
}

function cleanupAudio() {
  const a = audio.value
  if (!a) return

  // 移除透传事件监听器
  emitHandlers.forEach((handler, event) => {
    a.removeEventListener(event, handler)
  })
  emitHandlers.clear()

  // 移除内部事件处理器
  Object.entries(audioEventHandlers).forEach(([event, handler]) => {
    a.removeEventListener(event, handler)
  })
}

function setSelfAdaptingTheme() {
  if ((currentMusic.value.theme || props.theme) === 'pic') {
    const pic = currentMusic.value.pic
    if (pic && picThemeCache[pic]) {
      selfAdaptingTheme.value = picThemeCache[pic]
    } else if (pic) {
      // 设置超时，避免长时间阻塞
      const timeout = setTimeout(() => {
        if (!picThemeCache[pic]) {
          // 超时后使用默认主题色
          picThemeCache[pic] = props.theme || '#41b883'
          selfAdaptingTheme.value = picThemeCache[pic]
        }
      }, 5000) // 5秒超时

      try {
        // 创建图片元素来提取颜色
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = () => {
          clearTimeout(timeout)
          try {
            const colorThief = new ColorThief()
            const [r, g, b] = colorThief.getColor(img)
            picThemeCache[pic] = `rgb(${r}, ${g}, ${b})`
            selfAdaptingTheme.value = `rgb(${r}, ${g}, ${b})`
          } catch {
            warn('color-thief failed to extract color')
          }
        }
        img.onerror = () => {
          clearTimeout(timeout)
          warn('Failed to load image for color extraction')
        }
        img.src = pic
      } catch {
        clearTimeout(timeout)
        warn('color-thief failed to extract color')
      }
    }
  } else {
    selfAdaptingTheme.value = null
  }
}

watch(() => props.music, (m) => { internalMusic.value = m })

watch(currentMusic, async (music) => {
  setSelfAdaptingTheme()

  const src = music.src

  if (/\.m3u8(?=(#|\?|$))/.test(src)) {
    const el = audio.value

    if (
      el?.canPlayType('application/x-mpegURL') ||
      el?.canPlayType('application/vnd.apple.mpegurl')
    ) {
      el.src = src
      return
    }

    try {
      // 👇避免 Vite 静态解析
      const mod = await new Function('return import("hls.js")')()
      const Hls = mod?.default

      if (Hls && Hls.isSupported()) {
        if (!hls) hls = new Hls()
        hls.loadSource(src)
        hls.attachMedia(el)
      } else {
        warn('HLS is not supported')
        if (el) el.src = src
      }
    } catch (e) {
      // 👇 没安装 hls.js 也不会炸
      warn('hls.js not installed')
      if (el) el.src = src
    }
  } else {
    if (audio.value) audio.value.src = src
  }
}, { immediate: false })

watch(isAudioMuted, (val) => { if (audio.value) audio.value.muted = val })
watch(() => props.preload, (val) => { if (audio.value && val) audio.value.preload = val as '' | 'none' | 'metadata' | 'auto' })
watch(audioVolume, (val) => { if (audio.value) audio.value.volume = val })
watch(() => props.muted, (val) => { internalMuted.value = val })
watch(() => props.volume, (val) => { internalVolume.value = val })
watch(() => props.shuffle, (val) => { internalShuffle.value = val })
watch(() => props.repeat, (val) => { internalRepeat.value = val })

shuffledList.value = getShuffledList()

onMounted(() => {
  // 检测移动端（延迟到客户端执行，避免 SSR 问题）
  if (typeof window !== 'undefined') {
    isMobile.value = /mobile/i.test(window.navigator.userAgent)
  }
  initAudio()
  setSelfAdaptingTheme()
  if (props.autoplay) play()
})

onBeforeUnmount(() => {
  // 清理 audio 事件监听器
  cleanupAudio()

  // 清理互斥锁
  if (activeMutex === audioRef.value) activeMutex = null

  // 清理 HLS 实例
  if (hls) hls.destroy()
})

defineExpose({ play, pause, toggle })
</script>

<style lang="scss">
@use "../scss/variables" as *;

.aplayer {
  font-family: Arial, Helvetica, sans-serif;
  color: #000;
  background-color: #fff;
  margin: 5px;
  box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.07), 0 1px 5px 0 rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  overflow: hidden;
  user-select: none;
  line-height: initial;

  * {
    box-sizing: content-box;
  }

  .aplayer-lrc-content {
    display: none;
  }

  .aplayer-body {
    display: flex;
    flex: 1;
    position: relative;

    .aplayer-info {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      text-align: start;
      padding: 10px 7px 7px 7px;
      height: $aplayer-height;
      box-sizing: border-box;
      overflow: hidden;

      .aplayer-music {
        flex-grow: 1;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        margin-left: 5px;
        user-select: text;
        cursor: default;
        padding-bottom: 2px;

        .aplayer-title {
          font-size: 14px;
        }

        .aplayer-author {
          font-size: 12px;
          color: #666;
        }
      }

      .aplayer-lrc {
        z-index: 0;
      }
    }
  }

  audio[controls] {
    display: block;
    width: 100%;
  }

  &.aplayer-mini {
    width: $aplayer-height;
  }

  &.aplayer-withlrc {
    .aplayer-body {
      .aplayer-pic {
        height: $aplayer-height-lrc;
        width: $aplayer-height-lrc;
      }

      .aplayer-info {
        height: $aplayer-height-lrc;
        padding: 10px 7px 7px 7px;
      }
    }
  }

  &.aplayer-withlist {
    .aplayer-body {
      .aplayer-info {
        border-bottom: 1px solid #e9e9e9;
      }

      .aplayer-controller .aplayer-time .aplayer-icon.aplayer-icon-menu {
        display: block;
      }
    }
  }

  position: relative;
  &.aplayer-float {
    z-index: 1;
    cursor: move;

    .aplayer-bar-wrap,
    .aplayer-volume-bar-wrap {
      cursor: pointer;
    }
  }
}

@keyframes aplayer-roll {
  0% { left: 0 }
  100% { left: -100% }
}

// Fixed 模式样式
.aplayer.aplayer-fixed {
  position: fixed;
  margin: 0;
  z-index: 99;
  overflow: visible;
  box-shadow: none;

  // 主体容器（包含 body 和 miniswitcher）
  .aplayer-fixed-body-wrap {
    display: flex;
    box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.07), 0 1px 5px 0 rgba(0, 0, 0, 0.1);
  }

  .aplayer-body {
    display: flex;
    overflow: hidden;
    background: #fff;
    transition: width 0.3s ease;
  }

  .aplayer-info {
    width: 300px;
    transform: scaleX(1);
    transform-origin: 0 0;
    transition: transform 0.3s ease, visibility 0.3s ease;
    border-bottom: none !important;
    border-top: 1px solid #e9e9e9;
    overflow: hidden;
    background: transparent;
  }

  .aplayer-list {
    border: 1px solid #eee;
    background: #fff;
    box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.07), 0 1px 5px 0 rgba(0, 0, 0, 0.1);
  }

  // 关闭按钮 - 折叠状态显示
  .aplayer-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    flex-shrink: 0;
    background: #e6e6e6;
    cursor: pointer;

    .aplayer-icon {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      padding: 0;
      cursor: pointer;

      svg {
        width: 12px;
        height: 12px;
      }

      .aplayer-fill {
        fill: #666;
      }

      &:hover .aplayer-fill {
        fill: #000;
      }
    }
  }

  // Mini 切换按钮 - 在最右侧
  .aplayer-miniswitcher {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    flex-shrink: 0;
    background: #e6e6e6;
    cursor: pointer;

    .aplayer-icon {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease;
      border: none;
      background: transparent;
      padding: 0;
      cursor: pointer;

      svg {
        width: 12px;
        height: 12px;
      }

      .aplayer-fill {
        fill: #666;
      }

      &:hover .aplayer-fill {
        fill: #000;
      }
    }
  }

  // Mini 状态
  &.aplayer-fixed-mini {
    .aplayer-info {
      transform: scaleX(0);
    }

    .aplayer-body {
      width: $aplayer-height !important;
    }
  }

  // ===== 位置变体 =====

  // 左下角（默认）- 箭头在右侧
  // 展开时箭头向左（收起），折叠时箭头向右（展开）
  &.aplayer-fixed-bottom-left {
    bottom: 0;
    left: 0;

    .aplayer-list {
      border-bottom: none;
    }

    .aplayer-fixed-body-wrap {
      border-radius: 0 2px 0 0;
    }

    .aplayer-miniswitcher {
      border-radius: 0 2px 2px 0;

      .aplayer-icon {
        transform: rotateY(180deg); // 展开时箭头向左
      }
    }

    &.aplayer-fixed-mini .aplayer-miniswitcher .aplayer-icon {
      transform: rotateY(0); // 折叠时箭头向右
    }
  }

  // 右下角 - 箭头在左侧
  // 展开时箭头向右（收起），折叠时箭头向左（展开）
  &.aplayer-fixed-bottom-right {
    bottom: 0;
    right: 0;

    .aplayer-list {
      border-bottom: none;
    }

    .aplayer-fixed-body-wrap {
      flex-direction: row-reverse;
      border-radius: 2px 0 0 0;
    }

    .aplayer-miniswitcher {
      border-radius: 2px 0 0 2px;

      .aplayer-icon {
        transform: rotateY(0); // 展开时箭头向右
      }
    }

    &.aplayer-fixed-mini .aplayer-miniswitcher .aplayer-icon {
      transform: rotateY(180deg); // 折叠时箭头向左
    }
  }

  // 左上角 - 箭头在右侧
  // 展开时箭头向左（收起），折叠时箭头向右（展开）
  &.aplayer-fixed-top-left {
    top: 0;
    left: 0;

    .aplayer-list {
      border-top: none;
    }

    .aplayer-fixed-body-wrap {
      border-radius: 0 0 2px 0;
    }

    .aplayer-miniswitcher {
      border-radius: 0 2px 2px 0;

      .aplayer-icon {
        transform: rotateY(180deg); // 展开时箭头向左
      }
    }

    &.aplayer-fixed-mini .aplayer-miniswitcher .aplayer-icon {
      transform: rotateY(0); // 折叠时箭头向右
    }
  }

  // 右上角 - 箭头在左侧
  // 展开时箭头向右（收起），折叠时箭头向左（展开）
  &.aplayer-fixed-top-right {
    top: 0;
    right: 0;

    .aplayer-list {
      border-top: none;
    }

    .aplayer-fixed-body-wrap {
      flex-direction: row-reverse;
      border-radius: 0 0 0 2px;
    }

    .aplayer-miniswitcher {
      border-radius: 2px 0 0 2px;

      .aplayer-icon {
        transform: rotateY(0); // 展开时箭头向右
      }
    }

    &.aplayer-fixed-mini .aplayer-miniswitcher .aplayer-icon {
      transform: rotateY(180deg); // 折叠时箭头向左
    }
  }
}

// Fixed 歌词样式 - 固定在屏幕底部（全局样式，因为使用 Teleport 渲染到 body）
.aplayer-lrc-fixed {
  position: fixed !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 10px !important;
  margin: 0 !important;
  z-index: 98 !important;
  pointer-events: none;

  &:before, &:after {
    display: none !important;
  }

  p {
    // 使用 -webkit-text-stroke 实现平滑描边
    -webkit-text-stroke: 1px rgba(255, 255, 255, 0.9);
    paint-order: stroke fill;
    // 8方向 text-shadow 作为回退和增强
    text-shadow:
      1px 0 1px rgba(255, 255, 255, 0.8),
      -1px 0 1px rgba(255, 255, 255, 0.8),
      0 1px 1px rgba(255, 255, 255, 0.8),
      0 -1px 1px rgba(255, 255, 255, 0.8),
      0.7px 0.7px 1px rgba(255, 255, 255, 0.8),
      -0.7px 0.7px 1px rgba(255, 255, 255, 0.8),
      0.7px -0.7px 1px rgba(255, 255, 255, 0.8),
      -0.7px -0.7px 1px rgba(255, 255, 255, 0.8);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  &.aplayer-lrc-hide {
    display: none !important;
  }
}
</style>

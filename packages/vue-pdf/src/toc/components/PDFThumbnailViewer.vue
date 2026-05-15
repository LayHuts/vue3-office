<template>
  <div class="thumbnail-viewer vue-pdf-scrollbar" ref="scrollableContainerRef" @scroll.passive="handleScroll">
    <div class="thumbnail-container" ref="containerRef">
      <PDFThumbnailView
        v-for="view in thumbnailViews"
        :key="view.id"
        :id="view.id"
        :pdf="pdf"
        :pdf-document="pdfDocument"
        :rendering-state="view.renderingState"
        :is-current="view.id === currentPage"
        :event-bus="eventBus"
        :link-service="linkService"
        :ref="el => setThumbRef(el, view.id)"
        @click="handleThumbnailClick(view.id)"
        @rendered="handleThumbnailRendered(view)"
        @state-change="(s) => handleThumbStateChange(view, s)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted, nextTick } from 'vue'
import PDFThumbnailView from './PDFThumbnailView.vue'
import { SidebarView, RenderingStates } from '../utils'
import type { EventBus, PDFLinkService, PDFRenderingQueue, IRenderableView } from '../services'

const SCROLL_OPTIONS: ScrollIntoViewOptions = { behavior: 'instant', block: 'nearest', inline: 'nearest' }

interface ThumbnailViewState {
  id: number
  renderingId: string
  renderingState: number
}

const props = defineProps<{
  pdf: any
  pdfDocument: any
  currentPage: number
  totalPages: number
  eventBus: EventBus
  linkService: PDFLinkService
  renderingQueue: PDFRenderingQueue
  isVisible?: boolean
}>()

const scrollableContainerRef = ref<HTMLElement>()
const containerRef = ref<HTMLElement>()
const thumbnailViews = reactive<ThumbnailViewState[]>([])
const thumbRefs = new Map<number, any>()

let scrollDown = true
let lastScrollTop = 0
let rafId: number | null = null
let scrollEndTimer: number | null = null

function setThumbRef(el: any, id: number) {
  if (el) thumbRefs.set(id, el)
  else thumbRefs.delete(id)
}

watch(
  () => props.totalPages,
  (newTotal) => {
    if (newTotal > 0) {
      thumbnailViews.length = 0
      for (let i = 1; i <= newTotal; i++) {
        thumbnailViews.push({
          id: i,
          renderingId: `thumbnail${i}`,
          renderingState: RenderingStates.INITIAL
        })
      }
      // 延后到下一帧调度
      requestAnimationFrame(() => scheduleForceRendering())
    }
  },
  { immediate: true }
)

/** 滚动（节流 + 滚动结束探测） */
function handleScroll() {
  if (!scrollableContainerRef.value) return
  const currentScrollTop = scrollableContainerRef.value.scrollTop
  scrollDown = currentScrollTop > lastScrollTop
  lastScrollTop = currentScrollTop

  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    // 滚动过程中不立即触发渲染，避免抢 worker
    if (scrollEndTimer !== null) clearTimeout(scrollEndTimer)
    scrollEndTimer = window.setTimeout(() => {
      scrollEndTimer = null
      scheduleForceRendering()
    }, 100)
  })
}

function getVisibleThumbs() {
  if (!scrollableContainerRef.value || !containerRef.value) {
    return { first: null, last: null, views: [], ids: new Set<number>() }
  }
  const scrollEl = scrollableContainerRef.value
  const top = scrollEl.scrollTop
  const bottom = top + scrollEl.clientHeight

  const visible: Array<{ id: number; percent: number; view: ThumbnailViewState }> = []
  const ids = new Set<number>()
  const elements = containerRef.value.querySelectorAll('.thumbnail-item') as NodeListOf<HTMLElement>

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i]
    const view = thumbnailViews[i]
    if (!view) continue
    const currentHeight = element.offsetTop
    const viewHeight = element.clientHeight
    const viewBottom = currentHeight + viewHeight
    if (viewBottom <= top || currentHeight >= bottom) continue
    const hiddenHeight = Math.max(0, top - currentHeight) + Math.max(0, viewBottom - bottom)
    const percent = Math.round(((viewHeight - hiddenHeight) / viewHeight) * 100)
    visible.push({ id: view.id, percent, view })
    ids.add(view.id)
  }

  return {
    first: visible[0] || null,
    last: visible[visible.length - 1] || null,
    views: visible,
    ids
  }
}

/** 把"需要渲染的缩略图"包装成 renderingQueue 可消费的 view */
function makeRenderableView(state: ThumbnailViewState): IRenderableView {
  return {
    id: state.id,
    renderingId: state.renderingId,
    get renderingState() {
      return state.renderingState
    },
    set renderingState(v: number) {
      state.renderingState = v
    },
    async draw() {
      // 切换到 RUNNING，PDFThumbnailView 的 watch 会触发真正渲染
      state.renderingState = RenderingStates.RUNNING
      // 等待渲染完成（或失败）
      await new Promise<void>((resolve) => {
        const check = () => {
          if (state.renderingState === RenderingStates.FINISHED || state.renderingState === RenderingStates.INITIAL) {
            resolve()
          } else {
            setTimeout(check, 50)
          }
        }
        check()
      })
    }
  }
}

function forceRendering(): boolean {
  if (!props.isVisible) return false
  const visible = getVisibleThumbs()
  if (visible.views.length === 0) return false

  // 可见的先渲染
  for (const item of visible.views) {
    if (item.view.renderingState !== RenderingStates.FINISHED) {
      const rv = makeRenderableView(item.view)
      props.renderingQueue.renderView(rv)
      return true
    }
  }

  // 预渲染方向上的下一个
  const firstId = visible.first?.id || 1
  const lastId = visible.last?.id || 1
  const preIdx = scrollDown ? lastId : firstId - 2
  const preView = thumbnailViews[preIdx]
  if (preView && preView.renderingState !== RenderingStates.FINISHED) {
    const rv = makeRenderableView(preView)
    props.renderingQueue.renderView(rv)
    return true
  }

  return false
}

function scheduleForceRendering() {
  // 让主视图的 renderingQueue 先判断优先级
  props.renderingQueue.renderHighestPriority()
}

function handleThumbnailRendered(view: ThumbnailViewState) {
  view.renderingState = RenderingStates.FINISHED
  // 当前缩略图完成后让队列继续
  props.renderingQueue.renderHighestPriority()
}

function handleThumbStateChange(view: ThumbnailViewState, state: number) {
  view.renderingState = state
}

function handleThumbnailClick(pageNumber: number) {
  props.linkService.goToPage(pageNumber)
}

function scrollThumbnailIntoView(pageNumber: number) {
  if (!props.totalPages) return
  const thumbnailView = thumbnailViews[pageNumber - 1]
  if (!thumbnailView) return
  const elements = containerRef.value?.querySelectorAll('.thumbnail-item') as NodeListOf<HTMLElement>
  const element = elements?.[pageNumber - 1]
  if (!element) {
    setTimeout(() => scrollThumbnailIntoView(pageNumber), 50)
    return
  }

  const { first, last, views } = getVisibleThumbs()
  if (views.length > 0) {
    let shouldScroll = false
    if (first && last && (pageNumber <= first.id || pageNumber >= last.id)) {
      shouldScroll = true
    } else {
      for (const { id, percent } of views) {
        if (id === pageNumber) {
          shouldScroll = percent < 100
          break
        }
      }
    }
    if (shouldScroll) element.scrollIntoView(SCROLL_OPTIONS)
  } else {
    element.scrollIntoView(SCROLL_OPTIONS)
  }
  nextTick(() => scheduleForceRendering())
}

let pageChangingHandler: ((evt: any) => void) | null = null
let sidebarViewChangedHandler: ((evt: any) => void) | null = null
let pageChangeScrollTimer: number | null = null

onMounted(() => {
  // 注册到渲染队列（低优先级，主视图满足后才轮到）
  props.renderingQueue.setThumbnailViewer({
    forceRendering,
    isThumbnailViewEnabled: () => props.isVisible === true
  })
  props.renderingQueue.isThumbnailViewEnabled = true

  pageChangingHandler = (evt: any) => {
    const pageNumber = evt.pageNumber
    if (pageNumber && pageNumber !== props.currentPage) {
      // 节流：100ms 内只滚一次，避免主视图每帧 emit 时反复 scrollIntoView
      if (pageChangeScrollTimer !== null) clearTimeout(pageChangeScrollTimer)
      pageChangeScrollTimer = window.setTimeout(() => {
        pageChangeScrollTimer = null
        scrollThumbnailIntoView(pageNumber)
      }, 100)
    }
  }
  props.eventBus.on('pagechanging', pageChangingHandler)

  sidebarViewChangedHandler = (evt: any) => {
    if (evt.scrollToPage && evt.view === SidebarView.THUMBS) {
      nextTick(() => {
        scrollThumbnailIntoView(evt.scrollToPage)
        scheduleForceRendering()
      })
    }
  }
  props.eventBus.on('sidebarviewchanged', sidebarViewChangedHandler)

  if (props.totalPages > 0) nextTick(() => scrollThumbnailIntoView(props.currentPage))
})

watch(
  () => props.currentPage,
  (newPage, oldPage) => {
    if (newPage !== oldPage && newPage > 0) {
      if (pageChangeScrollTimer !== null) clearTimeout(pageChangeScrollTimer)
      pageChangeScrollTimer = window.setTimeout(() => {
        pageChangeScrollTimer = null
        scrollThumbnailIntoView(newPage)
      }, 100)
    }
  }
)

watch(
  () => props.isVisible,
  (visible) => {
    props.renderingQueue.isThumbnailViewEnabled = visible === true
    if (visible) {
      nextTick(() => {
        scrollThumbnailIntoView(props.currentPage)
        scheduleForceRendering()
      })
    }
  }
)

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (scrollEndTimer) clearTimeout(scrollEndTimer)
  if (pageChangeScrollTimer) clearTimeout(pageChangeScrollTimer)
  if (pageChangingHandler) props.eventBus.off('pagechanging', pageChangingHandler)
  if (sidebarViewChangedHandler) props.eventBus.off('sidebarviewchanged', sidebarViewChangedHandler)
  props.renderingQueue.isThumbnailViewEnabled = false
})
</script>

<style scoped>
.thumbnail-viewer { height: 100%; overflow-y: auto; overscroll-behavior: contain; contain: strict; }
.thumbnail-container { display: flex; flex-direction: column; gap: 8px; padding: 8px 4px; }
</style>

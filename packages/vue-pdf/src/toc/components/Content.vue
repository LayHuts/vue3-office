<template>
  <div class="content-area">
    <div
      class="pdf-container vue-pdf-scrollbar"
      ref="containerRef"
      @scroll.passive="handleScroll"
    >
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>正在加载PDF...</p>
      </div>

      <div v-else class="pdf-content" ref="pdfContentRef"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { PDFPageView } from '../services/PDFPageView'
import type { EventBus, PDFLinkService, PDFRenderingQueue } from '../services'
import type { PDFLocation } from '../types'
import { PDF_TO_CSS_UNITS, DRAWING_DELAY, RenderingStates } from '../utils'
import { calculateTargetScale } from '../utils/scale-manager'
import { getDestCssOffsetY } from '../../components/utils/destination'

// ============================================================================

const CACHE_SIZE = 10
const PRELOAD_PAGES = 2
const PAGE_CHANGE_THROTTLE_MS = 100

/** 记录最近一次目录跳转的目标（含 destArray），用于尺寸变化后重新精确定位 */
let pendingDestination: { pageNumber: number; destArray: any[] | null } | null = null

const props = defineProps<{
  pdf: any
  pdfDocument: any
  currentPage: number
  scale: number | string
  loading: boolean
  totalPages: number
  eventBus: EventBus
  linkService: PDFLinkService
  renderingQueue: PDFRenderingQueue
}>()

const emit = defineEmits<{
  'page-change': [page: number]
  'scale-updated': [actualScale: number]
}>()

const containerRef = ref<HTMLElement>()
const pdfContentRef = ref<HTMLElement>()

const pageViews: PDFPageView[] = []
const visiblePageSet = new Set<number>()
/** 已完成渲染的页（LRU 插入顺序） */
const renderedOrder: number[] = []
const pagePromises = new Map<number, Promise<any>>()

let currentScale = PDF_TO_CSS_UNITS
let defaultPageSize = { width: 595, height: 842 }
let containerWidth = 0
let containerHeight = 0

let resizeObserver: ResizeObserver | null = null
let resizeDebounceTimer: number | null = null

let scrollRafId: number | null = null
let scrollEndTimer: number | null = null
let lastScrollTop = 0
let scrollDown = true

let lastEmittedPage = 0
let lastEmitTime = 0
let pendingEmitTimer: number | null = null
let pendingEmitPage: number | null = null

let currentLocation: PDFLocation | null = null

let scaleApplyTimer: number | null = null

/** 当前正在 draw 的 pageView，null 表示空闲 */
let currentRendering: PDFPageView | null = null
/** 调度请求标志。当 drawing 完成后回来看这个决定下一步 */
let schedulePending = false

// ============================================================================
// 页面准备
// ============================================================================

function getPageCached(pageNumber: number): Promise<any> {
  if (pagePromises.has(pageNumber)) return pagePromises.get(pageNumber)!
  const p = props.pdfDocument.getPage(pageNumber)
  pagePromises.set(pageNumber, p)
  return p
}

let isSettingUp = false

async function setupPageViews() {
  if (isSettingUp) return
  if (!props.pdfDocument || !pdfContentRef.value || pageViews.length > 0) return
  isSettingUp = true

  try {
    try {
      const first = await getPageCached(1)
      const vp = first.getViewport({ scale: 1 })
      defaultPageSize = { width: vp.width, height: vp.height }
    } catch { /* keep A4 */ }

    if (pageViews.length > 0) return // 别人已经做完

    containerWidth = containerRef.value?.clientWidth || 800
    containerHeight = containerRef.value?.clientHeight || 600
    currentScale = calculateTargetScale(
      props.scale,
      containerWidth,
      containerHeight,
      defaultPageSize.width,
      defaultPageSize.height
    )
    emit('scale-updated', currentScale)

    // 初始化容器 --scale-factor，所有 page 通过继承获得正确尺寸
    if (pdfContentRef.value) {
      pdfContentRef.value.style.setProperty('--scale-factor', String(currentScale))
      pdfContentRef.value.style.setProperty('--page-width', defaultPageSize.width + 'px')
      pdfContentRef.value.style.setProperty('--page-height', defaultPageSize.height + 'px')
    }

    const frag = document.createDocumentFragment()
    for (let i = 1; i <= props.totalPages; i++) {
      const v = new PDFPageView({
        id: i,
        scale: currentScale,
        defaultSize: defaultPageSize,
        enableTextLayer: true,
        enableAnnotationLayer: true,
        getPage: getPageCached,
        document: props.pdfDocument,
        linkService: props.linkService,
        onSizeChanged: handlePageSizeChanged
      })
      pageViews.push(v)
      frag.appendChild(v.div)
    }
    pdfContentRef.value!.appendChild(frag)
    console.log('[vue-pdf] ready:', pageViews.length, 'pages, scale=', currentScale.toFixed(2))

    setupResizeObserver()

    updateVisible()
    lastEmittedPage = determineCurrentPage()

    if (props.currentPage !== 1) {
      scrollToPage(props.currentPage, false)
    } else {
      schedule()
    }
  } finally {
    isSettingUp = false
  }
}

function teardownPageViews() {
  currentRendering?.cancel()
  for (const v of pageViews) v.destroy()
  pageViews.length = 0
  visiblePageSet.clear()
  renderedOrder.length = 0
  pagePromises.clear()
  currentRendering = null
  schedulePending = false
}

// ============================================================================
// 观察者
// ============================================================================

function setupResizeObserver() {
  if (!containerRef.value) return
  resizeObserver = new ResizeObserver((entries) => {
    for (const e of entries) {
      const { width, height } = e.contentRect
      if (width !== containerWidth || height !== containerHeight) {
        containerWidth = width
        containerHeight = height
        if (isFitMode()) {
          if (resizeDebounceTimer !== null) clearTimeout(resizeDebounceTimer)
          resizeDebounceTimer = window.setTimeout(() => {
            resizeDebounceTimer = null
            applyScale()
          }, 150)
        }
      }
    }
  })
  resizeObserver.observe(containerRef.value)
}

function isFitMode(): boolean {
  return typeof props.scale === 'string' && (props.scale === 'fit-width' || props.scale === 'fit-page')
}

// ============================================================================
// 可见页计算（同步）
// ============================================================================

function updateVisible() {
  if (!containerRef.value || pageViews.length === 0) return

  const scrollEl = containerRef.value
  const top = scrollEl.scrollTop
  const bottom = top + scrollEl.clientHeight
  const contentOffset = pdfContentRef.value ? pdfContentRef.value.offsetTop : 0

  // 二分查找第一个"底部 > top"的页
  let lo = 0
  let hi = pageViews.length - 1
  const afterTop = (i: number) => {
    const el = pageViews[i].div
    return el.offsetTop + contentOffset + el.clientHeight > top
  }
  if (!afterTop(hi)) return
  if (!afterTop(lo)) {
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (afterTop(mid)) hi = mid
      else lo = mid + 1
    }
  }

  visiblePageSet.clear()
  for (let i = lo; i < pageViews.length; i++) {
    const el = pageViews[i].div
    const eTop = el.offsetTop + contentOffset
    if (eTop >= bottom) break
    visiblePageSet.add(pageViews[i].id)
  }
}

function determineCurrentPage(): number {
  if (visiblePageSet.size === 0) return lastEmittedPage || 1
  if (visiblePageSet.has(lastEmittedPage)) return lastEmittedPage
  let min = Infinity
  for (const id of visiblePageSet) if (id < min) min = id
  return min === Infinity ? 1 : min
}

// ============================================================================
// 调度（单线程：永远只有 1 个 page 在 draw）
// ============================================================================

function pickNext(): PDFPageView | null {
  if (visiblePageSet.size === 0) return null
  const ids = Array.from(visiblePageSet).sort((a, b) => a - b)
  // 1. 可见页
  for (const id of ids) {
    const v = pageViews[id - 1]
    if (v && v.renderingState !== RenderingStates.FINISHED) return v
  }
  // 2. 预渲染：按滚动方向逐级扩展
  const first = ids[0]
  const last = ids[ids.length - 1]
  for (let d = 1; d <= PRELOAD_PAGES; d++) {
    const forward = scrollDown ? last + d : first - d
    const backward = scrollDown ? first - d : last + d
    if (forward >= 1 && forward <= props.totalPages) {
      const v = pageViews[forward - 1]
      if (v && v.renderingState !== RenderingStates.FINISHED) return v
    }
    if (backward >= 1 && backward <= props.totalPages) {
      const v = pageViews[backward - 1]
      if (v && v.renderingState !== RenderingStates.FINISHED) return v
    }
  }
  return null
}

/** 请求调度下一页。使用串行 Promise 链保证 worker 严格单任务 */
let drawChain: Promise<void> = Promise.resolve()

function schedule() {
  if (currentRendering) {
    schedulePending = true
    return
  }
  schedulePending = false
  const next = pickNext()
  if (!next) return
  drawView(next)
}

function drawView(view: PDFPageView) {
  if (currentRendering) {
    schedulePending = true
    return
  }
  currentRendering = view

  // 串行队尾追加，保证 getPage 也排队，不并发
  drawChain = drawChain
    .then(async () => {
      try {
        // 走到执行时再校验一次是否仍需要画
        if (!shouldStillRender(view) && !visiblePageSet.has(view.id)) {
          return
        }
        await view.draw()
        if (view.renderingState === RenderingStates.FINISHED) {
          const idx = renderedOrder.indexOf(view.id)
          if (idx >= 0) renderedOrder.splice(idx, 1)
          renderedOrder.push(view.id)
          evictLRU()
        }
      } catch (e: any) {
        const name = e?.name
        if (name !== 'RenderingCancelledException' && name !== 'AbortException') {
          console.error('[vue-pdf] drawView error:', e)
        }
      }
    })
    .finally(() => {
      if (currentRendering === view) currentRendering = null
      schedule()
    })
}

/** 该 view 在当前可见集合或预渲染范围里 */
function shouldStillRender(view: PDFPageView): boolean {
  if (visiblePageSet.has(view.id)) return true
  if (visiblePageSet.size === 0) return false
  let first = Infinity, last = -Infinity
  for (const id of visiblePageSet) {
    if (id < first) first = id
    if (id > last) last = id
  }
  return view.id >= first - PRELOAD_PAGES && view.id <= last + PRELOAD_PAGES
}

function evictLRU() {
  while (renderedOrder.length > CACHE_SIZE) {
    const oldest = renderedOrder.shift()!
    if (visiblePageSet.has(oldest)) {
      renderedOrder.push(oldest)
      continue
    }
    const v = pageViews[oldest - 1]
    if (v) v.reset()
  }
}

// ============================================================================
// 滚动
// ============================================================================

function handleScroll() {
  if (!containerRef.value) return
  const st = containerRef.value.scrollTop
  scrollDown = st >= lastScrollTop
  lastScrollTop = st

  // rAF 节流：更新可见集 + emit + schedule
  // 不主动 cancel 正在跑的 draw（让 worker 跑完最重的 canvas），
  // 靠 drawChain 内部 shouldStillRender 跳过已失效的排队任务
  if (scrollRafId === null) {
    scrollRafId = requestAnimationFrame(() => {
      scrollRafId = null
      updateVisible()
      maybeEmitCurrentPage()
      updateLocation()
      if (!currentRendering) schedule()
    })
  }

  // 滚动停止补一次 schedule，兜底
  if (scrollEndTimer !== null) clearTimeout(scrollEndTimer)
  scrollEndTimer = window.setTimeout(() => {
    scrollEndTimer = null
    updateVisible()
    schedule()
  }, 100)
}

function updateLocation() {
  if (!containerRef.value || visiblePageSet.size === 0) return
  let first = Infinity
  for (const id of visiblePageSet) if (id < first) first = id
  if (first === Infinity) return
  const pv = pageViews[first - 1]
  if (!pv) return
  const contentOffset = pdfContentRef.value ? pdfContentRef.value.offsetTop : 0
  const pageTop = pv.div.offsetTop + contentOffset
  const pageLeft = pv.div.offsetLeft
  const sT = containerRef.value.scrollTop
  const sL = containerRef.value.scrollLeft
  currentLocation = {
    pageNumber: first,
    scale: currentScale,
    left: Math.round((sL - pageLeft) / currentScale),
    top: Math.round((sT - pageTop) / currentScale)
  }
}

function scrollToLocation(loc: PDFLocation, scale: number) {
  const pv = pageViews[loc.pageNumber - 1]
  if (!pv || !containerRef.value) return
  const contentOffset = pdfContentRef.value ? pdfContentRef.value.offsetTop : 0
  containerRef.value.scrollTop = pv.div.offsetTop + contentOffset + loc.top * scale
  containerRef.value.scrollLeft = Math.max(0, pv.div.offsetLeft + loc.left * scale)
}

// ============================================================================
// page-change emit
// ============================================================================

function maybeEmitCurrentPage() {
  const current = determineCurrentPage()
  if (current === lastEmittedPage) return
  lastEmittedPage = current
  const now = performance.now()
  const elapsed = now - lastEmitTime
  if (elapsed >= PAGE_CHANGE_THROTTLE_MS) {
    doEmitPage(current)
  } else {
    pendingEmitPage = current
    if (pendingEmitTimer === null) {
      pendingEmitTimer = window.setTimeout(() => {
        pendingEmitTimer = null
        if (pendingEmitPage !== null) doEmitPage(pendingEmitPage)
        pendingEmitPage = null
      }, PAGE_CHANGE_THROTTLE_MS - elapsed)
    }
  }
}

function doEmitPage(p: number) {
  lastEmitTime = performance.now()
  emit('page-change', p)
}

// ============================================================================
// 跳转
// ============================================================================

function scrollToPage(pageNum: number, smooth = false, offsetY = 0) {
  if (!containerRef.value) return
  const pv = pageViews[pageNum - 1]
  if (!pv) return
  const contentOffset = pdfContentRef.value ? pdfContentRef.value.offsetTop : 0
  // offsetY 来自 destArray 的精确位置（已经是 CSS px），默认 -10 给一个轻微的上边距
  const target = pv.div.offsetTop + contentOffset + (offsetY || -10)

  // 取消当前 draw
  if (currentRendering) currentRendering.cancel()

  containerRef.value.scrollTo({
    top: Math.max(0, target),
    behavior: smooth ? 'smooth' : 'auto'
  })

  // 瞬间跳转：scrollTop 同步生效
  if (!smooth) {
    updateVisible()
    lastEmittedPage = pageNum
    schedule()
  } else {
    nextTick(() => {
      updateVisible()
      schedule()
    })
  }
}

/**
 * 解析 destArray 内的 Y 偏移，单位换算到 CSS px。
 * 公共逻辑在 components/utils/destination.ts，单页模式与 toc 多页共用。
 *   PDF 坐标系原点在页面左下角，Y 越大越靠上；
 *   而 CSS 中 div.offsetTop 越大越靠下，所以由共享函数做 (pageHeight - destY) 换算。
 */
function getDestinationOffsetY(pv: PDFPageView, destArray: any[]): number {
  const pageHeight = pv.pageSize.height
  const pageRect = pv.div.getBoundingClientRect()
  // 当前实际显示比例（CSS px / PDF user-space unit）
  const actualScale = pageHeight > 0 ? pageRect.height / pageHeight : 1
  return getDestCssOffsetY(destArray, pageHeight, actualScale)
}

function scrollToDestinationArray(pageNumber: number, destArray: any[]) {
  const pv = pageViews[pageNumber - 1]
  if (!pv) {
    scrollToPage(pageNumber, false)
    return
  }
  const offsetY = getDestinationOffsetY(pv, destArray)
  scrollToPage(pageNumber, false, offsetY)
}

function adjustExactPosition(pageNumber: number, destArray: any[]) {
  const pv = pageViews[pageNumber - 1]
  if (!pv || !containerRef.value) return
  const destType = destArray[1]
  const destName = typeof destType === 'object' ? destType.name : destType
  const pageHeight = pv.pageSize.height
  const pageRect = pv.div.getBoundingClientRect()
  const actualScale = pageRect.height / pageHeight

  let offsetY = 0
  if (destName === 'XYZ' && destArray[3] != null) {
    offsetY = (pageHeight - destArray[3]) * actualScale
  } else if ((destName === 'FitH' || destName === 'FitBH') && destArray[2] != null) {
    offsetY = (pageHeight - destArray[2]) * actualScale
  }
  const contentOffset = pdfContentRef.value ? pdfContentRef.value.offsetTop : 0
  containerRef.value.scrollTo({
    top: Math.max(0, pv.div.offsetTop + contentOffset + offsetY),
    behavior: 'auto'
  })
}

// ============================================================================
// 缩放
// ============================================================================

let pendingScaleRaf: number | null = null

function applyScale() {
  // 用 rAF 合并同一帧内的多次调用（比如 scale 变化 + resize 事件）
  if (pendingScaleRaf !== null) return
  pendingScaleRaf = requestAnimationFrame(() => {
    pendingScaleRaf = null
    doApplyScale()
  })
}

function doApplyScale() {
  if (!containerRef.value) return
  const newScale = calculateTargetScale(
    props.scale,
    containerWidth || containerRef.value.clientWidth,
    containerHeight || containerRef.value.clientHeight,
    defaultPageSize.width,
    defaultPageSize.height
  )
  if (Math.abs(newScale - currentScale) < 1e-6) return

  // 记录缩放前的锚点位置（PDF 坐标系）
  updateLocation()
  const before = currentLocation ? { ...currentLocation } : null

  currentScale = newScale
  emit('scale-updated', newScale)

  // 一次性改容器 CSS 变量，所有 page div 通过继承自动生效
  if (pdfContentRef.value) {
    pdfContentRef.value.style.setProperty('--scale-factor', String(newScale))
  }
  // canvas 通过 transform scale 做预览（每个页独立合成层）
  for (const v of pageViews) v.setScale(newScale)

  // 立即（同步）滚回原锚点，避免抖动
  if (before) {
    scrollToLocation(before, newScale)
    lastScrollTop = containerRef.value.scrollTop
  }

  if (scaleApplyTimer) clearTimeout(scaleApplyTimer)
  scaleApplyTimer = window.setTimeout(() => {
    scaleApplyTimer = null
    for (const v of pageViews) v.markDirtyForRescale()
    updateVisible()
    schedule()
  }, DRAWING_DELAY)
}

// ============================================================================
// 监听
// ============================================================================

watch(
  () => [props.pdfDocument, props.totalPages] as const,
  ([doc, total]) => {
    if (!doc || !total) return
    if (pageViews.length > 0) return
    nextTick(() => setupPageViews())
  },
  { immediate: true }
)

watch(
  () => props.loading,
  (l) => {
    if (!l && props.pdfDocument && pageViews.length === 0) {
      nextTick(() => setupPageViews())
    }
  }
)

watch(() => props.scale, () => applyScale(), { flush: 'post' })

// ============================================================================
// eventBus
// ============================================================================

function onPageNumberChange(evt: any) {
  if (!evt.pageNumber) return
  if (evt.destArray && Array.isArray(evt.destArray)) {
    pendingDestination = { pageNumber: evt.pageNumber, destArray: evt.destArray }
    scrollToDestinationArray(evt.pageNumber, evt.destArray)
  } else {
    pendingDestination = { pageNumber: evt.pageNumber, destArray: null }
    scrollToPage(evt.pageNumber, false)
  }
}

/**
 * 某一页的 div 高度变化（canvas 渲染后用真实 viewport 更新 --page-height）时
 * 根据该页相对 scrollTop 的位置补偿，避免画面抖动。
 */
function handlePageSizeChanged(view: PDFPageView, oldH: number, newH: number) {
  if (!containerRef.value || !pdfContentRef.value) return
  const delta = newH - oldH
  if (delta === 0) return

  const contentOffset = pdfContentRef.value.offsetTop
  const pageTop = view.div.offsetTop + contentOffset

  // 目录跳转：如果是正在跳转的目标页，完成后重新对齐到精确位置
  if (pendingDestination && view.id === pendingDestination.pageNumber) {
    const dest = pendingDestination
    requestAnimationFrame(() => {
      if (!pendingDestination) return
      if (dest.destArray) {
        scrollToDestinationArray(dest.pageNumber, dest.destArray)
      } else {
        scrollToPage(dest.pageNumber, false)
      }
      pendingDestination = null
    })
    return
  }

  // 普通滚动：如果该页在 scrollTop 之上，内容整体下移 delta → 补偿 scrollTop
  if (pageTop < containerRef.value.scrollTop) {
    containerRef.value.scrollTop += delta
    lastScrollTop = containerRef.value.scrollTop
  }
}

onMounted(() => {
  props.eventBus.on('pagenumberchange', onPageNumberChange)
})

onUnmounted(() => {
  props.eventBus.off('pagenumberchange', onPageNumberChange)
  if (scrollRafId) cancelAnimationFrame(scrollRafId)
  if (scrollEndTimer) clearTimeout(scrollEndTimer)
  if (pendingEmitTimer) clearTimeout(pendingEmitTimer)
  if (scaleApplyTimer) clearTimeout(scaleApplyTimer)
  if (pendingScaleRaf) cancelAnimationFrame(pendingScaleRaf)
  if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer)
  resizeObserver?.disconnect()
  teardownPageViews()
})

function recalculateScale() {
  if (!containerRef.value) return
  containerWidth = containerRef.value.clientWidth
  containerHeight = containerRef.value.clientHeight
  applyScale()
}

defineExpose({
  scrollToDestination: (d: any) => {
    if (d?.pageNumber) scrollToPage(d.pageNumber, false)
  },
  recalculateScale
})
</script>

<style scoped>
.content-area { flex: 1; display: flex; flex-direction: column; background: var(--pdf-bg-dark); position: relative; overflow: hidden; }
.pdf-container { flex: 1; overflow: auto; scroll-behavior: auto; overscroll-behavior: contain; scrollbar-gutter: stable; contain: strict; }
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--pdf-text-primary); }
.spinner { width: 48px; height: 48px; border: 4px solid rgba(255,255,255,0.1); border-top-color: var(--pdf-primary-color); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
.pdf-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  gap: 15px;
  --scale-factor: 1;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>

<style>
.pdf-content .pdf-page-container {
  position: relative;
  overflow: hidden;
  box-shadow: var(--pdf-shadow-lg);
  border-radius: 4px;
  background: #fff;
  margin: 1px auto;
  box-sizing: border-box;
  contain: layout paint;
  /* 尺寸由父容器 --scale-factor 驱动，所有页面一次 CSS 变量更新即生效 */
  width: calc(var(--page-width, 595px) * var(--scale-factor, 1));
  height: calc(var(--page-height, 842px) * var(--scale-factor, 1));
}
.pdf-content .pdf-page-container .canvas-wrapper {
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
}
.pdf-content .pdf-page-container .canvas-wrapper canvas {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: -webkit-optimize-contrast;
}
.pdf-content .pdf-page-container .textLayer {
  position: absolute; inset: 0; overflow: clip; opacity: 1;
  line-height: 1; text-size-adjust: none; forced-color-adjust: none;
  transform-origin: 0 0; z-index: 2;
  caret-color: CanvasText;
  -webkit-user-select: text;
  user-select: text;

  /* pdfjs-dist 5.x 计算文本 span 字号/缩放需要的变量，缺一不可 */
  --min-font-size: 1;
  --text-scale-factor: calc(var(--total-scale-factor) * var(--min-font-size));
  --min-font-size-inv: calc(1 / var(--min-font-size));
}
.pdf-content .pdf-page-container .textLayer.highlighting {
  touch-action: none;
}
.pdf-content .pdf-page-container .textLayer :is(span, br) {
  color: transparent; position: absolute; white-space: pre;
  cursor: text; transform-origin: 0% 0%;
}
/* 关键：让每个文本 span 按 --font-height/--scale-x 缩放，与 canvas 文字精确对齐，
   否则鼠标拖选会断断续续。 */
.pdf-content .pdf-page-container .textLayer > :not(.markedContent),
.pdf-content .pdf-page-container .textLayer .markedContent span:not(.markedContent) {
  z-index: 1;
  --font-height: 0;
  font-size: calc(var(--text-scale-factor) * var(--font-height));
  --scale-x: 1;
  --rotate: 0deg;
  transform: rotate(var(--rotate)) scaleX(var(--scale-x))
    scale(var(--min-font-size-inv));
}
.pdf-content .pdf-page-container .textLayer .markedContent {
  display: contents;
}
.pdf-content .pdf-page-container .textLayer span[role="img"] {
  -webkit-user-select: none;
  user-select: none;
  cursor: default;
}
.pdf-content .pdf-page-container .textLayer ::selection {
  background: rgba(0, 0, 255, 0.3);
  background: color-mix(in srgb, AccentColor, transparent 70%);
}
.pdf-content .pdf-page-container .textLayer br::selection {
  background: transparent;
}
.pdf-content .pdf-page-container .textLayer .endOfContent {
  display: block;
  position: absolute;
  inset: 100% 0 0;
  z-index: 0;
  cursor: default;
  -webkit-user-select: none;
  user-select: none;
}
.pdf-content .pdf-page-container .textLayer.selecting .endOfContent {
  top: 0;
}
.pdf-content .pdf-page-container .annotationLayer {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none; z-index: 3;
}
.pdf-content .pdf-page-container .annotationLayer section {
  position: absolute; pointer-events: auto; box-sizing: border-box;
}
.pdf-content .pdf-page-container .annotationLayer .linkAnnotation { cursor: pointer; }
.pdf-content .pdf-page-container .annotationLayer .linkAnnotation > a {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; font-size: 1em;
}
.pdf-content .pdf-page-container .annotationLayer .linkAnnotation:not(.hasBorder) > a:hover {
  opacity: 0.2; background-color: rgb(255 255 0);
}
</style>

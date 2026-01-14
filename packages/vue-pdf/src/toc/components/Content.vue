<template>
  <div class="content-area">
    <div class="pdf-container vue-pdf-scrollbar" ref="containerRef" @scroll="handleScroll" :style="containerStyle">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>正在加载PDF...</p>
      </div>

      <div v-else class="pdf-content" ref="pdfContentRef">
        <div
          v-for="pageNum in totalPages"
          :key="pageNum"
          class="pdf-page-container"
          :class="{ 'current-page': pageNum === currentPage, 'css-transform-active': isCssTransformActive }"
          :data-page-number="pageNum"
          :ref="el => setPageRef(el as HTMLElement, pageNum)"
          :style="pageContainerStyle"
        >
          <div class="canvas-wrapper" v-if="shouldRenderPage(pageNum)" :style="canvasWrapperStyle">
            <!-- 页面渲染中的加载遮罩 -->
            <div v-if="!isPageRendered(pageNum)" class="page-loading-overlay">
              <div class="loading-spinner"></div>
              <span class="loading-text">{{ pageNum }}</span>
            </div>
            <VuePdf
              :ref="el => setVuePdfRef(el, pageNum)"
              :pdf="pdf"
              :page="pageNum"
              :scale="renderScale"
              text-layer
              annotation-layer
              @loaded="(viewport) => handlePageLoaded(viewport, pageNum)"
              @error="(err) => handlePageError(err, pageNum)"
              @annotation="handleAnnotation"
            />
          </div>

          <div v-else class="page-placeholder">
            <div class="placeholder-content">
              <div class="loading-spinner"></div>
              <span class="placeholder-text">{{ pageNum }}</span>
            </div>
          </div>

          <div class="page-number-badge">{{ pageNum }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import VuePdf from '../../components/main.vue'
import type { EventBus, PDFLinkService, PDFRenderingQueue } from '../services'
import type { PDFLocation } from '../types'
import {
  DEFAULT_CACHE_SIZE,
  PDF_TO_CSS_UNITS,
  SCROLLBAR_PADDING,
  DRAWING_DELAY,
  MIN_SCALE, MAX_SCALE,
  RenderingStates
} from '../utils'
import { getVisiblePages, determineCurrentPage } from '../utils/visible-pages'
import { updateLocation as updateLocationUtil, scrollToLocation as scrollToLocationUtil, scrollToPage as scrollToPageUtil } from '../utils/scroll-manager'
import { calculateTargetScale, getPageContainerStyle, getCanvasWrapperStyle, getContainerStyle } from '../utils/scale-manager'
import { PageCacheManager } from '../utils/page-cache-manager'

const PRELOAD_PAGES = 2

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

const emit = defineEmits<{ 'page-change': [page: number]; 'scale-updated': [actualScale: number] }>()

const containerRef = ref<HTMLElement>()
const pdfContentRef = ref<HTMLElement>()
const pageRefs = ref<Map<number, HTMLElement>>(new Map())
const vuePdfRefs = ref<Map<number, any>>(new Map())

const cacheManager = new PageCacheManager(PRELOAD_PAGES, DEFAULT_CACHE_SIZE)
const forceRenderUpdate = ref(0)
const defaultPageSize = ref({ width: 595, height: 842 })

let rafId: number | null = null
let internalPageChange = false
let lastEmittedPage = 0
let scrollingToPage: number | null = null
let currentLocation: PDFLocation | null = null

const renderScale = ref(PDF_TO_CSS_UNITS)
const isCssTransformActive = ref(false)
let scaleTimeoutId: number | null = null
let lastScaleChangeTime = 0

const pageRenderingStates = ref<Map<number, number>>(new Map())

// 是否处于自适应模式
const isFitMode = computed(() => typeof props.scale === 'string' && (props.scale === 'fit-width' || props.scale === 'fit-page'))

// 容器宽度响应式引用（用于自适应模式）
const containerWidth = ref(0)
const containerHeight = ref(0)

const targetScale = computed(() => {
  if (defaultPageSize.value.width === 595) {
    if (typeof props.scale === 'number') return props.scale * PDF_TO_CSS_UNITS
    return PDF_TO_CSS_UNITS
  }
  // 使用响应式的容器尺寸
  const width = containerWidth.value || containerRef.value?.clientWidth || 800
  const height = containerHeight.value || containerRef.value?.clientHeight || 600
  return calculateTargetScale(props.scale, width, height, defaultPageSize.value.width, defaultPageSize.value.height)
})

const cssScale = computed(() => targetScale.value / renderScale.value)

// 容器样式：使用 CSS 变量
const containerStyle = computed(() => ({
  '--scale-factor': targetScale.value,
  '--page-width': defaultPageSize.value.width + 'px',
  '--page-height': defaultPageSize.value.height + 'px'
}))

// 页面容器样式：使用 CSS calc 和变量
const pageContainerStyle = computed(() => ({
  width: `calc(var(--scale-factor) * var(--page-width))`,
  height: `calc(var(--scale-factor) * var(--page-height))`
}))

const canvasWrapperStyle = computed(() => getCanvasWrapperStyle(cssScale.value, isCssTransformActive.value))

function setPageRef(el: HTMLElement | null, pageNum: number) { if (el) pageRefs.value.set(pageNum, el) }
function setVuePdfRef(el: any, pageNum: number) { if (el) vuePdfRefs.value.set(pageNum, el) }

function cancelAllRendering() {
  for (const [, vuePdfRef] of vuePdfRefs.value) {
    if (vuePdfRef?.cancel) vuePdfRef.cancel()
  }
}

function shouldRenderPage(pageNum: number): boolean {
  forceRenderUpdate.value
  return cacheManager.shouldRenderPage(pageNum, props.currentPage, props.totalPages)
}

function isPageRendered(pageNum: number): boolean {
  return pageRenderingStates.value.get(pageNum) === RenderingStates.FINISHED
}

function handlePageLoaded(viewport: any, pageNum: number) {
  pageRenderingStates.value.set(pageNum, RenderingStates.FINISHED)
  cacheManager.addPage(pageNum)
  if (pageNum === 1 && viewport.rawDims) {
    defaultPageSize.value = { width: viewport.rawDims.pageWidth, height: viewport.rawDims.pageHeight }
    if (typeof props.scale === 'string') nextTick(() => emit('scale-updated', targetScale.value))
  }
}

function handlePageError(error: any, pageNum: number) {
  console.warn(`PDF页面 ${pageNum} 渲染错误:`, error)
  pageRenderingStates.value.set(pageNum, RenderingStates.INITIAL)
  props.eventBus.dispatch('pageerror', { pageNumber: pageNum, error })
}

function handleAnnotation(payload: any) {
  if (payload.type === 'internal-link' && payload.data?.referencedPage) {
    props.linkService.goToPage(payload.data.referencedPage)
  }
}

function updateLocation(firstVisiblePage: { id: number } | null) {
  if (!firstVisiblePage || !containerRef.value) return
  const pageEl = pageRefs.value.get(firstVisiblePage.id)
  if (!pageEl) return
  currentLocation = updateLocationUtil(containerRef.value, pdfContentRef.value || null, pageEl, firstVisiblePage.id, targetScale.value)
}

function handleScroll() {
  if (rafId) return
  rafId = requestAnimationFrame(() => { rafId = null; update() })
}

function update() {
  if (!containerRef.value) return
  const visible = getVisiblePages(containerRef.value)
  const visiblePages = visible.views
  if (visiblePages.length === 0) return
  if (cacheManager.updateBuffer(visible.ids, props.totalPages)) forceRenderUpdate.value++
  if (scrollingToPage !== null) {
    const targetVisible = visiblePages.some(p => p.id === scrollingToPage)
    if (targetVisible) scrollingToPage = null
    else return
  }
  const newCurrentPage = determineCurrentPage(visiblePages, lastEmittedPage)
  if (newCurrentPage !== lastEmittedPage) {
    lastEmittedPage = newCurrentPage
    internalPageChange = true
    emit('page-change', newCurrentPage)
    nextTick(() => { internalPageChange = false })
  }
  updateLocation(visible.first)
}

function scrollToPage(pageNum: number, smooth = true) {
  const pageEl = pageRefs.value.get(pageNum)
  if (!pageEl || !containerRef.value) {
    cacheManager.preloadAround(pageNum, props.totalPages)
    forceRenderUpdate.value++
    scrollingToPage = pageNum
    lastEmittedPage = pageNum
    setTimeout(() => scrollToPage(pageNum, smooth), 100)
    return
  }
  scrollingToPage = pageNum
  lastEmittedPage = pageNum
  cacheManager.preloadAround(pageNum, props.totalPages)
  forceRenderUpdate.value++
  scrollToPageUtil(containerRef.value, pdfContentRef.value || null, pageEl, smooth)
}

function scrollToLocation(location: PDFLocation, newScale: number) {
  const pageEl = pageRefs.value.get(location.pageNumber)
  if (!pageEl || !containerRef.value) {
    cacheManager.addPage(location.pageNumber)
    forceRenderUpdate.value++
    setTimeout(() => scrollToLocation(location, newScale), 50)
    return
  }
  scrollToLocationUtil(containerRef.value, pdfContentRef.value || null, pageEl, location, newScale)
}

function scrollToDestination(destination: any, smooth = true) {
  if (!destination) return
  scrollToPage(destination.pageNumber || 1, smooth)
}

watch(() => props.scale, () => {
  const now = Date.now()
  lastScaleChangeTime = now
  if (scaleTimeoutId) { clearTimeout(scaleTimeoutId); scaleTimeoutId = null }
  const locationBeforeScale = currentLocation ? { ...currentLocation } : null
  const previousScale = renderScale.value
  const newTargetScale = targetScale.value
  emit('scale-updated', newTargetScale)
  if (Math.abs(newTargetScale - previousScale) < 1e-10) return
  isCssTransformActive.value = true
  if (locationBeforeScale && containerRef.value) requestAnimationFrame(() => scrollToLocation(locationBeforeScale, newTargetScale))
  scaleTimeoutId = window.setTimeout(() => {
    if (lastScaleChangeTime !== now) return
    cancelAllRendering()
    for (const [pageNum] of pageRenderingStates.value) pageRenderingStates.value.set(pageNum, RenderingStates.INITIAL)
    renderScale.value = newTargetScale
    isCssTransformActive.value = false
    forceRenderUpdate.value++
    requestAnimationFrame(() => {
      if (locationBeforeScale && containerRef.value) scrollToLocation(locationBeforeScale, newTargetScale)
      nextTick(() => update())
    })
    scaleTimeoutId = null
  }, DRAWING_DELAY)
}, { immediate: true })

watch(() => props.currentPage, (newPage, oldPage) => {
  if (newPage === oldPage || internalPageChange) return
  cacheManager.preloadAround(newPage, props.totalPages)
  forceRenderUpdate.value++
  nextTick(() => { const pageJump = Math.abs(newPage - oldPage); scrollToPage(newPage, pageJump <= 5) })
}, { flush: 'post' })

watch(() => props.totalPages, (newTotal) => {
  if (newTotal > 0 && cacheManager.size === 0) initializeRendering()
}, { immediate: true })

watch(() => props.loading, (isLoading) => {
  if (!isLoading && props.totalPages > 0) nextTick(() => { if (cacheManager.size === 0) initializeRendering(); else update() })
})

function initializeRendering() {
  if (props.totalPages <= 0) return
  lastEmittedPage = props.currentPage
  cacheManager.initializeRendering(props.currentPage, props.totalPages)
  forceRenderUpdate.value++
  nextTick(() => {
    if (containerRef.value) {
      const visible = getVisiblePages(containerRef.value)
      cacheManager.updateBuffer(visible.ids, props.totalPages)
      updateLocation(visible.first)
    }
  })
}

// 强制重新计算缩放（用于侧边栏切换等场景）
function recalculateScale() {
  if (typeof props.scale !== 'string') return
  if (props.scale !== 'fit-width' && props.scale !== 'fit-page' && props.scale !== 'auto') return
  if (!containerRef.value) return

  // 更新容器尺寸，触发 targetScale 重新计算
  containerWidth.value = containerRef.value.clientWidth
  containerHeight.value = containerRef.value.clientHeight

  const newTargetScale = targetScale.value

  // 如果缩放值有变化，重新渲染
  if (Math.abs(newTargetScale - renderScale.value) > 0.01) {
    const locationBeforeScale = currentLocation ? { ...currentLocation } : null

    emit('scale-updated', newTargetScale)

    cancelAllRendering()
    for (const [pageNum] of pageRenderingStates.value) {
      pageRenderingStates.value.set(pageNum, RenderingStates.INITIAL)
    }

    renderScale.value = newTargetScale
    forceRenderUpdate.value++

    requestAnimationFrame(() => {
      if (locationBeforeScale && containerRef.value) {
        scrollToLocation(locationBeforeScale, newTargetScale)
      }
      nextTick(() => update())
    })
  }
}

onMounted(() => {
  props.eventBus.on('pagenumberchange', (evt: any) => {
    if (evt.pageNumber && evt.pageNumber !== props.currentPage) scrollToPage(evt.pageNumber, true)
  })

  // 使用 ResizeObserver 监听容器尺寸变化
  if (containerRef.value) {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width !== containerWidth.value || height !== containerHeight.value) {
          containerWidth.value = width
          containerHeight.value = height

          // 如果是自适应模式且缩放有变化，重新渲染
          if (isFitMode.value && Math.abs(targetScale.value - renderScale.value) > 0.01) {
            const locationBeforeScale = currentLocation ? { ...currentLocation } : null
            emit('scale-updated', targetScale.value)

            cancelAllRendering()
            for (const [pageNum] of pageRenderingStates.value) {
              pageRenderingStates.value.set(pageNum, RenderingStates.INITIAL)
            }

            renderScale.value = targetScale.value
            forceRenderUpdate.value++

            if (locationBeforeScale) {
              requestAnimationFrame(() => {
                scrollToLocation(locationBeforeScale, targetScale.value)
                nextTick(() => update())
              })
            }
          }
        }
      }
    })
    resizeObserver.observe(containerRef.value)
  }

  if (props.totalPages > 0 && !props.loading) initializeRendering()
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (scaleTimeoutId) clearTimeout(scaleTimeoutId)
  cancelAllRendering()
})

defineExpose({ scrollToDestination, recalculateScale })
</script>

<style scoped>
.content-area { flex: 1; display: flex; flex-direction: column; background: var(--pdf-bg-dark); position: relative; overflow: hidden; }
.pdf-container { --scale-factor: 1; --page-width: 595px; --page-height: 842px; flex: 1; overflow: auto; scroll-behavior: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; scrollbar-gutter: stable; }
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--pdf-text-primary); }
.spinner { width: 48px; height: 48px; border: 4px solid rgba(255,255,255,0.1); border-top-color: var(--pdf-primary-color); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
.pdf-content { display: flex; flex-direction: column; align-items: center; padding: 10px; gap: 15px; }
.pdf-page-container { position: relative; overflow: hidden; box-shadow: var(--pdf-shadow-lg); border-radius: 4px; background: #fff; margin: 1px auto; box-sizing: border-box; }
.pdf-page-container.current-page { box-shadow: 0 4px 20px var(--pdf-primary-shadow); }
.canvas-wrapper { overflow: hidden; position: relative; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.pdf-page-container.css-transform-active .canvas-wrapper { will-change: transform; }
.canvas-wrapper :deep(span) { display: block; line-height: 0; }
.canvas-wrapper :deep(canvas) { display: block; width: 100%; height: 100%; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; }
.canvas-wrapper :deep(.textLayer) { position: absolute; text-align: initial; inset: 0; overflow: clip; opacity: 1; line-height: 1; text-size-adjust: none; forced-color-adjust: none; transform-origin: 0 0; caret-color: CanvasText; z-index: 2; }
.canvas-wrapper :deep(.textLayer) :is(span, br) { color: transparent; position: absolute; white-space: pre; cursor: text; transform-origin: 0% 0%; }
.canvas-wrapper :deep(.textLayer) ::selection { background: rgba(0, 0, 255, 0.25); }
.canvas-wrapper :deep(.textLayer) > span { line-height: 1; }
.pdf-page-container.css-transform-active .canvas-wrapper :deep(.textLayer) { pointer-events: none; }
.canvas-wrapper :deep(.annotationLayer) { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 3; }
.canvas-wrapper :deep(.annotationLayer section) { position: absolute; pointer-events: auto; box-sizing: border-box; }
.canvas-wrapper :deep(.annotationLayer .linkAnnotation) { cursor: pointer; }
.canvas-wrapper :deep(.annotationLayer .linkAnnotation > a) { position: absolute; top: 0; left: 0; width: 100%; height: 100%; font-size: 1em; }
.canvas-wrapper :deep(.annotationLayer .linkAnnotation:not(.hasBorder) > a:hover) { opacity: 0.2; background-color: rgb(255 255 0); }
.page-placeholder { width: 100%; height: 100%; background: #fff; display: flex; align-items: center; justify-content: center; }
.placeholder-content { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.loading-spinner { width: 32px; height: 32px; border: 3px solid rgba(0, 0, 0, 0.1); border-top-color: var(--pdf-primary-color); border-radius: 50%; animation: spin 1s linear infinite; }
.placeholder-text { color: var(--pdf-text-muted); font-size: 14px; font-weight: 500; }
.page-loading-overlay { position: absolute; inset: 0; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 5; gap: 8px; }
.page-loading-overlay .loading-spinner { width: 32px; height: 32px; border: 3px solid rgba(0, 0, 0, 0.1); border-top-color: var(--pdf-primary-color); border-radius: 50%; animation: spin 1s linear infinite; }
.page-loading-overlay .loading-text { color: var(--pdf-text-muted); font-size: 14px; font-weight: 500; }
.page-number-badge { position: absolute; top: 10px; right: 10px; background: rgba(0, 0, 0, 0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; z-index: 10; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

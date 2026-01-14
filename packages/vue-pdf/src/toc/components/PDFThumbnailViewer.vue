<template>
  <div class="thumbnail-viewer vue-pdf-scrollbar" ref="scrollableContainerRef" @scroll="handleScroll">
    <div class="thumbnail-container" ref="containerRef">
      <PDFThumbnailView v-for="view in thumbnailViews" :key="view.id" :id="view.id" :pdf="pdf" :pdf-document="pdfDocument" :rendering-state="view.renderingState" :is-current="view.id === currentPage" :event-bus="eventBus" :link-service="linkService" @click="handleThumbnailClick(view.id)" @rendered="handleThumbnailRendered(view)" ref="thumbnailRefs" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted, nextTick } from 'vue'
import PDFThumbnailView from './PDFThumbnailView.vue'
import { SidebarView, RenderingStates } from '../utils'
import type { EventBus, PDFLinkService, PDFRenderingQueue } from '../services'

const SCROLL_OPTIONS: ScrollIntoViewOptions = { behavior: 'instant', block: 'nearest', inline: 'nearest' }

interface ThumbnailViewState { id: number; renderingId: string; renderingState: number; div: HTMLElement | null }

const props = defineProps<{
  pdf: any; pdfDocument: any; currentPage: number; totalPages: number
  eventBus: EventBus; linkService: PDFLinkService; renderingQueue: PDFRenderingQueue; isVisible?: boolean
}>()

const scrollableContainerRef = ref<HTMLElement>()
const containerRef = ref<HTMLElement>()
const thumbnailRefs = ref<any[]>([])
const thumbnailViews = reactive<ThumbnailViewState[]>([])

let scrollDown = true, lastScrollTop = 0, rafId: number | null = null

watch(() => props.totalPages, (newTotal) => {
  if (newTotal > 0) {
    thumbnailViews.length = 0
    for (let i = 1; i <= newTotal; i++) thumbnailViews.push({ id: i, renderingId: `thumbnail${i}`, renderingState: RenderingStates.INITIAL, div: null })
    nextTick(() => forceRendering())
  }
}, { immediate: true })

function handleScroll() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    if (!scrollableContainerRef.value) return
    const currentScrollTop = scrollableContainerRef.value.scrollTop
    scrollDown = currentScrollTop > lastScrollTop
    lastScrollTop = currentScrollTop
    forceRendering()
  })
}

function getVisibleThumbs() {
  if (!scrollableContainerRef.value) return { first: null, last: null, views: [], ids: new Set<number>() }
  const scrollEl = scrollableContainerRef.value
  const top = scrollEl.scrollTop, bottom = top + scrollEl.clientHeight
  const visible: Array<{ id: number; percent: number; view: ThumbnailViewState }> = []
  const ids = new Set<number>()
  const thumbnailElements = containerRef.value?.querySelectorAll('.thumbnail-item') as NodeListOf<HTMLElement>
  if (!thumbnailElements) return { first: null, last: null, views: [], ids: new Set<number>() }
  for (let i = 0; i < thumbnailElements.length; i++) {
    const element = thumbnailElements[i], view = thumbnailViews[i]
    if (!view) continue
    const currentHeight = element.offsetTop, viewHeight = element.clientHeight, viewBottom = currentHeight + viewHeight
    if (viewBottom <= top || currentHeight >= bottom) continue
    const hiddenHeight = Math.max(0, top - currentHeight) + Math.max(0, viewBottom - bottom)
    const percent = Math.round(((viewHeight - hiddenHeight) / viewHeight) * 100)
    visible.push({ id: view.id, percent, view })
    ids.add(view.id)
  }
  return { first: visible[0] || null, last: visible[visible.length - 1] || null, views: visible, ids }
}

function forceRendering(): boolean {
  const visibleThumbs = getVisibleThumbs()
  const thumbView = getHighestPriority(visibleThumbs)
  if (thumbView) { renderView(thumbView); return true }
  return false
}

function getHighestPriority(visible: ReturnType<typeof getVisibleThumbs>): ThumbnailViewState | null {
  const visibleViews = visible.views
  if (visibleViews.length === 0) return null
  for (let i = 0; i < visibleViews.length; i++) {
    const view = visibleViews[i].view
    if (view.renderingState !== RenderingStates.FINISHED) return view
  }
  const firstId = visible.first?.id || 1, lastId = visible.last?.id || 1
  const preRenderIndex = scrollDown ? lastId : firstId - 2
  const preRenderView = thumbnailViews[preRenderIndex]
  if (preRenderView && preRenderView.renderingState !== RenderingStates.FINISHED) return preRenderView
  return null
}

function renderView(view: ThumbnailViewState) { if (view.renderingState !== RenderingStates.FINISHED) view.renderingState = RenderingStates.RUNNING }
function handleThumbnailRendered(view: ThumbnailViewState) { view.renderingState = RenderingStates.FINISHED; nextTick(() => forceRendering()) }
function handleThumbnailClick(pageNumber: number) { props.linkService.goToPage(pageNumber) }

function scrollThumbnailIntoView(pageNumber: number) {
  if (!props.totalPages) return
  const thumbnailView = thumbnailViews[pageNumber - 1]
  if (!thumbnailView) return
  const thumbnailElements = containerRef.value?.querySelectorAll('.thumbnail-item') as NodeListOf<HTMLElement>
  const element = thumbnailElements?.[pageNumber - 1]
  if (!element) { setTimeout(() => scrollThumbnailIntoView(pageNumber), 50); return }
  const { first, last, views } = getVisibleThumbs()
  if (views.length > 0) {
    let shouldScroll = false
    if (first && last && (pageNumber <= first.id || pageNumber >= last.id)) shouldScroll = true
    else { for (const { id, percent } of views) { if (id === pageNumber) { shouldScroll = percent < 100; break } } }
    if (shouldScroll) element.scrollIntoView(SCROLL_OPTIONS)
  } else element.scrollIntoView(SCROLL_OPTIONS)
  nextTick(() => forceRendering())
}

let pageChangingHandler: ((evt: any) => void) | null = null
let sidebarViewChangedHandler: ((evt: any) => void) | null = null

onMounted(() => {
  pageChangingHandler = (evt: any) => { const pageNumber = evt.pageNumber; if (pageNumber && pageNumber !== props.currentPage) scrollThumbnailIntoView(pageNumber) }
  props.eventBus.on('pagechanging', pageChangingHandler)
  sidebarViewChangedHandler = (evt: any) => { if (evt.scrollToPage && evt.view === SidebarView.THUMBS) nextTick(() => { scrollThumbnailIntoView(evt.scrollToPage); forceRendering() }) }
  props.eventBus.on('sidebarviewchanged', sidebarViewChangedHandler)
  if (props.totalPages > 0) nextTick(() => scrollThumbnailIntoView(props.currentPage))
})

watch(() => props.currentPage, (newPage, oldPage) => { if (newPage !== oldPage && newPage > 0) scrollThumbnailIntoView(newPage) })
watch(() => props.isVisible, (visible) => { if (visible) nextTick(() => { forceRendering(); scrollThumbnailIntoView(props.currentPage) }) })

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (pageChangingHandler) props.eventBus.off('pagechanging', pageChangingHandler)
  if (sidebarViewChangedHandler) props.eventBus.off('sidebarviewchanged', sidebarViewChangedHandler)
})
</script>

<style scoped>
.thumbnail-viewer { height: 100%; overflow-y: auto; overscroll-behavior: contain; }
.thumbnail-container { display: flex; flex-direction: column; gap: 8px; padding: 8px 4px; }
</style>

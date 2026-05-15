<template>
  <div class="vue-pdf-viewer">
    <!-- 顶部工具栏 -->
    <Header
      :current-page="currentPage"
      :total-pages="totalPages"
      :scale="scale"
      :actual-scale="actualScale"
      :fit-mode="fitMode"
      :filename="filename"
      :sidebar-collapsed="sidebarCollapsed"
      :show-download="showDownload"
      :show-print="showPrint"
      @page-change="handlePageChange"
      @scale-change="handleScaleChange"
      @download="handleDownload"
      @print="handlePrint"
      @toggle-sidebar="handleToggleSidebar"
    />

    <!-- 错误提示 -->
    <div v-if="loadError" class="error-banner">
      <span class="error-icon">⚠️</span>
      <span>{{ loadError }}</span>
    </div>

    <!-- 打印进度提示 -->
    <PrintProgressDialog
      :visible="isPrinting"
      :progress="printProgress"
      :total="printTotal"
      @cancel="handleCancelPrint"
    />

    <!-- 主体内容区域 -->
    <div class="pdf-viewer-body">
      <!-- 左侧边栏 -->
      <LeftSidebar
        v-show="!sidebarCollapsed"
        ref="leftSidebarRef"
        :outline-tree="outlineTree"
        :current-page="currentPage"
        :total-pages="totalPages"
        :active-tab="activeTab"
        :pdf="pdf"
        :pdf-document="pdfDocument"
        :event-bus="eventBus"
        :link-service="linkService"
        :rendering-queue="renderingQueue"
        :is-visible="!sidebarCollapsed"
        :is-loading-outline="isGeneratingOutline"
        :outline-default-expand-level="outlineDefaultExpandLevel"
        @tab-change="handleTabChange"
      />

      <!-- 右侧PDF内容区域 -->
      <Content
        ref="contentRef"
        :pdf="pdf"
        :pdf-document="pdfDocument"
        :current-page="currentPage"
        :scale="scale"
        :loading="loading"
        :total-pages="totalPages"
        :event-bus="eventBus"
        :link-service="linkService"
        :rendering-queue="renderingQueue"
        @page-change="handleContentPageChange"
        @scale-updated="handleScaleUpdated"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, shallowRef, nextTick } from 'vue'
import { usePDF } from '../components'
import { Header, LeftSidebar, Content, PrintProgressDialog } from './components'
import { EventBus, PDFLinkService, PDFRenderingQueue } from './services'
import { SidebarView, PDF_TO_CSS_UNITS, MIN_SCALE, MAX_SCALE } from './utils'
import { generateOutlineFromAnnotations, convertPdfOutline, enhanceOutline } from './utils'
import type { OutlineItem } from './types'
import './styles/index.css'

import type { FileSrc } from "@vue3-office/common";
import { useObjectUrl } from "@vue3-office/common";

defineOptions({
  name: 'VuePdfToc'
})

// Props 定义
const props = withDefaults(defineProps<{
  src: FileSrc
  filename?: string
  showDownload?: boolean
  showPrint?: boolean
  /**
   * 是否自动补全 outline 中缺失的下级编号子项（例如 outline 里只有 8.3，
   * 但正文实际上还有 8.3.1 / 8.3.2 时尝试扫描并挂回去）。
   * 默认关闭，开启会带来一定扫描开销。
   */
  autoEnhanceOutline?: boolean
  /** 目录默认展开到的层级（含），默认 1 */
  outlineDefaultExpandLevel?: number
}>(), {
  filename: '',
  showDownload: true,
  showPrint: true,
  autoEnhanceOutline: false,
  outlineDefaultExpandLevel: 1,
})

const { createUrl } = useObjectUrl();
const pdfSrc = computed(() => {
  return createUrl(props.src);
})

// Emits 定义
const emit = defineEmits<{
  rendered: [{ totalPages: number }]
  error: [error: Error]
}>()

// 状态管理
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref<number | string>('auto')
const actualScale = ref(1.0)
const fitMode = ref<string | null>(null)
const loading = ref(true)
const activeTab = ref('thumbnails')
const sidebarCollapsed = ref(false)
const filename = computed(() => {
  if (props.filename) return props.filename;
  return 'document.pdf';
})

// 打印状态
const isPrinting = ref(false)
const printProgress = ref(0)
const printTotal = ref(0)

// 组件引用
const contentRef = ref<InstanceType<typeof Content>>()
const leftSidebarRef = ref<InstanceType<typeof LeftSidebar>>()

// PDF.js 风格：核心服务实例
const eventBus = new EventBus()
const linkService = new PDFLinkService({ eventBus })
const renderingQueue = new PDFRenderingQueue()

// 适配 pdfViewer：将 scrollPageIntoView 桥接到 eventBus 事件驱动
linkService.setViewer({
  scrollPageIntoView({
    pageNumber,
    destArray,
  }: {
    pageNumber: number
    destArray?: any[] | null
  }) {
    eventBus.dispatch('pagenumberchange', { pageNumber, destArray })
  },
  get currentPageNumber() { return currentPage.value },
  set currentPageNumber(val: number) {
    eventBus.dispatch('pagenumberchange', { pageNumber: val })
  },
})

// PDF 文档代理
const pdfDocument = shallowRef<any>(null)

// PDF 加载错误状态
const loadError = ref<string | null>(null)

// 从 Link Annotations 生成的目录
const generatedOutline = ref<OutlineItem[]>([])
const isGeneratingOutline = ref(false)

// 从 PDF 内置 outline 转换+（可选）增强后的目录
const builtinOutline = ref<OutlineItem[]>([])

// 使用 usePDF 加载 PDF
const { pdf, pages, info, download, printFast, cancelPrint } = usePDF(
  pdfSrc,
  {
    onError: (error: any) => {
      console.error('PDF加载失败:', error)
      loadError.value = error?.message || 'PDF加载失败'
      loading.value = false
      emit('error', error instanceof Error ? error : new Error(error?.message || 'PDF加载失败'))
    }
  }
)

// 目录数据（优先使用 PDF 内置 outline，否则使用生成的）
const outlineTree = computed(() => {
  if (builtinOutline.value.length > 0) return builtinOutline.value
  return generatedOutline.value
})

// 监听 PDF 加载
watch([pdf, pages], ([pdfValue, pagesValue]) => {
  if (pdfValue?.promise && pagesValue) {
    if (totalPages.value === pagesValue && pdfDocument.value) {
      return
    }

    pdfValue.promise.then(async (doc: any) => {
      pdfDocument.value = doc
      totalPages.value = pagesValue
      loading.value = false

      linkService.setDocument(doc)
      eventBus.dispatch('pagesloaded', { pagesCount: pagesValue })

      // 触发加载完成事件
      emit('rendered', { totalPages: pagesValue })

      // 构建目录：内置 outline 优先，否则从 Link Annotations 生成
      const hasBuiltin = info.value?.outline && info.value.outline.length > 0
      isGeneratingOutline.value = true
      try {
        if (hasBuiltin) {
          let tree = convertPdfOutline(info.value!.outline as any[])
          if (props.autoEnhanceOutline) {
            tree = await enhanceOutline(doc, tree)
          }
          builtinOutline.value = tree
        } else {
          let tree = await generateOutlineFromAnnotations(doc)
          if (props.autoEnhanceOutline && tree.length > 0) {
            tree = await enhanceOutline(doc, tree)
          }
          generatedOutline.value = tree
        }
      } finally {
        isGeneratingOutline.value = false
      }
    }).catch((error: any) => {
      console.error('PDF加载失败:', error)
      loading.value = false
    })
  }
}, { immediate: true })

// 监听 eventBus 事件
onMounted(() => {
  eventBus.on('pagenumberchange', (evt: any) => {
    const pageNumber = evt.pageNumber
    if (pageNumber && pageNumber !== currentPage.value) {
      // 来自 linkService（含目录跳转）的事件已经被 Content.vue 直接监听并执行了精确滚动，
      // 这里只需要更新 currentPage / 派发 pagechanging，不要再次派发 pagenumberchange 把
      // destArray 丢失。
      handlePageChange(pageNumber, 'linkService')
    }
  })

  eventBus.on('sidebarviewchanged', (evt: any) => {
    if (evt.view === SidebarView.THUMBS) {
      activeTab.value = 'thumbnails'
    } else if (evt.view === SidebarView.OUTLINE) {
      activeTab.value = 'outline'
    }
  })

  eventBus.on('pageerror', (evt: any) => {
    console.warn('页面渲染错误:', evt)
  })

  eventBus.on('thumbnailError', (evt: any) => {
    console.warn('缩略图渲染错误:', evt)
  })

  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// 事件处理函数
function handlePageChange(page: number, source = 'unknown') {
  if (page === currentPage.value) return
  if (page < 1 || page > totalPages.value) {
    console.error(`handlePageChange: "${page}" is not a valid page.`)
    return
  }

  const previous = currentPage.value
  currentPage.value = page

  eventBus.dispatch('pagechanging', { pageNumber: page, previous, source })

  // 非滚动触发（即外部主动跳转：Header 输入、键盘、按钮、目录等）
  // 需要通知 Content 执行 scrollToPage。
  // linkService 触发的（包括目录跳转、内部链接）已经直接派发过 pagenumberchange
  // 给 Content（且带着 destArray），不要在这里再补发一次空的，否则会把精确位置覆盖到页顶。
  if (source !== 'scroll' && source !== 'linkService') {
    eventBus.dispatch('pagenumberchange', { pageNumber: page })
  }
}

function handleContentPageChange(page: number) {
  handlePageChange(page, 'scroll')
}

function handleScaleChange(newScale: number | string) {
  if (typeof newScale === 'string') {
    if (newScale === 'fit-width') {
      fitMode.value = 'fit-width'
      scale.value = 'fit-width'
    } else if (newScale === 'fit-page') {
      fitMode.value = 'fit-page'
      scale.value = 'fit-page'
    } else if (newScale === 'auto') {
      fitMode.value = null
      scale.value = 1.0
      actualScale.value = PDF_TO_CSS_UNITS
    }
  } else {
    const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))
    scale.value = clampedScale
    fitMode.value = null
  }
  eventBus.dispatch('scalechanging', { scale: scale.value })
}

function handleScaleUpdated(newActualScale: number) {
  actualScale.value = newActualScale
}

function handleTabChange(tab: string) {
  activeTab.value = tab
  const view = tab === 'thumbnails' ? SidebarView.THUMBS : SidebarView.OUTLINE
  eventBus.dispatch('sidebarviewchanged', { view })
}

function handleDownload() {
  download(filename.value)
}

async function handlePrint() {
  if (isPrinting.value) return

  isPrinting.value = true
  printProgress.value = 0
  printTotal.value = totalPages.value

  try {
    const result = await printFast(100, filename.value, (current, total) => {
      printProgress.value = current
      printTotal.value = total
    })

    if (result.cancelled) {
      console.log('打印已取消')
    }
  } catch (error) {
    console.error('打印失败:', error)
  } finally {
    isPrinting.value = false
    printProgress.value = 0
  }
}

function handleCancelPrint() {
  cancelPrint()
}

function handleToggleSidebar() {
  const wasCollapsed = sidebarCollapsed.value
  sidebarCollapsed.value = !sidebarCollapsed.value

  if (wasCollapsed && !sidebarCollapsed.value) {
    nextTick(() => {
      if (activeTab.value === 'thumbnails') {
        eventBus.dispatch('sidebarviewchanged', {
          view: SidebarView.THUMBS,
          scrollToPage: currentPage.value
        })
      }
    })
  }
}

function handleKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
    event.preventDefault()
    handleToggleSidebar()
  }
}
</script>

<style scoped>
.vue-pdf-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  flex: 1;
  background: var(--pdf-bg-darker);
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.pdf-viewer-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #d93025;
  color: #fff;
  font-size: 14px;
}

.error-icon {
  font-size: 16px;
}

</style>

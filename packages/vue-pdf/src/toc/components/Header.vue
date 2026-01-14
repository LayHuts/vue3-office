<template>
  <div class="header">
    <!-- 左侧：文件信息 -->
    <div class="header-left">
      <button class="menu-btn" @click="$emit('toggle-sidebar')" :title="sidebarCollapsed ? '展开侧边栏 (Ctrl+B)' : '折叠侧边栏 (Ctrl+B)'">
        <svg v-if="!sidebarCollapsed" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9h14V7H3v2zm0 4h14v-2H3v2zm0 4h14v-2H3v2zm16 0h2v-2h-2v2zm0-10v2h2V7h-2zm0 6h2v-2h-2v2z"/>
        </svg>
      </button>
      <span class="filename">{{ filename }}</span>
    </div>

    <!-- 中间：主要控制区域 -->
    <div class="header-center">
      <!-- 页面导航 -->
      <div class="control-group">
        <button class="nav-btn" :disabled="currentPage <= 1" @click="$emit('page-change', currentPage - 1)" title="上一页">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>

        <div class="page-input-group">
          <input type="input" :value="currentPage" :min="1" :max="totalPages" class="page-input" @change="handlePageInput" @keyup.enter="handlePageInput" />
          <span class="page-separator">/</span>
          <span class="total-pages">{{ totalPages }}</span>
        </div>

        <button class="nav-btn" :disabled="currentPage >= totalPages" @click="$emit('page-change', currentPage + 1)" title="下一页">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>
      </div>

      <div class="separator"></div>

      <!-- 缩放控制 -->
      <div class="control-group">
        <button class="tool-btn" :disabled="Math.round(props.actualScale / 1.3333 * 100) <= 25" @click="handleZoomOut" title="缩小">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13H5v-2h14v2z"/>
          </svg>
        </button>

        <div class="scale-display">{{ Math.round(props.actualScale / 1.3333 * 100) }}%</div>

        <button class="tool-btn" :disabled="Math.round(props.actualScale / 1.3333 * 100) >= 500" @click="handleZoomIn" title="放大">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </div>

      <div class="separator"></div>

      <!-- 适应控制 -->
      <div class="control-group">
        <button class="tool-btn" :class="{ 'active': props.fitMode === 'fit-page' }" @click="$emit('scale-change', 'fit-page')" title="适应页面">
          <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor">
            <path d="M263.72-96Q234-96 213-117.15T192-168v-624q0-29.7 21.16-50.85Q234.32-864 264.04-864h432.24Q726-864 747-842.85T768-792v624q0 29.7-21.16 50.85Q725.68-96 695.96-96H263.72ZM696-168v-624H264v624h432Zm0-624H264h432ZM360-600h240L480-720 360-600Zm120 360 120-120H360l120 120Z"/>
          </svg>
        </button>

        <button class="tool-btn" :class="{ 'active': props.fitMode === 'fit-width' }" @click="$emit('scale-change', 'fit-width')" title="适应窗口宽度">
          <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor">
            <path d="M168-192q-29.7 0-50.85-21.16Q96-234.32 96-264.04v-432.24Q96-726 117.15-747T168-768h624q29.7 0 50.85 21.16Q864-725.68 864-695.96v432.24Q864-234 842.85-213T792-192H168Zm624-504H168v432h624v-432Zm-624 0v432-432Zm192 336v-240L240-480l120 120Zm360-120L600-600v240l120-120Z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 右侧：次要功能 -->
    <div class="header-right">
      <button v-if="showDownload" class="tool-btn" @click="$emit('download')" title="下载">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
      </button>

      <button v-if="showPrint" class="tool-btn" @click="$emit('print')" title="打印">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  currentPage: number
  totalPages: number
  scale: number | string
  actualScale: number
  fitMode: string | null
  filename: string
  sidebarCollapsed?: boolean
  showDownload?: boolean
  showPrint?: boolean
}>(), {
  showDownload: true,
  showPrint: true
})

const emit = defineEmits<{
  'page-change': [page: number]
  'scale-change': [scale: number | string]
  'download': []
  'print': []
  'toggle-sidebar': []
}>()

function handlePageInput(event: Event) {
  const target = event.target as HTMLInputElement
  const page = parseInt(target.value)
  if (page && page >= 1 && page <= props.totalPages) {
    emit('page-change', page)
  }
}

const SCALE_STEPS = [0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.90, 1.0, 1.10, 1.25, 1.50, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0]
const PDF_TO_CSS_UNITS = 96 / 72

function getCurrentLogicalScale() {
  return props.actualScale / PDF_TO_CSS_UNITS
}

function handleZoomIn() {
  const currentLogical = getCurrentLogicalScale()
  if (currentLogical >= SCALE_STEPS[SCALE_STEPS.length - 1] - 0.001) return
  for (const step of SCALE_STEPS) {
    if (step > currentLogical + 0.001) {
      emit('scale-change', step)
      return
    }
  }
}

function handleZoomOut() {
  const currentLogical = getCurrentLogicalScale()
  if (currentLogical <= SCALE_STEPS[0] + 0.001) return
  for (let i = SCALE_STEPS.length - 1; i >= 0; i--) {
    if (SCALE_STEPS[i] < currentLogical - 0.001) {
      emit('scale-change', SCALE_STEPS[i])
      return
    }
  }
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  background: #424242;
  padding: 0 16px;
}

.header-left { display: flex; align-items: center; gap: 12px; flex: 1; }

.menu-btn {
  background: none;
  border: none;
  color: var(--pdf-text-primary);
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--pdf-transition-fast);
}

.menu-btn:hover { background: var(--pdf-bg-hover); color: #fff; }
.menu-btn:active { background: rgba(255,255,255,0.2); transform: scale(0.95); }

.filename {
  color: var(--pdf-text-primary);
  font-size: 14px;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.header-center { display: flex; align-items: center; gap: 12px; flex: 2; justify-content: center; }
.control-group { display: flex; align-items: center; gap: 4px; }
.separator { width: 1px; height: 24px; background: var(--pdf-border-light); margin: 0 4px; }

.nav-btn {
  background: none;
  border: none;
  color: var(--pdf-text-primary);
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover:not(:disabled) { background: var(--pdf-bg-hover); }
.nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.page-input-group {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--pdf-bg-hover);
  border-radius: 4px;
  padding: 4px 8px;
}

.page-input {
  background: none;
  border: none;
  color: var(--pdf-text-primary);
  width: 40px;
  text-align: center;
  font-size: 14px;
}

.page-input:focus { outline: none; }
.page-separator, .total-pages { color: var(--pdf-text-secondary); font-size: 14px; }

.header-right { display: flex; align-items: center; gap: 4px; flex: 1; justify-content: flex-end; }

.tool-btn {
  background: none;
  border: none;
  color: var(--pdf-text-primary);
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--pdf-transition-fast);
}

.tool-btn:hover { background: var(--pdf-bg-hover); }
.tool-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.tool-btn:disabled:hover { background: none; }
.tool-btn.active { background: var(--pdf-primary-shadow); color: var(--pdf-primary-light); }
.scale-display { color: var(--pdf-text-primary); font-size: 14px; min-width: 40px; text-align: center; }
</style>

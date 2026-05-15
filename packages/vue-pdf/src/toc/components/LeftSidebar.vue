<template>
  <div class="sidebar">
    <div class="sidebar-tabs">
      <button class="tab-btn" :class="{ active: activeTab === 'outline' }" @click="handleTabChange('outline')" title="目录">
        <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor">
          <path d="M323.79-288q15.21 0 25.71-10.29t10.5-25.5q0-15.21-10.29-25.71t-25.5-10.5q-15.21 0-25.71 10.29t-10.5 25.5q0 15.21 10.29 25.71t25.5 10.5Zm0-156q15.21 0 25.71-10.29t10.5-25.5q0-15.21-10.29-25.71t-25.5-10.5q-15.21 0-25.71 10.29t-10.5 25.5q0 15.21 10.29 25.71t25.5 10.5Zm0-156q15.21 0 25.71-10.29t10.5-25.5q0-15.21-10.29-25.71t-25.5-10.5q-15.21 0-25.71 10.29t-10.5 25.5q0 15.21 10.29 25.71t25.5 10.5ZM432-288h240v-72H432v72Zm0-156h240v-72H432v72Zm0-156h240v-72H432v72ZM216-144q-29.7 0-50.85-21.15Q144-186.3 144-216v-528q0-29.7 21.15-50.85Q186.3-816 216-816h528q29.7 0 50.85 21.15Q816-773.7 816-744v528q0 29.7-21.15 50.85Q773.7-144 744-144H216Zm0-72h528v-528H216v528Zm0-528v528-528Z"/>
        </svg>
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'thumbnails' }" @click="handleTabChange('thumbnails')" title="缩略图">
        <svg width="16" height="16" viewBox="0 -960 960 960" fill="currentColor">
          <path d="M216-144q-29.7 0-50.85-21.5Q144-187 144-216v-528q0-29 21.15-50.5T216-816h528q29.7 0 50.85 21.5Q816-773 816-744v528q0 29-21.15 50.5T744-144H216Zm0-72h528v-528H216v528Zm48-72h432L552-480 444-336l-72-96-108 144Zm-48 72v-528 528Z"/>
        </svg>
      </button>
    </div>

    <div class="sidebar-content">
      <div v-show="activeTab === 'outline'" class="outline-view vue-pdf-scrollbar" ref="outlineContainerRef">
        <div v-if="props.isLoadingOutline" class="loading-state">
          <div class="loading-spinner"></div>
          <p>正在生成目录...</p>
        </div>
        <div v-else-if="outlineTree.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8l6-6V4c0-1.1-.9-2-2-2zm4 18l-4 4H6V4h8v5h4v11z"/>
          </svg>
          <p>此文档没有目录</p>
        </div>
        <PDFOutlineViewer v-else :outline="outlineTree" :pdf-document="pdfDocument" :event-bus="eventBus" :link-service="linkService" :default-expand-level="outlineDefaultExpandLevel" />
      </div>

      <div v-show="activeTab === 'thumbnails'" class="thumbnails-view vue-pdf-scrollbar" ref="thumbnailContainerRef">
        <PDFThumbnailViewer :pdf="pdf" :pdf-document="pdfDocument" :current-page="currentPage" :total-pages="totalPages" :event-bus="eventBus" :link-service="linkService" :rendering-queue="renderingQueue" :is-visible="activeTab === 'thumbnails'" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PDFOutlineViewer from './PDFOutlineViewer.vue'
import PDFThumbnailViewer from './PDFThumbnailViewer.vue'
import type { EventBus, PDFLinkService, PDFRenderingQueue } from '../services'

const props = defineProps<{
  outlineTree: any[]
  currentPage: number
  totalPages: number
  activeTab: string
  pdf: any
  pdfDocument: any
  eventBus: EventBus
  linkService: PDFLinkService
  renderingQueue: PDFRenderingQueue
  isVisible?: boolean
  isLoadingOutline?: boolean
  outlineDefaultExpandLevel?: number
}>()

const emit = defineEmits<{ 'tab-change': [tab: string] }>()

const outlineContainerRef = ref<HTMLElement>()
const thumbnailContainerRef = ref<HTMLElement>()

function handleTabChange(tab: string) {
  emit('tab-change', tab)
}
</script>

<style scoped>
.sidebar {
  width: 280px;
  height: 100%;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  padding-block: 0;
  background: var(--pdf-bg-dark);
  border-top: 1px solid var(--pdf-border-color);
  border-right: 1px solid var(--pdf-border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
  overflow: hidden;
}

.sidebar-tabs { display: flex; background: var(--pdf-bg-panel);}

.tab-btn {
  flex: 1;
  background: none;
  border: none;
  color: var(--pdf-text-secondary);
  cursor: pointer;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--pdf-transition-fast);
  border-radius: 0;
}

.tab-btn:hover { background: var(--pdf-bg-hover); color: var(--pdf-text-primary); }
.tab-btn.active { background: var(--pdf-primary-color); color: #fff; }

.sidebar-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
.outline-view, .thumbnails-view { flex: 1; overflow-y: auto; padding: 0; min-height: 0; contain: strict; }

.empty-state, .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--pdf-text-secondary);
  text-align: center;
}

.empty-state p, .loading-state p { margin: 16px 0 0 0; font-size: 14px; }

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--pdf-primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>

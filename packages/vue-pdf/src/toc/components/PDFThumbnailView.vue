<template>
  <div class="thumbnail-item" :class="{ selected: isCurrent }" :data-page-number="id">
    <div class="thumbnail-container">
      <div v-if="renderingState >= RenderingStates.RUNNING" class="thumbnail-canvas">
        <VuePdf v-if="pdf" :pdf="pdf" :page="id" :scale="0.15" class="thumbnail-pdf" @loaded="handleLoaded" @error="handleError" />
      </div>
      <div v-else class="thumbnail-placeholder">
        <div v-if="renderingState === RenderingStates.RUNNING" class="loading-spinner"></div>
        <span>{{ id }}</span>
      </div>
    </div>
    <div class="thumbnail-label">{{ id }}</div>
  </div>
</template>

<script setup lang="ts">
import VuePdf from '../../components/main.vue'
import { RenderingStates } from '../utils'
import type { EventBus, PDFLinkService } from '../services'

const props = defineProps<{
  id: number
  pdf: any
  pdfDocument: any
  renderingState: number
  isCurrent: boolean
  eventBus: EventBus
  linkService: PDFLinkService
}>()

const emit = defineEmits<{ 'rendered': [] }>()

function handleLoaded() {
  emit('rendered')
  props.eventBus.dispatch('thumbnailrendered', { pageNumber: props.id })
}

function handleError(error: { type: string; message: string; error: any }) {
  console.error(`缩略图 ${props.id} 渲染失败:`, error)
  props.eventBus.dispatch('thumbnailError', { pageNumber: props.id, error })
  emit('rendered')
}
</script>

<style scoped>
.thumbnail-item { display: flex; flex-direction: column; align-items: center; cursor: pointer; padding: 6px; border-radius: 6px; border: 2px solid transparent; background: rgba(255,255,255,0.02); flex-shrink: 0; }
.thumbnail-item:hover { background: var(--pdf-bg-active); }
.thumbnail-item.selected { border-color: var(--pdf-primary-color); background: var(--pdf-primary-bg); box-shadow: 0 2px 8px var(--pdf-primary-shadow); }
.thumbnail-container { width: 100%; max-width: 110px; aspect-ratio: 3/4; background: #fff; border-radius: 4px; overflow: hidden; box-shadow: var(--pdf-shadow-sm), var(--pdf-shadow-md); margin-bottom: 6px; }
.thumbnail-item:hover .thumbnail-container { box-shadow: var(--pdf-shadow-md), 0 8px 16px rgba(0,0,0,0.15); }
.thumbnail-item.selected .thumbnail-container { box-shadow: 0 4px 12px rgba(26, 115, 232, 0.4), 0 8px 20px rgba(26, 115, 232, 0.2); }
.thumbnail-canvas { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.thumbnail-pdf { width: 100%; height: 100%; }
.thumbnail-pdf :deep(canvas) { max-width: 100% !important; max-height: 100% !important; width: auto !important; height: auto !important; object-fit: contain !important; display: block !important; margin: 0 auto !important; }
.thumbnail-placeholder { width: 100%; height: 100%; background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--pdf-text-muted); font-size: 12px; gap: 8px; }
.loading-spinner { width: 20px; height: 20px; border: 2px solid #e0e0e0; border-top-color: var(--pdf-primary-color); border-radius: 50%; animation: spin 0.8s linear infinite; }
.thumbnail-label { color: var(--pdf-text-primary); font-size: 11px; font-weight: 500; padding: 2px 6px; border-radius: 10px; background: var(--pdf-bg-hover); min-width: 20px; text-align: center; }
.thumbnail-item.selected .thumbnail-label { color: #fff; background: var(--pdf-primary-color); font-weight: 600; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

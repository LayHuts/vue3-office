<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import { VuePdf, usePDF } from '@vue3-office/vue-pdf';
import { useObjectUrl } from '@vue3-office/vue-pdf';
import type { FileSrc } from '@vue3-office/vue-pdf';
import useLoading from '../hooks/useLoading.js';

const props = defineProps<{
  src: FileSrc;
}>();

const page = ref(1);

const { createUrl } = useObjectUrl();
const pdfSrc = computed(() => {
  return createUrl(props.src);
})

const { pdf, pages } = usePDF(pdfSrc);

// 当 src 变化时，重置页码
watch(pdfSrc, () => {
  page.value = 1;
});

function onRendered(){
  console.log('[PdfDemo] loaded');
  useLoading.hideLoading();
}

function onError(error:{
  type: string
  message: string
  error: Error
}){
  console.error('[PdfDemo] error:', error.type, ':', error.message, " => ", error.error);
  useLoading.hideLoading();
}

// 处理 annotation 事件，实现目录跳转
function onAnnotation(event: { type: string; data: any }) {
  console.log('[PdfDemo] annotation:', event);
  if (event.type === 'internal-link' && event.data.referencedPage) {
    page.value = event.data.referencedPage;
  } else if (event.type === 'link' && event.data.url) {
    window.open(event.data.url, '_blank');
  }
}

function onHighlight(payload: any) {
  console.log('[PdfDemo] highlight:', payload);
}

function onTextLoaded(payload: any) {
  console.log('[PdfDemo] textLoaded:', payload);
}

function onAnnotationLoaded(payload: any) {
  console.log('[PdfDemo] annotationLoaded:', payload);
}

function onXfaLoaded() {
  console.log('[PdfDemo] xfaLoaded');
}
</script>

<template>
  <div class="pdf-container">
    <div class="pdf-toolbar">
      <button class="pdf-btn" :disabled="page <= 1" @click="page = page > 1 ? page - 1 : page">
        <span class="btn-icon">‹</span>
        上一页
      </button>
      <span class="page-info">
        <span class="current-page">{{ page }}</span>
        <span class="separator">/</span>
        <span class="total-pages">{{ pages }}</span>
      </span>
      <button class="pdf-btn" :disabled="page >= pages" @click="page = page < pages ? page + 1 : page">
        下一页
        <span class="btn-icon">›</span>
      </button>
    </div>
    <div class="pdf-viewer">
      <VuePdf
        :pdf="pdf"
        :page="page"
        fit-parent
        :text-layer="true"
        :annotation-layer="true"
        @load="onRendered"
        @error="onError"
        @annotation="onAnnotation"
        @highlight="onHighlight"
        @text-loaded="onTextLoaded"
        @annotation-loaded="onAnnotationLoaded"
        @xfa-loaded="onXfaLoaded"
      />
    </div>
  </div>
</template>

<style scoped>
.pdf-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px;
}

.pdf-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.pdf-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pdf-btn:hover:not(:disabled) {
  background: #f0f0f0;
  border-color: #d0d0d0;
}

.pdf-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
}

.page-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #666;
  min-width: 60px;
  justify-content: center;
}

.current-page {
  font-weight: 600;
  color: #1890ff;
}

.separator {
  color: #999;
}

.total-pages {
  color: #666;
}

.pdf-viewer {
  width: 50vw;
  max-height: calc(100vh - 200px);
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: auto;
}
</style>

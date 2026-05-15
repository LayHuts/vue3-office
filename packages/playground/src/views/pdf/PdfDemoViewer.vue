<script setup lang="ts">
import {computed, ref, watch, useTemplateRef} from 'vue';
import { VuePdf, usePDF, getDestCssOffsetY } from '@vue3-office/vue-pdf';
import { useObjectUrl } from '@vue3-office/vue-pdf';
import type { FileSrc } from '@vue3-office/vue-pdf';
import useLoading from '../hooks/useLoading.js';

const props = defineProps<{
  src: FileSrc;
}>();

const page = ref(1);
const viewerRef = useTemplateRef<HTMLDivElement>('viewerRef');

const { createUrl } = useObjectUrl();
const pdfSrc = computed(() => {
  return createUrl(props.src);
})

const { pdf, pages } = usePDF(pdfSrc);

// 当 src 变化时，重置页码
watch(pdfSrc, () => {
  page.value = 1;
});

/**
 * 待执行的目录跳转 destArray。等当前页渲染完成（@load 触发，能拿到 viewport）后再滚动。
 */
let pendingDest: any[] | null = null;

function onRendered(viewport?: any){
  console.log('[PdfDemo] loaded');
  useLoading.hideLoading();

  if (!pendingDest || !viewport || !viewerRef.value) return;

  // viewBox = [x0, y0, x1, y1]，pageHeight 是 PDF 用户坐标系下的页面高度
  const pageHeight: number = viewport.viewBox?.[3] ?? viewport.height / viewport.scale;
  const offsetY = getDestCssOffsetY(pendingDest, pageHeight, viewport.scale);
  viewerRef.value.scrollTo({ top: offsetY, behavior: 'auto' });
  pendingDest = null;
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
    pendingDest = event.data.destArray || null;
    if (event.data.referencedPage === page.value) {
      // 已在目标页：@load 不会再触发，直接清空 pending 并滚到顶部以避免错觉
      pendingDest = null;
      viewerRef.value?.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      page.value = event.data.referencedPage;
    }
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
    <div ref="viewerRef" class="pdf-viewer">
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

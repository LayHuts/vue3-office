<script setup lang="ts">
import PreviewWrapper from '../common/PreviewWrapper.vue';
import useLoading from '../hooks/useLoading.js';
import { watch } from 'vue';
import type { PreviewSlotProps } from "../../types/preview";
import PdfDemoViewer from './PdfDemoViewer.vue';
import pdfFile from '@samples/issue133.pdf';

const defaultUrl = pdfFile;

// 监听 loading 状态
watch(() => defaultUrl, () => {
  useLoading.showLoading();
}, { immediate: true });
</script>

<template>
  <PreviewWrapper
    accept=".pdf"
    placeholder="请输入pdf文件地址"
    :default-url="defaultUrl"
  >
    <template #default="{ url }: PreviewSlotProps">
      <PdfDemoViewer :src="url" />
    </template>
  </PreviewWrapper>
</template>
<style scoped>
:deep(.preview-content) {
  background-color: #808080;
  overflow: auto;
}
</style>

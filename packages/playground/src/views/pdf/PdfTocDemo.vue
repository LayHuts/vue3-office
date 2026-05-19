<script setup lang="ts">
import { VuePdfToc } from '@vue3-office/vue-pdf';
import PreviewWrapper from '../common/PreviewWrapper.vue';
import useLoading from '../hooks/useLoading.js';
import type {PreviewSlotProps} from "../../types/preview";

import pdfFile from '@samples/test.pdf';

const defaultUrl = pdfFile;

// 大文件优化：256KB 一片 + 关闭后台预取，仅在传 URL 时生效
// 临时加 disableStream:true 验证 Stream 通道是否在拖慢首屏
const loaderOptions = {
  rangeChunkSize: 256 * 1024,
  disableAutoFetch: true,
  // disableStream: true,
};

function onProgress({ loaded, total }: { loaded: number; total: number }) {
  // [DEBUG] 业务侧也能拿到进度，VuePdfToc 内部 loading 区已经显示了，
  // 这里只打印日志便于排查
  console.log('[PdfTocDemo] progress', loaded, '/', total);
}

function onRendered(){
  console.log('[PdfTocDemo] rendered pdf');
  useLoading.hideLoading();
}
function onError(e: Error){
  console.error(e);
  useLoading.hideLoading();
}
</script>

<template>
  <PreviewWrapper
      accept=".pdf"
      placeholder="请输入pdf文件地址"
      :default-url="defaultUrl"
  >
    <template #default="{url}: PreviewSlotProps">
      <VuePdfToc
          :src="url"
          auto-enhance-outline
          :loader-options="loaderOptions"
          @rendered="onRendered"
          @error="onError"
          @progress="onProgress"
      />
    </template>

  </PreviewWrapper>
</template>


<style scoped>

</style>

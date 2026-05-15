<script setup lang="ts">
import { VuePdfToc } from '@vue3-office/vue-pdf';
import PreviewWrapper from '../common/PreviewWrapper.vue';
import useLoading from '../hooks/useLoading.js';
import type {PreviewSlotProps} from "../../types/preview";

import pdfFile from '@samples/test.pdf';

const defaultUrl = pdfFile;

function onRendered(){
  console.log('rendered pdf');
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
        @rendered="onRendered"
        @error="onError"
      />
    </template>

  </PreviewWrapper>
</template>


<style scoped>

</style>

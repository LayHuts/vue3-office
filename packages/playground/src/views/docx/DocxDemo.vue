<script setup lang="ts">
import { VueDocx } from '@vue3-office/vue-docx';
import PreviewWrapper from '../common/PreviewWrapper.vue';
import useLoading from '../hooks/useLoading.js';
import {ref} from 'vue';
import demoFile from '@samples/test.docx';
import type {PreviewSlotProps} from "../../types/preview";

function onRendered(){
    useLoading.hideLoading();
}
function onError(e: Error){
  console.error(e);
    useLoading.hideLoading();
}


const defaultUrl = demoFile;
const docxRef = ref();

</script>

<template>
  <PreviewWrapper
      accept=".docx"
      placeholder="请输入docx文件地址"
      :default-url="defaultUrl"
  >
    <template #default="{url}: PreviewSlotProps">
      <VueDocx
          ref="docxRef"
          :url="url"
          :options="{url}"
          style="flex: 1;height: 0"
          @rendered="onRendered"
          @error="onError"
      />
    </template>

  </PreviewWrapper>
</template>


<style scoped>

</style>

<script setup lang="ts">
import {onMounted, ref, watch} from 'vue';
import {download, MimeType, RequestOptions} from '@vue3-office/common';
import {DocxProps, DocxOptions} from "./types";
import {useDocx} from './docx';

defineOptions({
  name: 'VueDocx'
});

const props = withDefaults(defineProps<DocxProps>(), {
  requestOptions: (): RequestOptions => ({
    responseType: "blob",
  }),
  docxOptions: (): Partial<DocxOptions> => ({
    ignoreLastRenderedPageBreak: false
  })
});

const emit = defineEmits<{
  rendered: []
  error: [error: Error]
}>();

const docxRef = ref<HTMLElement | null>(null);

let fileData: Blob | null;
function initDocx() {
  if (!docxRef.value) {
    emit('error', new Error('渲染容器为空'));
    return;
  }

  useDocx(props.url, docxRef.value, props.requestOptions, props.docxOptions).then(({data, wordDocument}) => {
    fileData = data;
    emit('rendered');
  }).catch(error => {
    emit('error', new Error(error.message));
  });
}

onMounted(() => {
  if (props.url) {
    initDocx();
  }
});

watch(() => props.url, (url, oldUrl) => {
  if (oldUrl !== url) {
    initDocx();
  }
});

function downloadFile(fileName: string){
  if(!fileData){
    console.error('文件数据为空');
    return;
  }
  download(fileName || `vue-office-docx-${new Date().getTime()}.docx`, fileData, MimeType.DOCX);
}

defineExpose({
  docxRef,
  downloadFile
});
</script>

<template>
  <div class="vue-office-docx">
    <div class="vue-office-docx-main" ref="docxRef"></div>
  </div>
</template>

<style lang="scss">
  .vue-office-docx {
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    .docx-wrapper {
      > section.docx {
        margin-bottom: 5px;
      }
    }
  }

  @media screen and (max-width: 800px) {
    .vue-office-docx {
      .docx-wrapper {
        padding: 10px;

        > section.docx {
          padding: 10px !important;
          width: 100% !important;
        }
      }
    }
  }

  .vue-office-docx-main {
    display: flex;
    flex: 1;
    flex-direction: column;
  }
</style>

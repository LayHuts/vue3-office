<script setup lang="ts">
import { watch } from 'vue';
import { UploadOutlined } from '@ant-design/icons-vue';
import usePreview from '../hooks/usePreview.js';
import useLoading from '../hooks/useLoading.js';
import type {PreviewSlotProps} from "../../types/preview";

const props = defineProps({
  accept: String,
  placeholder: String,
  defaultUrl: String
});

const slots = defineSlots<{
  default(props: PreviewSlotProps): any;
}>();

const {type, inputUrl, url, xls, fileList, beforeUpload} = usePreview(props.defaultUrl);
watch(url,()=>{
    useLoading.showLoading();
},{
    immediate: true
});

</script>

<template>
  <div class="preview-wrapper">
    <div class="operate-area">
      <a-radio-group v-model:value="type" button-style="solid">
        <a-radio-button value="url">远程文件地址</a-radio-button>
        <a-radio-button value="upload">上传本地文件</a-radio-button>
      </a-radio-group>
      <a-input
          v-if="type==='url'"
          v-model:value="inputUrl"
          :placeholder="props.placeholder"
          style="width: 600px; margin-left:10px;"
      />
      <a-button
          v-if="type==='url'"
          type="primary"
          style="margin-left: 10px"
          @click="url=inputUrl; xls=inputUrl.endsWith('xls')"
      >
        预览
      </a-button>
      <a-upload
          v-if="type !== 'url'"
          :accept="props.accept"
          action=""
          :beforeUpload="beforeUpload"
          :file-list="[]"
      >
        <a-button  style="margin-left: 10px">
          <upload-outlined></upload-outlined>
          选择文件
        </a-button>
      </a-upload>

    </div>
    <div class="preview-content">
      <slot :url="url" :xls="xls"></slot>
    </div>
    <div class="preview-wrapper-main">

    </div>
  </div>
</template>

<style scoped>
.preview-wrapper{
  height: calc(100vh - 46px);
  display: flex;
  flex-direction: column;
}

.operate-area {
  display: flex;
  margin: 10px;
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  background: #fff;
}

.preview-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>

<script setup lang="ts">
import {ref, watch} from 'vue';
import {useRouter, useRoute} from 'vue-router';
const router = useRouter();
const route = useRoute();

type RouteKey =
  | 'docx'
  | 'excel'
  | 'pdf-one'
  | 'pdf-toc'
  | 'pptx'
  | 'audio'
  | 'video';

const current = ref<RouteKey[]>([]);

watch(
  () => route.path,
  (path) => {
    let currentRoute: RouteKey = 'docx';
    console.log(path);
    if (path.includes('excel')) {
      currentRoute = 'excel';
    } else if (path.includes('pdf-one')) {
      currentRoute = 'pdf-one';
    }else if (path.includes('pdf-toc')) {
      currentRoute = 'pdf-toc';
    } else if (path.includes('pptx')) {
      currentRoute = 'pptx';
    }else if (path.includes('audio')) {
      currentRoute = 'audio';
    }else if (path.includes('video')) {
      currentRoute = 'video';
    }

    current.value = [currentRoute];
  },
  { immediate: true }
);

function go({ key }: { key: RouteKey }) {
  router.push({
    path: key,
    query: { ...route.query }
  });
}
</script>

<template>
  <div class="app-container">
    <a-menu v-model:selectedKeys="current" mode="horizontal" @click="go">
      <a-menu-item key="docx">
        docx文件预览
      </a-menu-item>
      <a-menu-item key="excel">
        excel文件预览
      </a-menu-item>
      <a-menu-item key="pdf-one">
        pdf文件预览
      </a-menu-item>
      <a-menu-item key="pdf-toc">
        pdf带目录预览
      </a-menu-item>
      <a-menu-item key="pptx">
        pptx文件预览
      </a-menu-item>
      <a-menu-item key="audio">
        音频文件播放
      </a-menu-item>
      <a-menu-item key="video">
        视频文件播放
      </a-menu-item>
    </a-menu>
    <router-view/>
  </div>

</template>

<style scoped>
.app-container {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

:deep(.ant-tabs-nav-wrap){
  padding-left: 20px !important;
}

</style>

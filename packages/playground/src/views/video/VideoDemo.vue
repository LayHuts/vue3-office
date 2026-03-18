<script setup lang="ts">
import { VueVideo, Events as VideoEvents } from '@vue3-office/vue-video';
import PreviewWrapper from '../common/PreviewWrapper.vue';
import useLoading from '../hooks/useLoading.js';
import {ref, onMounted} from 'vue';
import videoFile from '@samples/xgplayer-demo-360p.mp4';
import videoThumbnailFile from '@samples/xgplayer-demo-thumbnail.jpg';
import type {PreviewSlotProps} from "../../types/preview";
import type { XGPlayerOptions, VideoEventHandlers, VideoUrl, IError } from "@vue3-office/vue-video";

function onRendered(){
    useLoading.hideLoading();
}
function onError(e: Error){
  console.error(e);
    useLoading.hideLoading();
}

const netUrl = "https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4";
const defaultUrl = videoFile;
const videoRef = ref();

const playOptions: XGPlayerOptions = {
  thumbnail: {
    pic_num: 44,
    width: 160,
    height: 90,
    col: 10,
    row: 10,
    urls: [videoThumbnailFile],
  },
  download: true
};

const getPlayOptions = (url: VideoUrl) => {
  if(url !== defaultUrl){
    return {
      thumbnail: null
    };
  }
  return playOptions;
}

const videoEvents: VideoEventHandlers = {
  [VideoEvents.ERROR]: (error: IError) => {
    console.log('错误信息 ', error);
    onError(error.originError);
  },
  [VideoEvents.FULLSCREEN_CHANGE]: (isFullScreen: boolean) => {
    console.log(`${isFullScreen ? '打开' : '退出'}全屏`);
  },
  [VideoEvents.CSS_FULLSCREEN_CHANGE]: (isCssFullScreen: boolean) => {
    console.log(`${isCssFullScreen ? '打开' : '退出'}网页全屏`);
  },
  play: () => console.log('开始播放'),
  pause: () => console.log('播放暂停'),
  ended: () => console.log('播放结束'),
  ready: () => {
    console.log('播放器完成实例化');
    onRendered();
  },
  complete: () => console.log('播放器创建video完成，可以开始播放'),
  destroy: () => console.log('播放器销毁'),
}

// 滚动触发小窗
function onScroll(e: Event) {
  const player = videoRef.value?.getPlayer();
  const miniPlugin = player?.getPlugin('miniscreen');
  if (!miniPlugin) return;

  const scrollTop = (e.target as HTMLElement).scrollTop;
  if (scrollTop > 100 && !miniPlugin.isMini) {
    miniPlugin.getMini();
  } else if (scrollTop <= 100 && miniPlugin.isMini) {
    miniPlugin.exitMini();
  }
}

const placeholderCount = ref(200);

onMounted(() => {
  const container = document.querySelector('.preview-content');
  container?.addEventListener('scroll', onScroll);
});
</script>

<template>
  <PreviewWrapper
      accept=".mp4"
      placeholder="请输入视频文件地址"
      :default-url="defaultUrl"
  >
    <template #default="{url}: PreviewSlotProps">
      <VueVideo
        ref="videoRef"
        :url="url"
        :player-options="getPlayOptions(url)"
        :events="videoEvents"
        style="flex-shrink: 0;"/>

      <div v-for="index of placeholderCount" :key="index">
        我是占位符
        <br>
      </div>
    </template>

  </PreviewWrapper>
</template>


<style scoped>
:deep(.preview-content) {
  background-color: #808080;
  overflow: auto;
}
</style>

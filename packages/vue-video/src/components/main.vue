<script setup lang="ts">
import {computed, onMounted, onBeforeUnmount, ref, watch, nextTick, toRaw, useAttrs} from 'vue';
import { VideoOptions, VideoUrl } from "./types";
import Player, {Events, IPlayerOptions} from "xgplayer";
import 'xgplayer/dist/index.min.css';
import { IUrl } from "xgplayer/es/player";
import { useObjectUrl, deepMerge } from "@vue3-office/common";

defineOptions({
  name: 'VueVideo'
});

const { createUrl } = useObjectUrl();
const props = defineProps<VideoOptions>();

// 获取用户实际传入的属性（不包含默认值）
const defaultOptions: Partial<IPlayerOptions> = {
  lang: 'zh-cn',
  i18n: [
    {
      LANG: 'zh-cn',
      TEXT: {
        FULLSCREEN_TIPS: '全屏',
        CSSFULLSCREEN_TIPS: '网页全屏',
        EXITCSSFULLSCREEN_TIPS: '退出网页全屏',
      }
    }
  ],
  pip: true,
  mini: {
    isScrollSwitch: true,
    scrollTop: 10,
    isShowIcon: true,
  }
}

const xgOptions = computed<IPlayerOptions>(() => {
  const rawOptions = props.playerOptions
    ? toRaw(props.playerOptions)
    : {};
  return deepMerge(defaultOptions, {
    url: getUrl(props.url),
    ...rawOptions
  });
});


const emit = defineEmits<{
  rendered: []
  error: [error: Error]
}>();

let player: Player | null = null;
const videoRef = ref<HTMLElement | null>(null);
const dynamicId = `vue-office-player-${new Date().getTime()}`;

// 转成xgplayer支持的url类型
const getUrl = (url: VideoUrl): IUrl => {
  if (!url) {
    return '';
  }

  // Binary（二进制）：走 createUrl
  if (url instanceof Blob || url instanceof ArrayBuffer) {
    return createUrl(url, 'video/mp4')
  }
  return url
}


function destroyPlayer() {
  if (player) {
    player.destroy();
    player = null;
  }
}

function initPlayer() {
  if(!videoRef.value){
    throw new Error('渲染容器为空');
  }

  player = new Player({
    el: videoRef.value,
    ...toRaw(xgOptions.value),
  });

  // 监听画中画变化
  player.on(Events.PIP_CHANGE, (isPipMode) => {
    // 修改画中画提示tips
    const tipEl = player?.root?.querySelector('.xgplayer-pip .xg-tips');
    if (tipEl) {
      tipEl.textContent = isPipMode ? '退出画中画' : '画中画';
    }
    // 进入画中画时 mini 功能禁用
    const miniPlugin = player?.getPlugin('miniscreen');

    if (miniPlugin) {
      if (isPipMode) {
        // 如果当前是mini状态，先退出
        if (miniPlugin.isMini) {
          miniPlugin.exitMini();
        }
        // 保存原始 getMini，替换为空函数
        miniPlugin._originalGetMini = miniPlugin.getMini;
        miniPlugin.getMini = () => {};
      } else {
        // 恢复原始 getMini
        if (miniPlugin._originalGetMini) {
          miniPlugin.getMini = miniPlugin._originalGetMini;
          delete miniPlugin._originalGetMini;
          miniPlugin.getMini();
        }
      }
    }
  });

  // 绑定用户传入的事件处理器
  if (props.events) {
    Object.entries(props.events).forEach(([eventName, handler]) => {
      if (typeof handler === 'function') {
        player!.on(eventName, handler as (...args: any[]) => void);
      }
    });
  }

}

onMounted(() => {
  nextTick(() => {
    if (props.url) {
      initPlayer();
    }
  });

});

onBeforeUnmount(() => {
  destroyPlayer();
});

watch(() => props.url, (url, oldUrl) => {
  if (player && url && oldUrl !== url) {
    destroyPlayer();
    initPlayer();
    /*player.playNext({
      url: getUrl(url),
      poster: props.playerOptions?.poster || '',
      thumbnail: props.playerOptions?.thumbnail || null,
    });*/
  }
});

// 暴露方法给父组件
defineExpose({
  getPlayer: () => player,
});

</script>

<template>
  <div class="vue-office-video">
    <div class="vue-office-video-main" ref="videoRef" :id="dynamicId"></div>
  </div>
</template>

<style lang="scss">
video:picture-in-picture {
  visibility: hidden;
  height: 0;
}

  .vue-office-video {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;

    .vue-office-video-main {
      // 由 xgplayer 的 width/height 配置控制
    }
  }
</style>

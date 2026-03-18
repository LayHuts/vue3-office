<script setup lang="ts">
import PreviewWrapper from '../common/PreviewWrapper.vue';
import useLoading from '../hooks/useLoading';
import {ref} from 'vue';
import demoFile from '@samples/audio.mp3';
import type {PreviewSlotProps} from "../../types/preview";
import { VueAudio, Music } from '@vue3-office/vue-audio';
import type { FixedPosition } from "@vue3-office/vue-audio";
import musicData from './music-data.json'

function onRendered(){
    useLoading.hideLoading();
}
function onError(e: Error){
  console.error(e);
    useLoading.hideLoading();
}


const defaultUrl = demoFile;
const docxRef = ref();

const volume = ref(1)
const muted = ref(false)

const fixedPosition = ref<FixedPosition>('bottom-left' as FixedPosition)
const showFixedPlayer = ref(true)

const musicList: Music[] =  musicData;
let basicData = getRandomItem<Music>(musicList);
let miniData = getRandomItem<Music>(musicList);

function getRandomItem<T>(list: T[]): T {
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}
</script>

<template>
  <PreviewWrapper
      accept=".mp3,.mp4"
      placeholder="请输入音频文件地址"
      :default-url="defaultUrl"
  >
    <template #default="{url}: PreviewSlotProps">
      <div class="audio-container">
        <h3>一、Basic (zero config)</h3>
        <VueAudio
          :music="basicData"
        />

        <h3>二、</h3>
        <VueAudio
          v-model:volume="volume"
          v-model:muted="muted"
          autoplay
          theme="pic"
          repeat="list"
          show-lrc
          :music="musicList[0]"
          :list="musicList"
          :list-max-height="200"
        />
        <div >
          <a-button type="primary"  @click="muted = !muted">{{ muted ? '取消静音' : '静音' }}</a-button>
          音量调节：<a-input-number step="0.1" v-model:value="volume" :min="0" :max="1" />
        </div>


        <h3>三、mini</h3>
        <VueAudio
          mini
          float
          :music="miniData"
        />
        <h3>四、Fixed</h3>
        <VueAudio
          v-if="showFixedPlayer"
          fixed
          :fixed-position="fixedPosition"
          :fixed-close="true"
          :show-lrc="false"
          theme="pic"
          :music="musicList[0]"
          :list="musicList"
          @close="showFixedPlayer = false"
        />

        <!-- Fixed 位置切换按钮 -->
        <div class="fixed-position-switcher">
          <span>Fixed Position:</span>
          <a-button
            type="primary"
            v-for="pos in ['bottom-left', 'bottom-right', 'top-left', 'top-right']"
            :key="pos"
            :class="{ active: fixedPosition === pos }"
            @click="fixedPosition = pos as FixedPosition"
          >
            {{ pos }}
          </a-button>
        </div>

      </div>
    </template>

  </PreviewWrapper>
</template>


<style scoped>
:deep(.preview-content) {
  //background-color: #808080;
  //overflow: auto;

  font-family: Source Sans Pro, 'PingFang SC', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background: linear-gradient(135deg, rgb(65, 184, 131), rgb(74, 156, 238));
  color: #fff;
  overflow-y: auto;
}


.audio-container {
  max-width: 40rem;
  margin: 0 auto 50px;
  padding: 0 15px;
}

.audio-container h3 {
  margin-top: 15px;
}

.fixed-position-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fixed-position-switcher button {
  font-size: 15px;
}

</style>

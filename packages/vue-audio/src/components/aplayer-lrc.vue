<template>
  <div class="aplayer-lrc">
    <div class="aplayer-lrc-contents" :style="transformStyle">
      <p
        v-for="(line, index) of lrcLines"
        :key="index"
        :class="{ 'aplayer-lrc-current': index === currentLineIndex }"
      >
        {{ line[1] }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { parseLrc } from '../util/utils'
import type { Music, PlayStat, LrcLine } from './types'

const props = defineProps<{
  currentMusic: Music
  playStat: PlayStat
}>()

const displayLrc = ref('')
const currentLineIndex = ref(0)

const lrcLines = computed<LrcLine[]>(() => parseLrc(displayLrc.value))

const transformStyle = computed(() => ({
  transform: `translateY(${-currentLineIndex.value * 16}px)`,
  webkitTransform: `translateY(${-currentLineIndex.value * 16}px)`,
}))

function applyLrc(lrc: string) {
  if (/^https?:\/\//.test(lrc)) fetchLrc(lrc)
  else displayLrc.value = lrc
}

function fetchLrc(src: string) {
  fetch(src).then(r => r.text()).then(lrc => { displayLrc.value = lrc })
}

function hideLrc() {
  displayLrc.value = ''
}

watch(() => props.currentMusic, (music) => {
  currentLineIndex.value = 0
  if (music.lrc) applyLrc(music.lrc)
  else hideLrc()
}, { immediate: true })

watch(() => props.playStat.playedTime, (playedTime) => {
  for (let i = 0; i < lrcLines.value.length; i++) {
    const line = lrcLines.value[i]
    const nextLine = lrcLines.value[i + 1]
    if (playedTime >= line[0] && (!nextLine || playedTime < nextLine[0])) {
      currentLineIndex.value = i
    }
  }
})
</script>

<style lang="scss">
@use "../scss/variables" as *;

.aplayer-lrc {
  position: relative;
  height: $lrc-height;
  text-align: center;
  overflow: hidden;
  margin-bottom: 7px;

  &:before {
    position: absolute;
    top: 0;
    z-index: 1;
    display: block;
    overflow: hidden;
    width: 100%;
    height: 10%;
    content: ' ';
    background: linear-gradient(to bottom, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 100%);
  }

  &:after {
    position: absolute;
    bottom: 0;
    z-index: 1;
    display: block;
    overflow: hidden;
    width: 100%;
    height: 33%;
    content: ' ';
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.8) 100%);
  }

  p {
    font-size: 12px;
    color: #666;
    line-height: 16px;
    height: 16px;
    padding: 0;
    margin: 0;
    transition: all 0.5s ease-out;
    opacity: 0.4;
    overflow: hidden;

    &.aplayer-lrc-current {
      opacity: 1;
      overflow: visible;
      height: initial;
    }
  }

  .aplayer-lrc-contents {
    width: 100%;
    transition: all 0.5s ease-out;
    user-select: text;
    cursor: default;
  }
}
</style>

<template>
  <div
    class="aplayer-pic"
    :style="currentPicStyleObj"
    role="button"
    :aria-label="playing ? '暂停' : '播放'"
    :aria-pressed="playing"
    tabindex="0"
    @click="onClick"
    @keydown.enter="onClick"
    @keydown.space.prevent="onClick"
  >
    <div class="aplayer-button" :class="playing ? 'aplayer-pause' : 'aplayer-play'">
      <icon-button
        :icon="playing ? 'pause' : 'play'"
        :class="playing ? 'aplayer-icon-pause' : 'aplayer-icon-play'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import IconButton from './aplayer-iconbutton.vue'

const props = defineProps({
  pic: String,
  theme: String,
  playing: { type: Boolean, default: false },
  enableDrag: { type: Boolean, default: false }
})

const emit = defineEmits<{
  togglePlay: []
}>()

const currentPicStyleObj = computed(() => {
  if (!props.pic) return {}
  return { backgroundImage: `url(${props.pic})`, backgroundColor: props.theme }
})

function onClick() {
  emit('togglePlay')
}
</script>

<style lang="scss">
@use "../scss/variables" as *;

.aplayer-float {
  .aplayer-pic:active {
    cursor: move;
  }
}

.aplayer-pic {
  flex-shrink: 0;
  position: relative;
  height: $aplayer-height;
  width: $aplayer-height;
  background-image: url(../default.jpg);
  background-size: cover;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    .aplayer-button {
      opacity: 1;
    }
  }

  .aplayer-button {
    position: absolute;
    border-radius: 50%;
    opacity: 0.8;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
    background: rgba(0, 0, 0, 0.2);
    transition: all 0.1s ease;

    .aplayer-fill {
      fill: #fff;
    }
  }

  .aplayer-play {
    width: 26px;
    height: 26px;
    border: 2px solid #fff;
    bottom: 50%;
    right: 50%;
    margin: 0 -15px -15px 0;

    .aplayer-icon-play {
      position: absolute;
      top: 3px;
      left: 4px;
      height: 20px;
      width: 20px;
    }
  }

  .aplayer-pause {
    width: 16px;
    height: 16px;
    border: 2px solid #fff;
    bottom: 4px;
    right: 4px;

    .aplayer-icon-pause {
      position: absolute;
      top: 2px;
      left: 2px;
      height: 12px;
      width: 12px;
    }
  }
}
</style>

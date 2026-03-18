<template>
  <button 
    type="button" 
    class="aplayer-icon"
    :aria-label="ariaLabel"
    :title="ariaLabel"
  >
    <icon :type="icon" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from './aplayer-icon.vue'

const props = defineProps<{ icon?: string }>()

// 图标对应的无障碍标签
const iconLabels: Record<string, string> = {
  'play': '播放',
  'pause': '暂停',
  'volume-up': '音量',
  'volume-down': '音量',
  'volume-off': '静音',
  'shuffle': '随机播放',
  'repeat-one': '单曲循环',
  'repeat-all': '列表循环',
  'menu': '播放列表',
  'skip': '跳过',
  'loading': '加载中',
}

const ariaLabel = computed(() => (props.icon && iconLabels[props.icon]) || props.icon || '')
</script>

<style lang="scss">
.aplayer-icon {
  width: 20px;
  height: 20px;
  border: none;
  background-color: transparent;
  outline: none;
  cursor: pointer;
  opacity: .8;
  vertical-align: middle;
  padding: 0;
  font-size: 12px;
  margin: 0;
  display: inline;

  &:hover {
    opacity: 1;
  }

  .aplayer-fill {
    transition: all .2s ease-in-out;
  }
}
</style>

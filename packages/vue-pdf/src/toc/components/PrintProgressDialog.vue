<template>
  <div v-if="visible" class="print-progress-overlay">
    <div class="print-progress-dialog">
      <div class="print-progress-title">正在准备打印...</div>
      <div class="print-progress-bar">
        <div 
          class="print-progress-fill" 
          :style="{ width: `${progressPercent}%` }"
        ></div>
      </div>
      <div class="print-progress-text">
        {{ progress }} / {{ total }} 页
      </div>
      <button class="print-cancel-btn" @click="$emit('cancel')">
        取消
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  visible: boolean
  progress: number
  total: number
}>()

defineEmits<{
  cancel: []
}>()

const progressPercent = computed(() => {
  if (props.total === 0) return 0
  return Math.round((props.progress / props.total) * 100)
})
</script>

<style scoped>
.print-progress-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.print-progress-dialog {
  background: var(--pdf-bg-panel);
  border-radius: 8px;
  padding: 24px 32px;
  min-width: 300px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.print-progress-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 16px;
  color: var(--pdf-text-primary);
}

.print-progress-bar {
  height: 8px;
  background: var(--pdf-border-color);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.print-progress-fill {
  height: 100%;
  background: var(--pdf-primary-color);
  border-radius: 4px;
  transition: width var(--pdf-transition-fast);
}

.print-progress-text {
  font-size: 14px;
  color: var(--pdf-text-secondary);
  text-align: center;
}

.print-cancel-btn {
  display: block;
  width: 100%;
  margin-top: 16px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--pdf-border-color);
  border-radius: 4px;
  color: var(--pdf-text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--pdf-transition-fast);
}

.print-cancel-btn:hover {
  background: var(--pdf-bg-hover);
  border-color: var(--pdf-text-secondary);
}
</style>

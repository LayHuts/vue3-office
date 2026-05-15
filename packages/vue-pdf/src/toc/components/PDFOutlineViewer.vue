<template>
  <div class="outline-tree" ref="containerRef">
    <OutlineTreeNode v-for="(item, index) in outline" :key="index" :item="item" :level="0" :link-service="linkService" :current-tree-item="currentTreeItem" :default-expand-level="defaultExpandLevel" @item-click="handleItemClick" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { EventBus, PDFLinkService } from '../services'
import type { OutlineItem } from '../types'
import OutlineTreeNode from './OutlineTreeNode.vue'

const props = withDefaults(defineProps<{
  outline: OutlineItem[]
  pdfDocument: any
  eventBus: EventBus
  linkService: PDFLinkService
  /** 默认展开到的层级（含），超过该 level 的节点默认折叠 */
  defaultExpandLevel?: number
}>(), {
  defaultExpandLevel: 1,
})

const containerRef = ref<HTMLElement>()
const currentTreeItem = ref<any>(null)

async function handleItemClick(item: OutlineItem) {
  currentTreeItem.value = item
  if (item.dest) await props.linkService.goToDestination(item.dest)
}

onMounted(() => {
  props.eventBus.on('pagechanging', (evt: any) => {})
})
</script>

<style scoped>
.outline-tree { padding: 8px 4px; }
</style>

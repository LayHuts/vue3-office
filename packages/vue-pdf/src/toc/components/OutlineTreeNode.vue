<template>
  <div class="tree-node">
    <div
      class="treeItem"
      :class="{ selected: item === currentTreeItem, withNesting: hasChildren }"
      :style="{ paddingLeft: `${level * 20 + 8}px` }"
      @click="handleClick"
    >
      <div v-if="hasChildren" class="treeItemToggler" :class="{ treeItemsHidden: !expanded }" @click.stop="toggleExpand"></div>
      <div v-else class="treeItemToggler-placeholder"></div>
      <a :href="destinationHash" class="outline-link" :style="linkStyle" @click.prevent>
        {{ normalizeTextContent(item.title) }}
      </a>
    </div>
    <div v-if="hasChildren && expanded" class="tree-children">
      <OutlineTreeNode v-for="(child, index) in item.items" :key="index" :item="child" :level="level + 1" :link-service="linkService" :current-tree-item="currentTreeItem" :default-expand-level="defaultExpandLevel" @item-click="$emit('item-click', $event)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PDFLinkService } from '../services'
import type { OutlineItem } from '../types'

const props = withDefaults(defineProps<{
  item: OutlineItem
  level: number
  linkService: PDFLinkService
  currentTreeItem: any
  /** 默认展开到的层级（含），超过该 level 的节点默认折叠 */
  defaultExpandLevel?: number
}>(), {
  defaultExpandLevel: 1,
})

const emit = defineEmits<{ 'item-click': [item: OutlineItem] }>()

// 根据 level 决定默认展开状态：level <= defaultExpandLevel 时默认展开
const expanded = ref(props.level <= props.defaultExpandLevel)
const hasChildren = computed(() => props.item.items && props.item.items.length > 0)
const linkStyle = computed(() => {
  const style: any = {}
  if (props.item.bold) style.fontWeight = 'bold'
  if (props.item.italic) style.fontStyle = 'italic'
  return style
})

// 缓存 dest -> hash 的计算，避免每次 render 都调用 linkService
const destinationHash = computed(() => props.linkService.getDestinationHash(props.item.dest))

function toggleExpand() { expanded.value = !expanded.value }
function handleClick() { emit('item-click', props.item) }
function normalizeTextContent(str: string): string {
  const result = str
    .replace(/[\x00-\x1F]/g, '') // 控制字符
    .trim() // 去除首尾空格
    || '\u2013'
  // console.log('[OutlineTreeNode] title:', JSON.stringify(str), '-> level:', props.level, '-> result:', JSON.stringify(result), '-> hasChildren:', hasChildren.value)
  return result
}
</script>

<style scoped>
.treeItem { display: flex; align-items: center; padding: 4px 8px; cursor: pointer; border-radius: 4px; margin: 1px 4px; transition: background-color var(--pdf-transition-fast); min-height: 28px; }
.treeItem:hover { background: var(--pdf-bg-hover); }
.treeItem.selected { background: var(--pdf-primary-shadow); }
.treeItemToggler { width: 16px; height: 16px; margin-right: 4px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: transform var(--pdf-transition-fast); }
.treeItemToggler::before { content: ''; width: 0; height: 0; border-style: solid; border-width: 5px 0 5px 8px; border-color: transparent transparent transparent var(--pdf-text-secondary); transition: transform var(--pdf-transition-fast); }
.treeItemToggler:not(.treeItemsHidden)::before { transform: rotate(90deg); }
.treeItemToggler:hover::before { border-color: transparent transparent transparent var(--pdf-text-primary); }
.treeItemToggler-placeholder { width: 16px; height: 16px; margin-right: 4px; flex-shrink: 0; }
.outline-link { color: var(--pdf-text-primary); font-size: 13px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-decoration: none; }
.outline-link:hover { color: var(--pdf-primary-light); }
</style>

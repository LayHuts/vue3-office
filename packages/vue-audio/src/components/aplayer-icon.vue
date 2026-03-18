<template>
  <svg xmlns:xlink="http://www.w3.org/1999/xlink" height="100%" version="1.1" :viewBox="svg.viewBox" width="100%"
       :style="style">
    <path v-for="(d, index) in svg.paths" :key="index" class="aplayer-fill" :d="d"></path>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface SvgData {
  viewBox: string
  paths: string[]
}

const svgModules = import.meta.glob('../assets/*.svg', { eager: true, query: '?raw', import: 'default' })

const SVGs: Record<string, SvgData> = Object.entries(svgModules).reduce<Record<string, SvgData>>((svgs, [path, inlineSvg]) => {
  // 移除换行符，使正则可以匹配多行 SVG
  const svgContent = (inlineSvg as string).replace(/\n\s*/g, '')
  const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/)
  // 匹配所有 path 的 d 属性
  const pathMatches = [...svgContent.matchAll(/<path[^>]*d="([^"]+)"[^>]*>/g)]
  
  const nameMatch = path.match(/^.*\/(.+?)\.svg$/)
  if (nameMatch) {
    const name = nameMatch[1]
    if (viewBoxMatch && pathMatches.length > 0) {
      svgs[name] = {
        viewBox: viewBoxMatch[1],
        paths: pathMatches.map(m => m[1])
      }
    } else {
      console.warn(`[aplayer-icon] Failed to parse SVG: ${name}`, { viewBoxMatch, pathMatches, svgContent })
    }
  }
  return svgs
}, {})


const props = defineProps<{ type?: string }>()

const svg = computed(() => {
  return (props.type && SVGs[props.type]) || { viewBox: '0 0 24 24', paths: [] }
})

const style = computed(() => {
  return {}
})
</script>

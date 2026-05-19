<div align="center">
  <h1>@vue3-office/vue-pdf</h1>
  <p>基于 <a href="https://github.com/mozilla/pdf.js">pdfjs-dist</a> 的 Vue 3 PDF 预览组件库</p>
  <p>提供两套使用方式：底层的单页组件 <code>VuePdf</code>，以及开箱即用、内置目录 / 缩略图 / 工具栏 / 打印的完整阅读器 <code>VuePdfToc</code></p>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/vue-3.5+-brightgreen" />
  <img src="https://img.shields.io/badge/pdfjs--dist-5.7-orange" />
  <img src="https://img.shields.io/badge/license-MIT-blue" />
</p>

## 目录

- [安装](#安装)
- [导出内容总览](#导出内容总览)
- [VuePdf 单页组件](#vuepdf-单页组件)
  - [基本用法](#基本用法)
  - [多页渲染](#多页渲染)
  - [自适应宽度 / 指定宽高 / 缩放](#自适应宽度--指定宽高--缩放)
  - [开启文本层与注释层](#开启文本层与注释层)
  - [水印](#水印)
  - [文本高亮](#文本高亮)
  - [XFA 表单](#xfa-表单)
  - [Props 完整列表](#vuepdf-props-完整列表)
  - [Events 完整列表](#vuepdf-events-完整列表)
  - [Slots](#vuepdf-slots)
  - [通过 ref 调用的方法](#vuepdf-通过-ref-调用的方法)
  - [usePDF 组合式函数](#usepdf-组合式函数)
- [VuePdfToc 完整阅读器](#vuepdftoc-完整阅读器)
  - [快速开始](#快速开始)
  - [文件来源支持](#文件来源支持)
  - [目录的两种来源](#目录的两种来源)
  - [Props 完整列表](#vuepdftoc-props-完整列表)
  - [Events](#vuepdftoc-events)
  - [键盘快捷键](#键盘快捷键)
- [大文件 / 远程 PDF 加载优化](#大文件--远程-pdf-加载优化)
- [全局注册](#全局注册)
- [SSR / Nuxt 注意事项](#ssr--nuxt-注意事项)
- [常见问题](#常见问题)

---

## 安装

```bash
pnpm add @vue3-office/vue-pdf
# 或
npm install @vue3-office/vue-pdf
yarn add @vue3-office/vue-pdf
```

需要 Vue >= 3.5.24，PDF.js Worker 已在内部通过 `pdfjs-dist/build/pdf.worker.min?url` 自动注入，无需手动配置 `workerSrc`。

记得引入样式（`VuePdfToc` 必需，`VuePdf` 用到文本层 / 注释层时也需要）：

```ts
import '@vue3-office/vue-pdf/style.css'
```

---

## 导出内容总览

```ts
import {
  // 组件
  VuePdf,             // 单页组件（底层）
  VuePdfToc,          // 完整阅读器（带工具栏 + 侧边栏 + 目录）
  VuePDFPlugin,       // Vue 插件，调用后全局注册 <VuePdf />

  // 组合式 API
  usePDF,             // 加载 PDF 并返回任务、页数、信息、下载、打印等

  // 工具
  parseDestOffset,    // 解析目标位置数组
  getDestCssOffsetY,  // 计算目录跳转目标在 CSS 像素下的纵向偏移

  // 来自 @vue3-office/common（重新导出）
  useObjectUrl,       // 处理 string/Blob/ArrayBuffer 输入
  download,           // 触发浏览器下载（依赖 MimeType 决定 Content-Type）
  isHttpUrl,          // 判断字符串是否为 http(s) URL

  // 类型
  type FileSrc,
  type MimeType,
  type RequestOptions,
  type WatermarkOptions,
  type HighlightOptions,
  type AnnotationEventPayload,
  type HighlightEventPayload,
  type LoadedEventPayload,
  type TextLayerLoadedEventPayload,
  type PDFInfo,
  type PDFDestination,
  type PDFLoaderOptions,  // pdfjs.getDocument 透传参数（Range/Stream/cMap...）
  type PDFOptions,        // usePDF 第二个参数的类型
} from '@vue3-office/vue-pdf'
```

---

## VuePdf 单页组件

`VuePdf` 是一个 **只渲染单页** 的底层组件，外层多页布局、滚动、虚拟列表等都由你自己控制。它接收的是 `usePDF` 返回的 `PDFDocumentLoadingTask`，而不是文件 URL，这样多个 `VuePdf` 实例可以共享同一份解析结果。

### 基本用法

```vue
<script setup lang="ts">
import { VuePdf, usePDF } from '@vue3-office/vue-pdf'
import '@vue3-office/vue-pdf/style.css'

const { pdf, pages, info } = usePDF('https://example.com/sample.pdf')
</script>

<template>
  <div>
    <p>共 {{ pages }} 页</p>
    <VuePdf :pdf="pdf" :page="1" />
  </div>
</template>
```

### 多页渲染

```vue
<script setup lang="ts">
import { VuePdf, usePDF } from '@vue3-office/vue-pdf'

const { pdf, pages } = usePDF('/sample.pdf')
</script>

<template>
  <VuePdf
    v-for="page in pages"
    :key="page"
    :pdf="pdf"
    :page="page"
    fit-parent
  />
</template>
```

### 自适应宽度 / 指定宽高 / 缩放

| 模式 | 写法 | 说明 |
| --- | --- | --- |
| 固定缩放 | `:scale="1.5"` | 默认即此模式，1 = 100% |
| 撑满父容器宽度 | `fit-parent` | 监听父元素 `clientWidth`，等比例计算 scale |
| 指定宽度 | `:width="800"` | 单位 px，按宽度反推 scale |
| 指定高度 | `:height="600"` | 单位 px，按高度反推 scale |
| 旋转 | `:rotation="90"` | 仅支持 90 的整数倍 |

```vue
<VuePdf :pdf="pdf" :page="1" fit-parent />
<VuePdf :pdf="pdf" :page="1" :width="800" />
<VuePdf :pdf="pdf" :page="1" :scale="1.5" :rotation="90" />
```

### 开启文本层与注释层

文本层支持鼠标选中、复制；注释层负责链接、表单等可交互元素。

```vue
<VuePdf
  :pdf="pdf"
  :page="page"
  text-layer
  annotation-layer
  @text-loaded="onTextLoaded"
  @annotation="onAnnotation"
  @annotation-loaded="onAnnotationLoaded"
/>
```

注释相关 props：

| Prop | 作用 |
| --- | --- |
| `annotationsFilter` | 字符串数组，只渲染指定子类型的注释，如 `['Link', 'Widget']` |
| `annotationsMap` | 透传给 PDF.js 的 `annotationStorage` 数据，常用于回填表单数据 |
| `hideForms` | `true` 时隐藏表单控件（内部把 `AnnotationMode` 从 `ENABLE_FORMS` 切回 `ENABLE`） |
| `imageResourcesPath` | PDF.js 注释图标资源路径，自托管时使用 |

### 水印

```vue
<VuePdf
  :pdf="pdf"
  :page="page"
  watermark-text="机密文件"
  :watermark-options="{
    columns: 4,
    rows: 4,
    rotation: 45,
    fontSize: 18,
    color: 'rgba(211,210,211,0.4)',
  }"
/>
```

`WatermarkOptions` 字段（均为可选）：

| 字段 | 类型 | 默认值 |
| --- | --- | --- |
| `columns` | `number` | `4` |
| `rows` | `number` | `4` |
| `rotation` | `number`（角度） | `45` |
| `fontSize` | `number`（px） | `18` |
| `color` | `string` | `'rgba(211, 210, 211, 0.4)'` |

水印是直接画在 canvas 上的，所以会跟随 `scale` 自动缩放。

### 文本高亮

需要同时开启 `text-layer`：

```vue
<VuePdf
  :pdf="pdf"
  :page="page"
  text-layer
  :highlight-text="['关键词1', '关键词2']"
  :highlight-options="{ ignoreCase: true, completeWords: false }"
  :highlight-pages="[1, 3, 5]"
  @highlight="onHighlight"
/>
```

| Prop | 类型 | 说明 |
| --- | --- | --- |
| `highlightText` | `string \| string[]` | 单个词或多个词 |
| `highlightOptions.ignoreCase` | `boolean` | 是否忽略大小写 |
| `highlightOptions.completeWords` | `boolean` | 是否仅匹配完整词 |
| `highlightPages` | `number[]` | 限定生效页码，留空则所有页生效 |

`highlight` 事件回调：

```ts
{
  matches: Match[]
  page: number
  textContent: TextContent
  textDivs: HTMLElement[]
}
```

### XFA 表单

XFA 表单需要在加载阶段开启：

```ts
const { pdf } = usePDF({
  url: '/forms/xfa.pdf',
  enableXfa: true,
})
```

随后 `VuePdf` 会自动渲染 XFA 层并触发 `xfaLoaded` 事件。

### VuePdf Props 完整列表

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `pdf` | `PDFDocumentLoadingTask` | — | `usePDF` 返回的加载任务，**核心入参** |
| `page` | `number` | `1` | 渲染的页码，从 1 开始 |
| `scale` | `number` | `1` | 缩放系数，1 = 原始尺寸 |
| `rotation` | `number` | — | 旋转角度，必须是 90 的倍数；非法值会被纠正为 0 |
| `fitParent` | `boolean` | `false` | 启用后忽略 `scale`，按父元素 `clientWidth` 自适应 |
| `width` | `number` | — | 指定渲染宽度（px），优先级低于 `fitParent` |
| `height` | `number` | — | 指定渲染高度（px），优先级低于 `width` |
| `textLayer` | `boolean` | `false` | 开启文本选择层 |
| `annotationLayer` | `boolean` | `false` | 开启注释 / 表单交互层 |
| `annotationsFilter` | `string[]` | — | 注释类型白名单 |
| `annotationsMap` | `object` | — | `annotationStorage` 初始数据 |
| `hideForms` | `boolean` | `false` | 隐藏表单 |
| `imageResourcesPath` | `string` | — | 注释图标资源路径 |
| `intent` | `string` | `'display'` | PDF.js 渲染意图，可选 `'display'` / `'print'` / `'any'` |
| `autoDestroy` | `boolean` | `false` | 组件卸载时是否自动 `pdf.destroy()`；多实例共享同一个 `pdf` 时建议保持 `false`，由 `usePDF` 统一管理生命周期 |
| `autoRender` | `boolean` | `true` | `false` 时不会在 prop 变化时自动渲染，需要外部调用 `draw()`，配合渲染队列使用 |
| `watermarkText` | `string` | — | 水印文字 |
| `watermarkOptions` | `WatermarkOptions` | 见上文 | 水印样式 |
| `highlightText` | `string \| string[]` | — | 高亮文本 |
| `highlightOptions` | `HighlightOptions` | — | 高亮选项 |
| `highlightPages` | `number[]` | — | 限定高亮页码 |

> 内部使用了 **离屏 canvas + 渲染完成后再替换** 的策略，所以缩放 / 翻页时不会出现白屏闪烁；旧 canvas 会立即释放显存。

### VuePdf Events 完整列表

| 事件 | 回调参数类型 | 触发时机 |
| --- | --- | --- |
| `loaded` | `PageViewport` | 当前页 canvas 渲染完成（注意：此时文本层 / 注释层可能还在串行渲染中） |
| `error` | `{ type: 'load' \| 'page' \| 'render', message: string, error: Error }` | PDF 加载、获取页或渲染失败 |
| `annotation` | `{ type: string, data: any }` | 用户与注释交互（如点击链接），`type` 常见值：`'link'`（外链）、`'internal-link'`（内部跳转，含 `data.referencedPage` 和 `data.destArray`） |
| `annotationLoaded` | `any[]` | 注释层 DOM 渲染完成，参数为注释数组 |
| `highlight` | `HighlightEventPayload` | 文本高亮匹配完成 |
| `textLoaded` | `{ textDivs: HTMLElement[], textContent }` | 文本层渲染完成 |
| `xfaLoaded` | — | XFA 层渲染完成 |
| `stateChange` | `number` | 渲染状态切换：`0` 初始 / `1` 渲染中 / `2` 暂停 / `3` 完成 |

#### 注释跳转完整示例

PDF 内目录链接通常是 `internal-link`，配合 `getDestCssOffsetY` 可以精确滚动到目标位置：

```vue
<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { VuePdf, usePDF, getDestCssOffsetY } from '@vue3-office/vue-pdf'

const page = ref(1)
const viewerRef = useTemplateRef<HTMLDivElement>('viewerRef')
const { pdf } = usePDF('/sample.pdf')

let pendingDest: any[] | null = null

function onAnnotation(e: { type: string; data: any }) {
  if (e.type === 'internal-link' && e.data.referencedPage) {
    pendingDest = e.data.destArray ?? null
    page.value = e.data.referencedPage
  } else if (e.type === 'link' && e.data.url) {
    window.open(e.data.url, '_blank')
  }
}

function onLoaded(viewport: any) {
  if (!pendingDest || !viewerRef.value) return
  const pageHeight = viewport.viewBox?.[3] ?? viewport.height / viewport.scale
  const offsetY = getDestCssOffsetY(pendingDest, pageHeight, viewport.scale)
  viewerRef.value.scrollTo({ top: offsetY, behavior: 'auto' })
  pendingDest = null
}
</script>

<template>
  <div ref="viewerRef" style="overflow: auto; height: 80vh">
    <VuePdf
      :pdf="pdf"
      :page="page"
      fit-parent
      text-layer
      annotation-layer
      @loaded="onLoaded"
      @annotation="onAnnotation"
    />
  </div>
</template>
```

### VuePdf Slots

| Slot | Scope 参数 | 用途 |
| --- | --- | --- |
| `default` | — | 渲染中的占位内容，会绝对定位覆盖在页面上，渲染完成后自动隐藏 |
| `overlay` | `{ width, height }` | 渲染完成后的覆盖层，常用于自定义批注、坐标定位、热区等 |

```vue
<VuePdf :pdf="pdf" :page="page">
  <div class="loading">PDF 加载中...</div>
  <template #overlay="{ width, height }">
    <div :style="{ position: 'absolute', top: 0, left: 0, width: `${width}px`, height: `${height}px` }">
      <!-- 自定义图层 -->
    </div>
  </template>
</VuePdf>
```

### VuePdf 通过 ref 调用的方法

```vue
<script setup lang="ts">
import { ref } from 'vue'
const pdfRef = ref()

// 重新渲染当前页（参数变化时通常会自动重渲，这里用于手动刷新）
pdfRef.value?.reload()

// 取消进行中的渲染（多次切页时会自动取消上一个）
pdfRef.value?.cancel()

// 销毁底层 PDFDocumentLoadingTask
pdfRef.value?.destroy()

// 在 autoRender = false 模式下，手动触发渲染（配合自定义渲染队列）
await pdfRef.value?.draw()

// 直接清空当前页 canvas（释放显存）
pdfRef.value?.clearCanvas()

// 渲染状态：0 初始 / 1 渲染中 / 2 暂停 / 3 完成
console.log(pdfRef.value?.renderingState)
</script>
```

### usePDF 组合式函数

```ts
const {
  pdf,
  pages,
  info,
  download,
  print,
  printFast,
  cancelPrint,
  getPDFDestination,
} = usePDF(src, options?)
```

#### 入参 src

`src` 支持响应式：传 `Ref` 时，值变化会自动销毁旧文档并重新加载。

| 类型 | 示例 |
| --- | --- |
| URL 字符串 | `'/sample.pdf'` |
| URL 对象 | `new URL('./a.pdf', import.meta.url)` |
| 二进制数据 | `Uint8Array` / `ArrayBuffer` |
| 配置对象 | `{ url: '/a.pdf', enableXfa: true, withCredentials: true }`（PDF.js 的 `DocumentInitParameters`） |
| 响应式 | `Ref<以上任意类型>` |

如果你拿到的是 `string | ArrayBuffer | Blob`，可以配合 `useObjectUrl` 转成 URL：

```ts
import { useObjectUrl } from '@vue3-office/vue-pdf'

const { createUrl } = useObjectUrl()
const pdfSrc = computed(() => createUrl(props.src))
const { pdf, pages } = usePDF(pdfSrc)
```

#### options

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `password` | `string` | 静态密码 |
| `onPassword` | `(updatePassword, reason) => void` | 动态密码回调；设置后会忽略 `password` |
| `onProgress` | `(progressData) => void` | 加载进度回调，参数为 `{ loaded, total }` 字节数。**已内部去重**：相同 `loaded` 不会重复触发，避免 worker 数据流空响应造成的回调风暴 |
| `onError` | `(error) => void` | 加载失败回调 |
| `loaderOptions` | `PDFLoaderOptions` | pdfjs `getDocument` 的加载参数子集，详见 [大文件 / 远程 PDF 加载优化](#大文件--远程-pdf-加载优化) |

#### 返回值

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `pdf` | `Ref<PDFDocumentLoadingTask \| undefined>` | 传给 `<VuePdf :pdf="pdf" />` |
| `pages` | `Ref<number>` | 总页数 |
| `info` | `Ref<Partial<PDFInfo>>` | `{ metadata, attachments, javascript, outline }` |
| `download(filename?)` | `Promise<void>` | 下载当前文档（保留表单填写内容） |
| `print(dpi?, filename?, onProgress?)` | `Promise<void>` | 高质量打印，逐页串行渲染，单 canvas 复用，内存友好 |
| `printFast(dpi?, filename?, onProgress?)` | `Promise<{ cancelled }>` | 快速打印，4 页一批并行，可被 `cancelPrint` 中断 |
| `cancelPrint()` | `void` | 中断 `printFast` |
| `getPDFDestination(dest)` | `Promise<PDFDestination \| null>` | 解析命名目标 / 数组目标，返回 `{ pageIndex, location }` |

打印进度示例：

```ts
const { printFast, cancelPrint } = usePDF('/big.pdf')

const result = await printFast(100, '导出.pdf', (current, total) => {
  console.log(`渲染中 ${current}/${total}`)
})
if (result.cancelled) console.log('已取消')
```

---

## VuePdfToc 完整阅读器

`VuePdfToc` 是一个 **开箱即用** 的完整 PDF 阅读器组件，内部已经基于 `VuePdf` + `usePDF` 实现：

- 顶部工具栏：翻页、页码跳转、缩放、适应宽度 / 适应页面、下载、打印
- 左侧边栏：缩略图 + 目录两个 Tab
- 主区域：滚动加载、虚拟渲染、目录跳转精确定位
- 打印进度对话框 + 取消按钮
- 自动适配 PDF 内置 outline，没有 outline 时回退到从 Link 注释生成
- `Ctrl/⌘ + B` 折叠 / 展开侧边栏

### 快速开始

```vue
<script setup lang="ts">
import { VuePdfToc } from '@vue3-office/vue-pdf'
import '@vue3-office/vue-pdf/style.css'

function onRendered(e: { totalPages: number }) {
  console.log('PDF 加载完成，共', e.totalPages, '页')
}
function onError(err: Error) {
  console.error(err)
}
</script>

<template>
  <VuePdfToc
    src="https://example.com/sample.pdf"
    filename="技术手册.pdf"
    @rendered="onRendered"
    @error="onError"
    style="height: 100vh"
  />
</template>
```

> **必须给组件指定高度**（`height` / `flex: 1` 等）。组件内部使用 `flex: 1` + `min-height: 0` 自适应父容器高度。
>
> 加载远程大文件时，loading 区会自动显示进度条与字节数文案；如果想把进度联动到外部 UI，监听 [`@progress` 事件](#vuepdftoc-events)。
>
> 默认即启用大文件优化（256KB Range + 关闭后台预取），无需手动配置。需要调整请见 [大文件 / 远程 PDF 加载优化](#大文件--远程-pdf-加载优化)。

### 文件来源支持

`src` 支持以下类型（来自 `@vue3-office/common` 的 `FileSrc`）：

| 类型 | 示例 |
| --- | --- |
| `string` | `'https://x.com/a.pdf'` 或 `'/a.pdf'` |
| `ArrayBuffer` | 来自 `fetch().then(r => r.arrayBuffer())` |
| `Blob` | 文件上传或网络请求得到的 Blob |

组件内部会调用 `useObjectUrl` 自动处理 Blob / ArrayBuffer 到 Object URL 的转换，并在卸载时自动释放，无需手动管理。

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { VuePdfToc } from '@vue3-office/vue-pdf'

const buffer = ref<ArrayBuffer | null>(null)
onMounted(async () => {
  const res = await fetch('/api/file/123')
  buffer.value = await res.arrayBuffer()
})
</script>

<template>
  <VuePdfToc v-if="buffer" :src="buffer" style="height: 100vh" />
</template>
```

### 目录的两种来源

组件内部会按以下优先级构建目录：

1. **PDF 内置 outline**（`PDFDocumentProxy.getOutline()`）—— 大多数规范的 PDF 都自带
2. **从 Link 注释推断** —— 没有 outline 时，扫描全文档 `Link` 类型注释，按位置 / 字号聚类生成树

开启 `auto-enhance-outline` 后，会进一步扫描正文，把 outline 中缺失的子级编号补回去。例如 outline 里只有 `8.3`，但正文里有 `8.3.1`、`8.3.2`，会被自动挂上：

```vue
<VuePdfToc
  src="/manual.pdf"
  auto-enhance-outline
  :outline-default-expand-level="2"
  style="height: 100vh"
/>
```

> 增强会带来一定的扫描开销（取决于文档规模），按需开启。

### VuePdfToc Props 完整列表

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `src` | `string \| ArrayBuffer \| Blob` | — | **必填**，PDF 文件来源 |
| `filename` | `string` | `''` | 显示在标题栏 / 下载时使用的文件名；为空时使用 `'document.pdf'` |
| `showDownload` | `boolean` | `true` | 是否显示工具栏右侧的下载按钮 |
| `showPrint` | `boolean` | `true` | 是否显示工具栏右侧的打印按钮 |
| `autoEnhanceOutline` | `boolean` | `false` | 是否自动补全 outline 中缺失的下级编号子项 |
| `outlineDefaultExpandLevel` | `number` | `1` | 目录默认展开到的层级（含），`1` 表示只展开第一级 |
| `loaderOptions` | `PDFLoaderOptions` | 内置默认值 | 透传给 pdfjs `getDocument` 的加载参数。不传也会自动启用大文件优化默认值，详见 [大文件 / 远程 PDF 加载优化](#大文件--远程-pdf-加载优化) |

### VuePdfToc Events

| 事件 | 回调参数 | 说明 |
| --- | --- | --- |
| `rendered` | `{ totalPages: number }` | 文档加载完成（pdf 解析完拿到 numPages，不等同于所有页都已渲染） |
| `progress` | `{ loaded: number; total: number }` | 网络下载进度，`loaded`/`total` 均为字节数；仅当通过 URL 加载时才会触发；已做去重处理 |
| `error` | `Error` | 加载失败 |

> `VuePdfToc` 内部 loading 区已经显示了进度条与 `xx%  loadedMB / totalMB` 文案，业务侧通常不需要再用 `@progress` 自己渲染 UI；这个事件主要用于联动外部组件（如全局 loading bar、埋点）。

> 如果你需要更细粒度的事件（注释跳转、文本高亮、单页 loaded 等），请改用底层 `VuePdf` + `usePDF` 自行组装。`VuePdfToc` 的设计目标是「直接能用」。

### 键盘快捷键

| 快捷键 | 行为 |
| --- | --- |
| `Ctrl + B` / `⌘ + B` | 折叠 / 展开左侧边栏 |
| 页码输入框回车 | 跳转到指定页 |

---

## 全局注册

```ts
import { createApp } from 'vue'
import { VuePDFPlugin, VuePdfToc } from '@vue3-office/vue-pdf'
import '@vue3-office/vue-pdf/style.css'
import App from './App.vue'

const app = createApp(App)

app.use(VuePDFPlugin)            // 注册 <VuePdf />
app.component('VuePdfToc', VuePdfToc) // 完整阅读器需要单独注册
app.mount('#app')
```

---

## 大文件 / 远程 PDF 加载优化

加载远程 PDF 时（尤其是 30M+ 大文件），pdfjs 默认会顺序拉取整个文件到内存才能开始解析。`@vue3-office/vue-pdf` 通过 `loaderOptions` 暴露了 pdfjs `getDocument` 的关键加载参数，并设置了一套**面向大文件的保守默认值**。

### 默认值（无需手动配置即可生效）

| 字段 | 默认值 | pdfjs 原生默认 | 含义 |
| --- | --- | --- | --- |
| `rangeChunkSize` | `262144`（256KB） | `65536`（64KB） | 每次 HTTP Range 请求拉取的字节数。256KB 比默认大 4 倍，减少 RTT 累积 |
| `disableAutoFetch` | `true` | `false` | 关闭后台预取剩余页。首屏只下载渲染当前页所需字节，翻页才拉对应页 |

### 字段定义（`PDFLoaderOptions`）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `rangeChunkSize` | `number` | Range 单次字节数 |
| `disableRange` | `boolean` | 关闭 Range 请求；服务端不支持 Range 时使用 |
| `disableStream` | `boolean` | 关闭 fetch ReadableStream 模式；调试用 |
| `disableAutoFetch` | `boolean` | 关闭后台预取 |
| `cMapUrl` | `string` | 中日韩 CMap 资源地址 |
| `cMapPacked` | `boolean` | CMap 是否为压缩格式（pdfjs-dist 自带的是 `true`） |
| `standardFontDataUrl` | `string` | 标准字体资源地址 |
| `enableXfa` | `boolean` | 启用 XFA 表单 |
| `httpHeaders` | `Record<string, string>` | 自定义请求头 |
| `withCredentials` | `boolean` | 请求是否带 cookies |

### 合并语义：业务方传入的字段会**覆盖**同名默认

```ts
// 默认行为：rangeChunkSize=256KB，disableAutoFetch=true
usePDF('/big.pdf')

// 自定义 chunk 大小，autoFetch 仍保持关闭
usePDF('/big.pdf', {
  loaderOptions: { rangeChunkSize: 512 * 1024 },
})

// 显式开启后台预取（小文件 / 弱网场景）
usePDF('/small.pdf', {
  loaderOptions: { disableAutoFetch: false },
})

// 完全关闭 Range，回到 pdfjs 一次性拉全文件
usePDF('/file.pdf', {
  loaderOptions: { disableRange: true, rangeChunkSize: 0 },
})
```

`VuePdfToc` 同样支持：

```vue
<VuePdfToc
  :src="pdfUrl"
  :loader-options="{ rangeChunkSize: 512 * 1024 }"
/>
```

### 服务端要求（Range 生效条件）

要让 Range / Stream 真正生效，文件服务必须满足：

1. 响应头包含 `Accept-Ranges: bytes`
2. 响应头包含正确的 `Content-Length`
3. **不要**对 PDF 启用 gzip / br 压缩（压缩会破坏字节偏移，pdfjs 检测到 `Content-Encoding` 会自动禁用 Range）
4. CORS 场景下需要暴露相关响应头：

```
Access-Control-Expose-Headers: Accept-Ranges, Content-Length, Content-Encoding, Content-Range
```

5. 业务侧把 URL **字符串**直接传给组件，**不要**自己 `fetch().arrayBuffer()` 后再传 Buffer——一旦变成 `ArrayBuffer/Blob`，pdfjs 就拿不到 HTTP 流，所有 Range 配置都失效。

### 中文 / 日文 / 韩文 PDF：配置 cMap

CJK PDF 的字体编码通常是 CID（Adobe-GB1 / Adobe-CNS1 / Adobe-Japan1 等），需要 CMap 表把 CID 映射回 Unicode，否则**文字能渲染、但复制是乱码、textLayer 选不中、PDF 全文搜索失效**，控制台还会反复报 `Unable to load CMap` 警告拖慢首屏。

最简单的做法是把 `pdfjs-dist/cmaps/` 目录的 100+ 个 `.bcmap` 文件拷到业务方 `public/` 下，然后在 `loaderOptions` 里指定路径：

```ts
loaderOptions: {
  cMapUrl: '/pdfjs-cmaps/',  // 注意尾部斜杠
  cMapPacked: true,
}
```

> 也可以用 `vite-plugin-static-copy` 在 vite 配置里自动从 `node_modules/pdfjs-dist/cmaps` 拷贝。**不要**用 `import 'xxx.bcmap'` 让构建工具加 hash —— pdfjs 运行时是按原文件名拼接 URL 的，加 hash 会找不到文件。

### 加载进度

`usePDF` 的 `onProgress` 与 `VuePdfToc` 的 `@progress` 事件提供字节级进度反馈：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { usePDF } from '@vue3-office/vue-pdf'

const progress = ref<{ loaded: number; total: number } | null>(null)
const { pdf } = usePDF('/big.pdf', {
  onProgress: ({ loaded, total }) => { progress.value = { loaded, total } },
})

const percent = computed(() =>
  progress.value && progress.value.total > 0
    ? Math.floor(progress.value.loaded / progress.value.total * 100)
    : 0
)
</script>
```

`VuePdfToc` 内部 loading 区已自动显示了进度条 + `xx%  loadedMB / totalMB` 文案。

### 何时配置无效？

下列场景 `loaderOptions` 里和网络相关的字段（`rangeChunkSize` / `disableRange` / `disableStream` / `disableAutoFetch`）**不会**生效，因为数据已经在内存中：

- `src` 是 `ArrayBuffer` / `Blob` / `TypedArray`
- `src` 是已经 `URL.createObjectURL` 出来的 `blob:` URL
- `usePDF` 入参直接是 `DocumentInitParameters` 对象 + `data` 字段

但 `cMapUrl` / `enableXfa` / `standardFontDataUrl` 等字段在所有场景都生效，会一并透传。

### 不能再优化的极端场景

如果文件本身**对象排布不规范**（例如 OCR 后保存、多次编辑、未线性化的 PDF），worker 必须读取大部分字节才能 resolve `numPages`。这种情况下 `loaderOptions` 调到极致也只能省 5-10% 时间。**唯一治本方案是让后端做线性化**（Linearization / Web Optimized）：

```bash
# 单文件
qpdf --linearize input.pdf output.pdf

# 批量
find /path -name '*.pdf' -exec qpdf --linearize {} {}.tmp \; -exec mv {}.tmp {} \;
```

线性化后的 PDF 文件大小通常多 1-3%，但首页渲染只需要拿到前几个 chunk，体验差距明显。

---



`VuePdf` 与 `VuePdfToc` 都依赖 `pdfjs-dist`，需要浏览器环境（Web Worker、`URL.createObjectURL` 等）。在 Nuxt / 其他 SSR 框架中请用 `<ClientOnly>` 包裹：

```vue
<ClientOnly>
  <VuePdfToc :src="src" style="height: 100vh" />
</ClientOnly>
```

---

## 常见问题

**1. 翻页 / 缩放时为什么不会闪白？**
内部使用了离屏 canvas，新页面渲染完成后才一次性替换 DOM，旧 canvas 立即释放显存。

**2. 多个 `VuePdf` 共用同一个 `pdf`，卸载会出问题吗？**
不会。`autoDestroy` 默认为 `false`，文档生命周期由 `usePDF` 统一管理。如果你只在一个组件里用 PDF 且希望它卸载时释放资源，可以单独打开 `auto-destroy`。

**3. `printFast` 打印效果模糊？**
`printFast` 默认 100 DPI，追求速度。需要更清晰的输出请用 `print(150)` 或 `print(200)`，逐页串行渲染、画质更好。

**4. 目录跳转不准（总是滚到页顶）？**
确保你监听了 `annotation` 中的 `internal-link`，并在 `loaded` 事件里使用 `getDestCssOffsetY` 计算目标偏移。`VuePdfToc` 已经内置该逻辑。

**5. `info.outline` 是空的怎么办？**
PDF 文件本身没有 outline。可以用 `VuePdfToc` 的 `auto-enhance-outline`，或在自己的实现里调用 `generateOutlineFromAnnotations` 回退方案。

**6. 加载远程大 PDF（30M+）首屏很慢？**
组件内置了 `rangeChunkSize: 256KB` + `disableAutoFetch: true` 的大文件优化默认值，但要真正生效需要业务方满足：① 直接传 URL 字符串，不要自己 `fetch().arrayBuffer()` 后再传；② 服务端返回 `Accept-Ranges: bytes` 且不压缩 PDF；③ CORS 场景暴露 `Content-Range / Content-Length`。详见 [大文件 / 远程 PDF 加载优化](#大文件--远程-pdf-加载优化)。如果配置都正确仍然慢，多半是 PDF 本身没线性化，可在后端用 `qpdf --linearize` 处理。

**7. 中文 PDF 复制 / 选中是乱码？**
没配 cMap。把 `pdfjs-dist/cmaps/` 拷到 `public/pdfjs-cmaps/`，然后传 `loader-options="{ cMapUrl: '/pdfjs-cmaps/', cMapPacked: true }"`。

**8. 进度条事件 `progress` 一直在响？**
进度回调已在 `usePDF` 内部去重——相同 `loaded` 不会重复触发。如果你看到大量重复日志，请确认引用的是当前版本的产物（不是旧的 dist）。

---

## License

[MIT](../../LICENSE)

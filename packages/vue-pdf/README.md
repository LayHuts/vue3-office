<div align="center">
  <h1>Vue3 Office</h1>
  <p>一套基于 Vue 3 的办公文档及多媒体预览组件库</p>
  <p>支持 PDF / DOCX / Excel / 视频 / 音频 在线预览</p>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/vue-3.5+-brightgreen" />
  <img src="https://img.shields.io/badge/license-MIT-blue" />
  <img src="https://img.shields.io/badge/pnpm-10+-orange" />
  <img src="https://img.shields.io/badge/node-%3E%3D22.14-green" />
</p>

## 简介

Vue3 Office 是一个 monorepo 项目，提供了一系列开箱即用的 Vue 3 组件，用于在浏览器中预览各类办公文档和多媒体文件。

| 包名 | 说明 | 核心依赖 |
| --- | --- | --- |
| `@vue3-office/vue-pdf` | PDF 预览（支持文本层、注释层、水印、高亮、XFA 表单） | pdfjs-dist |
| `@vue3-office/vue-docx` | Word 文档预览 | docx-preview |
| `@vue3-office/vue-excel` | Excel 表格预览 | exceljs + x-data-spreadsheet |
| `@vue3-office/vue-video` | 视频播放器（画中画、迷你模式） | xgplayer |
| `@vue3-office/vue-audio` | 音频播放器（歌词、播放列表、固定模式） | colorthief |
| `@vue3-office/common` | 公共工具库（请求、下载、类型定义） | — |

## 环境要求

- Node.js >= 22.14.0
- pnpm >= 10.0.0
- Vue >= 3.5.24

## 安装

```bash
# 安装 PDF 预览
pnpm add @vue3-office/vue-pdf

# 安装 Word 预览
pnpm add @vue3-office/vue-docx

# 安装 Excel 预览
pnpm add @vue3-office/vue-excel

# 安装视频播放器
pnpm add @vue3-office/vue-video

# 安装音频播放器
pnpm add @vue3-office/vue-audio
```

也可以使用 npm / yarn：

```bash
npm install @vue3-office/vue-pdf
yarn add @vue3-office/vue-pdf
```

---

## 本地开发

```bash
# 克隆仓库
git clone <repo-url>

# 安装依赖
pnpm install

# 启动 playground
pnpm dev

# 启动文档站点
pnpm dev:docs

# 构建
pnpm build
```

---

## @vue3-office/vue-pdf

PDF 文档预览组件，基于 `pdfjs-dist`，支持文本选择、注释交互、水印、文本高亮、XFA 表单等。

### 基本用法

```vue
<script setup>
import { VuePdf, usePDF } from '@vue3-office/vue-pdf'
import '@vue3-office/vue-pdf/style.css'

const { pdf, pages, info } = usePDF('https://example.com/sample.pdf')
</script>

<template>
  <VuePdf :pdf="pdf" />
</template>
```

### 多页渲染

```vue
<script setup>
import { VuePdf, usePDF } from '@vue3-office/vue-pdf'

const { pdf, pages } = usePDF('sample.pdf')
</script>

<template>
  <VuePdf v-for="page in pages" :key="page" :pdf="pdf" :page="page" />
</template>
```

### 启用文本层和注释层

```vue
<template>
  <VuePdf :pdf="pdf" text-layer annotation-layer />
</template>
```

### 水印 & 高亮

```vue
<template>
  <VuePdf
    :pdf="pdf"
    watermark-text="机密文件"
    :watermark-options="{ columns: 4, rows: 4, rotation: 45, fontSize: 18, color: 'rgba(211,210,211,0.4)' }"
    highlight-text="搜索关键词"
    :highlight-options="{ ignoreCase: true, completeWords: false }"
  />
</template>
```

### XFA 表单

```vue
<script setup>
const { pdf } = usePDF({ url: '/xfa.pdf', enableXfa: true })
</script>

<template>
  <VuePdf :pdf="pdf" />
</template>
```

### `usePDF` 组合式函数

```ts
const { pdf, pages, info, download, print, printFast, cancelPrint, getPDFDestination } = usePDF(src, options?)
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `src` | `string \| URL \| TypedArray \| DocumentInitParameters \| Ref<...>` | PDF 来源（URL、二进制数据或配置对象） |
| `options.password` | `string` | 文档密码 |
| `options.onProgress` | `(progressData) => void` | 加载进度回调 |
| `options.onPassword` | `(updatePassword, reason) => void` | 密码请求回调（设置后 `password` 选项被忽略） |
| `options.onError` | `(error) => void` | 加载错误回调 |

**返回值：**

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `pdf` | `Ref<PDFDocumentLoadingTask>` | PDF 加载任务，传给 `<VuePdf :pdf="pdf" />` |
| `pages` | `Ref<number>` | 总页数 |
| `info` | `Ref<PDFInfo>` | 文档元信息（metadata、attachments、outline 等） |
| `download(filename?)` | `Function` | 下载 PDF 文件 |
| `print(dpi?, filename?, onProgress?)` | `Function` | 打印（逐页渲染，高质量） |
| `printFast(dpi?, filename?, onProgress?)` | `Function` | 快速打印（并行渲染，低内存） |
| `cancelPrint()` | `Function` | 取消正在进行的打印 |
| `getPDFDestination(dest)` | `Function` | 解析 PDF 目标位置 |

### `VuePdf` 组件 Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `pdf` | `PDFDocumentLoadingTask` | — | `usePDF` 返回的 PDF 对象 |
| `page` | `number` | `1` | 要渲染的页码 |
| `scale` | `number` | `1` | 缩放比例 |
| `rotation` | `number` | — | 旋转角度（需为 90 的倍数） |
| `fitParent` | `boolean` | — | 自适应父容器宽度 |
| `width` | `number` | — | 指定渲染宽度（px） |
| `height` | `number` | — | 指定渲染高度（px） |
| `textLayer` | `boolean` | — | 启用文本选择层 |
| `annotationLayer` | `boolean` | — | 启用注释交互层 |
| `annotationsFilter` | `string[]` | — | 注释类型过滤 |
| `annotationsMap` | `object` | — | 注释映射 |
| `hideForms` | `boolean` | — | 隐藏表单 |
| `imageResourcesPath` | `string` | — | 注释图片资源路径 |
| `intent` | `string` | `"display"` | 渲染意图 |
| `autoDestroy` | `boolean` | `false` | 组件卸载时自动销毁 PDF 文档 |
| `watermarkText` | `string` | — | 水印文字 |
| `watermarkOptions` | `WatermarkOptions` | — | 水印配置 |
| `highlightText` | `string \| string[]` | — | 高亮搜索文本 |
| `highlightOptions` | `HighlightOptions` | — | 高亮配置 |
| `highlightPages` | `number[]` | — | 限定高亮的页码 |

### `VuePdf` 事件

| 事件 | 回调参数 | 说明 |
| --- | --- | --- |
| `loaded` | `PageViewport` | 页面渲染完成 |
| `error` | `{ type, message, error }` | 渲染/加载错误 |
| `annotation` | `{ type, data }` | 注释交互（如点击链接） |
| `annotationLoaded` | `any[]` | 注释层加载完成 |
| `highlight` | `{ matches, page, textContent, textDivs }` | 文本高亮匹配 |
| `textLoaded` | `{ textDivs, textContent }` | 文本层加载完成 |
| `xfaLoaded` | — | XFA 层加载完成 |

### `VuePdf` 暴露方法（ref 调用）

| 方法 | 说明 |
| --- | --- |
| `reload()` | 重新渲染当前页 |
| `cancel()` | 取消当前渲染任务 |
| `destroy()` | 销毁 PDF 文档 |

### `VuePdf` 插槽

| 插槽 | 作用域参数 | 说明 |
| --- | --- | --- |
| `default` | — | 页面加载中的占位内容 |
| `overlay` | `{ width, height }` | 页面上方的覆盖层（可用于自定义标注） |

---

### `VuePdfToc` 完整 PDF 阅读器

内置工具栏、侧边栏（缩略图 + 目录）、翻页、缩放、下载、打印的完整阅读器组件。

```vue
<script setup>
import { VuePdfToc } from '@vue3-office/vue-pdf'
import '@vue3-office/vue-pdf/style.css'
</script>

<template>
  <VuePdfToc src="https://example.com/sample.pdf" style="height: 100vh" />
</template>
```

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `src` | `string \| ArrayBuffer \| Blob` | — | PDF 文件来源 |
| `showDownload` | `boolean` | `true` | 显示下载按钮 |
| `showPrint` | `boolean` | `true` | 显示打印按钮 |

| 事件 | 回调参数 | 说明 |
| --- | --- | --- |
| `rendered` | `{ totalPages }` | 文档加载完成 |
| `error` | `Error` | 加载错误 |

---

## @vue3-office/vue-docx

Word 文档（.docx）在线预览组件，基于 `docx-preview`。

### 基本用法

```vue
<script setup>
import VueDocx from '@vue3-office/vue-docx'

const docxUrl = 'https://example.com/sample.docx'
</script>

<template>
  <VueDocx :url="docxUrl" @rendered="onRendered" @error="onError" />
</template>
```

### 使用 ArrayBuffer / Blob

```vue
<script setup>
import VueDocx from '@vue3-office/vue-docx'

// 通过 fetch 获取二进制数据
const response = await fetch('/sample.docx')
const blob = await response.blob()
</script>

<template>
  <VueDocx :url="blob" />
</template>
```

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `url` | `string \| ArrayBuffer \| Blob` | — | 文档来源（URL 或二进制数据） |
| `requestOptions` | `RequestOptions` | `{ responseType: 'blob' }` | 请求配置（仅 URL 模式生效） |
| `docxOptions` | `Partial<DocxOptions>` | `{ ignoreLastRenderedPageBreak: false }` | docx-preview 渲染选项 |

### 事件

| 事件 | 回调参数 | 说明 |
| --- | --- | --- |
| `rendered` | — | 文档渲染完成 |
| `error` | `Error` | 渲染错误 |

### 暴露方法（ref 调用）

```vue
<script setup>
const docxRef = ref()

function download() {
  docxRef.value.downloadFile('文档.docx')
}
</script>

<template>
  <VueDocx ref="docxRef" :url="url" />
</template>
```

| 方法 | 说明 |
| --- | --- |
| `downloadFile(fileName)` | 下载原始 docx 文件 |
| `docxRef` | 渲染容器 DOM 引用 |

---

## @vue3-office/vue-excel

Excel 表格（.xlsx / .xls）在线预览组件，基于 `exceljs` + `x-data-spreadsheet`。

### 基本用法

```vue
<script setup>
import VueExcel from '@vue3-office/vue-excel'
import '@vue3-office/vue-excel/style.css'
</script>

<template>
  <VueExcel
    url="https://example.com/sample.xlsx"
    @rendered="onRendered"
    @error="onError"
  />
</template>
```

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `url` | `string \| ArrayBuffer \| Blob` | — | 文件来源 |
| `xls` | `boolean` | `false` | 是否为 .xls 格式 |
| `widthOffset` | `number` | `0` | 列宽额外偏移量（px） |
| `heightOffset` | `number` | `0` | 行高额外偏移量（px） |
| `requestOptions` | `RequestOptions` | `{ responseType: 'arraybuffer' }` | 请求配置 |
| `excelOptions` | `Partial<ExcelOptions>` | `{}` | x-data-spreadsheet 配置 |
| `beforeTransform` | `(workbook) => any` | — | 数据转换前回调 |
| `afterTransform` | `(workbook) => any` | — | 数据转换后回调 |

**ExcelOptions 配置：**

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `showGrid` | `boolean` | `true` | 显示网格线 |
| `showBottomBar` | `boolean` | `true` | 显示底部 Sheet 切换栏 |
| `view.height` | `() => number` | 自适应容器 | 视图高度 |
| `view.width` | `() => number` | 自适应容器 | 视图宽度 |
| `row.len` | `number` | `100` | 默认行数 |
| `row.height` | `number` | `24` | 默认行高 |
| `col.len` | `number` | `26` | 默认列数 |
| `col.width` | `number` | `80` | 默认列宽 |

### 事件

| 事件 | 回调参数 | 说明 |
| --- | --- | --- |
| `rendered` | — | 渲染完成 |
| `error` | `Error` | 渲染错误 |
| `switchSheet` | `index: number` | 切换 Sheet 页签 |
| `cellSelected` | `{ cell, rowIndex, columnIndex }` | 单元格选中 |
| `cellsSelected` | `{ cell, startRowIndex, startColumnIndex, endRowIndex, endColumnIndex }` | 多单元格选中 |

### 暴露方法（ref 调用）

| 方法 | 说明 |
| --- | --- |
| `downloadFile(fileName)` | 下载原始 Excel 文件 |
| `reRender()` | 重新渲染表格 |
| `wrapperRef` | 外层容器 DOM 引用 |
| `rootRef` | 表格容器 DOM 引用 |

---

## @vue3-office/vue-video

视频播放器组件，基于 `xgplayer`，支持画中画、迷你模式、HLS 等。

### 基本用法

```vue
<script setup>
import VueVideo from '@vue3-office/vue-video'
import '@vue3-office/vue-video/style.css'
</script>

<template>
  <VueVideo url="https://example.com/video.mp4" />
</template>
```

### 自定义播放器配置

```vue
<template>
  <VueVideo
    url="https://example.com/video.mp4"
    :player-options="{
      width: 800,
      height: 450,
      autoplay: false,
      poster: 'https://example.com/poster.jpg',
      volume: 0.6,
    }"
  />
</template>
```

### 使用二进制数据

```vue
<script setup>
// 支持 ArrayBuffer / Blob
const response = await fetch('/video.mp4')
const blob = await response.blob()
</script>

<template>
  <VueVideo :url="blob" />
</template>
```

### 监听播放器事件

```vue
<script setup>
import { Events } from '@vue3-office/vue-video'

const events = {
  [Events.PLAY]: () => console.log('播放'),
  [Events.PAUSE]: () => console.log('暂停'),
  [Events.ENDED]: () => console.log('播放结束'),
  [Events.ERROR]: (err) => console.error('错误', err),
}
</script>

<template>
  <VueVideo url="/video.mp4" :events="events" />
</template>
```

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `url` | `string \| ArrayBuffer \| Blob` | — | 视频来源 |
| `playerOptions` | `Partial<IPlayerOptions>` | 见下方 | xgplayer 播放器配置（不含 `url`、`id`、`el`） |
| `events` | `VideoEventHandlers` | — | 事件处理器对象，key 为 xgplayer 事件名 |

**默认播放器配置：**

```ts
{
  lang: 'zh-cn',
  pip: true,           // 画中画
  mini: {              // 迷你模式
    isScrollSwitch: true,
    scrollTop: 10,
    isShowIcon: true,
  }
}
```

### 事件

| 事件 | 回调参数 | 说明 |
| --- | --- | --- |
| `rendered` | — | 播放器初始化完成 |
| `error` | `Error` | 初始化错误 |

> 更多播放器事件通过 `events` prop 传入，支持 xgplayer 所有事件。

### 暴露方法（ref 调用）

| 方法 | 说明 |
| --- | --- |
| `getPlayer()` | 获取 xgplayer 实例，可调用所有原生方法 |

```vue
<script setup>
const videoRef = ref()

function seekTo(time) {
  const player = videoRef.value.getPlayer()
  player.currentTime = time
}
</script>

<template>
  <VueVideo ref="videoRef" url="/video.mp4" />
</template>
```

---

## @vue3-office/vue-audio

音频播放器组件，支持播放列表、歌词显示（LRC）、随机/循环播放、固定模式、浮动拖拽等。

### 基本用法

```vue
<script setup>
import VueAudio from '@vue3-office/vue-audio'
import '@vue3-office/vue-audio/style.css'

const music = {
  src: 'https://example.com/song.mp3',
  title: '歌曲名称',
  artist: '歌手',
  pic: 'https://example.com/cover.jpg',
}
</script>

<template>
  <VueAudio :music="music" />
</template>
```

### 播放列表 + 歌词

```vue
<script setup>
const music = { src: '/song1.mp3', title: '歌曲1', artist: '歌手A', pic: '/cover1.jpg', lrc: '/song1.lrc' }
const playlist = [
  music,
  { src: '/song2.mp3', title: '歌曲2', artist: '歌手B', pic: '/cover2.jpg', lrc: '/song2.lrc' },
  { src: '/song3.mp3', title: '歌曲3', artist: '歌手C', pic: '/cover3.jpg' },
]
</script>

<template>
  <VueAudio :music="music" :list="playlist" show-lrc />
</template>
```

### 固定模式（Fixed）

```vue
<template>
  <VueAudio :music="music" :list="playlist" fixed fixed-position="bottom-right" />
</template>
```

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `music` | `Music` | — | **必填**，当前播放的音乐 |
| `list` | `Music[]` | `[]` | 播放列表 |
| `mini` | `boolean` | `false` | 迷你模式（仅显示封面） |
| `showLrc` | `boolean` | `false` | 显示歌词 |
| `mutex` | `boolean` | `true` | 互斥播放（同时只有一个播放器播放） |
| `theme` | `string` | `'#41b883'` | 主题色（设为 `'pic'` 自动从封面提取） |
| `listMaxHeight` | `number \| string` | `0` | 播放列表最大高度 |
| `listFolded` | `boolean` | `false` | 初始折叠播放列表 |
| `float` | `boolean` | `false` | 浮动模式（可拖拽） |
| `autoplay` | `boolean` | `false` | 自动播放 |
| `controls` | `boolean` | `false` | 显示原生 audio 控件 |
| `muted` | `boolean` | `false` | 静音 |
| `preload` | `string` | `''` | 预加载模式（`'none'` / `'metadata'` / `'auto'`） |
| `volume` | `number` | `0.8` | 音量（0-1） |
| `shuffle` | `boolean` | `false` | 随机播放 |
| `repeat` | `string` | `'repeat-all'` | 循环模式（`'no-repeat'` / `'repeat-one'` / `'repeat-all'`） |
| `fixed` | `boolean` | `false` | 固定模式（固定在页面边缘） |
| `fixedPosition` | `FixedPosition` | `'bottom-left'` | 固定位置（`'bottom-left'` / `'bottom-right'` / `'top-left'` / `'top-right'`） |
| `fixedClose` | `boolean` | `true` | 固定模式下显示关闭按钮 |

**Music 接口：**

```ts
interface Music {
  src: string       // 音频 URL（必填）
  title?: string    // 歌曲标题
  artist?: string   // 歌手
  pic?: string      // 封面图片 URL
  lrc?: string      // 歌词（LRC 格式字符串或 .lrc 文件 URL）
  theme?: string    // 单曲主题色
}
```

### 事件

| 事件 | 回调参数 | 说明 |
| --- | --- | --- |
| `play` | `Event` | 开始播放 |
| `pause` | `Event` | 暂停 |
| `ended` | `Event` | 播放结束 |
| `error` | `Event` | 播放错误 |
| `timeUpdate` | `Event` | 播放进度更新 |
| `volumeChange` | `Event` | 音量变化 |
| `canPlay` | `Event` | 可以播放 |
| `canPlayThrough` | `Event` | 可以完整播放 |
| `durationChange` | `Event` | 时长变化 |
| `loadedData` | `Event` | 数据加载完成 |
| `loadedMetadata` | `Event` | 元数据加载完成 |
| `loadStart` | `Event` | 开始加载 |
| `playing` | `Event` | 正在播放 |
| `progress` | `Event` | 加载进度 |
| `seeked` | `Event` | 跳转完成 |
| `seeking` | `Event` | 正在跳转 |
| `waiting` | `Event` | 等待数据 |
| `close` | — | 固定模式下关闭播放器 |

**支持 v-model：**

| v-model | 类型 | 说明 |
| --- | --- | --- |
| `v-model:music` | `Music` | 当前播放曲目 |
| `v-model:muted` | `boolean` | 静音状态 |
| `v-model:volume` | `number` | 音量 |
| `v-model:shuffle` | `boolean` | 随机播放状态 |
| `v-model:repeat` | `string` | 循环模式 |

### 暴露方法（ref 调用）

| 方法 | 说明 |
| --- | --- |
| `play()` | 播放 |
| `pause()` | 暂停 |
| `toggle()` | 切换播放/暂停 |

```vue
<script setup>
const audioRef = ref()

function playMusic() {
  audioRef.value.play()
}
</script>

<template>
  <VueAudio ref="audioRef" :music="music" />
</template>
```

---

## @vue3-office/common

公共工具库，被其他包内部依赖，也可以单独使用。

### 导出内容

```ts
import {
  // 类型
  type FileSrc,          // string | ArrayBuffer | Blob
  type MimeType,         // 常用 MIME 类型枚举
  type RequestOptions,   // fetch 请求配置扩展

  // 请求
  request,               // 封装的 fetch 请求函数

  // 工具函数
  useObjectUrl,          // 创建/管理 Object URL（组件卸载自动清理）
  download,              // 下载文件
  deepMerge,             // 深度合并对象
  isHttpUrl,             // 判断是否为 HTTP URL
} from '@vue3-office/common'
```

### `request` 请求函数

```ts
const result = await request<ArrayBuffer>(url, { responseType: 'arraybuffer' })
if (result.ok) {
  console.log(result.data)
} else {
  console.error(result.error.message)
}
```

### `useObjectUrl` 组合式函数

```ts
const { createUrl, revokeUrl, revokeUrlAll } = useObjectUrl()

// 从 Blob/ArrayBuffer 创建 URL
const url = createUrl(blob, 'video/mp4')

// 手动释放
revokeUrl(url)

// 组件卸载时自动释放所有 URL
```

### `download` 下载文件

```ts
import { download, MimeType } from '@vue3-office/common'

download('文件名.pdf', blobData, MimeType.PDF)
```

### MimeType 枚举

| 值 | MIME 类型 |
| --- | --- |
| `MimeType.PDF` | `application/pdf` |
| `MimeType.DOCX` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `MimeType.XLSX` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `MimeType.PPTX` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| `MimeType.PNG` | `image/png` |
| `MimeType.JPG` | `image/jpeg` |
| `MimeType.ZIP` | `application/zip` |
| `MimeType.MP4` | `video/mp4` |

---

## 全局注册（可选）

每个组件包都导出了 Vue 插件，可以全局注册：

```ts
import { createApp } from 'vue'
import { VuePDFPlugin } from '@vue3-office/vue-pdf'
import VueDocx from '@vue3-office/vue-docx'
import VueExcel from '@vue3-office/vue-excel'
import VueVideo from '@vue3-office/vue-video'
import VueAudio from '@vue3-office/vue-audio'

const app = createApp(App)

// 全局注册后可直接在模板中使用 <VuePdf />、<VueDocx /> 等
app.use(VuePDFPlugin)
app.component('VueDocx', VueDocx)
app.component('VueExcel', VueExcel)
app.component('VueVideo', VueVideo)
app.component('VueAudio', VueAudio)
```

---

## SSR 注意事项

所有组件均为客户端组件。在 Nuxt 等 SSR 框架中，需要使用 `<ClientOnly>` 包裹：

```vue
<ClientOnly>
  <VuePdf :pdf="pdf" />
</ClientOnly>
```

## License

[MIT](./LICENSE)

<div align="center">
  <h1>@vue3-office/vue-audio</h1>
  <p>Vue 3 音频播放器组件，支持单曲 / 列表 / 浮动 / 固定边缘 / HLS / 歌词 / 主题色自适应</p>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/vue-3.5+-brightgreen" />
  <img src="https://img.shields.io/badge/license-MIT-blue" />
</p>

## 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [功能特性](#功能特性)
- [使用模式](#使用模式)
  - [基础模式](#基础模式)
  - [Mini 模式](#mini-模式)
  - [Float 浮动模式](#float-浮动模式)
  - [Fixed 固定边缘模式](#fixed-固定边缘模式)
  - [播放列表与循环模式](#播放列表与循环模式)
  - [HLS 流](#hls-流)
  - [歌词显示与自定义渲染](#歌词显示与自定义渲染)
  - [封面提取主题色](#封面提取主题色)
- [Props](#props)
- [Events](#events)
- [Slots](#slots)
- [通过 ref 调用的方法](#通过-ref-调用的方法)
- [Music 数据结构](#music-数据结构)
- [v-model 双向绑定](#v-model-双向绑定)
- [全局注册](#全局注册)
- [SSR 注意事项](#ssr-注意事项)

---

## 安装

```bash
pnpm add @vue3-office/vue-audio
# 或
npm install @vue3-office/vue-audio
yarn add @vue3-office/vue-audio
```

需要 Vue >= 3.5.24。播放 HLS（.m3u8）流时还需自行安装 `hls.js`：

```bash
pnpm add hls.js
```

不传 `.m3u8` 不会触发 hls.js 解析，按需安装即可。

引入样式：

```ts
import '@vue3-office/vue-audio/style.css'
```

---

## 快速开始

```vue
<script setup lang="ts">
import { VueAudio } from '@vue3-office/vue-audio'
import '@vue3-office/vue-audio/style.css'
import { ref } from 'vue'

const music = ref({
  src: 'https://cdn.example.com/song.mp3',
  title: '示例歌曲',
  artist: '某乐队',
  pic: 'https://cdn.example.com/cover.jpg',
  lrc: 'https://cdn.example.com/song.lrc',
})
</script>

<template>
  <VueAudio v-model:music="music" autoplay show-lrc />
</template>
```

---

## 功能特性

- 单曲 / 多曲列表，列表循环 / 单曲循环 / 随机播放，三档自动切换
- Mini / Float（拖拽悬浮）/ Fixed（固定四角）三套布局
- HLS 流支持，自动按需加载 `hls.js`
- 歌词显示（LRC 字符串或 URL）
- 封面图主题色自适应（基于 ColorThief）
- 多播放器互斥（同时只播一个）
- 完整的原生 `<audio>` 事件透传 + Vue 风格的 `update:xxx` 双向绑定
- 移动端触摸拖动支持

---

## 使用模式

### 基础模式

```vue
<VueAudio :music="{ src: '/song.mp3', title: '示例', artist: '某人' }" />
```

### Mini 模式

只显示封面 + 播放按钮：

```vue
<VueAudio :music="music" mini />
```

### Float 浮动模式

可拖拽到页面任意位置，会做边界限制（缩略图必须完整可见）：

```vue
<VueAudio :music="music" float />
```

### Fixed 固定边缘模式

固定到屏幕四角，提供折叠 / 展开按钮、歌词分离 Teleport 到 body：

```vue
<VueAudio
  :music="music"
  :list="playlist"
  fixed
  fixed-position="bottom-right"
  show-lrc
/>
```

`fixed-position` 可选值：

| 值 | 位置 |
| --- | --- |
| `bottom-left`（默认） | 左下角，箭头在右 |
| `bottom-right` | 右下角，箭头在左 |
| `top-left` | 左上角，列表在下方 |
| `top-right` | 右上角，列表在下方 |

### 播放列表与循环模式

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { Music, RepeatMode } from '@vue3-office/vue-audio'

const list = ref<Music[]>([
  { src: '/a.mp3', title: 'A', artist: 'a' },
  { src: '/b.mp3', title: 'B', artist: 'b' },
  { src: '/c.mp3', title: 'C', artist: 'c' },
])
const current = ref(list.value[0])
const shuffle = ref(false)
const repeat = ref<RepeatMode>('repeat-all')
</script>

<template>
  <VueAudio
    v-model:music="current"
    v-model:shuffle="shuffle"
    v-model:repeat="repeat"
    :list="list"
    :list-max-height="320"
  />
</template>
```

`repeat` 可选值：

| 值 | 行为 |
| --- | --- |
| `'no-repeat'` | 列表播完即停 |
| `'repeat-one'` | 单曲循环 |
| `'repeat-all'`（默认） | 列表循环 |

> 内部循环按钮会按「列表循环 → 随机播放 → 单曲循环 → 列表循环」顺序切换。

### HLS 流

直接传 `.m3u8` URL 即可，组件会动态 import `hls.js`，没装的话会优雅降级到原生 `<audio>` 自带的 HLS 支持（仅 Safari）：

```vue
<VueAudio :music="{ src: 'https://example.com/live.m3u8', title: 'LIVE' }" />
```

### 歌词显示与自定义渲染

打开 `show-lrc` 默认会渲染内置 LRC 解析器。可以用 `display` slot 自定义中间区域：

```vue
<VueAudio :music="music" show-lrc>
  <template #display="{ currentMusic, playStat }">
    <div class="my-lrc">
      <p>{{ currentMusic.title }}</p>
      <p>已播放 {{ playStat.playedTime.toFixed(1) }}s</p>
    </div>
  </template>
</VueAudio>
```

### 封面提取主题色

把 `theme` 设为 `'pic'`，组件会用 ColorThief 从封面图提取主题色（用于进度条、按钮高亮）：

```vue
<VueAudio :music="{ ...music, theme: 'pic' }" />
<!-- 或全局指定 -->
<VueAudio :music="music" theme="pic" />
```

> 跨域图片需要服务端返回正确的 CORS 头，否则会回退到默认主题色。

---

## Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `music` | `Music` | — | **必填**，当前播放的歌曲；支持 `v-model:music` |
| `list` | `Music[]` | `[]` | 播放列表 |
| `mini` | `boolean` | `false` | 仅显示封面 + 播放按钮 |
| `showLrc` | `boolean` | `false` | 显示歌词 |
| `mutex` | `boolean` | `true` | 多个播放器同时存在时只允许一个播放 |
| `theme` | `string` | `'#41b883'` | 主题色，支持 CSS 颜色或字面量 `'pic'`（取自封面） |
| `listMaxHeight` | `number \| string` | — | 列表最大高度（px 或 CSS 字符串） |
| `listFolded` | `boolean` | `false` | 初始折叠列表 |
| `float` | `boolean` | `false` | 浮动可拖拽模式 |
| `autoplay` | `boolean` | `false` | 挂载后立即播放（受浏览器自动播放策略影响） |
| `controls` | `boolean` | `false` | 显示原生 `<audio>` 控件，仅调试用 |
| `muted` | `boolean` | `false` | 静音；支持 `v-model:muted` |
| `preload` | `'' \| 'none' \| 'metadata' \| 'auto'` | `''` | 预加载策略 |
| `volume` | `number` | `0.8` | 音量 0-1；支持 `v-model:volume` |
| `shuffle` | `boolean` | `false` | 随机播放；支持 `v-model:shuffle` |
| `repeat` | `RepeatMode` | `'repeat-all'` | 循环模式；支持 `v-model:repeat` |
| `fixed` | `boolean` | `false` | 固定到屏幕边缘 |
| `fixedPosition` | `FixedPosition` | `'bottom-left'` | Fixed 模式位置 |
| `fixedClose` | `boolean` | `true` | Fixed 模式下显示关闭按钮 |

---

## Events

### 业务事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `update:music` | `Music` | 切歌时（与 `v-model:music` 配合） |
| `update:muted` | `boolean` | 静音切换 |
| `update:volume` | `number` | 音量变化 |
| `update:shuffle` | `boolean` | 随机播放切换 |
| `update:repeat` | `string` | 循环模式切换 |
| `close` | — | Fixed 模式点击关闭按钮 |

### 原生 `<audio>` 事件透传

下列事件全部以 `camelCase` emit，参数为原生 `Event`：

`abort`、`canPlay`、`canPlayThrough`、`durationChange`、`emptied`、`encrypted`、`ended`、`error`、`loadedData`、`loadedMetadata`、`loadStart`、`pause`、`play`、`playing`、`progress`、`rateChange`、`seeked`、`seeking`、`stalled`、`suspend`、`timeUpdate`、`volumeChange`、`waiting`

```vue
<VueAudio
  :music="music"
  @play="(e) => console.log('开始播放', e)"
  @ended="onEnded"
  @error="(e) => console.error(e)"
/>
```

---

## Slots

| Slot | Scope 参数 | 用途 |
| --- | --- | --- |
| `display` | `{ currentMusic: Music, playStat: PlayStat }` | 自定义信息区域，覆盖默认歌词显示 |

`PlayStat`：

```ts
interface PlayStat {
  duration: number   // 总时长（秒）
  loadedTime: number // 已缓冲时长（秒）
  playedTime: number // 已播放时长（秒）
}
```

---

## 通过 ref 调用的方法

```vue
<script setup lang="ts">
import { ref } from 'vue'
const audioRef = ref()

audioRef.value?.play()    // 播放
audioRef.value?.pause()   // 暂停
audioRef.value?.toggle()  // 切换播放/暂停
</script>

<template>
  <VueAudio ref="audioRef" :music="music" />
</template>
```

---

## Music 数据结构

```ts
interface Music {
  src: string      // 音频 URL（必需）
  title?: string   // 标题
  artist?: string  // 艺术家
  pic?: string     // 封面图 URL
  lrc?: string     // LRC 字符串或 .lrc URL
  theme?: string   // 单曲主题色覆盖（可设为 'pic' 取封面色）
}
```

---

## v-model 双向绑定

支持 `music` / `muted` / `volume` / `shuffle` / `repeat` 五个字段双向绑定：

```vue
<VueAudio
  v-model:music="current"
  v-model:volume="volume"
  v-model:muted="muted"
  v-model:shuffle="shuffle"
  v-model:repeat="repeat"
  :list="list"
/>
```

---

## 全局注册

```ts
import { createApp } from 'vue'
import { VueAudioPlugin } from '@vue3-office/vue-audio'
import '@vue3-office/vue-audio/style.css'
import App from './App.vue'

createApp(App).use(VueAudioPlugin).mount('#app')
```

---

## SSR 注意事项

组件挂载时会读取 `window.navigator`、`new Image()` 等浏览器 API。在 Nuxt / 其他 SSR 框架中请用 `<ClientOnly>` 包裹：

```vue
<ClientOnly>
  <VueAudio :music="music" />
</ClientOnly>
```

---

## License

[MIT](../../LICENSE)

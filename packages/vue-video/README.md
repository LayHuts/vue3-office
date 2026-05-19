<div align="center">
  <h1>@vue3-office/vue-video</h1>
  <p>基于 <a href="https://github.com/bytedance/xgplayer">xgplayer</a> 封装的 Vue 3 视频播放器组件</p>
  <p>开箱即用：画中画、迷你模式滚动切换、双语提示、二进制源支持</p>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/vue-3.5+-brightgreen" />
  <img src="https://img.shields.io/badge/xgplayer-3-orange" />
  <img src="https://img.shields.io/badge/license-MIT-blue" />
</p>

## 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [文件来源支持](#文件来源支持)
- [Props](#props)
- [Events](#events)
- [通过 ref 调用](#通过-ref-调用)
- [完整使用示例](#完整使用示例)
- [画中画与迷你模式](#画中画与迷你模式)
- [类型导出](#类型导出)
- [全局注册](#全局注册)
- [常见问题](#常见问题)

---

## 安装

```bash
pnpm add @vue3-office/vue-video
# 或
npm install @vue3-office/vue-video
yarn add @vue3-office/vue-video
```

需要 Vue >= 3.5.24。`xgplayer` 已作为依赖被打包进发布产物，无需额外安装。

引入样式：

```ts
import '@vue3-office/vue-video/style.css'
```

xgplayer 自带的样式 `xgplayer/dist/index.min.css` 会在组件内部自动 import，业务侧无需重复引入。

---

## 快速开始

```vue
<script setup lang="ts">
import { VueVideo } from '@vue3-office/vue-video'
import '@vue3-office/vue-video/style.css'
</script>

<template>
  <VueVideo
    url="https://example.com/sample.mp4"
    :player-options="{
      poster: '/poster.jpg',
      width: 720,
      height: 405,
      autoplay: false,
    }"
    @rendered="() => console.log('player ready')"
    @error="(e) => console.error(e)"
  />
</template>
```

> 必须给容器或 `playerOptions` 指定宽高，否则播放器尺寸会塌陷。

---

## 文件来源支持

`url` 接受以下类型：

| 类型 | 示例 | 说明 |
| --- | --- | --- |
| `string` | `'https://x.com/a.mp4'` 或 `'/a.mp4'` | 远程或同源路径 |
| `IUrl`（xgplayer 多源） | `[{ src: '...', type: 'video/mp4' }]` | 多清晰度 / 多格式 |
| `Blob` | 来自 `<input type="file">` | 自动调用 `URL.createObjectURL` |
| `ArrayBuffer` | 来自 fetch 响应 | 自动包成 `Blob('video/mp4')` |

二进制场景示例：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VueVideo } from '@vue3-office/vue-video'

const file = ref<Blob | null>(null)
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
}
</script>

<template>
  <input type="file" accept="video/*" @change="onFileChange" />
  <VueVideo v-if="file" :url="file" :player-options="{ width: 720, height: 405 }" />
</template>
```

> `Blob/ArrayBuffer` 转出来的 Object URL 在组件卸载时会自动释放。

---

## Props

| Prop | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `url` | `string \| IUrl \| Blob \| ArrayBuffer` | ✅ | 视频源 |
| `playerOptions` | `Partial<XGPlayerOptions>` | — | 透传给 xgplayer 的全部配置（不含 `url` / `id` / `el`，由组件内部处理） |
| `events` | `VideoEventHandlers` | — | xgplayer 原生事件回调表，键为事件名，值为处理函数 |

`playerOptions` 接受 [xgplayer 全部参数](https://h5player.bytedance.com/api/)，组件内部已配置以下默认值：

```ts
{
  lang: 'zh-cn',
  i18n: [
    { LANG: 'zh-cn', TEXT: { FULLSCREEN_TIPS: '全屏', CSSFULLSCREEN_TIPS: '网页全屏', EXITCSSFULLSCREEN_TIPS: '退出网页全屏' } }
  ],
  pip: true,           // 启用画中画
  mini: {              // 滚动到视野外自动迷你
    isScrollSwitch: true,
    scrollTop: 10,
    isShowIcon: true,
  }
}
```

业务方传入的 `playerOptions` 会与默认值做深度合并（`deepMerge`），同名字段以业务方为准。

---

## Events

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `rendered` | — | 播放器实例创建完成（`new Player` 之后立即触发） |
| `error` | `Error` | 容器为空或播放器初始化失败 |

> xgplayer 的 timeupdate / playing / canplay 等播放事件不通过 `emit` 暴露，请通过 `events` prop 注册。

---

## 通过 ref 调用

组件暴露 `getPlayer()`，返回原生 `xgplayer` 实例，可直接调用 xgplayer 全部 API：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VueVideo } from '@vue3-office/vue-video'

const videoRef = ref<InstanceType<typeof VueVideo>>()

function play() {
  const player = videoRef.value?.getPlayer()
  player?.play()
}

function seek(time: number) {
  videoRef.value?.getPlayer()?.seek(time)
}
</script>

<template>
  <VueVideo ref="videoRef" url="/sample.mp4" :player-options="{ width: 720, height: 405 }" />
  <button @click="play">播放</button>
  <button @click="seek(30)">跳到 30 秒</button>
</template>
```

---

## 完整使用示例

```vue
<script setup lang="ts">
import { VueVideo } from '@vue3-office/vue-video'
import type { VideoEventHandlers } from '@vue3-office/vue-video'

const events: VideoEventHandlers = {
  play: () => console.log('开始播放'),
  pause: () => console.log('暂停'),
  ended: () => console.log('播放结束'),
  timeupdate: () => {
    // 注意：高频事件，谨慎处理
  },
  error: (err) => console.error('播放出错', err),
}
</script>

<template>
  <VueVideo
    url="https://example.com/sample.mp4"
    :player-options="{
      poster: '/poster.jpg',
      width: '100%',
      height: 480,
      autoplay: false,
      volume: 0.6,
      playbackRate: [0.5, 1, 1.5, 2],
      definitionActive: 'click',
    }"
    :events="events"
    @rendered="() => console.log('xgplayer ready')"
  />
</template>
```

---

## 画中画与迷你模式

组件内部对 `xgplayer` 的画中画和迷你模式做了协调：

- 启用画中画时会自动禁用 mini 切换，并把当前 mini 状态退出
- 退出画中画后 mini 功能恢复
- 画中画提示文案在中英文之间动态切换

如需关闭：

```vue
<VueVideo
  :url="url"
  :player-options="{ pip: false, mini: false }"
/>
```

---

## 类型导出

```ts
import {
  VueVideo,
  VueVideoPlugin,

  // 类型
  type VideoUrl,
  type VideoOptions,
  type VideoEventHandlers,
  type XGPlayerOptions,
  Events,        // xgplayer 事件名常量
  type IError,
} from '@vue3-office/vue-video'
```

`VideoEventHandlers` 是从 `xgplayer` 的 `Events` 自动推导的全集类型，TypeScript 下能拿到所有合法事件名的提示。

---

## 全局注册

```ts
import { createApp } from 'vue'
import { VueVideoPlugin } from '@vue3-office/vue-video'
import '@vue3-office/vue-video/style.css'
import App from './App.vue'

createApp(App).use(VueVideoPlugin).mount('#app')
```

---

## 常见问题

**1. 播放器没有显示？**
请确认在 `playerOptions` 里指定了 `width` / `height`，或外层容器有明确尺寸。xgplayer 不会自动撑满父元素。

**2. 切换 `url` 后没有生效？**
组件已在内部监听 `url` 变化并重建播放器实例。如果发现没刷新，确认新旧 URL 字符串确实不同（同一字符串不会重新初始化）。

**3. 想监听 `timeupdate` / `playing` 等高频事件？**
通过 `events` prop 传入处理函数，不要用 `@event-name`，因为组件本身只 emit `rendered` / `error`。

**4. 支持 HLS / DASH / FLV？**
xgplayer 原生支持 HLS（通过其插件体系），如需启用请按 xgplayer 官方文档加载对应插件。当前组件未内置自动切换。

---

## License

[MIT](../../LICENSE)

<div align="center">
  <h1>@vue3-office/vue-docx</h1>
  <p>基于 <a href="https://github.com/VolodymyrBaydalka/docxjs">docx-preview</a> 的 Vue 3 Word（.docx）在线预览组件</p>
  <p>开箱即用：传入 URL 或二进制即可渲染，保留段落格式、样式、表格、图片</p>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/vue-3.5+-brightgreen" />
  <img src="https://img.shields.io/badge/license-MIT-blue" />
</p>

## 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [文件来源支持](#文件来源支持)
- [Props](#props)
- [Events](#events)
- [通过 ref 调用](#通过-ref-调用)
- [docxOptions 详解](#docxoptions-详解)
- [完整示例](#完整示例)
- [全局注册](#全局注册)
- [常见问题](#常见问题)

---

## 安装

```bash
pnpm add @vue3-office/vue-docx
# 或
npm install @vue3-office/vue-docx
yarn add @vue3-office/vue-docx
```

需要 Vue >= 3.5.24。`docx-preview` 已作为依赖打包进发布产物。

引入样式：

```ts
import '@vue3-office/vue-docx/style.css'
```

---

## 快速开始

```vue
<script setup lang="ts">
import { VueDocx } from '@vue3-office/vue-docx'
import '@vue3-office/vue-docx/style.css'
</script>

<template>
  <div style="height: 100vh">
    <VueDocx
      url="https://example.com/sample.docx"
      @rendered="() => console.log('rendered')"
      @error="(e) => console.error(e)"
    />
  </div>
</template>
```

> 容器需要明确高度（`height: 100vh` / `flex: 1` 等），组件内部用 `overflow-y: auto` 做滚动。

---

## 文件来源支持

`url` 接受以下类型（来自 `@vue3-office/common` 的 `FileSrc`）：

| 类型 | 示例 |
| --- | --- |
| `string` | `'/api/file/123.docx'` |
| `ArrayBuffer` | `await fetch(url).then(r => r.arrayBuffer())` |
| `Blob` | 来自上传或网络请求 |

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { VueDocx } from '@vue3-office/vue-docx'

const blob = ref<Blob | null>(null)
onMounted(async () => {
  const res = await fetch('/api/file/sample.docx')
  blob.value = await res.blob()
})
</script>

<template>
  <VueDocx v-if="blob" :url="blob" style="height: 100vh" />
</template>
```

---

## Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `url` | `string \| ArrayBuffer \| Blob` | — | **必填**，docx 文件源 |
| `requestOptions` | `RequestOptions` | `{ responseType: 'blob' }` | URL 模式下传给 fetch 的请求配置（headers / credentials / responseType 等） |
| `docxOptions` | `Partial<DocxOptions>` | `{ ignoreLastRenderedPageBreak: false }` | 透传给 `docx-preview` 的渲染配置 |

`RequestOptions`：

```ts
interface RequestOptions extends RequestInit {
  responseType?: 'arraybuffer' | 'blob' | 'json'
}
```

`DocxOptions` 完整字段见下文 [docxOptions 详解](#docxoptions-详解)。

---

## Events

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `rendered` | — | 文件解析并渲染完成 |
| `error` | `Error` | 容器为空、网络失败、解析失败 |

```vue
<VueDocx
  :url="url"
  @rendered="onRendered"
  @error="(err) => alert(err.message)"
/>
```

---

## 通过 ref 调用

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VueDocx } from '@vue3-office/vue-docx'

const docxRef = ref<InstanceType<typeof VueDocx>>()

// 触发下载（保留原始文件字节）
function download() {
  docxRef.value?.downloadFile('导出文档.docx')
}
</script>

<template>
  <VueDocx ref="docxRef" :url="url" />
  <button @click="download">下载</button>
</template>
```

暴露的属性 / 方法：

| 名称 | 说明 |
| --- | --- |
| `docxRef` | 渲染容器 DOM 引用 |
| `downloadFile(fileName?)` | 触发下载；不传文件名时自动用时间戳命名 |

---

## docxOptions 详解

`docxOptions` 透传给 `docx-preview`，常用字段：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `inWrapper` | `boolean` | `true` | 包一层 `.docx-wrapper` 容器（用于分页阴影、内边距） |
| `ignoreWidth` | `boolean` | `false` | 忽略页面宽度，铺满父容器 |
| `ignoreHeight` | `boolean` | `false` | 忽略页面高度 |
| `ignoreFonts` | `boolean` | `false` | 忽略 docx 内嵌字体 |
| `breakPages` | `boolean` | `true` | 按 docx 内的分页符分页显示 |
| `ignoreLastRenderedPageBreak` | `boolean` | `false`（库默认 `true`） | 忽略文档最后一页前的渲染分页符 |
| `experimental` | `boolean` | `false` | 启用实验性特性 |
| `trimXmlDeclaration` | `boolean` | `true` | 解析时是否去掉 XML 声明 |
| `useBase64URL` | `boolean` | `false` | 图片用 base64 内联（默认 blob URL） |
| `renderHeaders` | `boolean` | `true` | 渲染页眉 |
| `renderFooters` | `boolean` | `true` | 渲染页脚 |
| `renderFootnotes` | `boolean` | `true` | 渲染脚注 |
| `renderEndnotes` | `boolean` | `true` | 渲染尾注 |
| `debug` | `boolean` | `false` | 开发调试 |

完整字段见 [docx-preview 文档](https://github.com/VolodymyrBaydalka/docxjs/blob/master/src/docx-preview.ts)。

```vue
<VueDocx
  :url="url"
  :docx-options="{
    breakPages: true,
    ignoreLastRenderedPageBreak: false,
    renderHeaders: true,
    renderFooters: true,
    inWrapper: true,
  }"
/>
```

---

## 完整示例

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VueDocx } from '@vue3-office/vue-docx'
import '@vue3-office/vue-docx/style.css'

const docxRef = ref()
const url = ref('/api/file/report.docx')
const loaded = ref(false)
const error = ref<string | null>(null)

function onRendered() {
  loaded.value = true
  error.value = null
}

function onError(err: Error) {
  loaded.value = false
  error.value = err.message
}

function download() {
  docxRef.value?.downloadFile()
}
</script>

<template>
  <div class="page">
    <header>
      <span v-if="!loaded">加载中...</span>
      <span v-if="error" class="error">{{ error }}</span>
      <button v-if="loaded" @click="download">下载原文件</button>
    </header>

    <VueDocx
      ref="docxRef"
      :url="url"
      :request-options="{ credentials: 'include' }"
      :docx-options="{ breakPages: true }"
      @rendered="onRendered"
      @error="onError"
    />
  </div>
</template>

<style scoped>
.page { height: 100vh; display: flex; flex-direction: column; }
header { padding: 8px 16px; border-bottom: 1px solid #eee; display: flex; gap: 12px; align-items: center; }
.error { color: #d93025; }
</style>
```

---

## 全局注册

```ts
import { createApp } from 'vue'
import { VueDocxPlugin } from '@vue3-office/vue-docx'
import '@vue3-office/vue-docx/style.css'
import App from './App.vue'

createApp(App).use(VueDocxPlugin).mount('#app')
```

---

## 常见问题

**1. 文档不显示 / 高度为 0？**
确认外层容器有显式高度，组件内部使用 `overflow-y: auto`。移动端窄屏（<800px）时，组件已自动调整 padding 和宽度。

**2. 切换 `url` 没刷新？**
组件已监听 `url` 变化并重新加载。如果新旧 `url` 是同一个字符串引用，监听不会触发——可以临时清空再赋值，或使用 key 强制重建：

```vue
<VueDocx :key="url" :url="url" />
```

**3. 嵌入图片为什么是 Blob URL，不能直接复制？**
默认 `useBase64URL: false` 用 Blob URL 节省内存。需要把图片转为 base64 内联（便于复制 / 离线保存），传 `:docx-options="{ useBase64URL: true }"`。

**4. 表格 / 公式 / 修订模式支持吗？**
- 表格：✅ 支持，含合并单元格 / 边框 / 底纹
- 公式（OMML）：⚠️ 部分支持，复杂公式可能错位
- 修订模式 / 批注：⚠️ 仅做基本展示，不支持交互
- ActiveX / 嵌入对象：❌ 不支持

需要更高保真度建议在服务端转 PDF 后用 `@vue3-office/vue-pdf` 预览。

**5. 加载受 CORS 限制？**
对受保护资源使用 `requestOptions`：

```vue
<VueDocx
  url="/api/private/file.docx"
  :request-options="{
    credentials: 'include',
    headers: { Authorization: 'Bearer xxx' },
  }"
/>
```

---

## License

[MIT](../../LICENSE)

<div align="center">
  <h1>@vue3-office/vue-excel</h1>
  <p>Vue 3 Excel 在线预览组件，基于 <a href="https://github.com/exceljs/exceljs">exceljs</a> + <a href="https://github.com/myliang/x-spreadsheet">x-data-spreadsheet</a></p>
  <p>支持 .xlsx / .xls，自动识别格式 / 样式 / 合并单元格，能下载、能切 sheet、能监听单元格选区</p>
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
- [自定义渲染钩子](#自定义渲染钩子)
- [完整示例](#完整示例)
- [全局注册](#全局注册)
- [常见问题](#常见问题)

---

## 安装

```bash
pnpm add @vue3-office/vue-excel
# 或
npm install @vue3-office/vue-excel
yarn add @vue3-office/vue-excel
```

需要 Vue >= 3.5.24。`exceljs` / `xlsx` / `x-data-spreadsheet` 已作为依赖打包进发布产物，无需另外安装。

引入样式：

```ts
import '@vue3-office/vue-excel/style.css'
```

---

## 快速开始

```vue
<script setup lang="ts">
import { VueExcel } from '@vue3-office/vue-excel'
import '@vue3-office/vue-excel/style.css'
</script>

<template>
  <div style="height: 100vh">
    <VueExcel
      url="https://example.com/sample.xlsx"
      @rendered="() => console.log('rendered')"
      @error="(e) => console.error(e)"
    />
  </div>
</template>
```

> 必须给容器指定**明确高度**（`height: 100vh` / `flex: 1` 等），否则表格区域会塌陷。

---

## 文件来源支持

`url` 接受以下类型（来自 `@vue3-office/common` 的 `FileSrc`）：

| 类型 | 示例 |
| --- | --- |
| `string` | `'/api/file/123.xlsx'` |
| `ArrayBuffer` | `await fetch(url).then(r => r.arrayBuffer())` |
| `Blob` | 来自上传或网络请求 |

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { VueExcel } from '@vue3-office/vue-excel'

const buffer = ref<ArrayBuffer | null>(null)
onMounted(async () => {
  const res = await fetch('/api/file/sample.xlsx')
  buffer.value = await res.arrayBuffer()
})
</script>

<template>
  <VueExcel v-if="buffer" :url="buffer" style="height: 100vh" />
</template>
```

---

## Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `url` | `string \| ArrayBuffer \| Blob` | — | **必填**，Excel 文件源 |
| `xls` | `boolean` | `false` | 标记是否为旧版 `.xls`；`.xlsx` 不需要传 |
| `widthOffset` | `number` | `0` | 在自动计算的列宽基础上加 N 像素，用于补偿过窄的单元格 |
| `heightOffset` | `number` | `0` | 在自动计算的行高基础上加 N 像素 |
| `requestOptions` | `RequestOptions` | `{ responseType: 'arraybuffer' }` | URL 模式下传给 fetch 的请求配置（headers / credentials 等） |
| `excelOptions` | `Partial<ExcelOptions>` | 内部默认 | 透传给 `x-data-spreadsheet` 的渲染配置 |
| `beforeTransform` | `(workbook: any) => any` | — | exceljs 解析后、转 spreadsheet 数据前的钩子 |
| `afterTransform` | `(workbook: any) => any` | — | 转 spreadsheet 数据后的钩子 |

`ExcelOptions` 字段（节选）：

```ts
interface ExcelOptions {
  showGrid?: boolean       // 显示网格线，默认 true
  showBottomBar?: boolean  // 显示底部 sheet 切换栏，默认 true
  view?: { height: () => number; width: () => number }
  row?: { len: number; height: number }
  col?: { len: number; width: number; indexWidth: number; minWidth: number }
}
```

> 组件强制 `mode: 'read'`、`showToolbar: false`、`showContextmenu: false`，专注预览场景；如需编辑请直接使用 `x-data-spreadsheet`。

---

## Events

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `rendered` | — | 文件解析并渲染完成 |
| `error` | `Error` | 容器为空、网络失败、解析失败 |
| `switchSheet` | `index: number` | 用户切换底部 sheet 时 |
| `cellSelected` | `{ cell, rowIndex, columnIndex }` | 单击选中单元格 |
| `cellsSelected` | `{ cell, startRowIndex, startColumnIndex, endRowIndex, endColumnIndex }` | 拖选多个单元格 |

```vue
<VueExcel
  :url="url"
  @rendered="onRendered"
  @switch-sheet="(i) => console.log('切换到 sheet', i)"
  @cell-selected="(d) => console.log('单选', d)"
  @cells-selected="(d) => console.log('多选', d)"
/>
```

---

## 通过 ref 调用

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VueExcel } from '@vue3-office/vue-excel'

const excelRef = ref<InstanceType<typeof VueExcel>>()

// 触发下载（保留原始文件字节）
function download() {
  excelRef.value?.downloadFile('导出结果.xlsx')
}

// 强制重新渲染（如外层尺寸变化时）
function refresh() {
  excelRef.value?.reRender()
}
</script>

<template>
  <VueExcel ref="excelRef" :url="url" />
  <button @click="download">下载</button>
  <button @click="refresh">重绘</button>
</template>
```

暴露的属性 / 方法：

| 名称 | 说明 |
| --- | --- |
| `wrapperRef` | 外层容器 DOM |
| `rootRef` | 表格挂载点 DOM |
| `downloadFile(fileName?)` | 用 `download` 工具触发浏览器下载，文件名不传时自动用时间戳 |
| `reRender()` | 调用 spreadsheet 实例的 `reload()` + `reRender()` |

---

## 自定义渲染钩子

`beforeTransform` / `afterTransform` 给到 exceljs 的 workbook 对象，可在渲染前后做数据修改、过滤、补默认值：

```vue
<script setup lang="ts">
function beforeTransform(workbook: any) {
  // 比如：去掉名为 "_internal" 的 sheet
  workbook.eachSheet((sheet: any) => {
    if (sheet.name === '_internal') workbook.removeWorksheet(sheet.id)
  })
  return workbook
}

function afterTransform(spreadsheetData: any) {
  // 进一步处理 x-data-spreadsheet 数据格式
  return spreadsheetData
}
</script>

<template>
  <VueExcel
    :url="url"
    :before-transform="beforeTransform"
    :after-transform="afterTransform"
  />
</template>
```

---

## 完整示例

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VueExcel } from '@vue3-office/vue-excel'
import '@vue3-office/vue-excel/style.css'

const url = ref('/api/file/report.xlsx')
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
</script>

<template>
  <div class="page">
    <header v-if="!loaded">正在加载…</header>
    <header v-if="error" class="error">{{ error }}</header>

    <VueExcel
      :url="url"
      :width-offset="10"
      :request-options="{ credentials: 'include' }"
      :excel-options="{ showGrid: true, showBottomBar: true }"
      @rendered="onRendered"
      @error="onError"
      @cell-selected="(d) => console.log(d)"
    />
  </div>
</template>

<style scoped>
.page { height: 100vh; display: flex; flex-direction: column; }
.error { color: #d93025; padding: 8px 16px; }
</style>
```

---

## 全局注册

```ts
import { createApp } from 'vue'
import { VueExcelPlugin } from '@vue3-office/vue-excel'
import '@vue3-office/vue-excel/style.css'
import App from './App.vue'

createApp(App).use(VueExcelPlugin).mount('#app')
```

---

## 常见问题

**1. 表格不显示 / 高度为 0？**
确认外层容器有显式高度。组件内部会用 `wrapperRef.clientHeight` 计算渲染区域。

**2. `.xls`（旧二进制格式）打开后样式丢失？**
旧 `.xls` 走 `xlsx` 解析（不是 exceljs），样式信息有限，仅保留数据 + 基础样式。建议把文件转成 `.xlsx` 再预览。

**3. 列宽过窄文字被裁剪？**
传 `:width-offset="10"`（或更大）整体加宽。

**4. 公式 / 图表 / 数据透视表能渲染吗？**
公式按计算结果展示；图表 / 数据透视表 / 嵌入对象 **不支持**——这是底层 `x-data-spreadsheet` 的限制，需要这类能力请在服务端预先转换成 PDF / 图片。

**5. 大文件（10W+ 单元格）会卡？**
组件做了基础适配，但 x-data-spreadsheet 没有虚拟滚动，超大表格请考虑分 sheet 或后端裁剪后再预览。

---

## License

[MIT](../../LICENSE)

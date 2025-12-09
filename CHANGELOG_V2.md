# Vue Office v2.0 更新日志

## 🎉 重大变更

### 架构升级
- ✅ **纯 Vue3 支持**：移除 Vue2 兼容代码，专注 Vue3 生态
- ✅ **pnpm workspace**：从 npm + Lerna 迁移到 pnpm monorepo
- ✅ **统一构建工具**：全面使用 Vite 构建，移除 Rollup 单独配置
- ✅ **移除 vue-demi**：不再需要兼容层，直接使用 Vue3 API

### 模块精简
- ❌ 移除 `@js-preview/docx` - 原生 JS 版本
- ❌ 移除 `@js-preview/excel` - 原生 JS 版本
- ❌ 移除 `@js-preview/pdf` - 原生 JS 版本
- ❌ 移除 Vue2 相关依赖和配置
- ❌ 移除 Lerna 配置
- ❌ 移除 Babel 配置

### 保留的核心组件
- ✅ `@vue-office/docx` - Word 文档预览
- ✅ `@vue-office/excel` - Excel 表格预览
- ✅ `@vue-office/pdf` - PDF 文档预览
- ✅ `@vue-office/pptx` - PowerPoint 演示文稿预览

## 📦 技术栈

### 运行环境
- Node.js >= 20.12.0
- pnpm >= 10.0.0

### 核心依赖
- Vue 3.4+
- Vite 5.4+
- Ant Design Vue 4.x

### 组件依赖
- docx-preview ^0.3.2
- exceljs ^4.3.0
- x-data-spreadsheet ^1.1.9
- pptx-preview ^1.0.2

## 🚀 快速开始

### 安装
```bash
cd core
pnpm install
```

### 开发
```bash
pnpm dev
```
访问：http://localhost:5173/vue-office/examples/dist

### 构建
```bash
# 构建所有组件包
pnpm lib

# 构建单个组件
pnpm lib:vue-docx
pnpm lib:vue-excel
pnpm lib:vue-pdf
pnpm lib:vue-pptx

# 构建演示应用
pnpm build
```

## 📝 使用方式

### 安装组件
```bash
pnpm add @vue3-office/docx
pnpm add @vue3-office/excel
pnpm add @vue3-office/pdf
pnpm add @vue3-office/pptx
```

### 使用示例
```vue
<template>
  <vue-office-docx 
    :src="docxUrl" 
    @rendered="onRendered"
  />
</template>

<script setup>
import VueOfficeDocx from '@vue3-office/docx'
import '@vue3-office/docx/lib/style.css'

const docxUrl = 'https://example.com/document.docx'

const onRendered = () => {
  console.log('文档渲染完成')
}
</script>
```

## 🔄 从 v1.x 迁移

详见 [MIGRATION.md](./MIGRATION.md)

## 📂 项目结构

```
vue-office/
├── core/                      # 主项目
│   ├── packages/             # 组件包
│   │   ├── vue-docx/        # Word 组件
│   │   ├── vue-excel/       # Excel 组件
│   │   ├── vue-pdf/         # PDF 组件
│   │   └── vue-pptx/        # PPT 组件
│   ├── src/                 # 演示应用
│   ├── package.json
│   ├── pnpm-workspace.yaml
│   └── vite.config.js
├── demo-vue3/               # Vue3 示例项目
├── examples/                # 构建输出
├── MIGRATION.md            # 迁移指南
└── README.md               # 项目说明
```

## ⚡ 性能提升

- 📦 更小的包体积（移除 vue-demi 和 Vue2 代码）
- 🚀 更快的构建速度（pnpm + Vite）
- 💪 更好的类型支持（纯 Vue3 TypeScript）
- 🎯 更简洁的依赖树

## 🐛 已知问题

无

## 📅 发布时间

2024-12-05

## 👥 贡献者

感谢所有为本项目做出贡献的开发者！

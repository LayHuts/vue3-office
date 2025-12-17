# Vue Office - 开发指南

## 项目结构

```
core/
├── packages/           # 组件包
│   ├── vue-docx/      # Word 预览组件
│   ├── vue-excel/     # Excel 预览组件
│   ├── vue-pdf/       # PDF 预览组件
│   └── vue-pptx/      # PPT 预览组件
├── src/               # 演示应用
└── pnpm-workspace.yaml
```

## 开发环境

- Node.js >= 16
- pnpm >= 8

## 安装依赖

```bash
cd core
pnpm install
```

## 开发

启动演示应用：
```bash
pnpm dev
```

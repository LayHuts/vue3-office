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

## 构建

构建所有组件包：
```bash
pnpm lib
```

构建单个组件包：
```bash
pnpm lib:vue-docx
pnpm lib:vue-excel
pnpm lib:vue-pdf
pnpm lib:vue-pptx
```

构建演示应用：
```bash
pnpm build
```

## 发布

1. 更新各组件包的版本号
2. 构建组件包：`pnpm lib`
3. 发布到 npm：
```bash
cd packages/vue-docx && npm publish
cd packages/vue-excel && npm publish
cd packages/vue-pdf && npm publish
cd packages/vue-pptx && npm publish
```

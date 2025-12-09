# 迁移指南：从 Vue2/3 兼容版本到 Vue3 专用版本

## 主要变更

### 1. 移除 Vue2 支持
- 不再支持 Vue 2.x
- 移除 `vue-demi` 依赖
- 移除 `@vue/composition-api` 依赖

### 2. 移除原生 JS 模块
- 删除 `@js-preview/docx`
- 删除 `@js-preview/excel`
- 删除 `@js-preview/pdf`

### 3. 包管理器变更
- 从 npm + Lerna 迁移到 pnpm workspace
- 删除 Lerna 配置

### 4. 构建工具优化
- 统一使用 Vite 构建
- 移除 Rollup 单独配置
- 移除 Babel 配置

## 升级步骤

### 对于使用者

如果你的项目使用了旧版本的 vue-office：

1. **确保使用 Vue 3**
   ```json
   {
     "dependencies": {
       "vue": "^3.0.0"
     }
   }
   ```

2. **更新依赖**
   ```bash
   # 卸载旧版本
   npm uninstall @vue3-office/docx @vue3-office/excel @vue3-office/pdf @vue3-office/pptx vue-demi
   
   # 安装新版本
   pnpm add @vue3-office/docx
   pnpm add @vue3-office/excel
   pnpm add @vue3-office/pdf
   pnpm add @vue3-office/pptx
   ```

3. **代码无需修改**
   组件 API 保持不变，使用方式完全一致。

### 对于开发者

1. **安装 pnpm**
   ```bash
   npm install -g pnpm
   ```

2. **清理旧依赖**
   ```bash
   rm -rf node_modules package-lock.json
   ```

3. **安装新依赖**
   ```bash
   cd core
   pnpm install
   ```

4. **开发和构建**
   ```bash
   # 开发
   pnpm dev
   
   # 构建所有包
   pnpm lib
   
   # 构建单个包
   pnpm lib:vue-docx
   ```

## 不兼容变更

### 组件注册方式
Vue3 的插件安装方式略有不同，但向后兼容：

```javascript
// 旧版本（Vue2）
import Vue from 'vue'
import VueOfficeDocx from '@vue3-office/docx'
Vue.use(VueOfficeDocx)

// 新版本（Vue3）
import { createApp } from 'vue'
import VueOfficeDocx from '@vue3-office/docx'
const app = createApp(App)
app.use(VueOfficeDocx)
```

### 样式导入
保持不变：
```javascript
import '@vue3-office/docx/lib/style.css'
import '@vue3-office/excel/lib/style.css'
```

## 性能提升

- 更小的包体积（移除 vue-demi 和 Vue2 相关代码）
- 更快的构建速度（pnpm + Vite）
- 更好的类型支持（纯 Vue3 TypeScript）

## 问题反馈

如有问题，请在 GitHub 提 Issue。

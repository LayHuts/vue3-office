# x-data-spreadsheet 官方示例说明

## 概述
新增了一个使用官方 `x-data-spreadsheet` 包的独立示例页面。

## 文件位置
- 组件文件：`core/src/components/ExcelSpreadsheetDemo.vue`
- 路由配置：`core/src/router.js`
- 菜单配置：`core/src/App.vue`

## 访问方式
启动开发服务器后，访问：`http://localhost:5173/#/excel-spreadsheet`

## 功能特性
1. **编辑模式**：支持完整的表格编辑功能
2. **工具栏**：显示完整的格式化工具栏
3. **右键菜单**：支持右键上下文菜单
4. **示例数据**：预加载了包含样式、合并单元格的示例数据
5. **事件监听**：监听单元格选中事件，输出到控制台
6. **操作按钮**：
   - 导出数据：将当前表格数据输出到控制台
   - 重新加载：加载新的示例数据
   - 清空：清空表格内容

## 与 vue-excel 的区别
- **vue-excel**：基于 x-data-spreadsheet 封装，专注于 Excel 文件预览
- **ExcelSpreadsheetDemo**：直接使用官方 x-data-spreadsheet，展示原生编辑功能

## 技术栈
- Vue 3 Composition API
- x-data-spreadsheet v1.1.9（官方包）
- 响应式布局

## 开发说明
如需修改示例数据或配置，请编辑 `ExcelSpreadsheetDemo.vue` 中的 `xs.loadData()` 部分。

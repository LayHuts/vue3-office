import { resolve } from 'node:path'
import { defineConfig, mergeConfig } from 'vite'
import commonConfig from '../../vite.config'

// https://vitejs.dev/config/
export default mergeConfig(
  commonConfig,
  defineConfig({
    build: {
      lib: {
        entry: resolve(__dirname, './src/index.ts'),
        name: '@vue3-office/vue-excel',
        fileName: 'index',
        cssFileName: 'style'
      },
      rollupOptions: {
        external: ['vue', 'exceljs', 'exceljs/dist/exceljs', 'x-data-spreadsheet', 'lodash-es', 'dayjs', 'tinycolor2', 'xlsx', '@vue3-office/common'],
        output: {
          exports: 'named',
          globals: {
            'vue': 'Vue',
            'exceljs': 'ExcelJS',
            'exceljs/dist/exceljs': 'ExcelJS',
            'x-data-spreadsheet': 'Spreadsheet',
            'lodash-es': '_',
            'dayjs': 'dayjs',
            'tinycolor2': 'tinycolor',
            'xlsx': 'XLSX',
            '@vue3-office/common': 'Vue3OfficeCommon',
          },
        },
      },
    },
  }),
)

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
        external: ['vue', 'exceljs', 'x-data-spreadsheet', 'lodash'],
        output: {
          exports: 'named',
          globals: {
            'vue': 'vue',
            'lodash': 'lodash',
          },
        },
      },
    },
  }),
)

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
        name: '@vue3-office/vue-docx',
        fileName: 'index',
        cssFileName: 'style'
      },
      rollupOptions: {
        external: ['vue', 'docx-preview', '@vue3-office/common'],
        output: {
          exports: 'named',
          globals: {
            'vue': 'Vue',
            'docx-preview': 'docxPreview',
            '@vue3-office/common': 'Vue3OfficeCommon',
          },
        },
      },
    },
  }),
)

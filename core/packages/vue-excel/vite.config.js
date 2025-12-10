import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'es2015',
    outDir: 'lib',
    lib: {
      entry: resolve(__dirname, 'index.js'),
      name: 'VueOfficeExcel',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue', 'exceljs', 'x-data-spreadsheet', 'lodash'],
      output: {
        globals: {
          vue: 'Vue'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'index.css';
          return assetInfo.name;
        }
      }
    }
  }
});

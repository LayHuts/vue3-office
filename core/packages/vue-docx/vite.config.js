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
      name: 'VueOfficeDocx',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue', 'docx-preview'],
      output: {
        globals: {
          vue: 'Vue'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'style.css';
          return assetInfo.name;
        }
      }
    }
  }
});

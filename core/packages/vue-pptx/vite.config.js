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
      name: 'VueOfficePptx',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue', 'pptx-preview'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
});

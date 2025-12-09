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
      name: 'VueOfficePdf',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue', 'lodash'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
});

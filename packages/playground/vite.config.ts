import { resolve } from 'node:path';
import { defineConfig, mergeConfig } from 'vite';
import commonConfig from '../../vite.config';

export default mergeConfig(
  commonConfig,
  defineConfig({
    assetsInclude: ['**/*.xlsx', '**/*.xls', '**/*.docx'],
    resolve: {
      alias: {
        "@vue3-office/vue-pdf": resolve(__dirname, "../vue-pdf/src"),
        "@vue3-office/vue-excel": resolve(__dirname, "../vue-excel/src"),
        "@vue3-office/vue-docx": resolve(__dirname, "../vue-docx/src"),
      },
    },
  })
);

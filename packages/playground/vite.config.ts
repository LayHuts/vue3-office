import { resolve } from 'node:path';
import { defineConfig, mergeConfig } from 'vite';
import commonConfig from '../../vite.config';

export default mergeConfig(
  commonConfig,
  defineConfig({
    assetsInclude: ['**/*.xlsx', '**/*.xls', '**/*.docx', '**/*.mp4', '**/*.jpg'],
    resolve: {
      alias: {
        "@vue3-office/vue-pdf": resolve(__dirname, "../vue-pdf/src"),
        "@vue3-office/vue-excel": resolve(__dirname, "../vue-excel/src"),
        "@vue3-office/vue-docx": resolve(__dirname, "../vue-docx/src"),
        "@vue3-office/vue-video": resolve(__dirname, "../vue-video/src"),
        "@vue3-office/vue-audio": resolve(__dirname, "../vue-audio/src"),
      },
    },
    server: {
      allowedHosts: [
        'zola-wizened-magnus.ngrok-free.dev'
      ]
    }
  })
);

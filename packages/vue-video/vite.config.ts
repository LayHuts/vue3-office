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
        name: '@vue3-office/vue-video',
        fileName: 'index',
        cssFileName: 'style'
      },
      rollupOptions: {
        external: ['vue', '@vue3-office/common', 'xgplayer', 'xgplayer-music', 'xgplayer/es/player'],
        output: {
          exports: 'named',
          globals: {
            'vue': 'Vue',
            '@vue3-office/common': 'Vue3OfficeCommon',
            'xgplayer': 'Player',
            'xgplayer-music': 'XgplayerMusic',
            'xgplayer/es/player': 'Player',
          },
        },
      },
    },
  }),
)

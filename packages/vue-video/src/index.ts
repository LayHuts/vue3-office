import type { Plugin } from 'vue'
import VueVideo from './components/main.vue'

export const VueVideoPlugin: Plugin = {
  install(Vue) {
    Vue.component(VueVideo.name ?? 'VueVideo', VueVideo)
  },
}
export * from './components';
export default VueVideo

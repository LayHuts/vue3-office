import type { Plugin } from 'vue'
import VueDocx from './components/main.vue'

export const VueDocxPlugin: Plugin = {
  install(Vue) {
    Vue.component(VueDocx.name ?? 'VueDocx', VueDocx)
  },
}
export * from './components';
export default VueDocx

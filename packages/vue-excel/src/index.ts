import type { Plugin } from 'vue'
import VueExcel from './components/main.vue'

export const VueExcelPlugin: Plugin = {
  install(Vue) {
    Vue.component(VueExcel.name ?? 'VueExcel', VueExcel)
  },
}
export * from './components';
export default VueExcel

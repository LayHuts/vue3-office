import type { Plugin } from 'vue'
import VuePdf from './components/main.vue'

export const VuePDFPlugin: Plugin = {
  install(Vue) {
    Vue.component(VuePdf.name ?? 'VuePdf', VuePdf)
  },
}

export * from './components'
export { default as VuePdfToc } from "./toc/index.vue";
export default VuePDFPlugin

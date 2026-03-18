import type { Plugin } from 'vue'
import VueAudio from './components/main.vue'

export const VueAudioPlugin: Plugin = {
  install(Vue) {
    Vue.component(VueAudio.name ?? 'VueAudio', VueAudio)
  },
}
export * from './components';
export default VueAudio

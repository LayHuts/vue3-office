import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.md'],
  },
  ...pluginVue.configs['flat/essential'],
  ...vueTsEslintConfig(),
]

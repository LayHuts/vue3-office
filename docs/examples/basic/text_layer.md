# Text Layer

```vue
<script setup>
import { ref } from 'vue'
import { VuePdf, usePDF } from '@vue3-office/vue-pdf'
import '@vue3-office/vue-pdf/style.css'

const text_layer = ref(false)
const { pdf } = usePDF('https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf')
</script>

<template>
  <div>
    <div>
      <button @click="text_layer = !text_layer">
        Change to {{ !text_layer }}
      </button>
    </div>
    <VuePdf :pdf="pdf" :text-layer="text_layer" />
  </div>
</template>
```
<ClientOnly>
  <TextLayer />
</ClientOnly>
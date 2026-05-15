# One page

```vue
<script setup>
import { ref } from 'vue'
import { VuePdf, usePDF } from '@vue3-office/vue-pdf'

const page = ref(1)
const { pdf, pages } = usePDF('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf')
</script>

<template>
  <div>
    <div>
      <button @click="page = page > 1 ? page - 1 : page">
        Prev
      </button>
      <span>{{ page }} / {{ pages }}</span>
      <button @click="page = page < pages ? page + 1 : page">
        Next
      </button>
    </div>
    <VuePdf :pdf="pdf" :page="page" />
  </div>
</template>
```
<ClientOnly>
  <OnePage />
</ClientOnly>

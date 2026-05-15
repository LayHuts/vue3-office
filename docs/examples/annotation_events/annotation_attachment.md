# File attachment

```vue
<script setup>
import { ref } from 'vue'
import { VuePdf, usePDF } from '@vue3-office/vue-pdf'

const { pdf } = usePDF('/41.pdf')
function onAnnotation(value) {
  console.log(value)
}
</script>

<template>
  <div>
    <VuePdf :pdf="pdf" annotation-layer image-resources-path="https://unpkg.com/pdfjs-dist@latest/web/images/" @annotation="onAnnotation" />
  </div>
</template>
```
<ClientOnly>
  <AnnoAttachment />
</ClientOnly>
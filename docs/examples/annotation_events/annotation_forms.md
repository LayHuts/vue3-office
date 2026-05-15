# Forms fields

```vue
<script setup>
import { ref } from 'vue'
import { VuePdf, usePDF } from '@vue3-office/vue-pdf'

const { pdf } = usePDF('/14.pdf')
function onAnnotation(value) {
  console.log(value)
}
</script>

<template>
  <div>
    <VuePdf :pdf="pdf" annotation-layer @annotation="onAnnotation" />
  </div>
</template>
```

<ClientOnly>
  <AnnoForms />
</ClientOnly>
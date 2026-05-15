# Links

```vue
<script setup>
import { ref } from 'vue'
import { VuePdf, usePDF } from '@vue3-office/vue-pdf'

const { pdf } = usePDF('/45.pdf')
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
  <AnnoLinks />
</ClientOnly>
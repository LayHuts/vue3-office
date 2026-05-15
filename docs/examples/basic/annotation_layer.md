# Annotation Layer

```vue
<script setup>
import { ref } from 'vue'
import { VuePdf, usePDF } from '@vue3-office/vue-pdf'
import '@vue3-office/vue-pdf/style.css'

const annotation_layer = ref(false)
const { pdf } = usePDF('example_014.pdf')
</script>

<template>
  <div>
    <div>
      <button @click="annotation_layer = !annotation_layer">
        Change to {{ !annotation_layer }}
      </button>
    </div>
    <VuePdf :pdf="pdf" :annotation-layer="annotation_layer" />
  </div>
</template>
```

<ClientOnly>
  <AnnotationLayer />
</ClientOnly>
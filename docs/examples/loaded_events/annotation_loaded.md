# Annotation Loaded Event

::: warning
Annotation loaded event's payload has too many data to display on screen, open the console to see the results.
:::

```vue
<script setup>
import { VuePdf, usePDF } from '@vue3-office/vue-pdf'

const { pdf } = usePDF('/14.pdf')
function onLoaded(value) {
  console.log(value)
}
</script>

<template>
  <div>
    <VuePdf :pdf="pdf" annotation-layer @annotation-loaded="onLoaded" />
  </div>
</template>
```

<ClientOnly>
  <AnnotationLoaded />
</ClientOnly>
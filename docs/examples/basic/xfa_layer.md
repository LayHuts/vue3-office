# XFA Forms

```vue
<script setup>
import { VuePdf, usePDF } from '@vue3-office/vue-pdf'
import '@vue3-office/vue-pdf/style.css'

const { pdf } = usePDF({
  url: '/xfa.pdf',
  enableXfa: true,
})
</script>

<template>
  <div class="container">
    <VuePdf :pdf="pdf" />
  </div>
</template>
```
<ClientOnly>
  <XFALayer />
</ClientOnly>
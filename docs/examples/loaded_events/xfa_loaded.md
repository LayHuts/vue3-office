# XFA Loaded Event

```vue
<script setup>
import { VuePdf, usePDF } from '@vue3-office/vue-pdf'
import '@vue3-office/vue-pdf/style.css'

const { pdf } = usePDF({
  url: '/xfa.pdf',
  enableXfa: true,
})
function onLoaded() {
  console.log("XFA loaded")
}
</script>

<template>
  <div>
    <VuePdf :pdf="pdf" @xfa-loaded="onLoaded" />
  </div>
</template>
```

<ClientOnly>
  <XFALoaded />
</ClientOnly>
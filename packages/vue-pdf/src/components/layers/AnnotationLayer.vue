<script setup lang="ts">
import * as PDFJS from 'pdfjs-dist'
import { ref, toRaw } from 'vue'

import type { PDFDocumentProxy, PDFPageProxy, PageViewport } from 'pdfjs-dist'
import type { AnnotationLayerParameters } from 'pdfjs-dist/types/src/display/annotation_layer'

import { EVENTS_TO_HANDLER, annotationEventsHandler } from '../utils/annotations'
import { SimpleLinkService } from '../services'

import type { AnnotationEventPayload } from '../types'

const props = defineProps<{
  page?: PDFPageProxy
  viewport?: PageViewport
  document?: PDFDocumentProxy
  annotationsFilter?: string[]
  annotationsMap?: object
  imageResourcesPath?: string
  hideForms?: boolean
  enableScripting?: boolean
  intent: string
}>()

const emit = defineEmits<{
  (event: 'annotation', payload: AnnotationEventPayload): void
  (event: 'annotationLoaded', payload: any[]): void
}>()

const layer = ref<HTMLDivElement>()
const annotations = ref<any[]>()

// 缓存 document 级别的信息，避免每页都问一次 worker
let cachedFieldObjects: any = null
let cachedHasJSActions: boolean | null = null
let cachedFor: PDFDocumentProxy | null = null

function annotationsEvents(evt: Event) {
  const value = annotationEventsHandler(evt, props.document!, annotations.value!)
  Promise.resolve(value).then((data) => {
    if (data) emit('annotation', data)
  })
}

async function getFieldObjects() {
  const doc = toRaw(props.document)
  if (!doc) return undefined
  if (cachedFor !== doc) {
    cachedFor = doc
    cachedFieldObjects = null
    cachedHasJSActions = null
  }
  if (cachedFieldObjects === null) {
    cachedFieldObjects = await doc.getFieldObjects()
  }
  return cachedFieldObjects
}

async function getHasJSActions() {
  const doc = toRaw(props.document)
  if (!doc) return false
  if (cachedFor !== doc) {
    cachedFor = doc
    cachedFieldObjects = null
    cachedHasJSActions = null
  }
  if (cachedHasJSActions === null) {
    cachedHasJSActions = await doc.hasJSActions()
  }
  return cachedHasJSActions
}

async function getAnnotations() {
  const page = props.page
  let list = await page?.getAnnotations({ intent: props.intent })
  if (props.annotationsFilter) {
    const filters = props.annotationsFilter
    list = list!.filter((value) => {
      const subType = value.subtype
      const fieldType = value.fieldType ? `${subType}.${value.fieldType}` : null
      return filters?.includes(subType) || (fieldType !== null && filters?.includes(fieldType))
    })
  }
  return list
}

async function render(): Promise<void> {
  if (!layer.value || !props.page || !props.viewport) return

  layer.value.replaceChildren?.()
  for (const evtHandler of EVENTS_TO_HANDLER)
    layer.value.removeEventListener(evtHandler, annotationsEvents)

  const pdf = toRaw(props.document)
  if (!pdf) return

  const page = props.page
  const viewport = props.viewport

  annotations.value = await getAnnotations()

  const canvasMap = new Map<string, HTMLCanvasElement>([])
  for (const anno of annotations.value!) {
    if (anno.subtype === 'Widget' && anno.fieldType === 'Btn' && anno.pushButton) {
      const canvasWidth = anno.rect[2] - anno.rect[0]
      const canvasHeight = anno.rect[3] - anno.rect[1]
      const subCanvas = document.createElement('canvas')
      subCanvas.setAttribute('width', (canvasWidth * viewport.scale).toString())
      subCanvas.setAttribute('height', (canvasHeight * viewport.scale).toString())
      canvasMap.set(anno.id, subCanvas)
    }
  }

  const annotationStorage = pdf.annotationStorage
  if (props.annotationsMap) {
    for (const [key, value] of Object.entries(props.annotationsMap))
      annotationStorage.setValue(key, value)
  }

  const linkService = new SimpleLinkService()

  const layerParameters = {
    accessibilityManager: undefined,
    annotationCanvasMap: canvasMap,
    div: layer.value,
    page,
    viewport: viewport.clone({ dontFlip: true }),
    annotationEditorUIManager: null,
    l10n: null,
    annotationStorage,
    linkService,
    commentManager: null,
    structTreeLayer: null
  }

  // 并行获取 fieldObjects / hasJSActions（已做缓存，后续页面复用）
  const [fieldObjects, hasJSActions] = await Promise.all([
    getFieldObjects(),
    getHasJSActions()
  ])

  const renderParameters: AnnotationLayerParameters = {
    annotations: annotations.value!,
    viewport: viewport.clone({ dontFlip: true }),
    linkService,
    annotationCanvasMap: canvasMap,
    div: layer.value,
    annotationStorage,
    renderForms: !props.hideForms,
    page,
    enableScripting: false,
    hasJSActions,
    fieldObjects,
    downloadManager: undefined,
    imageResourcesPath: props.imageResourcesPath,
  }

  await new PDFJS.AnnotationLayer(layerParameters).render(renderParameters)

  emit('annotationLoaded', annotations.value!)

  for (const evtHandler of EVENTS_TO_HANDLER)
    layer.value!.addEventListener(evtHandler, annotationsEvents)
}

defineExpose({ render })
</script>

<template>
  <div ref="layer" class="annotationLayer" />
</template>

<style>
.annotationLayer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 3;
}

.annotationLayer section {
  position: absolute;
  pointer-events: auto;
  box-sizing: border-box;
}

.annotationLayer .linkAnnotation > a,
.annotationLayer .buttonWidgetAnnotation.pushButton > a {
  position: absolute;
  font-size: 1em;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.annotationLayer .linkAnnotation > a:hover,
.annotationLayer .buttonWidgetAnnotation.pushButton > a:hover {
  opacity: 0.2;
  background-color: rgba(255, 255, 0, 1);
  box-shadow: 0 2px 10px rgba(255, 255, 0, 1);
}
</style>

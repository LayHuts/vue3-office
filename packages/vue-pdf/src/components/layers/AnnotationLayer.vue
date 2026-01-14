<script setup lang="ts">
import * as PDFJS from 'pdfjs-dist'
import { ref, toRaw, watch } from 'vue'

import type { PDFDocumentProxy, PDFPageProxy, PageViewport } from 'pdfjs-dist'
import type { AnnotationLayerParameters } from 'pdfjs-dist/types/src/display/annotation_layer'
import type { IDownloadManager } from 'pdfjs-dist/types/web/interfaces'

import { EVENTS_TO_HANDLER, annotationEventsHandler } from '../utils/annotations'
import { SimpleLinkService } from '../utils/link_service'

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

function annotationsEvents(evt: Event) {
  const value = annotationEventsHandler(evt, props.document!, annotations.value!)
  Promise.resolve(value).then((data) => {
    if (data)
      emit('annotation', data)
  })
}

async function getFieldObjects() {
  const fieldObjects = await toRaw(props.document)?.getFieldObjects()
  return fieldObjects
}

async function getHasJSActions() {
  const hasJSActions = await toRaw(props.document)?.hasJSActions()
  return hasJSActions
}

async function getAnnotations() {
  const page = props.page

  let annotations = await page?.getAnnotations({ intent: props.intent })
  if (props.annotationsFilter) {
    const filters = props.annotationsFilter
    annotations = annotations!.filter((value) => {
      const subType = value.subtype
      const fieldType = value.fieldType ? `${subType}.${value.fieldType}` : null
      return filters?.includes(subType) || (fieldType !== null && filters?.includes(fieldType))
    })
  }

  return annotations
}

async function render() {
  layer.value!.replaceChildren?.()
  for (const evtHandler of EVENTS_TO_HANDLER)
    layer.value!.removeEventListener(evtHandler, annotationsEvents)

  const pdf = toRaw(props.document)
  const page = props.page
  const viewport = props.viewport

  annotations.value = await getAnnotations()

  // Canvas map for push button widget
  const canvasMap = new Map<string, HTMLCanvasElement>([])
  for (const anno of annotations.value!) {
    if (anno.subtype === 'Widget' && anno.fieldType === 'Btn' && anno.pushButton) {
      const canvasWidth = anno.rect[2] - anno.rect[0]
      const canvasHeight = anno.rect[3] - anno.rect[1]
      const subCanvas = document.createElement('canvas')
      subCanvas.setAttribute('width', (canvasWidth * viewport!.scale).toString())
      subCanvas.setAttribute('height', (canvasHeight * viewport!.scale).toString())
      canvasMap.set(anno.id, subCanvas)
    }
  }
  const annotationStorage = pdf!.annotationStorage
  if (props.annotationsMap) {
    for (const [key, value] of Object.entries(props.annotationsMap))
      annotationStorage.setValue(key, value)
  }

  const linkService = new SimpleLinkService();

  const layerParameters = {
    accessibilityManager: undefined,
    annotationCanvasMap: canvasMap,
    div: layer.value!,
    page: page!,
    viewport: viewport!.clone({ dontFlip: true }),
    annotationEditorUIManager: null,
    l10n: null,
    annotationStorage,
    linkService: linkService,
    commentManager: null,
    structTreeLayer: null
  }

  const renderParameters: AnnotationLayerParameters = {
    annotations: annotations.value!,
    viewport: viewport!.clone({ dontFlip: true }),
    linkService: linkService,
    annotationCanvasMap: canvasMap,
    div: layer.value!,
    annotationStorage,
    renderForms: !props.hideForms,
    page: page!,
    enableScripting: false,
    hasJSActions: await getHasJSActions(),
    fieldObjects: await getFieldObjects(),
    downloadManager: null as unknown as IDownloadManager,
    imageResourcesPath: props.imageResourcesPath,
  }
  const task = new PDFJS.AnnotationLayer(layerParameters).render(renderParameters)
  task.then(async () => {
    emit('annotationLoaded', annotations.value!)
  })

  for (const evtHandler of EVENTS_TO_HANDLER)
    layer.value!.addEventListener(evtHandler, annotationsEvents)
}

// 记录上一次的 viewport，避免重复渲染
let lastViewport: PageViewport | undefined = undefined

watch(() => [props.page, props.viewport], ([newPage, newViewport]) => {
  // 只有当 viewport 真正变化时才渲染
  if (newPage && newViewport && layer.value && newViewport !== lastViewport) {
    lastViewport = newViewport as PageViewport
    render()
  }
}, { immediate: true })
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

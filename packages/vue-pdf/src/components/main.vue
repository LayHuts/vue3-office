<!-- eslint-disable no-case-declarations -->
<script setup lang="ts">
import * as PDFJS from "pdfjs-dist";
import { computed, onMounted, onUnmounted, shallowRef, ref, toRaw, watch } from "vue";

import type {
  PDFDocumentLoadingTask,
  PDFPageProxy,
  PageViewport,
  RenderTask,
} from "pdfjs-dist";
import type {
  GetViewportParameters,
  PDFDocumentProxy,
  RenderParameters,
} from "pdfjs-dist/types/src/display/api";
import type {
  AnnotationEventPayload,
  HighlightEventPayload,
  HighlightOptions,
  LoadedEventPayload,
  TextLayerLoadedEventPayload,
  WatermarkOptions,
} from "./types";

import AnnotationLayer from "./layers/AnnotationLayer.vue";
import TextLayer from "./layers/TextLayer.vue";
import XFALayer from "./layers/XFALayer.vue";

interface InternalProps {
  page: PDFPageProxy | undefined;
  document: PDFDocumentProxy | undefined;
  viewport: PageViewport | undefined;
}

defineOptions({
  name: "VuePdf",
});

const props = withDefaults(
  defineProps<{
    pdf?: PDFDocumentLoadingTask;
    page?: number;
    scale?: number;
    rotation?: number;
    fitParent?: boolean;
    width?: number;
    height?: number;
    textLayer?: boolean;
    autoDestroy?: boolean;
    imageResourcesPath?: string;
    hideForms?: boolean;
    intent?: string;
    annotationLayer?: boolean;
    annotationsFilter?: string[];
    annotationsMap?: object;
    watermarkText?: string;
    watermarkOptions?: WatermarkOptions;
    highlightText?: string | string[];
    highlightOptions?: HighlightOptions;
    highlightPages?: number[];
    /**
     * 是否自动渲染。false 时需要外部调用 draw() 才会真正渲染（用于渲染队列调度）。
     */
    autoRender?: boolean;
  }>(),
  {
    page: 1,
    scale: 1,
    intent: "display",
    autoDestroy: false,
    autoRender: true,
  }
);

const emit = defineEmits<{
  (event: "annotation", payload: AnnotationEventPayload): void;
  (event: "highlight", payload: HighlightEventPayload): void;
  (event: "loaded", payload: LoadedEventPayload): void;
  (event: "textLoaded", payload: TextLayerLoadedEventPayload): void;
  (event: "annotationLoaded", payload: any[]): void;
  (event: "xfaLoaded"): void;
  (event: "error", payload: { type: string; message: string; error: Error }): void;
  (event: "stateChange", state: number): void;
}>();

// 渲染状态（与 RenderingStates 对齐：0=INITIAL 1=RUNNING 2=PAUSED 3=FINISHED）
const renderingState = ref(0);
function setState(s: number) {
  if (renderingState.value !== s) {
    renderingState.value = s;
    emit("stateChange", s);
  }
}

// Template Refs
const container = ref<HTMLSpanElement>();
const loadingLayer = ref<HTMLSpanElement>();
const textLayerRef = ref<any>();
const annotationLayerRef = ref<any>();
const loading = ref(false);
let renderTask: RenderTask | null = null;

const internalProps = shallowRef<InternalProps>({
  viewport: undefined,
  document: undefined,
  page: undefined,
});

const alayerProps = computed(() => {
  return {
    annotationsMap: props.annotationsMap,
    annotationsFilter: props.annotationsFilter,
    imageResourcesPath: props.imageResourcesPath,
    hideForms: props.hideForms,
    intent: props.intent,
  };
});
const tlayerProps = computed(() => {
  return {
    highlightText: props.highlightText,
    highlightOptions: props.highlightOptions,
    highlightPages: props.highlightPages,
  };
});

function getWatermarkOptionsWithDefaults(): WatermarkOptions {
  return Object.assign(
    {},
    {
      columns: 4,
      rows: 4,
      rotation: 45,
      fontSize: 18,
      color: "rgba(211, 210, 211, 0.4)",
    },
    props.watermarkOptions
  );
}

function getRotation(rotation: number): number {
  if (!(typeof rotation === "number" && rotation % 90 === 0)) return 0;
  const factor = rotation / 90;
  if (factor > 4) return getRotation(rotation - 360);
  else if (factor < 0) return getRotation(rotation + 360);
  return rotation;
}

function getScale(page: PDFPageProxy): number {
  if (!props.fitParent && !props.width && !props.height) {
    return props.scale;
  }
  const defaultViewport = page.getViewport({ scale: 1 });
  if (props.fitParent) {
    const parentWidth: number = (container.value!.parentNode! as HTMLElement)
      .clientWidth;
    return parentWidth / defaultViewport.width;
  } else if (props.width) {
    return props.width / defaultViewport.width;
  } else if (props.height) {
    return props.height / defaultViewport.height;
  }
  return props.scale;
}

function paintWatermark(zoomRatio = 1.0) {
  if (!props.watermarkText) return;

  const canvas = getCurrentCanvas();
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const mergeOptions = getWatermarkOptionsWithDefaults();

  const text = props.watermarkText;
  const columns = mergeOptions.columns!;
  const rows = mergeOptions.rows!;
  const numWatermarks = columns * rows;
  const rotation = mergeOptions.rotation!;
  const pixels = mergeOptions.fontSize! * zoomRatio;
  ctx.font = `${pixels}px Trebuchet MS`;
  ctx.fillStyle = mergeOptions.color!;

  for (let i = 0; i < numWatermarks; i++) {
    const x =
      (i % columns) * (canvas.width / columns) + canvas.width / (columns * 2);
    const y =
      Math.floor(i / columns) * (canvas.height / rows) +
      canvas.height / (rows * 2);

    const textWidth = ctx.measureText(text).width;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-rotation * (Math.PI / 180));
    ctx.fillText(text, -textWidth / 2, pixels / 2);
    ctx.restore();
  }
}

function getCurrentCanvas(): HTMLCanvasElement | null {
  let oldCanvas = null;
  container.value?.childNodes.forEach((el) => {
    if ((el as HTMLElement).tagName === "CANVAS") oldCanvas = el;
  });
  return oldCanvas;
}

/**
 * 创建离屏新 canvas（不加入 DOM），绘制完成后由 renderPage 替换旧 canvas。
 * 这样在缩放重绘过程中旧 canvas 继续展示，不会出现白屏闪烁。
 */
function setupCanvas(viewport: PageViewport): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("dir", "ltr");
  canvas.style.display = "block";

  const outputScale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  container.value?.style.setProperty("--scale-factor", `${viewport.scale}`);
  container.value?.style.setProperty("--user-unit", `${viewport.userUnit}`);
  container.value?.style.setProperty(
    "--total-scale-factor",
    "calc(var(--scale-factor) * var(--user-unit))"
  );

  if (loadingLayer.value) {
    loadingLayer.value.style.width = `${Math.floor(viewport.width)}px`;
    loadingLayer.value.style.height = `${Math.floor(viewport.height)}px`;
    loadingLayer.value.style.top = "0";
    loadingLayer.value.style.left = "0";
  }
  // 只有首次渲染（没有旧 canvas 可展示）时才显示 loading 遮罩
  loading.value = !getCurrentCanvas();

  return canvas;
}

/** 把新 canvas 替换到 DOM，同时释放旧 canvas 显存 */
function swapCanvas(newCanvas: HTMLCanvasElement): void {
  const oldCanvases: HTMLCanvasElement[] = [];
  container.value?.childNodes.forEach((el) => {
    if ((el as HTMLElement).tagName === "CANVAS" && el !== newCanvas) {
      oldCanvases.push(el as HTMLCanvasElement);
    }
  });

  if (oldCanvases.length > 0) {
    const first = oldCanvases[0];
    first.parentNode?.replaceChild(newCanvas, first);
    for (let i = 1; i < oldCanvases.length; i++) {
      oldCanvases[i].remove();
    }
    // 释放旧 canvas 显存
    for (const c of oldCanvases) {
      c.width = 0;
      c.height = 0;
    }
  } else {
    container.value?.prepend(newCanvas);
  }
}

function cancelRender() {
  if (renderTask) {
    try { renderTask.cancel(); } catch { /* ignore */ }
    renderTask = null;
  }
  // 同时取消文本层的 streamTextContent 任务
  try { textLayerRef.value?.cancel?.(); } catch { /* ignore */ }
}

async function renderPage(pageNum: number): Promise<void> {
  const doc = toRaw(internalProps.value.document);
  if (!doc) return;

  cancelRender();
  setState(1); // RUNNING

  let page: PDFPageProxy;
  try {
    page = await doc.getPage(pageNum);
  } catch (error) {
    setState(0);
    console.error(`Failed to get page ${pageNum}:`, error);
    loading.value = false;
    emit("error", {
      type: "page",
      message: `Failed to get page ${pageNum}`,
      error: error as Error,
    });
    return;
  }

  const defaultViewport = page.getViewport();
  const viewportParams: GetViewportParameters = {
    scale: getScale(page),
    rotation: getRotation((props.rotation || 0) + defaultViewport.rotation),
  };
  const viewport = page.getViewport(viewportParams);

  const canvas = setupCanvas(viewport);

  const outputScale = window.devicePixelRatio || 1;
  const transform =
    outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

  const renderContext: RenderParameters = {
    canvas: canvas,
    viewport,
    annotationMode: props.hideForms
      ? PDFJS.AnnotationMode.ENABLE
      : PDFJS.AnnotationMode.ENABLE_FORMS,
    transform,
    intent: props.intent,
  };

  // 首次渲染时（没有旧 canvas 可展示）先把新 canvas 放进 DOM，让 loading 占位
  const hasOldCanvas = !!getCurrentCanvas();
  if (!hasOldCanvas && !canvas.parentNode) {
    container.value?.prepend(canvas);
  }

  internalProps.value = {
    ...internalProps.value,
    page,
    viewport,
  };

  const task = page.render(renderContext);
  renderTask = task;

  try {
    await task.promise;
    if (renderTask !== task) return; // 已被取消，最新任务接管

    // 渲染成功后才把新 canvas 替换进 DOM（避免白屏）
    if (hasOldCanvas) {
      swapCanvas(canvas);
    }
    loading.value = false;
    paintWatermark(viewport.scale);

    // 串行渲染 TextLayer / AnnotationLayer，避免每页同时向 worker 抛 3-4 个任务
    try {
      if (props.textLayer && textLayerRef.value?.render) {
        await textLayerRef.value.render();
      }
    } catch (e) {
      /* layer 失败不阻塞主流程 */
    }
    try {
      if (props.annotationLayer && annotationLayerRef.value?.render) {
        await annotationLayerRef.value.render();
      }
    } catch (e) {
      /* layer 失败不阻塞主流程 */
    }

    setState(3); // FINISHED
    emit("loaded", internalProps.value.viewport!);
  } catch (error: any) {
    // 离屏 canvas 释放显存
    if (!canvas.parentNode) {
      canvas.width = 0;
      canvas.height = 0;
    }
    loading.value = false;
    if (error?.name === "RenderingCancelledException") {
      setState(0); // 回到 INITIAL，允许重新排队
      return;
    }
    setState(0);
    console.error(`Page ${pageNum} render failed`, error);
    emit("error", {
      type: "render",
      message: `Page ${pageNum} render failed`,
      error,
    });
  } finally {
    if (renderTask === task) renderTask = null;
  }
}

async function initDoc(proxy: PDFDocumentLoadingTask): Promise<void> {
  if (!proxy?.promise) return;
  try {
    const document = await proxy.promise;
    internalProps.value = { ...internalProps.value, document };
    if (props.autoRender) {
      await renderPage(props.page);
    }
  } catch (error) {
    loading.value = false;
    emit("error", {
      type: "load",
      message: "Failed to load PDF document",
      error: error as Error,
    });
  }
}

// 受控渲染：被 queue 调用
async function draw(): Promise<void> {
  if (renderingState.value === 1) return; // RUNNING 中，忽略重复调用
  if (!internalProps.value.document) {
    if (props.pdf) {
      await props.pdf.promise.then((doc) => {
        internalProps.value = { ...internalProps.value, document: doc };
      });
    }
    if (!internalProps.value.document) return;
  }
  await renderPage(props.page);
}

watch(
  () => props.pdf,
  (pdf, oldPdf) => {
    cancelRender();
    if (oldPdf && oldPdf !== pdf && !props.autoDestroy) {
      oldPdf.destroy();
    }
    setState(0);
    if (pdf !== undefined) {
      initDoc(pdf);
    }
  },
  { immediate: true }
);

// scale/width/height 变化：只有自动渲染模式才立即重绘
let lastScale = props.scale;
let lastWidth = props.width;
let lastHeight = props.height;

watch(
  () => [props.scale, props.width, props.height],
  ([newScale, newWidth, newHeight]) => {
    if (
      newScale !== lastScale ||
      newWidth !== lastWidth ||
      newHeight !== lastHeight
    ) {
      lastScale = newScale as number;
      lastWidth = newWidth as number | undefined;
      lastHeight = newHeight as number | undefined;
      cancelRender();
      setState(0);
      if (props.autoRender && internalProps.value.document) {
        renderPage(props.page);
      }
    }
  }
);

watch(
  () => [props.rotation, props.hideForms, props.intent],
  () => {
    cancelRender();
    setState(0);
    if (props.autoRender && internalProps.value.document) {
      renderPage(props.page);
    }
  }
);

watch(
  () => props.page,
  (newPage, oldPage) => {
    if (newPage !== oldPage && internalProps.value.document) {
      cancelRender();
      setState(0);
      if (props.autoRender) renderPage(newPage);
    }
  }
);

onMounted(() => {
  // pdf 初始化由 watch immediate 处理
});

onUnmounted(() => {
  cancelRender();
  if (props.autoDestroy) {
    props.pdf?.destroy();
  }
});

function destroy() {
  props.pdf?.destroy();
}

function reload() {
  cancelRender();
  setState(0);
  if (internalProps.value.document) renderPage(props.page);
}

function cancel() {
  cancelRender();
  if (renderingState.value === 1) setState(0);
}

function clearCanvas() {
  const canvas = getCurrentCanvas();
  if (canvas) {
    canvas.width = 0;
    canvas.height = 0;
  }
  setState(0);
}

defineExpose({
  reload,
  cancel,
  destroy,
  draw,
  clearCanvas,
  renderingState,
});
</script>

<template>
  <div ref="container" style="position: relative; display: block">
    <canvas dir="ltr" style="display: block" role="main" />
    <AnnotationLayer
      v-if="annotationLayer"
      ref="annotationLayerRef"
      :page="internalProps.page"
      :viewport="internalProps.viewport"
      :document="internalProps.document"
      v-bind="alayerProps"
      @annotation="emit('annotation', $event)"
      @annotation-loaded="emit('annotationLoaded', $event)"
    />
    <TextLayer
      v-if="textLayer"
      ref="textLayerRef"
      :page="internalProps.page"
      :viewport="internalProps.viewport"
      v-bind="tlayerProps"
      @highlight="emit('highlight', $event)"
      @text-loaded="emit('textLoaded', $event)"
    />
    <XFALayer
      :page="internalProps.page"
      :viewport="internalProps.viewport"
      :document="internalProps.document"
      @xfa-loaded="emit('xfaLoaded')"
    />
    <div v-show="loading" ref="loadingLayer" style="position: absolute">
      <slot />
    </div>
    <slot
      name="overlay"
      :width="internalProps.viewport?.width"
      :height="internalProps.viewport?.height"
    />
  </div>
</template>

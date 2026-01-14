<script setup lang="ts">
import * as PDFJS from "pdfjs-dist";
import { onBeforeUnmount, ref, watch } from "vue";

import type { PDFPageProxy, PageViewport } from "pdfjs-dist";
import type {
  HighlightEventPayload,
  HighlightOptions,
  TextLayerLoadedEventPayload,
} from "../types";
import { findMatches, highlightMatches, resetDivs } from "../utils/highlight";

const props = defineProps<{
  page?: PDFPageProxy;
  viewport?: PageViewport;
  highlightText?: string | string[];
  highlightOptions?: HighlightOptions;
  highlightPages?: number[];
}>();

const emit = defineEmits<{
  (event: "highlight", payload: HighlightEventPayload): void;
  (event: "textLoaded", payload: TextLayerLoadedEventPayload): void;
}>();

const layer = ref<HTMLDivElement>();
const endContent = ref<HTMLDivElement>();
let textDivs: HTMLElement[] = [];
let textLayerTask: PDFJS.TextLayer | null = null;

function getHighlightOptionsWithDefaults(): HighlightOptions {
  return Object.assign(
    {},
    {
      ignoreCase: true,
      completeWords: false,
    },
    props.highlightOptions
  );
}

async function findAndHighlight(reset = false) {
  const page = props.page;
  const textContent = await page?.getTextContent();

  if (!textContent) {
    return;
  }

  if (reset) {
    resetDivs(textContent, textDivs);
  }

  if (
    props.highlightText &&
    (!props.highlightPages || props.highlightPages.includes(page!.pageNumber))
  ) {
    const queries =
      typeof props.highlightText === "string"
        ? [props.highlightText]
        : props.highlightText;
    const matches = findMatches(
      queries,
      textContent!,
      getHighlightOptionsWithDefaults()
    );
    highlightMatches(matches, textContent!, textDivs);
    emit("highlight", {
      matches,
      textContent,
      textDivs,
      page: page?.pageNumber || 1,
    });
  }
}

async function render() {
  // 取消之前的渲染任务
  textLayerTask?.cancel();
  
  // 清空容器内容
  if (layer.value) {
    layer.value.innerHTML = '';
  }

  const page = props.page;
  const viewport = props.viewport;
  
  if (!page || !viewport || !layer.value) {
    return;
  }
  
  const textStream = page.streamTextContent({
    includeMarkedContent: true,
    disableNormalization: true,
  });
  const textLayer = new PDFJS.TextLayer({
    container: layer.value,
    textContentSource: textStream,
    viewport: viewport,
  });

  textLayerTask = textLayer;
  try {
    await textLayer.render();

    textDivs = textLayer.textDivs;
    const textContent = await page.getTextContent();
    emit("textLoaded", { textDivs, textContent });

    setEOC();
    findAndHighlight();
  } catch (e: any) {
    // 忽略取消错误
    if (e?.name !== 'RenderingCancelledException') {
      console.error(e);
    }
  }
}

function setEOC() {
  const endOfContent = document.createElement("div");
  endOfContent.className = "endOfContent";
  layer.value?.appendChild(endOfContent);
  endContent.value = endOfContent;
}

function onMouseDown() {
  if (!endContent.value) {
    return;
  }
  endContent.value.classList.add("active");
}

function onMouseUp() {
  if (!endContent.value) {
    return;
  }
  endContent.value.classList.remove("active");
}

// 记录上一次的 viewport，避免重复渲染
let lastViewport: PageViewport | undefined = undefined;

watch(
  () => [props.page, props.viewport],
  ([newPage, newViewport]) => {
    // 只有当 viewport 真正变化时才渲染
    if (newPage && newViewport && layer.value && newViewport !== lastViewport) {
      lastViewport = newViewport as PageViewport;
      render();
    }
  },
  { immediate: true }
);

watch(
  () => [props.highlightText, props.highlightOptions],
  (_) => {
    findAndHighlight(true);
  },
  { deep: true }
);

// 添加清理
onBeforeUnmount(() => {
  textLayerTask?.cancel();
});

</script>

<template>
  <div
    ref="layer"
    class="textLayer"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
  />
</template>

<style>
.textLayer {
  position: absolute;
  text-align: initial;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  line-height: 1;
  text-size-adjust: none;
  forced-color-adjust: none;
  transform-origin: 0 0;
  z-index: 2;
  /* 禁止容器本身被选中 */
  user-select: none;
  -webkit-user-select: none;
}

.textLayer > span {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
  /* 只允许文本 span 被选中 */
  user-select: text;
  -webkit-user-select: text;
}

.textLayer > span:empty {
  user-select: none;
  -webkit-user-select: none;
}

.textLayer br {
  user-select: none;
  -webkit-user-select: none;
}

.textLayer > span::selection {
  background: rgba(0, 0, 255, 0.25);
}

.textLayer .endOfContent {
  display: block;
  position: absolute;
  inset: 100% 0 0;
  z-index: -1;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  pointer-events: none;
}

.textLayer .endOfContent.active {
  top: 0;
}
</style>

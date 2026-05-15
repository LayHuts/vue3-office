<script setup lang="ts">
import * as PDFJS from "pdfjs-dist";
import { onBeforeUnmount, ref } from "vue";

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

async function render(): Promise<void> {
  textLayerTask?.cancel();

  if (layer.value) {
    layer.value.replaceChildren();
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

    await findAndHighlight();
  } catch (e: any) {
    if (e?.name !== "RenderingCancelledException") {
      console.error(e);
    }
  }
}

function cancel() {
  textLayerTask?.cancel();
}

onBeforeUnmount(() => {
  textLayerTask?.cancel();
});

defineExpose({ render, cancel, findAndHighlight });
</script>

<template>
  <div ref="layer" class="textLayer" />
</template>

<style scoped>
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

/* pdfjs-dist 动态创建的 span 没有 data-v 属性，必须用 :deep() 穿透 scoped 限制 */
.textLayer :deep(span) {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
  /* 只允许文本 span 被选中 */
  user-select: text;
  -webkit-user-select: text;
}

.textLayer :deep(span:empty) {
  user-select: none;
  -webkit-user-select: none;
}

.textLayer :deep(br) {
  user-select: none;
  -webkit-user-select: none;
}

.textLayer :deep(span)::selection {
  background: rgba(0, 0, 255, 0.25);
}

.textLayer :deep(.endOfContent) {
  display: block;
  position: absolute;
  inset: 100% 0 0;
  z-index: -1;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  pointer-events: none;
}

.textLayer :deep(.endOfContent.active) {
  top: 0;
}
</style>

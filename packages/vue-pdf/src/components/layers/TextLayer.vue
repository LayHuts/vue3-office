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

<!-- 为了保证 pdfjs-dist 动态创建的 span/br 能正确接收样式，文本层不能使用 scoped。 -->
<style>
/*
 * 这里基本对齐 pdfjs-dist 5.x 官方 web/pdf_viewer.css 中的 .textLayer 规则。
 * 关键点：
 *   1. 通过 --font-height / --scale-x / --rotate / --min-font-size-inv 等自定义
 *      属性正确设置 font-size 和 transform，让文本层 span 与 canvas 文字精确对齐，
 *      否则鼠标选择会出现断断续续的问题。
 *   2. .markedContent 使用 display: contents，被标记内容里的 span 才是真正承载
 *      文字的元素。
 */
.textLayer {
  position: absolute;
  text-align: initial;
  inset: 0;
  overflow: clip;
  opacity: 1;
  line-height: 1;
  -webkit-text-size-adjust: none;
  text-size-adjust: none;
  forced-color-adjust: none;
  transform-origin: 0 0;
  caret-color: CanvasText;
  z-index: 2;

  --min-font-size: 1;
  --text-scale-factor: calc(var(--total-scale-factor) * var(--min-font-size));
  --min-font-size-inv: calc(1 / var(--min-font-size));
}

.textLayer.highlighting {
  touch-action: none;
}

.textLayer :is(span, br) {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
}

.textLayer > :not(.markedContent),
.textLayer .markedContent span:not(.markedContent) {
  z-index: 1;

  --font-height: 0;
  font-size: calc(var(--text-scale-factor) * var(--font-height));

  --scale-x: 1;
  --rotate: 0deg;
  transform: rotate(var(--rotate)) scaleX(var(--scale-x))
    scale(var(--min-font-size-inv));
}

.textLayer .markedContent {
  display: contents;
}

.textLayer span[role="img"] {
  -webkit-user-select: none;
  user-select: none;
  cursor: default;
}

.textLayer ::selection {
  background: rgba(0, 0, 255, 0.25);
  background: color-mix(in srgb, AccentColor, transparent 75%);
}

.textLayer br::selection {
  background: transparent;
}

.textLayer .endOfContent {
  display: block;
  position: absolute;
  inset: 100% 0 0;
  z-index: 0;
  cursor: default;
  -webkit-user-select: none;
  user-select: none;
}

.textLayer.selecting .endOfContent {
  top: 0;
}
</style>

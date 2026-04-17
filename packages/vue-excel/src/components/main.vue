<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Options as SpreadSheetOptions } from "x-data-spreadsheet";

import 'x-data-spreadsheet/dist/xspreadsheet.css';
import './style/index.css';
import {TransferOptions, useExcel, requestFileData, loadExcel, workDataCache} from './excel';

import { merge } from 'lodash-es';
import { download, MimeType, RequestOptions } from '@vue3-office/common';
import { ExcelOptions, ExcelProps } from "./types";
import { UseExcelEvents, UseTransformCallback } from "./utils/types";


const defaultSpreadSheetOptions: SpreadSheetOptions = {
  mode: 'read',
  showToolbar: true,
  showGrid: true,
  showContextmenu: true,
  showBottomBar: true,
  view: {
    height: () => document.documentElement.clientHeight,
    width: () => document.documentElement.clientWidth,
  },
  row: {
    len: 100,
    height: 24,
  },
  col: {
    len: 26,
    width: 80,
    indexWidth: 60,
    minWidth: 60,
  },
  style: {
    bgcolor: '#ffffff',
    align: 'left',
    valign: 'middle',
    textwrap: false,
    strike: false,
    underline: false,
    color: '#0a0a0a',
    font: {
      name: 'Helvetica',
      size: 10,
      bold: false,
      italic: false,
    },
  },
};

defineOptions({
  name: 'VueExcel'
});

const props = withDefaults(defineProps<ExcelProps>(), {
  xls: false,
  heightOffset: 0,
  widthOffset: 0,
  requestOptions: (): RequestOptions => ({
    responseType: "arraybuffer",
  }),
  excelOptions: (): Partial<ExcelOptions> => ({})
});

// 使用 computed 合并默认spreadsheet配置
const spreadsheetOptions = computed(() => {
  const autoView = {
    view: {
      height: () => wrapperRef.value?.clientHeight || 300,
      width: () => wrapperRef.value?.clientWidth || 1200,
    },
  };

  return merge(
    {},
    defaultSpreadSheetOptions,
    props.excelOptions?.view ? {} : autoView,
    props.excelOptions,
    {
      mode: 'read',
      showToolbar: false,
      showContextmenu: false
    }
  );
});

const emit = defineEmits<{
  rendered: []
  error: [error: Error]
  switchSheet: [index: number]
  cellSelected: [data: { cell: any; rowIndex: number; columnIndex: number }]
  cellsSelected: [data: { cell: any; startRowIndex: number; startColumnIndex: number; endRowIndex: number; endColumnIndex: number }]
}>();

const wrapperRef = ref<HTMLElement | null>(null);
const rootRef = ref<HTMLElement | null>(null);

let spreadsheetObject: any;
let fileData: ArrayBuffer | null;
let initialized = false;
// 转换回调
const callback: UseTransformCallback = {
  beforeTransform(workbook){
    return props.beforeTransform?.(workbook);
  },
  afterTransform(workbook){
    return  props.afterTransform?.(workbook);
  },
}

// 事件回调
const events: UseExcelEvents = {
  onCellSelected(cell: any, rowIndex: number, columnIndex: number){
    emit('cellSelected', { cell, rowIndex: rowIndex, columnIndex: columnIndex });
  },
  onCellsSelected:(
    cell: any,
    startRowIndex: number,
    startColumnIndex: number,
    endRowIndex: number,
    endColumnIndex: number
  )=>{
    emit('cellsSelected', {
      cell,
      startRowIndex: startRowIndex,
      startColumnIndex: startColumnIndex,
      endRowIndex: endRowIndex,
      endColumnIndex: endColumnIndex
    });
  },
  onSwitchSheet(index) {
    emit('switchSheet', index);
  },
};

const transferOptions: TransferOptions = {
  xls: props.xls,
  widthOffset: props.widthOffset,
  heightOffset: props.heightOffset,
  minRowLength: spreadsheetOptions.value.row?.len,
  minColLength: spreadsheetOptions.value.col?.len,
}

onMounted(() => {
  nextTick(async () => {
    if (!rootRef.value) {
      emit('error', new Error('渲染容器不存在'));
      return;
    }

    await useExcel(
      props.url,
      rootRef.value,
      props.requestOptions,
      spreadsheetOptions.value,
      transferOptions,
      callback,
      events
    ).then(({ spreadsheet, fileArrayBuffer}) => {
      console.log(spreadsheet)
      spreadsheetObject = spreadsheet;
      fileData = fileArrayBuffer;
      initialized = true;
      emit('rendered');
    }).catch((error: Error) => {
      emit('error', error);
    });
  });
});

onBeforeUnmount(() => {
  spreadsheetObject = null;
  fileData = null;
});

watch(() => props.url, (url, oldUrl) => {
  if (url !== oldUrl  && initialized) {
    requestFileData(url, props.requestOptions).then((data) => {
      loadExcel(data, spreadsheetObject, transferOptions, workDataCache.ctx2d, callback);
    }).catch((error: Error) => {
      // spreadsheetObject.loadData({});
      emit('error', error);
    });
  }
});

function downloadFile(fileName: string) {
  if(!fileData){
    console.error('文件数据为空');
    return;
  }
  download(fileName || `vue3-office-excel-${new Date().getTime()}.xlsx`, fileData, MimeType.XLSX);
}

function reRender() {
  spreadsheetObject.sheet?.reload();
  spreadsheetObject.reRender?.();
}

defineExpose({
  wrapperRef,
  rootRef,
  downloadFile,
  reRender
});
</script>

<template>
  <div class="vue-office-excel" ref="wrapperRef">
    <div class="vue-office-excel-main" ref="rootRef"></div>
  </div>
</template>

<style lang="scss">
.vue-office-excel * {
  box-sizing: content-box;
}
</style>

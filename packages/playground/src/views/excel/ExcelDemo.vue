<script setup lang="ts">
import { VueExcel } from '@vue3-office/vue-excel';
import PreviewWrapper from '../common/PreviewWrapper.vue';
import useLoading from '../hooks/useLoading.js';
import {ref} from 'vue';
import demoFile from '@samples/test.xlsx';
import type {PreviewSlotProps} from "../../types/preview";

const defaultUrl = demoFile;
const excelRef = ref();

function beforeTransform(data: any){
    console.log('beforeTransform', data, excelRef);

    // 暂时注释掉，先确保基本功能正常
    // data._worksheets.forEach(worksheet=>{
    //     let line = 0;
    //     if( worksheet._rows[line] && worksheet._rows[line]._cells){
    //         for(let i = 0;i < worksheet._rows[line]._cells.length;i++){
    //             let cell = worksheet._rows[line]._cells[i];
    //             if(!cell){
    //                 //单元格不存在
    //                 worksheet._rows[line]._cells[i] = {
    //                     text: '',
    //                     value:'',
    //                     style: {
    //                         bgcolor: '#00ff00'
    //                     }
    //                 }
    //             }else{
    //                 // 正确的方式：获取现有样式，然后添加 bgcolor
    //                 // 使用 cell.style getter 获取完整样式
    //                 const currentStyle = cell.style;
    //                 console.log(`第一行第${i+1}个单元格原始样式:`, currentStyle);
    //
    //                 // 合并样式，而不是覆盖
    //                 cell.style = {
    //                     ...currentStyle,
    //                     bgcolor: '#00ff00'
    //                 };
    //
    //                 console.log(`第一行第${i+1}个单元格合并后样式:`, cell.style);
    //             }
    //         }
    //     }
    // })

    return data;
}

function afterTransform(data: any){
  console.log('afterTransform', data);
  return data;
}

function switchSheet(sheetIndex: number){
    console.log('当前sheet', sheetIndex);
}

function cellSelected(event: any){
    console.log('选择了单元格', event)
}

function cellsSelected(event: any){
    console.log('多选了单元格', event)
}

function onRendered(){
  useLoading.hideLoading();
}

function onError(e: Error){
  useLoading.hideLoading();
}

// setTimeout(()=>{
//     console.log( docxRef.value.download());
// }, 2000);
</script>

<template>
  <PreviewWrapper
      accept=".xlsx,.xls"
      placeholder="请输入xlsx文件地址"
      :default-url="defaultUrl"
  >
    <template #default="{url, xls}: PreviewSlotProps">
      <VueExcel
          ref="xls"
          :xls="false"
          :url="url"
          :beforeTransform = "beforeTransform"
          :afterTransform = "afterTransform"
          style="flex: 1;height: 0"
          @rendered="onRendered"
          @error="onError"
          @switchSheet="switchSheet"
          @cellSelected="cellSelected"
          @cellsSelected="cellsSelected"
      />
    </template>

  </PreviewWrapper>
</template>


<style scoped>

</style>

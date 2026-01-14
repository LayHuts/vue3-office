import { FileSrc, RequestOptions } from "@vue3-office/common";
import Spreadsheet from "x-data-spreadsheet";

interface ExcelOptions {
  // 内容区域网格显示状态
  showGrid?: boolean;
  // 底部工具栏 默认为 true
  showBottomBar?: boolean;
  view?: {
    height: () => number;
    width: () => number;
  };
  row?: {
    len: number;
    height: number;
  };
  col?: {
    len: number;
    width: number;
    indexWidth: number;
    minWidth: number;
  };
}

interface ExcelProps {
  url: FileSrc;
  // 如果渲染出来的结果感觉单元格宽度不够，可以在默认渲染的列表宽度上再加 Npx宽
  widthOffset?: number,
  // 在默认渲染的列表高度上再加 Npx高
  heightOffset?: number,
  xls?: boolean;
  beforeTransform?: (workbook: any) => any;
  afterTransform?: (workbook: any) => any;
  requestOptions?: RequestOptions;
  excelOptions?: Partial<ExcelOptions>;
}

interface ExcelRenderResult {
  data: ArrayBuffer;
  spreadsheet: Spreadsheet;
}

export {
  ExcelOptions,
  ExcelProps,
}

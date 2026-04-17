import * as Excel from 'exceljs/dist/exceljs';
import { FileSrc, request, Result } from '@vue3-office/common';
import { cloneDeep, get, find } from 'lodash-es';
import {clearImageCache, isCellCoveredByImage, parseColor, renderImage, renderImageRaf, RenderOptions} from './utils';
import dayjs from 'dayjs';
import { read, write } from 'xlsx';
import { DEFAULT_COL_WIDTH, DEFAULT_ROW_HEIGHT } from "./constant";
import { RequestOptions } from "@vue3-office/common";
import zhCN from 'x-data-spreadsheet/src/locale/zh-cn';
import Spreadsheet from "x-data-spreadsheet";
import type { Options } from "x-data-spreadsheet";
import { UseExcelEvents, UseTransformCallback } from "./utils/types";
import { getCurrentInstance, onBeforeUnmount } from "vue";

// ==================== 类型定义 ====================
export interface TransferOptions {
  xls?: boolean;
  widthOffset?: number;
  heightOffset?: number;
  minRowLength?: number;
  minColLength?: number;
}

interface SpreadSheetData {
  name: string;
  styles: any[];
  rows: Record<string, any>;
  cols: Record<string, any>;
  merges: string[];
  media: any[];
}

interface MergeAddress {
  startAddress: string;
  endAddress: string;
  YRange: number;
  XRange: number;
}

// ==================== 数据获取 ====================

export const workDataCache = {
  sheetIndex: 0 as number,
  offset: null as any,
  workbookDataSource: { _worksheets: [] as any[] },
  mediasSource: [] as any[],
  ctx2d: null as CanvasRenderingContext2D | null,
  sheetClicked: new Map<number, boolean>()
};

const clearWorkDataCache = () => {
  workDataCache.offset = null;
  workDataCache.workbookDataSource._worksheets.length = 0;
  workDataCache.mediasSource.length = 0;
  workDataCache.ctx2d = null;
  workDataCache.sheetClicked.clear();
}


/**
 * 处理 bottomBar 中 一些在read模式下不需要的操作
 */
const setBottomBar = (xs: any, showBottomBar?: boolean) => {
  if (!showBottomBar) {
    return;
  }

  // 移除 add 按钮的 DOM 元素
  if (xs.bottombar?.menuEl) {
    const firstLi = xs.bottombar.menuEl.el.firstChild;
    if (firstLi) {
      const addIcon = firstLi.querySelector('.x-spreadsheet-icon-img.add');
      addIcon?.parentElement?.remove();
    }
  }

  // 禁止 sheet 标签双击重命名
  xs.bottombar?.menuEl?.el.addEventListener('dblclick', (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
  }, true);

  // 禁用 sheet 标签右键菜单
  xs.bottombar?.menuEl?.el.addEventListener('contextmenu', (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
  }, true);

  // 监听 moreEl 打开，给当前 sheet 添加 active
  setTimeout(() => {
    if (xs.bottombar?.moreEl) {
      xs.bottombar.moreEl.headerEl.el.addEventListener('click', () => {
        setTimeout(() => {
          const activeIndex = xs.bottombar.items.findIndex((item: any) =>
            item.el.classList.contains('active')
          );

          const dropdownItems = xs.bottombar.moreEl.contentEl.el.querySelectorAll('.x-spreadsheet-item');
          dropdownItems.forEach((item: Element, i: number) => {
            item.classList.toggle('active', i === activeIndex);
          });
        }, 10);
      });
    }
  }, 100);
}

/**
 * 初始化监听事件
 */
const initExcelEvent = (spreadsheet: any, renderImgOptions: RenderOptions, events?: UseExcelEvents) => {
  // 单选
  spreadsheet.on('cell-selected', (cell: any, ri: number, ci: number) => {
    // 如果点击的单元格被图片覆盖，隐藏选择框
    const currentSheet = workDataCache.workbookDataSource._worksheets[workDataCache.sheetIndex];
    if (isCellCoveredByImage(currentSheet, ri, ci)) {
      spreadsheet?.sheet?.selector?.hide();
      return;
    }
    // 记录点击记录
    workDataCache.sheetClicked.set(workDataCache.sheetIndex, true);
    events?.onCellSelected?.( cell, ri, ci);
  });

  //多选
  spreadsheet.on('cells-selected', (cell: any, { sri, sci, eri, eci }: any) => {
    // 如果选区起始位置被图片覆盖，隐藏选择框
    const currentSheet = workDataCache.workbookDataSource._worksheets[workDataCache.sheetIndex];
    if (isCellCoveredByImage(currentSheet, sri, sci)) {
      spreadsheet?.sheet?.selector?.hide();
      return;
    }
    // 记录点击记录
    workDataCache.sheetClicked.set(workDataCache.sheetIndex, true);
    events?.onCellsSelected?.(cell, sri, sci, eri, eci);
  });

  // 初始化隐藏选中
  spreadsheet?.sheet?.selector?.hide();
  let isSwapping = false;
  // 底部sheet切换监听
  const swapFunc = spreadsheet.bottombar.swapFunc;
  spreadsheet.bottombar.swapFunc = function (index: number) {
    // ✅ 标记切换状态
    isSwapping = true;
    workDataCache.sheetIndex = index;
    swapFunc.call(spreadsheet.bottombar, index);
    workDataCache.offset = spreadsheet.sheet.data.getSelectedRect();
    // 没有被用户手动选中过cell的sheet加载时隐藏 默认选中的cell操作

    if (!workDataCache.sheetClicked.get(index)) {
      spreadsheet?.sheet?.selector?.hide();
    }

    renderImage(
      workDataCache.ctx2d,
      workDataCache.mediasSource,
      workDataCache.workbookDataSource._worksheets[index],
      workDataCache.offset,
      renderImgOptions
    );
    // ✅ 重置标记
    isSwapping = false;
    // ⭐ 通过回调“向外通知”
    events?.onSwitchSheet?.(index);

  };

  // 处理图片
  const tableRender = spreadsheet.sheet.table.render;
  spreadsheet.sheet.table.render = function (...args: any[]) {
    spreadsheet.sheet && tableRender.apply(spreadsheet.sheet.table, args);
    // ✅ 切换时跳过，避免重复渲染图片
    if (isSwapping) return;
    renderImageRaf(
      workDataCache.ctx2d,
      workDataCache.mediasSource,
      workDataCache.workbookDataSource._worksheets[workDataCache.sheetIndex],
      workDataCache.offset,
      renderImgOptions
    );
  };

  const setOffset = spreadsheet.sheet.editor.setOffset;
  spreadsheet.sheet.editor.setOffset = function (...args: any[]) {
    setOffset.apply(spreadsheet.sheet.editor, args);
    workDataCache.offset = args[0];
  };

}

export async function useExcel (
  src: FileSrc,
  container: HTMLElement,
  requestOptions?: RequestOptions,
  excelOptions?: Partial<Options>,
  transferOptions: TransferOptions = {},
  callback?: UseTransformCallback,
  events?: UseExcelEvents) {

  Spreadsheet.locale('zh-cn', zhCN);

  const result: Result<ArrayBuffer> = await requestFileData(src, requestOptions);
  if (!result.ok) {
    throw new Error(result.error?.message || '文件加载失败')
  }

  const spreadsheet: any = new Spreadsheet(container, excelOptions).loadData({});

  let renderImgOptions: RenderOptions = {
    heightOffset: transferOptions.heightOffset,
    widthOffset: transferOptions.widthOffset,
  }
  initExcelEvent(spreadsheet, renderImgOptions, events);

  const canvas = container.querySelector('canvas');
  workDataCache.ctx2d = canvas?.getContext('2d') || null;

  // 加载数据
  await loadExcel(result, spreadsheet, transferOptions, workDataCache.ctx2d, callback);
  events?.onSwitchSheet?.(workDataCache.sheetIndex);

  // 只在组件上下文中注册卸载钩子
  if (getCurrentInstance()) {
    // 组件卸载时自动清理
    onBeforeUnmount(revokeAllCache);
  }

  return  {
    spreadsheet,
    fileArrayBuffer: result.data
  }

}

export const revokeAllCache = (): void => {
  // TODO 清理缓存
  clearWorkDataCache();
  clearImageCache();
};

/**
 * 加载附件数据
 */
export const loadExcel = async (
  result: Result<ArrayBuffer>,
  spreadsheet: any,
  transferOptions: TransferOptions = {},
  ctx2d?: CanvasRenderingContext2D | null,
  callback?: UseTransformCallback,
): Promise<void> => {
  if (!result.ok) {
    throw new Error(result.error?.message || '文件加载失败');
  }

  if(!ctx2d){
    throw new Error('canvas not loaded');
  }

  let workBook: any  = await readExcelData(result.data, false);

  if (!workBook._worksheets || workBook._worksheets.length === 0) {
    throw new Error('未获取到数据，可能文件格式不正确或文件已损坏');
  }
  clearImageCache();
  workDataCache.mediasSource.length = 0;
  workDataCache.workbookDataSource._worksheets.length = 0;
  workDataCache.sheetClicked.clear();

  // 转换前回调
  if (callback?.beforeTransform) {
    workBook = callback.beforeTransform(workBook) ?? workBook;
  }

  let { workbookData, medias, workbookSource } = transferExcelToSpreadSheet(workBook, transferOptions);

  // 转换后回调
  if (callback?.afterTransform) {
    workbookData = callback.afterTransform(workbookData) ?? workbookData;
  }

  //加载excel数据
  spreadsheet.loadData(workbookData);

  setBottomBar(spreadsheet, spreadsheet.options.showBottomBar);

  workDataCache.mediasSource = medias;
  workDataCache.workbookDataSource = workbookSource;
  workDataCache.offset = null;
  workDataCache.sheetIndex = 0;

  let renderImgOptions: RenderOptions = {
    heightOffset: transferOptions.heightOffset,
    widthOffset: transferOptions.widthOffset,
  }
  renderImage(ctx2d, medias, workbookSource._worksheets[0], workDataCache.offset, renderImgOptions);
}

/**
 * 获取附件
 * @param src 附件地址
 * @param options
 */
export const requestFileData = async (src: FileSrc,
                                      options?: RequestOptions): Promise<Result<ArrayBuffer>> => {
  if(typeof src === 'string') {
    return await request<ArrayBuffer>(src, options);
  } else {
    if (src instanceof Blob) {
      src = await blobToArrayBuffer(src);
    }
    const data: Result<ArrayBuffer> = {ok: true, data: src as ArrayBuffer};
    return Promise.resolve(data);
  }
}

/**
 * Blob转 ArrayBuffer
 * @param blob Blob对象
 */
const blobToArrayBuffer = async (blob: Blob): Promise<ArrayBuffer> => {
  return await blob.arrayBuffer();
}

// ==================== Excel 解析 ====================

/**
 * 检测 buffer 是否为 OLE2 格式（.xls）
 * OLE2 文件头魔数: D0 CF 11 E0 A1 B1 1A E1
 */
function isOLE2Format(buffer: ArrayBuffer): boolean {
  const header = new Uint8Array(buffer.slice(0, 4));
  return header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0;
}

/**
 * 检查 workbook 是否包含有效的 worksheet 数据
 */
function hasValidWorksheets(workbook: any): boolean {
  return workbook?._worksheets?.filter(Boolean).length > 0;
}

/**
 * 读取并解析 Excel 文件数据
 *
 * 策略：
 * 1. 自动检测文件格式，xls（OLE2）文件先通过 xlsx 库转为 xlsx 格式
 * 2. 优先使用 exceljs 直接解析（样式最完整）
 * 3. 若 exceljs 抛异常，或解析成功但 worksheets 为空，
 *    则通过 xlsx 库将原始 buffer 重新写出为标准 xlsx 后再交给 exceljs 解析
 */
export async function readExcelData(buffer: ArrayBuffer, xls?: boolean): Promise<any> {
  let processedBuffer = buffer;

  // 自动检测 xls 格式：外部参数或文件头魔数
  const isXls = xls || isOLE2Format(buffer);

  // xls 格式转换为 xlsx
  if (isXls) {
    console.log('[vue-excel] 检测到 OLE2/XLS 格式，通过 xlsx 库转换为 xlsx');
    const workbook = read(buffer, { type: 'array' });
    processedBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
  }

  let workBook: any;
  let exceljsError: any = null;

  // 第一步：尝试 exceljs 直接解析
  try {
    workBook = await new Excel.Workbook().xlsx.load(processedBuffer);
  } catch (e: any) {
    exceljsError = e;
  }

  // 第二步：如果解析成功且有有效数据，直接返回
  if (!exceljsError && hasValidWorksheets(workBook)) {
    return workBook;
  }

  // 如果已经是 xls 转换过的，不需要再次回退（已经用 xlsx 库处理过了）
  if (isXls) {
    throw exceljsError || new Error('XLS 文件转换后仍无法解析');
  }

  // 第三步：xlsx 格式但 exceljs 失败或结果为空，走 xlsx 回退修复
  const reason = exceljsError ? `解析异常: ${exceljsError.message}` : 'worksheets 为空';
  console.warn(`[vue-excel] exceljs ${reason}，尝试通过 xlsx 库修复`);

  try {
    const xlsxWorkbook = read(processedBuffer, { type: 'array' });
    const repairedBuffer = write(xlsxWorkbook, { bookType: 'xlsx', type: 'array' });
    const wb = new Excel.Workbook();
    const repairedWorkBook = await wb.xlsx.load(repairedBuffer);
    if (hasValidWorksheets(repairedWorkBook)) {
      return repairedWorkBook;
    }
    throw new Error('xlsx 修复后仍无有效数据');
  } catch (fallbackError: any) {
    throw exceljsError || fallbackError;
  }
}

// ==================== 单元格处理 ====================
/**
 * 获取单元格的文本内容
 */
function getCellText(cell: any): string {
  const { numFmt, value, type } = cell;

  switch (type) {
    case 2: // 数字类型
      return formatNumber(cell);
    case 3: // 字符串类型
      return value;
    case 4: // 日期类型
      return formatDate(value, numFmt);
    case 5: // 超链接类型
      return value?.text || '';
    case 6: // 公式类型
      return get(value, 'result.error') || value?.result || '';
    case 8: // 富文本类型
      return cell.text;
    case 9: // 布尔类型
      return cell.text?.toUpperCase() || '';
    default:
      return value ?? '';
  }
}

/**
 * 格式化数字
 */
function formatNumber(cell: any): string {
  const { value, style } = cell;
  const numFmt = style?.numFmt;

  if (!numFmt) return String(value);

  try {
    // 百分比格式
    if (numFmt.endsWith('%')) {
      const precision = numFmt.match(/\.(\d+)%/);
      const formatted = precision
        ? (value * 100).toFixed(precision[1].length)
        : String(value * 100);
      return `${formatted}%`;
    }

    // 数字格式
    if (/0(\.0+)?/.test(numFmt)) {
      let prefix = '';
      if (numFmt.startsWith('"$')) prefix = '$';
      else if (numFmt.startsWith('"¥')) prefix = '¥';

      if (value === 0 && numFmt.startsWith('_')) return '-';

      const precisionMatch = numFmt.match(/0\.(0+)(_|;|$)/);
      const precision = precisionMatch ? precisionMatch[1].length : 0;
      let result = value.toFixed(precision);

      // 千分位处理
      if (numFmt.includes('#,##')) {
        const parts = result.split('.');
        const intPart = parts[0].split('').reverse();
        const formatted: string[] = [];

        intPart.forEach((digit: string, i: number) => {
          formatted.push(digit);
          if ((i + 1) % 3 === 0 && i < intPart.length - 1 && intPart[i + 1] !== '-') {
            formatted.push(',');
          }
        });

        parts[0] = formatted.reverse().join('');
        result = parts.join('.');
      }

      return prefix + result;
    }

    return String(value);
  } catch (e) {
    return String(value);
  }
}

/**
 * 格式化日期
 */
function formatDate(value: any, numFmt: string): string {
  const formatMap: Record<string, string> = {
    'yyyy-mm-dd;@': 'YYYY-MM-DD',
    'mm-dd-yy': 'YYYY/MM/DD',
    '[$-F800]dddd, mmmm dd, yyyy': 'YYYY年M月D日 ddd',
    'm"月"d"日";@': 'M月D日',
    'h:mm;@': 'HH:mm'
  };

  if (numFmt === 'yyyy/m/d h:mm;@' || numFmt === 'm/d/yy "h":mm') {
    return dayjs(value).subtract(8, 'hour').format('YYYY/M/DD HH:mm');
  }

  return dayjs(value).format(formatMap[numFmt] || 'YYYY-MM-DD');
}

/**
 * 获取并转换单元格样式
 */
function getStyle(cell: any): any {
  const style = cloneDeep(cell.style);

  // 处理背景色
  if (!style.fill?.pattern || style.fill.pattern === 'none') {
    delete style.bgcolor;
  } else if (style.fill?.fgColor) {
    const bgColor = parseColor(style.fill.fgColor, '#C7C9CC');
    if (bgColor) style.bgcolor = bgColor;
  }

  // 处理字体颜色
  if (style.font?.color) {
    const fontColor = parseColor(style.font.color, '#000000');
    if (fontColor) style.color = fontColor;
  }

  // 处理对齐
  if (style.alignment) {
    if (style.alignment.horizontal) style.align = style.alignment.horizontal;
    if (style.alignment.vertical) style.valign = style.alignment.vertical;
    if (style.alignment.wrapText) style.textwrap = true;
  }

  // 处理边框
  if (style.border) {
    const styleBorder: Record<string, any> = {};

    Object.entries(style.border).forEach(([position, originBorder]: [string, any]) => {
      let borderColor = '#000000';

      if (typeof originBorder.color === 'string') {
        borderColor = originBorder.color;
      } else if (originBorder.color) {
        borderColor = parseColor(originBorder.color, '#000000');
      }

      styleBorder[position] = [originBorder.style || 'thin', borderColor];
    });

    style.border2 = { ...style.border };
    style.border = styleBorder;
  }

  // 处理字体大小
  if (style.font?.size && typeof style.font.size === 'number') {
    style.font.size = Math.round(style.font.size / 1.333333);
  }

  return style;
}

// ==================== 列转换 ====================
/**
 * 转换 Excel 列信息
 */
function transferColumns(excelSheet: any, spreadSheet: SpreadSheetData, options: TransferOptions): void {
  const columns = excelSheet.columns || [];
  const widthOffset = options.widthOffset || 0;

  columns.forEach((col: any, i: number) => {
    const key = i.toString();

    if (col._hidden) {
      spreadSheet.cols[key] = { width: 0.1 };
    } else {
      const width = col.width ? col.width * 6 + widthOffset : DEFAULT_COL_WIDTH + widthOffset;
      spreadSheet.cols[key] = { width };
    }
  });

  spreadSheet.cols.len = Math.max(
    Object.keys(spreadSheet.cols).length,
    options.minColLength || 0
  );
}

// ==================== 主转换函数 ====================
/**
 * 将 exceljs 的 Workbook 对象转换为 x-data-spreadsheet 格式
 */
export function transferExcelToSpreadSheet(workbook: any, options: TransferOptions = {}) {
  const workbookData: SpreadSheetData[] = [];
  const sheets: any[] = [];

  workbook.eachSheet((sheet: any) => {
    sheets.push(sheet);

    const sheetData: SpreadSheetData = {
      name: sheet.name,
      styles: [],
      rows: {},
      cols: {},
      merges: [],
      media: []
    };

    // 收集合并单元格信息
    const mergeAddressData: MergeAddress[] = [];
    for (const mergeRange in sheet._merges) {
      const merge = sheet._merges[mergeRange];
      sheetData.merges.push(merge.shortRange);
      mergeAddressData.push({
        startAddress: merge.tl,
        endAddress: merge.br,
        YRange: merge.model.bottom - merge.model.top,
        XRange: merge.model.right - merge.model.left
      });
    }

    let effectiveMaxColLen = 0;

    // 遍历行
    (sheet._rows || []).forEach((row: any, rowIndex: number) => {
      sheetData.rows[rowIndex] = { cells: {} };

      // 设置行高
      if (row._hidden) {
        sheetData.rows[rowIndex].height = 0.1;
        row._cells = [];
      } else {
        sheetData.rows[rowIndex].height = (row.height || DEFAULT_ROW_HEIGHT) + (options.heightOffset || 0);
      }

      // 遍历单元格
      (row._cells || []).forEach((cell: any, colIndex: number) => {
        sheetData.rows[rowIndex].cells[colIndex] = {};
        effectiveMaxColLen = Math.max(effectiveMaxColLen, colIndex);

        const mergeAddress = find(mergeAddressData, o => o.startAddress === cell._address);

        if (mergeAddress && cell.master.address !== mergeAddress.startAddress) {
          return;
        }

        if (mergeAddress) {
          sheetData.rows[rowIndex].cells[colIndex].merge = [mergeAddress.YRange, mergeAddress.XRange];
        }

        sheetData.rows[rowIndex].cells[colIndex].text = getCellText(cell);
        sheetData.styles.push(getStyle(cell));
        sheetData.rows[rowIndex].cells[colIndex].style = sheetData.styles.length - 1;
      });
    });

    if (sheet._media) {
      sheetData.media = sheet._media;
    }

    // 设置行数
    const rowKeys = Object.keys(sheetData.rows);
    const lastRowIndex = rowKeys.length > 0 ? +rowKeys[rowKeys.length - 1] + 1 : 0;
    const minRowLength = options.hasOwnProperty('minRowLength') ? options.minRowLength! : 100;
    sheetData.rows.len = Math.max(lastRowIndex, minRowLength);

    // 裁剪多余列
    if (sheet._columns && sheet._columns.length > effectiveMaxColLen + 1) {
      sheet._columns = sheet._columns.slice(0, effectiveMaxColLen + 1);
    }

    transferColumns(sheet, sheetData, options);
    workbookData.push(sheetData);
  });

  workbook._worksheets = sheets;

  return {
    workbookData,
    workbookSource: workbook,
    medias: workbook.media || []
  };
}

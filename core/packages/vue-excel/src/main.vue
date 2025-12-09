<script>
import {defineComponent, ref, computed, onMounted, onBeforeUnmount, watch, nextTick} from 'vue';
import zhCN from 'x-data-spreadsheet/src/locale/zh-cn';
import Spreadsheet from 'x-data-spreadsheet';

import 'x-data-spreadsheet/dist/xspreadsheet.css';
import './index.css';
import {getData, readExcelData, transferExcelToSpreadSheet} from './excel';
import {renderImage, clearCache} from './media';
import {readOnlyInput} from './hack';
import {debounce, merge} from 'lodash';
import {download as downloadFile} from '../../../utils/url';

// 使用函数返回默认配置，确保每次都是新对象
const getDefaultOptions = () => ({
    xls: false,
    minColLength: 20,
    showGrid: true,
    showBottomBar: true,
    row: {
        height: 24,
        len: 100,
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
    // view 配置在 mergedOptions 中动态处理
});

export default defineComponent({
    name: 'VueOfficeExcel',
    props: {
        src: [String, ArrayBuffer, Blob],
        requestOptions: {
            type: Object,
            default: () => ({})
        },
        options: {
            type: Object,
            default: () => ({})
        }
    },
    emits: ['rendered', 'error', 'switchSheet', 'cellSelected', 'cellsSelected'],
    setup(props, {emit}) {
        const wrapperRef = ref(null);
        const rootRef = ref(null);

        // 使用 computed 合并默认配置和用户配置
        const mergedOptions = computed(() => {
            const defaults = getDefaultOptions();
            const merged = merge({}, defaults, props.options);

            // 如果用户没有传 view 配置，使用 wrapperRef 的尺寸
            if (!props.options.view) {
                merged.view = {
                    height: () => wrapperRef.value?.clientHeight || 300,
                    width: () => wrapperRef.value?.clientWidth || 1200,
                };
            }

            return merged;
        });

        let workbookDataSource = {
            _worksheets:[]
        };
        let mediasSource = [];
        let sheetIndex = 0;
        let ctx = null;
        let xs = null;
        let offset = null;
        let fileData = null;
        // 新增：追踪每个 sheet 是否被用户点击过
        // key: sheetIndex, value: boolean
        let sheetClickedMap = new Map();

        function reRender() {
            xs && xs.reRender && xs.reRender();
        }

        // 设置初始时默认不选中
        const selectorHide = () => {
            // 隐藏初始选中状态（避免默认选中 [0,0] 单元格）
            if (xs && xs.sheet && xs.sheet.selector) {
                // xs.sheet.data.selector.range = { sri: -1, sci: -1, eri: -1, eci: -1 };
                xs.sheet.selector.hide();
            }
        }

        /**
         * 初始化一些默认操作
         */
        const init = () => {

            if(mergedOptions.value.showBottomBar){
                // 移除 add 按钮的 DOM 元素
                if (xs.bottombar && xs.bottombar.menuEl) {
                    const firstLi = xs.bottombar.menuEl.el.firstChild;
                    if (firstLi) {
                        const addIcon = firstLi.querySelector('.x-spreadsheet-icon-img.add');
                        if (addIcon) {
                            addIcon.parentElement.remove();
                        }
                    }
                }

                // 禁止 sheet 标签双击重命名
                xs.bottombar.menuEl.el.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                }, true);
            }

            // 监听 moreEl 打开，给当前 sheet 添加 active
            setTimeout(() => {
                if (xs.bottombar && xs.bottombar.moreEl) {
                    // 监听 ellipsis 图标点击（打开下拉菜单）
                    xs.bottombar.moreEl.headerEl.el.addEventListener('click', () => {
                        setTimeout(() => {
                            // 获取当前激活的 sheet 索引
                            const activeIndex = xs.bottombar.items.findIndex(item =>
                                item.el.classList.contains('active')
                            );

                            // 给对应的下拉菜单项添加 active
                            const dropdownItems = xs.bottombar.moreEl.contentEl.el.querySelectorAll('.x-spreadsheet-item');
                            dropdownItems.forEach((item, i) => {
                                if (i === activeIndex) {
                                    item.classList.add('active');
                                } else {
                                    item.classList.remove('active');
                                }
                            });
                        }, 10);
                    });
                }
            }, 100);
        }

        function renderExcel(buffer) {
            fileData = buffer;
            const opts = mergedOptions.value;
            readExcelData(buffer, opts.xls).then(workbook => {
                if (!workbook._worksheets || workbook._worksheets.length === 0) {
                    throw new Error('未获取到数据，可能文件格式不正确或文件已损坏');
                }
                if(opts.beforeTransformData && typeof opts.beforeTransformData === 'function' ){
                    workbook = opts.beforeTransformData(workbook);
                }
                let {workbookData, medias, workbookSource} = transferExcelToSpreadSheet(workbook, opts);
                if(opts.transformData && typeof opts.transformData === 'function' ){
                    workbookData = opts.transformData(workbookData);
                }
                mediasSource = medias;
                workbookDataSource = workbookSource;
                offset = null;
                sheetIndex = 0;

                // 重置点击记录，并为所有 sheet 初始化为 false
                sheetClickedMap.clear();
                workbookData.forEach((sheet, index) => {
                    sheetClickedMap.set(index, false);
                });
                selectorHide();

                clearCache();
                xs.loadData(workbookData);

                init();

                renderImage(ctx, mediasSource, workbookDataSource._worksheets[sheetIndex], offset, opts);
                emit('rendered');
                emit('switchSheet', 0);

            }).catch(e => {
                console.warn(e);
                mediasSource = [];
                workbookDataSource = {
                    _worksheets:[]
                };
                clearCache();
                xs && xs.loadData({});
                emit('error', e);
                emit('switchSheet', 0);
            });
        }

        onMounted(() => {
            nextTick(()=>{
                Spreadsheet.locale('zh-cn', zhCN);
                const opts = mergedOptions.value;
                xs = new Spreadsheet(rootRef.value, {
                    mode: 'read',
                    showToolbar: false,
                    showContextmenu: opts.showContextmenu || false,
                    showBottomBar: opts.showBottomBar,
                    showGrid: opts.showGrid,
                    view: opts.view,
                    row: opts.row,
                    col: opts.col,
                    style: opts.style,
                    autoFocus: false
                }).loadData({});

                xs.on('cell-selected', (cell, ri, ci) => {
                    // 标记当前 sheet 已被点击
                    sheetClickedMap.set(sheetIndex, true);
                    emit('cellSelected', {
                        cell,
                        rowIndex: ri,
                        columnIndex: ci
                    });
                });
                xs.on('cells-selected', (cell, { sri, sci, eri, eci }) => {
                    // 标记当前 sheet 已被点击
                    sheetClickedMap.set(sheetIndex, true);
                    emit('cellsSelected', {
                        cell,
                        startRowIndex: sri,
                        startColumnIndex: sci,
                        endRowIndex: eri,
                        endColumnIndex: eci
                    });
                });

                let swapFunc = xs.bottombar.swapFunc;
                xs.bottombar.swapFunc = function (index) {
                    swapFunc.call(xs.bottombar, index);
                    sheetIndex = index;
                    offset = xs.sheet.data.getSelectedRect();

                    setTimeout(() => {
                        xs.reRender();

                        // 如果该 sheet 从未被点击过（值为 false），隐藏选择器
                        if (sheetClickedMap.get(index) === false) {
                            selectorHide();
                        }
                        // 如果被点击过（值为 true），x-data-spreadsheet 会自动显示上次的选中位置

                        renderImage(ctx, mediasSource, workbookDataSource._worksheets[sheetIndex], offset, mergedOptions.value);
                        emit('switchSheet', index);
                    });
                };

                let renderImageDebounce = debounce(renderImage, 200, {
                    leading: true
                });
                let tableRender = xs.sheet.table.render;
                xs.sheet.table.render = function (...args){
                    xs && xs.sheet && tableRender.apply(xs.sheet.table, args);
                    renderImageDebounce(ctx, mediasSource, workbookDataSource._worksheets[sheetIndex], offset, mergedOptions.value);
                };

                // let clear = xs.sheet.editor.clear;
                // xs.sheet.editor.clear = function (...args){
                //     clear.apply(xs.sheet.editor, args);
                //     setTimeout(()=>{
                //         renderImage(ctx, mediasSource, workbookDataSource._worksheets[sheetIndex], offset, props.options);
                //     });
                // };
                let setOffset = xs.sheet.editor.setOffset;
                xs.sheet.editor.setOffset = function (...args){
                    setOffset.apply(xs.sheet.editor, args);
                    offset = args[0];
                };
                const canvas = rootRef.value.querySelector('canvas');
                ctx = canvas.getContext('2d');
                if (props.src) {
                    getData(props.src, props.requestOptions).then(renderExcel).catch(e => {
                        mediasSource = [];
                        workbookDataSource = {
                            _worksheets:[]
                        };
                        xs.loadData({});
                        emit('error', e);
                    });
                }
            });
        });

        onBeforeUnmount(()=>{
            // 重置点击记录
            sheetClickedMap.clear();
            clearCache();
            xs = null;
        });

        watch(() => props.src, () => {
            if (props.src) {
                getData(props.src, props.requestOptions).then(renderExcel).catch(e => {
                    mediasSource = [];
                    workbookDataSource = {
                        _worksheets:[]
                    };
                    xs.loadData({});
                    emit('error', e);
                });
            } else {
                mediasSource = [];
                workbookDataSource = {
                    _worksheets:[]
                };
                xs.loadData({});
                emit('error', new Error('src属性不能为空'));
            }
        });

        function save(fileName){
            downloadFile(fileName || `vue3-office-excel-${new Date().getTime()}.xlsx`,fileData);
        }

        return {
            wrapperRef,
            rootRef,
            save,
            reRender
        };
    }
});
</script>

<template>
    <div class="vue-office-excel" ref="wrapperRef">
        <div class="vue-office-excel-main" ref="rootRef"></div>
    </div>
</template>
<style lang="less">

</style>

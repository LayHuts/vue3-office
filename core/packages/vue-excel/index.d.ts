import { DefineComponent, Plugin } from 'vue';

export interface Options {
    xls?: boolean;
    minColLength?: number;
    minRowLength?: number;
    showContextmenu?: boolean;
    showGrid?: boolean;
    showBottomBar?: boolean;
    row?: {
        height?: number;
        len?: number;
    };
    col?: {
        len?: number;
        width?: number;
        indexWidth?: number;
        minWidth?: number;
    };
    view?: {
        height?: () => number;
        width?: () => number;
    };
    style?: {
        bgcolor?: string;
        align?: 'left' | 'center' | 'right';
        valign?: 'top' | 'middle' | 'bottom';
        textwrap?: boolean;
        strike?: boolean;
        underline?: boolean;
        color?: string;
        font?: {
            name?: string;
            size?: number;
            bold?: boolean;
            italic?: boolean;
        };
    };
    beforeTransformData?: (workbook: any) => any;
    transformData?: (data: any) => any;
}

export interface VueOfficeExcelProps {
    src: string | ArrayBuffer | Blob;
    requestOptions?: any;
    options?: Options;
}

declare const VueOfficeExcel: DefineComponent<VueOfficeExcelProps> & Plugin;

export default VueOfficeExcel;
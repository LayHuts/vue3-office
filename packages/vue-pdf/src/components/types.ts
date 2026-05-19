
import type { PageViewport } from 'pdfjs-dist'
import type {
  DocumentInitParameters,
  OnProgressParameters,
  TextContent,
  TypedArray,
} from 'pdfjs-dist/types/src/display/api'
import type { Metadata } from 'pdfjs-dist/types/src/display/metadata'

export interface Match {
  start: {
    idx: number
    offset: number
  }
  end: {
    idx: number
    offset: number
  }
  str: string
  oindex: number
}

export type LoadedEventPayload = PageViewport

export interface AnnotationEventPayload {
  type: string
  data: any
}

export interface HighlightEventPayload {
  matches: Match[]
  page: number
  textContent: TextContent
  textDivs: HTMLElement[]
}

export interface TextLayerLoadedEventPayload {
  textDivs: HTMLElement[]
  textContent: TextContent | undefined
}

export interface WatermarkOptions {
  columns?: number
  rows?: number
  rotation?: number
  fontSize?: number
  color?: string
}

export interface HighlightOptions {
  ignoreCase?: boolean
  completeWords?: boolean
}

export interface Base<T, S> {
  type: T
  spec: S
}
// These are types from the PDF 1.7 reference manual; Adobe
// Table 151 – Destination syntax
// (Coordinates origin is bottom left of page)
export type XYZ = Base<'XYZ', [left: number, top: number, zoom: number]>
export type Fit = Base<'Fit', []>
export type FitH = Base<'FitH', [top: number]>
export type FitV = Base<'FitV', [left: number]>
export type FitR = Base<
  'FitR',
  [left: number, bottom: number, right: number, top: number]
>
export type FitB = Base<'FitB', []>
export type FitBH = Base<'FitBH', [top: number]>
export type FitBV = Base<'FitBV', [left: number]>

export type PDFLocation = XYZ | Fit | FitH | FitV | FitR | FitB | FitBH | FitBV

export interface PDFDestination {
  pageIndex: number
  location: PDFLocation
}

export type OnProgressCallback = (progressData: OnProgressParameters) => void
export type UpdatePasswordFn = (newPassword: string) => void
export type OnPasswordCallback = (updatePassword: UpdatePasswordFn, reason: any) => void
export type OnErrorCallback = (error: any) => void

export type PDFSrc =
  | string
  | URL
  | TypedArray
  | ArrayBuffer
  | DocumentInitParameters
  | undefined
  | null;

/**
 * 透传给 pdfjs `getDocument` 的加载参数子集，主要用于优化大文件 / 远程 PDF 的加载体验。
 *
 * 仅在 src 是 string / URL / DocumentInitParameters 时生效（已经是 Blob/ArrayBuffer
 * 时数据已经在内存里，下面这些 Range/Stream 选项不会有效果）。
 *
 * 详细字段说明见 pdfjs `DocumentInitParameters`。
 */
export interface PDFLoaderOptions {
  /**
   * Range 请求每次拉取的字节数
   * 大文件 (30M+) 建议调到 262144 (256KB) 或 524288 (512KB) 减少请求往返次数。
   */
  rangeChunkSize?: number
  /**
   * 关闭 Range 请求。仅调试或服务端不支持 Range 时使用。
   */
  disableRange?: boolean
  /**
   * 关闭流式加载（fetch ReadableStream）。仅调试时使用。
   */
  disableStream?: boolean
  /**
   * 关闭后台预取剩余页面。
   * 大文件强烈建议设为 true：只在用户翻到某页时才拉取该页字节，
   * 首屏所需的网络流量降到最低，但翻页会多一次网络等待。
   */
  disableAutoFetch?: boolean
  /**
   * 中日韩字体所需的 CMap 资源地址，例如 'https://cdn.jsdelivr.net/npm/pdfjs-dist@x.x.x/cmaps/'。
   * 缺失会导致部分中文 PDF 渲染慢/乱码。
   */
  cMapUrl?: string
  /**
   * CMap 是否为二进制压缩格式，pdfjs-dist 自带的 cmaps/ 目录是 packed=true。
   */
  cMapPacked?: boolean
  /**
   * 标准字体资源地址，例如 'https://cdn.jsdelivr.net/npm/pdfjs-dist@x.x.x/standard_fonts/'。
   */
  standardFontDataUrl?: string
  /**
   * 是否启用 XFA 表单渲染。
   */
  enableXfa?: boolean
  /**
   * 自定义 fetch 头（透传到 pdfjs 的 httpHeaders）。
   */
  httpHeaders?: Record<string, string>
  /**
   * 是否随请求携带 cookies（透传到 pdfjs 的 withCredentials）。
   */
  withCredentials?: boolean
}

export interface PDFOptions {
  onProgress?: OnProgressCallback
  onPassword?: OnPasswordCallback
  onError?: OnErrorCallback
  password?: string
  /**
   * 透传给 pdfjs.getDocument 的加载参数。
   * 大文件场景请见 {@link PDFLoaderOptions} 字段说明。
   */
  loaderOptions?: PDFLoaderOptions
}

export interface PDFInfoMetadata {
  info: Object
  metadata: Metadata
}

export interface PDFInfo {
  metadata: PDFInfoMetadata
  attachments: Record<string, unknown>
  javascript: Object | null
  outline: any
}


/**
 * 公共类型定义
 */

/** 目录项 */
export interface OutlineItem {
  title: string
  dest: any
  items: OutlineItem[]
  bold: boolean
  italic: boolean
}

/** 扁平化目录项（用于构建树形结构） */
export interface FlatOutlineItem {
  title: string
  dest: any
  targetPage: number
  sourcePage: number
  x: number
  fontSize: number
  y: number
  level?: number
  items: any[]
  bold: boolean
  italic: boolean
}

/** PDF 位置信息 */
export interface PDFLocation {
  pageNumber: number
  scale: number
  top: number
  left: number
}

/** 可见页面信息 */
export interface VisiblePage {
  id: number
  percent: number
  y: number
}

/** 可见页面结果 */
export interface VisiblePagesResult {
  first: VisiblePage | null
  last: VisiblePage | null
  views: VisiblePage[]
  ids: Set<number>
}

/** 文本区域信息 */
export interface TextRectInfo {
  text: string
  x: number
  fontSize: number
}

/** 缩放管理器选项 */
export interface ScaleManagerOptions {
  minScale: number
  maxScale: number
  pdfToCssUnits: number
}

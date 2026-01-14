/**
 * 缩放管理器
 * 处理 PDF 缩放计算和样式
 */

import type { ScaleManagerOptions } from '../types'
import { PDF_TO_CSS_UNITS, MIN_SCALE, MAX_SCALE, SCROLLBAR_PADDING } from './ui_utils'

/** 默认选项 */
const defaultOptions: ScaleManagerOptions = {
  minScale: MIN_SCALE,
  maxScale: MAX_SCALE,
  pdfToCssUnits: PDF_TO_CSS_UNITS,
}

/**
 * 计算目标缩放值
 * @param scale - 缩放值（数字或字符串如 'fit-width', 'fit-page'）
 * @param containerWidth - 容器宽度
 * @param containerHeight - 容器高度
 * @param pageWidth - 页面宽度
 * @param pageHeight - 页面高度
 * @param options - 缩放选项
 * @returns CSS 单位的缩放值
 */
export function calculateTargetScale(
  scale: number | string,
  containerWidth: number,
  containerHeight: number,
  pageWidth: number,
  pageHeight: number,
  options: Partial<ScaleManagerOptions> = {}
): number {
  const opts = { ...defaultOptions, ...options }
  const { minScale, maxScale, pdfToCssUnits } = opts

  let result: number

  if (typeof scale === 'number') {
    result = scale * pdfToCssUnits
  } else {
    const availableWidth = containerWidth - SCROLLBAR_PADDING

    if (scale === 'fit-width') {
      result = availableWidth / pageWidth
    } else if (scale === 'fit-page') {
      const availableHeight = containerHeight - 10
      const widthScale = availableWidth / pageWidth
      const heightScale = availableHeight / pageHeight
      result = Math.min(widthScale, heightScale)
    } else {
      // 'auto' 或其他
      result = pdfToCssUnits
    }
  }

  // 限制在最小和最大缩放范围内
  const minCss = minScale * pdfToCssUnits
  const maxCss = maxScale * pdfToCssUnits
  return Math.max(minCss, Math.min(maxCss, result))
}

/**
 * 获取页面容器样式
 * @param targetScale - 目标缩放值
 * @param pageWidth - 页面宽度
 * @param pageHeight - 页面高度
 * @returns 样式对象
 */
export function getPageContainerStyle(
  targetScale: number,
  pageWidth: number,
  pageHeight: number
): Record<string, string> {
  return {
    width: `${Math.floor(targetScale * pageWidth)}px`,
    height: `${Math.floor(targetScale * pageHeight)}px`
  }
}

/**
 * 获取 canvas wrapper 样式（CSS Transform）
 * @param cssScale - CSS 缩放比例（targetScale / renderScale）
 * @param isCssTransformActive - 是否激活 CSS transform
 * @returns 样式对象
 */
export function getCanvasWrapperStyle(
  cssScale: number,
  isCssTransformActive: boolean
): Record<string, string> {
  return {
    transform: cssScale !== 1 ? `scale(${cssScale})` : 'none',
    transformOrigin: 'top left',
    width: cssScale !== 1 ? `${100 / cssScale}%` : '100%',
    height: cssScale !== 1 ? `${100 / cssScale}%` : '100%',
    willChange: isCssTransformActive ? 'transform' : 'auto'
  }
}

/**
 * 获取容器样式（CSS 变量）
 * @param targetScale - 目标缩放值
 * @param pageWidth - 页面宽度
 * @param pageHeight - 页面高度
 * @returns 样式对象
 */
export function getContainerStyle(
  targetScale: number,
  pageWidth: number,
  pageHeight: number
): Record<string, string | number> {
  return {
    '--scale-factor': targetScale,
    '--page-width': pageWidth + 'px',
    '--page-height': pageHeight + 'px'
  }
}

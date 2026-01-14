/**
 * 滚动管理器
 * 处理 PDF 页面滚动和位置恢复
 */

import type { PDFLocation } from '../types'

/**
 * 更新当前视图位置
 * @param containerEl - 滚动容器元素
 * @param contentEl - 内容容器元素
 * @param pageEl - 页面元素
 * @param pageNumber - 页码
 * @param currentScale - 当前缩放比例
 * @returns PDF 位置信息
 */
export function updateLocation(
  containerEl: HTMLElement,
  contentEl: HTMLElement | null,
  pageEl: HTMLElement,
  pageNumber: number,
  currentScale: number
): PDFLocation {
  const contentOffset = contentEl ? contentEl.offsetTop : 0

  // 计算滚动位置相对于页面的偏移（像素）
  const scrollTop = containerEl.scrollTop
  const scrollLeft = containerEl.scrollLeft
  const pageTop = pageEl.offsetTop + contentOffset
  const pageLeft = pageEl.offsetLeft

  // 视口左上角相对于页面的偏移（视口坐标）
  const viewportOffsetX = scrollLeft - pageLeft
  const viewportOffsetY = scrollTop - pageTop

  // 转换为 PDF 坐标（除以缩放比例）
  const pdfX = viewportOffsetX / currentScale
  const pdfY = viewportOffsetY / currentScale

  return {
    pageNumber,
    scale: currentScale,
    left: Math.round(pdfX),
    top: Math.round(pdfY),
  }
}

/**
 * 滚动到保存的位置
 * @param containerEl - 滚动容器元素
 * @param contentEl - 内容容器元素
 * @param pageEl - 页面元素
 * @param location - PDF 位置信息
 * @param newScale - 新的缩放比例
 */
export function scrollToLocation(
  containerEl: HTMLElement,
  contentEl: HTMLElement | null,
  pageEl: HTMLElement,
  location: PDFLocation,
  newScale: number
): void {
  const contentOffset = contentEl ? contentEl.offsetTop : 0

  const pageTop = pageEl.offsetTop + contentOffset
  const pageLeft = pageEl.offsetLeft

  // PDF 坐标乘以新缩放比例 = 新的视口偏移
  const targetScrollTop = pageTop + location.top * newScale
  const targetScrollLeft = pageLeft + location.left * newScale

  // 立即滚动（不使用动画）
  containerEl.scrollTop = targetScrollTop
  containerEl.scrollLeft = Math.max(0, targetScrollLeft)
}

/**
 * 滚动到指定页面
 * @param containerEl - 滚动容器元素
 * @param contentEl - 内容容器元素
 * @param pageEl - 页面元素
 * @param smooth - 是否使用平滑滚动
 * @param offset - 顶部偏移量
 */
export function scrollToPage(
  containerEl: HTMLElement,
  contentEl: HTMLElement | null,
  pageEl: HTMLElement,
  smooth = true,
  offset = 10
): void {
  const contentOffset = contentEl ? contentEl.offsetTop : 0
  const targetScrollTop = pageEl.offsetTop + contentOffset - offset

  containerEl.scrollTo({
    top: targetScrollTop,
    behavior: smooth ? 'smooth' : 'auto'
  })
}

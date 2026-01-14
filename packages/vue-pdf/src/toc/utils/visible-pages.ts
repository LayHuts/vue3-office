/**
 * 可见页面检测工具
 * 使用二分查找优化性能
 */

import type { VisiblePage, VisiblePagesResult } from '../types'

/**
 * 获取可见页面
 * @param containerEl - 滚动容器元素
 * @param contentSelector - 内容容器选择器
 * @param pageSelector - 页面元素选择器
 * @returns 可见页面结果
 */
export function getVisiblePages(
  containerEl: HTMLElement,
  contentSelector = '.pdf-content',
  pageSelector = '.pdf-page-container'
): VisiblePagesResult {
  const emptyResult: VisiblePagesResult = {
    first: null,
    last: null,
    views: [],
    ids: new Set<number>()
  }

  if (!containerEl) {
    return emptyResult
  }

  const scrollEl = containerEl
  const top = scrollEl.scrollTop
  const bottom = top + scrollEl.clientHeight

  const visible: VisiblePage[] = []
  const ids = new Set<number>()

  const pdfContent = scrollEl.querySelector(contentSelector) as HTMLElement
  if (!pdfContent) {
    return emptyResult
  }

  const pageContainers = pdfContent.querySelectorAll(pageSelector) as NodeListOf<HTMLElement>
  const numPages = pageContainers.length

  if (numPages === 0) {
    return emptyResult
  }

  // 二分查找第一个可见页面
  function isElementBottomAfterViewTop(index: number): boolean {
    const el = pageContainers[index]
    const elementBottom = el.offsetTop + el.clientTop + el.clientHeight
    return elementBottom > top
  }

  let minIndex = 0
  let maxIndex = numPages - 1

  if (!isElementBottomAfterViewTop(maxIndex)) {
    return emptyResult
  }

  if (isElementBottomAfterViewTop(minIndex)) {
    minIndex = 0
  } else {
    while (minIndex < maxIndex) {
      const currentIndex = (minIndex + maxIndex) >> 1
      if (isElementBottomAfterViewTop(currentIndex)) {
        maxIndex = currentIndex
      } else {
        minIndex = currentIndex + 1
      }
    }
  }

  const firstVisibleIndex = minIndex

  // 收集所有可见页面
  for (let i = firstVisibleIndex; i < numPages; i++) {
    const el = pageContainers[i]
    const pageNum = parseInt(el.dataset.pageNumber || '0', 10)
    if (pageNum <= 0) continue

    const currentHeight = el.offsetTop + el.clientTop
    const viewHeight = el.clientHeight
    const viewBottom = currentHeight + viewHeight

    if (currentHeight >= bottom) break
    if (viewBottom <= top) continue

    const hiddenHeight = Math.max(0, top - currentHeight) + Math.max(0, viewBottom - bottom)
    const percent = Math.round(((viewHeight - hiddenHeight) / viewHeight) * 100)

    visible.push({ id: pageNum, percent, y: currentHeight })
    ids.add(pageNum)
  }

  return {
    first: visible[0] || null,
    last: visible[visible.length - 1] || null,
    views: visible,
    ids
  }
}

/**
 * 确定当前页面
 * @param visiblePages - 可见页面数组
 * @param lastEmittedPage - 上次发出的页码
 * @returns 当前页码
 */
export function determineCurrentPage(
  visiblePages: VisiblePage[],
  lastEmittedPage: number
): number {
  if (visiblePages.length === 0) {
    return lastEmittedPage
  }

  // 检查上次发出的页面是否仍然可见
  let stillVisible = false
  for (const page of visiblePages) {
    if (page.id === lastEmittedPage) {
      stillVisible = true
      break
    }
  }

  // 如果当前页面可见，保持它；否则用第一个可见页面
  return stillVisible ? lastEmittedPage : visiblePages[0].id
}

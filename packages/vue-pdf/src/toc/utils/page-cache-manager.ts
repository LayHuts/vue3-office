/**
 * 页面缓存管理器
 * 管理 PDF 页面的渲染缓存
 */

import { DEFAULT_CACHE_SIZE } from './ui_utils'

/**
 * 页面缓存管理器
 */
export class PageCacheManager {
  private renderedPages: Set<number>
  private preloadPages: number
  private maxCacheSize: number

  constructor(preloadPages = 2, maxCacheSize = DEFAULT_CACHE_SIZE) {
    this.renderedPages = new Set()
    this.preloadPages = preloadPages
    this.maxCacheSize = maxCacheSize
  }

  /**
   * 判断是否应该渲染页面
   * @param pageNum - 页码
   * @param currentPage - 当前页码
   * @param totalPages - 总页数
   * @returns 是否应该渲染
   */
  shouldRenderPage(pageNum: number, currentPage: number, totalPages: number): boolean {
    // 已经在缓存中
    if (this.renderedPages.has(pageNum)) {
      return true
    }

    // 初始加载前 5 页
    if (this.renderedPages.size === 0 && pageNum <= 5) {
      return true
    }

    // 在当前页面附近
    if (Math.abs(pageNum - currentPage) <= this.preloadPages) {
      return true
    }

    return false
  }

  /**
   * 添加页面到缓存
   * @param pageNum - 页码
   */
  addPage(pageNum: number): void {
    this.renderedPages.add(pageNum)
  }

  /**
   * 检查页面是否在缓存中
   * @param pageNum - 页码
   * @returns 是否在缓存中
   */
  hasPage(pageNum: number): boolean {
    return this.renderedPages.has(pageNum)
  }

  /**
   * 获取缓存大小
   * @returns 缓存中的页面数量
   */
  get size(): number {
    return this.renderedPages.size
  }

  /**
   * 更新缓存
   * @param visibleIds - 可见页面 ID 集合
   * @param totalPages - 总页数
   * @returns 是否有更新
   */
  updateBuffer(visibleIds: Set<number>, totalPages: number): boolean {
    let needsUpdate = false

    // 添加可见页面
    for (const id of visibleIds) {
      if (!this.renderedPages.has(id)) {
        this.renderedPages.add(id)
        needsUpdate = true
      }
    }

    // 预加载可见页面周围的页面
    for (const id of visibleIds) {
      for (
        let i = Math.max(1, id - this.preloadPages);
        i <= Math.min(totalPages, id + this.preloadPages);
        i++
      ) {
        if (!this.renderedPages.has(i)) {
          this.renderedPages.add(i)
          needsUpdate = true
        }
      }
    }

    return needsUpdate
  }

  /**
   * 预加载指定页面周围的页面
   * @param pageNum - 中心页码
   * @param totalPages - 总页数
   */
  preloadAround(pageNum: number, totalPages: number): void {
    for (
      let i = Math.max(1, pageNum - this.preloadPages);
      i <= Math.min(totalPages, pageNum + this.preloadPages);
      i++
    ) {
      this.renderedPages.add(i)
    }
  }

  /**
   * 初始化渲染
   * @param currentPage - 当前页码
   * @param totalPages - 总页数
   * @param initialCount - 初始渲染页数
   */
  initializeRendering(currentPage: number, totalPages: number, initialCount = 5): void {
    // 渲染前几页
    const count = Math.min(initialCount, totalPages)
    for (let i = 1; i <= count; i++) {
      this.renderedPages.add(i)
    }

    // 预加载当前页面周围
    this.preloadAround(currentPage, totalPages)
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.renderedPages.clear()
  }

  /**
   * 获取所有缓存的页面
   * @returns 页面集合
   */
  getPages(): Set<number> {
    return new Set(this.renderedPages)
  }
}

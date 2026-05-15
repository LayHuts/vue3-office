/**
 * 页面缓存管理器
 * 使用 Map 维护 LRU 顺序，超出容量时按"距离可见缓冲最远"淘汰
 */

import { DEFAULT_CACHE_SIZE } from './ui_utils'

export class PageCacheManager {
  /** 使用 Map 保留插入顺序 = LRU 顺序（老的在前） */
  private renderedPages: Map<number, number>
  private preloadPages: number
  private maxCacheSize: number

  constructor(preloadPages = 1, maxCacheSize = DEFAULT_CACHE_SIZE) {
    this.renderedPages = new Map()
    this.preloadPages = preloadPages
    this.maxCacheSize = Math.max(3, maxCacheSize)
  }

  /** 记录页面已渲染，并刷新 LRU 顺序 */
  addPage(pageNum: number): void {
    if (this.renderedPages.has(pageNum)) this.renderedPages.delete(pageNum)
    this.renderedPages.set(pageNum, performance.now())
  }

  /** 移除某页（不属于 LRU 淘汰路径，用于主动清理） */
  removePage(pageNum: number): void {
    this.renderedPages.delete(pageNum)
  }

  hasPage(pageNum: number): boolean {
    return this.renderedPages.has(pageNum)
  }

  get size(): number {
    return this.renderedPages.size
  }

  /**
   * 根据可见页计算 buffer（可见页 ± preloadPages）
   */
  computeBuffer(visibleIds: Iterable<number>, totalPages: number): Set<number> {
    const buffer = new Set<number>()
    for (const id of visibleIds) {
      const from = Math.max(1, id - this.preloadPages)
      const to = Math.min(totalPages, id + this.preloadPages)
      for (let i = from; i <= to; i++) buffer.add(i)
    }
    return buffer
  }

  /**
   * 淘汰位于 buffer 之外且超出缓存上限的最旧页面
   * @returns 被淘汰页码数组
   */
  evict(buffer: Set<number>): number[] {
    const toDestroy: number[] = []
    if (this.renderedPages.size <= this.maxCacheSize) return toDestroy

    // Map 顺序即 LRU 顺序，最早插入/访问的在前
    for (const pageNum of Array.from(this.renderedPages.keys())) {
      if (this.renderedPages.size <= this.maxCacheSize) break
      if (!buffer.has(pageNum)) {
        this.renderedPages.delete(pageNum)
        toDestroy.push(pageNum)
      }
    }
    return toDestroy
  }

  /**
   * 预加载中心页周围页面（用于跳转）
   */
  markBufferAround(pageNum: number, totalPages: number): Set<number> {
    const buffer = new Set<number>()
    const from = Math.max(1, pageNum - this.preloadPages)
    const to = Math.min(totalPages, pageNum + this.preloadPages)
    for (let i = from; i <= to; i++) buffer.add(i)
    return buffer
  }

  clear(): void {
    this.renderedPages.clear()
  }

  get preloadCount(): number {
    return this.preloadPages
  }
}

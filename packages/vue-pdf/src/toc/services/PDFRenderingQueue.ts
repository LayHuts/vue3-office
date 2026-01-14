/**
 * PDF.js 风格的渲染队列
 * 参考: pdf.js/web/pdf_rendering_queue.js
 */

import { RenderingStates } from '../utils'

const CLEANUP_TIMEOUT = 30000

export interface IRenderableView {
  id: number
  renderingId: string
  renderingState: number
  draw(): Promise<void>
  resume?(): void
  detailView?: IRenderableView
}

export interface VisibleResult {
  first: { id: number } | null
  last: { id: number } | null
  views: Array<{ view: IRenderableView }>
  ids: Set<number>
}

/**
 * PDF 渲染队列
 */
export class PDFRenderingQueue {
  pdfViewer: any = null
  pdfThumbnailViewer: any = null
  onIdle: (() => void) | null = null
  highestPriorityPage: string | null = null
  idleTimeout: number | null = null
  printing = false
  isThumbnailViewEnabled = false

  setViewer(pdfViewer: any): void {
    this.pdfViewer = pdfViewer
  }

  setThumbnailViewer(pdfThumbnailViewer: any): void {
    this.pdfThumbnailViewer = pdfThumbnailViewer
  }

  hasViewer(): boolean {
    return !!this.pdfViewer
  }

  isHighestPriority(view: IRenderableView): boolean {
    return this.highestPriorityPage === view.renderingId
  }

  renderHighestPriority(currentlyVisiblePages?: VisibleResult): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout)
      this.idleTimeout = null
    }

    if (this.pdfViewer?.forceRendering?.(currentlyVisiblePages)) {
      return
    }

    if (this.isThumbnailViewEnabled && this.pdfThumbnailViewer?.forceRendering?.()) {
      return
    }

    if (this.printing) return

    if (this.onIdle) {
      this.idleTimeout = window.setTimeout(this.onIdle.bind(this), CLEANUP_TIMEOUT)
    }
  }

  getHighestPriority(
    visible: VisibleResult,
    views: IRenderableView[],
    scrolledDown: boolean,
    preRenderExtra = false,
    ignoreDetailViews = false
  ): IRenderableView | null {
    const visibleViews = visible.views
    const numVisible = visibleViews.length

    if (numVisible === 0) return null

    // 1. 优先渲染可见页面
    for (let i = 0; i < numVisible; i++) {
      const view = visibleViews[i].view
      if (!this.isViewFinished(view)) return view
    }

    // 2. 检查详细视图
    if (!ignoreDetailViews) {
      for (let i = 0; i < numVisible; i++) {
        const { detailView } = visibleViews[i].view
        if (detailView && !this.isViewFinished(detailView)) return detailView
      }
    }

    const firstId = visible.first?.id || 1
    const lastId = visible.last?.id || 1

    // 3. 处理页面布局中的"空洞"
    if (lastId - firstId + 1 > numVisible) {
      const visibleIds = visible.ids
      for (let i = 1, ii = lastId - firstId; i < ii; i++) {
        const holeId = scrolledDown ? firstId + i : lastId - i
        if (visibleIds.has(holeId)) continue
        const holeView = views[holeId - 1]
        if (holeView && !this.isViewFinished(holeView)) return holeView
      }
    }

    // 4. 预渲染下一个/上一个页面
    let preRenderIndex = scrolledDown ? lastId : firstId - 2
    let preRenderView = views[preRenderIndex]

    if (preRenderView && !this.isViewFinished(preRenderView)) return preRenderView

    if (preRenderExtra) {
      preRenderIndex += scrolledDown ? 1 : -1
      preRenderView = views[preRenderIndex]
      if (preRenderView && !this.isViewFinished(preRenderView)) return preRenderView
    }

    return null
  }

  isViewFinished(view: IRenderableView): boolean {
    return view.renderingState === RenderingStates.FINISHED
  }

  renderView(view: IRenderableView): boolean {
    switch (view.renderingState) {
      case RenderingStates.FINISHED:
        return false

      case RenderingStates.PAUSED:
        this.highestPriorityPage = view.renderingId
        view.resume?.()
        break

      case RenderingStates.RUNNING:
        this.highestPriorityPage = view.renderingId
        break

      case RenderingStates.INITIAL:
        this.highestPriorityPage = view.renderingId
        view.draw()
          .finally(() => this.renderHighestPriority())
          .catch((reason) => {
            if (reason?.name === 'RenderingCancelledException') return
            console.error('renderView:', reason)
          })
        break
    }
    return true
  }
}

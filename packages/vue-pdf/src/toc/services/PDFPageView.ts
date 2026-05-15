/**
 * 页面视图对象（参考 pdf.js PDFPageView）
 */

import * as PDFJS from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy, PageViewport, RenderTask } from 'pdfjs-dist'
import {RenderingState, RenderingStates} from '../utils'
import type { IRenderableView } from './PDFRenderingQueue'
import { SimpleLinkService } from '../../components/services'

export interface PDFPageViewOptions {
  id: number
  scale: number
  defaultSize: { width: number; height: number }
  enableTextLayer?: boolean
  enableAnnotationLayer?: boolean
  getPage: (pageNumber: number) => Promise<PDFPageProxy>
  document: PDFDocumentProxy
  /** 由外部注入的 linkService，annotationLayer 的链接点击会调用它跳转 */
  linkService?: any
  /** div 尺寸变化时通知外部 (oldHeight, newHeight, div)；外部可据此补偿 scrollTop */
  onSizeChanged?: (view: PDFPageView, oldHeight: number, newHeight: number) => void
}

export class PDFPageView implements IRenderableView {
  id: number
  renderingId: string
  renderingState: RenderingState = RenderingStates.INITIAL

  private scale: number
  private enableTextLayer: boolean
  private enableAnnotationLayer: boolean
  private getPageFn: (pageNumber: number) => Promise<PDFPageProxy>
  private document: PDFDocumentProxy
  private linkService: any
  private onSizeChanged?: (v: PDFPageView, oldH: number, newH: number) => void

  div: HTMLDivElement
  private canvasWrapper: HTMLDivElement
  private canvas: HTMLCanvasElement | null = null
  textLayerDiv: HTMLDivElement | null = null
  private annotationLayerDiv: HTMLDivElement | null = null

  private page: PDFPageProxy | null = null
  private renderTask: RenderTask | null = null
  private textLayerTask: PDFJS.TextLayer | null = null

  pageSize: { width: number; height: number }
  private destroyed = false
  /** 每次 draw 调用都会递增。await 之后如 token 变了则放弃 */
  private drawToken = 0

  constructor(opts: PDFPageViewOptions) {
    this.id = opts.id
    this.renderingId = `page${opts.id}`
    this.scale = opts.scale
    this.enableTextLayer = opts.enableTextLayer !== false
    this.enableAnnotationLayer = opts.enableAnnotationLayer !== false
    this.getPageFn = opts.getPage
    this.document = opts.document
    this.linkService = opts.linkService || new SimpleLinkService()
    this.onSizeChanged = opts.onSizeChanged
    this.pageSize = { ...opts.defaultSize }

    this.div = document.createElement('div')
    this.div.className = 'pdf-page-container'
    this.div.dataset.pageNumber = String(this.id)
    this.canvasWrapper = document.createElement('div')
    this.canvasWrapper.className = 'canvas-wrapper'
    this.div.appendChild(this.canvasWrapper)

    this.updateSize()
  }

  setScale(scale: number): void {
    if (this.scale === scale) return
    const prevScale = this.scale
    this.scale = scale
    // 不写 div 的 --page-scale，统一由父容器 --scale-factor 驱动
    // 只对已渲染的 canvas 做 CSS transform 预览（cumulative）
    if (this.canvas && this.renderingState === RenderingStates.FINISHED) {
      const ratio = scale / prevScale
      this.cssScaleRatio *= ratio
      // 数值接近 1 时直接清空，避免长时间挂 transform 建立 GPU 层
      if (Math.abs(this.cssScaleRatio - 1) < 0.001) {
        this.canvas.style.transform = ''
        this.cssScaleRatio = 1
      } else {
        this.canvas.style.transformOrigin = '0 0'
        this.canvas.style.transform = `scale(${this.cssScaleRatio})`
      }
    }
  }

  /** 调度器决定要重绘此页时调用：把 state 回到 INITIAL，清掉 CSS transform 标志 */
  markDirtyForRescale(): void {
    if (this.renderingState === RenderingStates.FINISHED) {
      this.renderingState = RenderingStates.INITIAL
    }
  }

  private cssScaleRatio = 1

  private updateSize(): void {
    const oldH = this.div.clientHeight
    this.div.style.setProperty('--page-width', `${this.pageSize.width}px`)
    this.div.style.setProperty('--page-height', `${this.pageSize.height}px`)
    // 尺寸变化通知外部（补偿 scrollTop 防抖动）
    const newH = Math.floor(this.pageSize.height * this.scale)
    if (oldH !== 0 && oldH !== newH && this.onSizeChanged) {
      this.onSizeChanged(this, oldH, newH)
    }
  }

  private cancelTasks(): void {
    if (this.renderTask) {
      try { this.renderTask.cancel() } catch { /* ignore */ }
      this.renderTask = null
    }
    if (this.textLayerTask) {
      try { this.textLayerTask.cancel() } catch { /* ignore */ }
      this.textLayerTask = null
    }
  }

  async draw(): Promise<void> {
    if (this.destroyed) return
    if (this.renderingState === RenderingStates.FINISHED) return
    if (this.renderingState === RenderingStates.RUNNING) return

    const myToken = ++this.drawToken
    this.renderingState = RenderingStates.RUNNING

    try {
      // 1. 获取 page（实例级缓存）
      if (!this.page) {
        const p = await this.getPageFn(this.id)
        if (this.destroyed || myToken !== this.drawToken) return
        this.page = p
        const defaultViewport = p.getViewport({ scale: 1 })
        this.pageSize = { width: defaultViewport.width, height: defaultViewport.height }
        this.updateSize()
      }

      const viewport = this.page.getViewport({ scale: this.scale })

      // 2. Canvas 离屏渲染
      const canvas = document.createElement('canvas')
      canvas.setAttribute('dir', 'ltr')
      canvas.style.display = 'block'
      const outputScale = window.devicePixelRatio || 1
      canvas.width = Math.floor(viewport.width * outputScale)
      canvas.height = Math.floor(viewport.height * outputScale)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`
      this.canvasWrapper.style.setProperty('--scale-factor', String(viewport.scale))

      const transform =
        outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined

      const task = this.page.render({
        canvas,
        viewport,
        transform,
        intent: 'display',
        annotationMode: PDFJS.AnnotationMode.ENABLE_FORMS
      })
      this.renderTask = task

      try {
        await task.promise
      } catch (e: any) {
        if (e?.name === 'RenderingCancelledException' ||
            this.destroyed ||
            myToken !== this.drawToken) {
          canvas.width = 0
          canvas.height = 0
          if (myToken === this.drawToken && !this.destroyed) {
            this.renderingState = RenderingStates.INITIAL
          }
          return
        }
        throw e
      }
      if (this.destroyed || myToken !== this.drawToken) {
        canvas.width = 0
        canvas.height = 0
        return
      }

      // swap
      const oldCanvas = this.canvas
      if (oldCanvas) {
        oldCanvas.replaceWith(canvas)
        oldCanvas.width = 0
        oldCanvas.height = 0
      } else {
        this.canvasWrapper.prepend(canvas)
      }
      this.canvas = canvas
      // 新 canvas 以正确尺寸渲染，清掉 CSS transform 预览标记
      this.cssScaleRatio = 1
      canvas.style.transform = ''

      // Canvas 完成即视为 FINISHED（用户已看到画面）。
      // TextLayer / AnnotationLayer 异步追加，不阻塞队列切到下一页。
      if (!this.destroyed && myToken === this.drawToken) {
        this.renderingState = RenderingStates.FINISHED
      }

      // 后台异步渲染 text/annotation，不等待
      void this.#renderAuxLayers(myToken, viewport)
    } catch (e: any) {
      if (myToken === this.drawToken && !this.destroyed) {
        this.renderingState = RenderingStates.INITIAL
      }
      const name = e?.name
      if (name !== 'RenderingCancelledException' && name !== 'AbortException') {
        console.error(`[PDFPageView] draw failed p${this.id}:`, e)
      }
    } finally {
      this.renderTask = null
    }
  }

  async #renderAuxLayers(myToken: number, viewport: PageViewport): Promise<void> {
    if (this.destroyed || myToken !== this.drawToken || !this.page) return

    // 3. TextLayer
    if (this.enableTextLayer) {
      if (!this.textLayerDiv) {
        this.textLayerDiv = document.createElement('div')
        this.textLayerDiv.className = 'textLayer'
        this.textLayerDiv.tabIndex = 0
        // pdfjs textLayer span 的 transform 依赖 --scale-factor
        this.textLayerDiv.style.setProperty('--scale-factor', String(viewport.scale))
        this.canvasWrapper.appendChild(this.textLayerDiv)
      } else {
        this.textLayerDiv.replaceChildren()
        this.textLayerDiv.style.setProperty('--scale-factor', String(viewport.scale))
      }
      try {
        const stream = this.page.streamTextContent({
          includeMarkedContent: true,
          disableNormalization: true
        })
        const textLayer = new PDFJS.TextLayer({
          container: this.textLayerDiv,
          textContentSource: stream,
          viewport
        })
        this.textLayerTask = textLayer
        await textLayer.render()
        if (this.destroyed || myToken !== this.drawToken) return
        this.textLayerTask = null
      } catch (e: any) {
        const name = e?.name
        if (name !== 'RenderingCancelledException' && name !== 'AbortException') {
          console.warn(`[PDFPageView] textLayer failed p${this.id}:`, e)
        }
      }
    }

    // 4. AnnotationLayer
    if (this.enableAnnotationLayer) {
      if (!this.annotationLayerDiv) {
        this.annotationLayerDiv = document.createElement('div')
        this.annotationLayerDiv.className = 'annotationLayer'
        this.canvasWrapper.appendChild(this.annotationLayerDiv)
      } else {
        this.annotationLayerDiv.replaceChildren()
      }
      try {
        const annotations = await this.page.getAnnotations({ intent: 'display' })
        if (this.destroyed || myToken !== this.drawToken) return

        const canvasMap = new Map<string, HTMLCanvasElement>()
        const linkService = this.linkService

        const layerParams = {
          accessibilityManager: undefined,
          annotationCanvasMap: canvasMap,
          div: this.annotationLayerDiv,
          page: this.page,
          viewport: viewport.clone({ dontFlip: true }),
          annotationEditorUIManager: null,
          l10n: null,
          annotationStorage: this.document.annotationStorage,
          linkService,
          commentManager: null,
          structTreeLayer: null
        } as any
        const params = {
          annotations,
          viewport: viewport.clone({ dontFlip: true }),
          linkService,
          annotationCanvasMap: canvasMap,
          div: this.annotationLayerDiv,
          annotationStorage: this.document.annotationStorage,
          renderForms: true,
          page: this.page,
          enableScripting: false,
          hasJSActions: false,
          fieldObjects: undefined,
          imageResourcesPath: undefined,
          downloadManager: null as any
        }
        await new PDFJS.AnnotationLayer(layerParams).render(params as any)
      } catch (e: any) {
        const name = e?.name
        if (name !== 'RenderingCancelledException' && name !== 'AbortException') {
          console.warn(`[PDFPageView] annotationLayer failed p${this.id}:`, e)
        }
      }
    }
  }

  /** 取消当前 draw；调用方负责推进队列 */
  cancel(): void {
    this.drawToken++ // 令 in-flight await 后放弃
    this.cancelTasks()
    if (this.renderingState === RenderingStates.RUNNING) {
      this.renderingState = this.canvas ? RenderingStates.FINISHED : RenderingStates.INITIAL
    }
  }

  /** 彻底释放 canvas（LRU 淘汰） */
  reset(): void {
    this.drawToken++
    this.cancelTasks()
    if (this.canvas) {
      this.canvas.width = 0
      this.canvas.height = 0
      this.canvas.remove()
      this.canvas = null
    }
    if (this.textLayerDiv) {
      this.textLayerDiv.remove()
      this.textLayerDiv = null
    }
    if (this.annotationLayerDiv) {
      this.annotationLayerDiv.remove()
      this.annotationLayerDiv = null
    }
    this.renderingState = RenderingStates.INITIAL
  }

  destroy(): void {
    this.destroyed = true
    this.drawToken++
    this.cancelTasks()
    this.reset()
    this.div.remove()
  }
}

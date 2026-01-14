/**
 * PDF.js 风格的链接服务
 * 参考: pdf.js/web/pdf_link_service.js
 */

import type { EventBus } from './EventBus'
import { parseQueryString } from '../utils'

const DEFAULT_LINK_REL = 'noopener noreferrer nofollow'

export const LinkTarget = {
  NONE: 0,
  SELF: 1,
  BLANK: 2,
  PARENT: 3,
  TOP: 4,
} as const

export type LinkTargetType = typeof LinkTarget[keyof typeof LinkTarget]

export interface PDFLinkServiceOptions {
  eventBus: EventBus
  externalLinkTarget?: LinkTargetType | null
  externalLinkRel?: string | null
  ignoreDestinationZoom?: boolean
}

/**
 * PDF 链接服务
 * 执行 PDF 内部的导航功能
 */
export class PDFLinkService {
  eventBus: EventBus
  externalLinkTarget: LinkTargetType | null
  externalLinkRel: string | null
  externalLinkEnabled = true

  baseUrl: string | null = null
  pdfDocument: any = null
  pdfViewer: any = null
  pdfHistory: any = null

  private _ignoreDestinationZoom: boolean

  constructor({
    eventBus,
    externalLinkTarget = null,
    externalLinkRel = null,
    ignoreDestinationZoom = false,
  }: PDFLinkServiceOptions) {
    this.eventBus = eventBus
    this.externalLinkTarget = externalLinkTarget
    this.externalLinkRel = externalLinkRel
    this._ignoreDestinationZoom = ignoreDestinationZoom
  }

  setDocument(pdfDocument: any, baseUrl: string | null = null): void {
    this.baseUrl = baseUrl
    this.pdfDocument = pdfDocument
  }

  setViewer(pdfViewer: any): void {
    this.pdfViewer = pdfViewer
  }

  setHistory(pdfHistory: any): void {
    this.pdfHistory = pdfHistory
  }

  get pagesCount(): number {
    return this.pdfDocument ? this.pdfDocument.numPages : 0
  }

  get page(): number {
    return this.pdfDocument ? this.pdfViewer?.currentPageNumber || 1 : 1
  }

  set page(value: number) {
    if (this.pdfDocument) {
      this.pdfViewer.currentPageNumber = value
    }
  }

  get rotation(): number {
    return this.pdfDocument ? this.pdfViewer?.pagesRotation || 0 : 0
  }

  set rotation(value: number) {
    if (this.pdfDocument) {
      this.pdfViewer.pagesRotation = value
    }
  }

  get isInPresentationMode(): boolean {
    return this.pdfDocument ? this.pdfViewer?.isInPresentationMode || false : false
  }

  async goToDestination(dest: string | any[]): Promise<void> {
    if (!this.pdfDocument) return

    let namedDest: string | null
    let explicitDest: any[]
    let pageNumber: number | undefined

    if (typeof dest === 'string') {
      namedDest = dest
      explicitDest = await this.pdfDocument.getDestination(dest)
    } else {
      namedDest = null
      explicitDest = await dest
    }

    if (!Array.isArray(explicitDest)) {
      console.error(`goToDestination: "${explicitDest}" is not a valid destination array.`)
      return
    }

    const [destRef] = explicitDest

    if (destRef && typeof destRef === 'object') {
      pageNumber = this.pdfDocument.cachedPageNumber?.(destRef)
      if (!pageNumber) {
        try {
          pageNumber = (await this.pdfDocument.getPageIndex(destRef)) + 1
        } catch {
          console.error(`goToDestination: "${destRef}" is not a valid page reference.`)
          return
        }
      }
    } else if (Number.isInteger(destRef)) {
      pageNumber = destRef + 1
    }

    if (!pageNumber || pageNumber < 1 || pageNumber > this.pagesCount) {
      console.error(`goToDestination: "${pageNumber}" is not a valid page number.`)
      return
    }

    if (this.pdfHistory) {
      this.pdfHistory.pushCurrentPosition()
      this.pdfHistory.push({ namedDest, explicitDest, pageNumber })
    }

    this.pdfViewer?.scrollPageIntoView?.({
      pageNumber,
      destArray: explicitDest,
      ignoreDestinationZoom: this._ignoreDestinationZoom,
    })

    this.eventBus.dispatch('pagenumberchange', {
      pageNumber,
      destArray: explicitDest,
      ignoreDestinationZoom: this._ignoreDestinationZoom,
    })
  }

  goToPage(val: number | string): void {
    if (!this.pdfDocument) return

    const pageNumber =
      (typeof val === 'string' && this.pdfViewer?.pageLabelToPageNumber?.(val)) ||
      (typeof val === 'string' ? parseInt(val, 10) : val) | 0

    if (!(Number.isInteger(pageNumber) && pageNumber > 0 && pageNumber <= this.pagesCount)) {
      console.error(`PDFLinkService.goToPage: "${val}" is not a valid page.`)
      return
    }

    if (this.pdfHistory) {
      this.pdfHistory.pushCurrentPosition()
      this.pdfHistory.pushPage(pageNumber)
    }

    this.pdfViewer?.scrollPageIntoView?.({ pageNumber })
    this.eventBus.dispatch('pagenumberchange', { pageNumber })
  }

  goToXY(pageNumber: number, x: number, y: number, options: Record<string, any> = {}): void {
    this.pdfViewer?.scrollPageIntoView?.({
      pageNumber,
      destArray: [null, { name: 'XYZ' }, x, y],
      ignoreDestinationZoom: true,
      ...options,
    })
  }

  addLinkAttributes(link: HTMLAnchorElement, url: string, newWindow = false): void {
    if (!url || typeof url !== 'string') {
      throw new Error('A valid "url" parameter must provided.')
    }

    const target = newWindow ? LinkTarget.BLANK : this.externalLinkTarget
    const rel = this.externalLinkRel

    if (this.externalLinkEnabled) {
      link.href = link.title = url
    } else {
      link.href = ''
      link.title = `Disabled: ${url}`
      link.onclick = () => false
    }

    let targetStr = ''
    switch (target) {
      case LinkTarget.SELF: targetStr = '_self'; break
      case LinkTarget.BLANK: targetStr = '_blank'; break
      case LinkTarget.PARENT: targetStr = '_parent'; break
      case LinkTarget.TOP: targetStr = '_top'; break
    }
    link.target = targetStr
    link.rel = typeof rel === 'string' ? rel : DEFAULT_LINK_REL
  }

  getDestinationHash(dest: string | any[]): string {
    if (typeof dest === 'string' && dest.length > 0) {
      return this.getAnchorUrl('#' + escape(dest))
    }
    if (Array.isArray(dest)) {
      const str = JSON.stringify(dest)
      if (str.length > 0) return this.getAnchorUrl('#' + escape(str))
    }
    return this.getAnchorUrl('')
  }

  getAnchorUrl(anchor: string): string {
    return this.baseUrl ? this.baseUrl + anchor : anchor
  }

  setHash(hash: string): void {
    if (!this.pdfDocument) return

    let pageNumber: number | undefined
    let dest: any[] | undefined

    if (hash.includes('=')) {
      const params = parseQueryString(hash)

      if (params.has('search')) {
        const query = params.get('search')!.replaceAll('"', '')
        const phrase = params.get('phrase') === 'true'
        this.eventBus.dispatch('findfromurlhash', {
          source: this,
          query: phrase ? query : query.match(/\S+/g),
        })
      }

      if (params.has('page')) {
        pageNumber = (parseInt(params.get('page')!, 10) | 0) || 1
      }

      if (params.has('zoom')) {
        const zoomArgs = params.get('zoom')!.split(',')
        const zoomArg = zoomArgs[0]
        const zoomArgNumber = parseFloat(zoomArg)

        if (!zoomArg.includes('Fit')) {
          dest = [
            null, { name: 'XYZ' },
            zoomArgs.length > 1 ? parseInt(zoomArgs[1], 10) | 0 : null,
            zoomArgs.length > 2 ? parseInt(zoomArgs[2], 10) | 0 : null,
            zoomArgNumber ? zoomArgNumber / 100 : zoomArg,
          ]
        } else if (zoomArg === 'Fit' || zoomArg === 'FitB') {
          dest = [null, { name: zoomArg }]
        } else if (['FitH', 'FitBH', 'FitV', 'FitBV'].includes(zoomArg)) {
          dest = [null, { name: zoomArg }, zoomArgs.length > 1 ? parseInt(zoomArgs[1], 10) | 0 : null]
        } else if (zoomArg === 'FitR') {
          if (zoomArgs.length !== 5) {
            console.error('PDFLinkService.setHash: Not enough parameters for "FitR".')
          } else {
            dest = [
              null, { name: zoomArg },
              parseInt(zoomArgs[1], 10) | 0, parseInt(zoomArgs[2], 10) | 0,
              parseInt(zoomArgs[3], 10) | 0, parseInt(zoomArgs[4], 10) | 0,
            ]
          }
        }
      }

      if (dest) {
        this.pdfViewer?.scrollPageIntoView?.({
          pageNumber: pageNumber || this.page,
          destArray: dest,
          allowNegativeOffset: true,
        })
      } else if (pageNumber) {
        this.page = pageNumber
      }

      if (params.has('pagemode')) {
        this.eventBus.dispatch('pagemode', { source: this, mode: params.get('pagemode') })
      }

      if (params.has('nameddest')) {
        this.goToDestination(params.get('nameddest')!)
      }
      return
    }

    let destStr: string | any[] = unescape(hash)
    try {
      destStr = JSON.parse(destStr)
      if (!Array.isArray(destStr)) destStr = destStr.toString()
    } catch { /* keep as string */ }

    if (typeof destStr === 'string' || Array.isArray(destStr)) {
      this.goToDestination(destStr)
      return
    }

    console.error(`PDFLinkService.setHash: "${unescape(hash)}" is not a valid destination.`)
  }

  executeNamedAction(action: string): void {
    if (!this.pdfDocument) return

    switch (action) {
      case 'GoBack': this.pdfHistory?.back(); break
      case 'GoForward': this.pdfHistory?.forward(); break
      case 'NextPage': this.pdfViewer?.nextPage?.(); break
      case 'PrevPage': this.pdfViewer?.previousPage?.(); break
      case 'LastPage': this.page = this.pagesCount; break
      case 'FirstPage': this.page = 1; break
    }

    this.eventBus.dispatch('namedaction', { source: this, action })
  }
}

export class SimpleLinkService extends PDFLinkService {
  setDocument(_pdfDocument: any, _baseUrl: string | null = null): void {}
}

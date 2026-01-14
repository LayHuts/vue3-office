/**
 * 服务导出
 */

export { EventBus, WaitOnType, waitOnEventOrTimeout } from './EventBus'
export type { WaitOnTypeValue } from './EventBus'

export { PDFLinkService, SimpleLinkService, LinkTarget } from './PDFLinkService'
export type { PDFLinkServiceOptions, LinkTargetType } from './PDFLinkService'

export { PDFRenderingQueue } from './PDFRenderingQueue'
export type { IRenderableView, VisibleResult } from './PDFRenderingQueue'

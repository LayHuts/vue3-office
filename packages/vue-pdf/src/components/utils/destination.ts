/**
 * Written by Jason Harwig as part of PDFjs React Outline Viewer
 * Source: https://codesandbox.io/s/rp18w
 */
import type { PDFDocumentProxy, RefProxy } from 'pdfjs-dist/types/src/display/api'
import type { Fit, FitB, FitBH, FitBV, FitH, FitR, FitV, PDFLocation, XYZ } from '../types'

function isRefProxy(obj: unknown): obj is RefProxy {
  return Boolean(typeof obj === 'object' && obj && 'gen' in obj && 'num' in obj)
}

async function getDestinationArray(doc: PDFDocumentProxy,
  dest: string | any[] | null): Promise<any[] | null> {
  return typeof dest === 'string' ? doc.getDestination(dest) : dest
}

// eslint-disable-next-line @typescript-eslint/require-await
async function getDestinationRef(doc: PDFDocumentProxy,
  destArray: any[] | null): Promise<RefProxy | null> {
  if (destArray && isRefProxy(destArray[0]))
    return destArray[0]

  return null
}

const isXYZ = (obj: { type: string; spec: number[] }): obj is XYZ => obj.type === 'XYZ' && obj.spec.length === 3
const isFit = (obj: { type: string; spec: number[] }): obj is Fit => obj.type === 'Fit' && obj.spec.length === 0
const isFitH = (obj: { type: string; spec: number[] }): obj is FitH => obj.type === 'FitH' && obj.spec.length === 1
const isFitV = (obj: { type: string; spec: number[] }): obj is FitV => obj.type === 'FitV' && obj.spec.length === 1
const isFitR = (obj: { type: string; spec: number[] }): obj is FitR => obj.type === 'FitR' && obj.spec.length === 4
const isFitB = (obj: { type: string; spec: number[] }): obj is FitB => obj.type === 'FitB' && obj.spec.length === 0
const isFitBH = (obj: { type: string; spec: number[] }): obj is FitBH => obj.type === 'FitBH' && obj.spec.length === 1
const isFitBV = (obj: { type: string; spec: number[] }): obj is FitBV => obj.type === 'FitBV' && obj.spec.length === 1

function getLocation(type: string, spec: number[]): PDFLocation | null {
  const obj = { type, spec }
  if (isXYZ(obj))
    return obj
  if (isFit(obj))
    return obj
  if (isFitH(obj))
    return obj
  if (isFitV(obj))
    return obj
  if (isFitR(obj))
    return obj
  if (isFitB(obj))
    return obj
  if (isFitBH(obj))
    return obj
  if (isFitBV(obj))
    return obj
  console.warn('no location type found for ', type, spec)

  return null
}

const isSpecLike = (list: any[]): list is number[] => list && list.every(v => !isNaN(v))

/**
 * 解析 destArray 内的精确目标坐标（PDF 用户坐标系，原点在页面左下角）。
 * 返回 { left, bottom } —— PDF 单位，调用方负责换算到 CSS 像素：
 *
 *   const cssTop  = (pageHeight - bottom) * actualScale
 *   const cssLeft = left * actualScale
 *
 * 不带 Y 偏移的 dest 类型（Fit / FitV / FitB / FitBV）会返回 null。
 */
export interface DestOffset {
  left: number | null
  bottom: number | null
}

export function parseDestOffset(destArray: any[] | null | undefined): DestOffset | null {
  if (!Array.isArray(destArray) || destArray.length < 2) return null
  const destType = destArray[1]
  const destName = typeof destType === 'object' ? destType?.name : destType
  switch (destName) {
    case 'XYZ':
      return {
        left: destArray[2] ?? null,
        bottom: destArray[3] ?? null,
      }
    case 'FitH':
    case 'FitBH':
      return { left: null, bottom: destArray[2] ?? null }
    case 'FitR':
      // [left, bottom, right, top] —— 跳到矩形顶部
      return { left: destArray[2] ?? null, bottom: destArray[5] ?? null }
    default:
      // Fit / FitV / FitB / FitBV：没有有意义的 Y 偏移
      return null
  }
}

/**
 * 把 destArray 换算成相对页面顶部的 CSS 像素偏移。
 *   pageHeight  —— PDF 用户坐标里的页面高度（page.view[3] - page.view[1]，多数情况就是 viewBox[3]）
 *   actualScale —— 当前页面 CSS 高度 / pageHeight
 */
export function getDestCssOffsetY(
  destArray: any[] | null | undefined,
  pageHeight: number,
  actualScale: number
): number {
  const off = parseDestOffset(destArray)
  if (!off || off.bottom == null) return 0
  return Math.max(0, (pageHeight - off.bottom) * actualScale)
}

export {
  getDestinationArray,
  getDestinationRef,
  getLocation,
  isSpecLike,
}

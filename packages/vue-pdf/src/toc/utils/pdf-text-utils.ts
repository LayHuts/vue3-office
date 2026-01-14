/**
 * PDF 文本工具函数
 */

import type { TextRectInfo } from '../types'

/**
 * 在矩形区域内查找文本（返回详细信息）
 * @param textItems - PDF 页面的文本项数组
 * @param rect - 矩形区域 [x1, y1, x2, y2]
 * @returns 文本内容和位置信息
 */
export function findTextInRectWithInfo(
  textItems: any[],
  rect: number[]
): TextRectInfo {
  if (!rect || rect.length < 4) {
    return { text: '', x: 0, fontSize: 12 }
  }

  const [x1, y1, x2, y2] = rect

  // 收集在链接区域内的文本
  const textsInRect: { text: string; x: number; y: number; fontSize: number }[] = []

  for (const item of textItems) {
    if (!item.str || !item.transform) continue

    // 文本项的位置（PDF 坐标系，Y 轴从底部向上）
    const tx = item.transform[4]
    const ty = item.transform[5]
    const width = item.width || 0
    const height = item.height || 12
    // 从 transform 矩阵获取字体大小（近似值）
    const fontSize = Math.abs(item.transform[0]) || Math.abs(item.transform[3]) || 12

    // 检查文本是否在链接区域内（允许一定的容差）
    const tolerance = 5
    const textRight = tx + width
    const textTop = ty + height

    // 检查水平方向重叠
    const horizontalOverlap = tx < x2 + tolerance && textRight > x1 - tolerance
    // 检查垂直方向重叠
    const verticalOverlap = ty < y2 + tolerance && textTop > y1 - tolerance

    if (horizontalOverlap && verticalOverlap) {
      textsInRect.push({ text: item.str, x: tx, y: ty, fontSize })
    }
  }

  if (textsInRect.length === 0) {
    return { text: '', x: 0, fontSize: 12 }
  }

  // 按 Y 坐标（从上到下）和 X 坐标排序
  textsInRect.sort((a, b) => {
    if (Math.abs(a.y - b.y) < 5) {
      return a.x - b.x
    }
    return b.y - a.y
  })

  // 返回拼接的文本和第一个文本项的位置信息
  const firstItem = textsInRect[0]
  return {
    text: textsInRect.map(t => t.text).join(''),
    x: firstItem.x,
    fontSize: firstItem.fontSize
  }
}

/**
 * 在矩形区域内查找文本（简化版）
 * @param textItems - PDF 页面的文本项数组
 * @param rect - 矩形区域 [x1, y1, x2, y2]
 * @returns 文本内容
 */
export function findTextInRect(
  textItems: any[],
  rect: number[]
): string {
  return findTextInRectWithInfo(textItems, rect).text
}

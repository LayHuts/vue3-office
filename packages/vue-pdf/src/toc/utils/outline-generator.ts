/**
 * PDF 目录生成器
 * 从 Link Annotations 生成树形目录结构
 */

import type { OutlineItem, FlatOutlineItem } from '../types'
import { findTextInRectWithInfo } from './pdf-text-utils'

/**
 * 从 PDF 的 Link Annotations 生成目录
 * @param doc - PDF 文档对象
 * @param maxPagesToScan - 最大扫描页数，默认 20
 * @returns 树形目录结构
 */
export async function generateOutlineFromAnnotations(
  doc: any,
  maxPagesToScan = 20
): Promise<OutlineItem[]> {
  if (!doc) return []

  const flatItems: FlatOutlineItem[] = []

  try {
    const pagesToScan = Math.min(maxPagesToScan, doc.numPages)

    for (let pageNum = 1; pageNum <= pagesToScan; pageNum++) {
      const page = await doc.getPage(pageNum)
      const annotations = await page.getAnnotations({ intent: 'display' })
      const textContent = await page.getTextContent()

      // 筛选内部链接注释
      const linkAnnotations = annotations.filter(
        (anno: any) => anno.subtype === 'Link' && anno.dest
      )

      if (linkAnnotations.length === 0) continue

      // 获取页面上的文本项
      const textItems = textContent.items as any[]

      // 为每个链接注释找到对应的文本和位置信息
      for (const anno of linkAnnotations) {
        // 获取链接的目标页码
        let targetPage: number | null = null

        if (Array.isArray(anno.dest)) {
          const destRef = anno.dest[0]
          if (typeof destRef === 'object' && destRef !== null) {
            try {
              targetPage = (await doc.getPageIndex(destRef)) + 1
            } catch {
              continue
            }
          } else if (Number.isInteger(destRef)) {
            targetPage = destRef + 1
          }
        } else if (typeof anno.dest === 'string') {
          try {
            const destArray = await doc.getDestination(anno.dest)
            if (destArray && destArray[0]) {
              targetPage = (await doc.getPageIndex(destArray[0])) + 1
            }
          } catch {
            continue
          }
        }

        if (!targetPage || targetPage <= pageNum) continue

        // 找到链接区域内的文本和位置信息
        const linkRect = anno.rect
        const { text: linkText, x: textX, fontSize } = findTextInRectWithInfo(
          textItems,
          linkRect
        )

        if (linkText && linkText.trim()) {
          flatItems.push({
            title: linkText.trim(),
            dest: anno.dest,
            targetPage,
            sourcePage: pageNum,
            x: textX,
            fontSize: fontSize,
            y: linkRect[3],
            items: [],
            bold: false,
            italic: false,
          })
        }
      }
    }

    // 按源页码和 Y 坐标排序（从上到下）
    flatItems.sort((a, b) => {
      if (a.sourcePage !== b.sourcePage) return a.sourcePage - b.sourcePage
      return b.y - a.y
    })

    // 去重
    const uniqueItems: FlatOutlineItem[] = []
    const seen = new Set<string>()
    for (const item of flatItems) {
      const key = `${item.title}-${item.targetPage}`
      if (!seen.has(key)) {
        seen.add(key)
        uniqueItems.push(item)
      }
    }
    console.log(uniqueItems);
    // 构建树形结构
    return buildOutlineTree(uniqueItems)
  } catch (error) {
    console.error('Error generating outline from annotations:', error)
    return []
  }
}

/**
 * 根据多种方式构建树形结构
 * @param items - 扁平化的目录项数组
 * @returns 树形目录结构
 */
export function buildOutlineTree(items: FlatOutlineItem[]): OutlineItem[] {
  if (items.length === 0) return []

  // 方法1：根据 X 坐标（缩进）判断层级
  const xValues = [...new Set(items.map(item => Math.round(item.x / 10) * 10))]
  xValues.sort((a, b) => a - b)

  let useXCoord = xValues.length > 1

  if (useXCoord) {
    console.log('Using X coordinate for levels, unique X values:', xValues)
    const xToLevel = new Map<number, number>()
    xValues.forEach((x, index) => xToLevel.set(x, index))
    for (const item of items) {
      const roundedX = Math.round(item.x / 10) * 10
      item.level = xToLevel.get(roundedX) || 0
    }
  } else {
    // 方法2：用字体大小判断
    const fontSizes = [...new Set(items.map(item => Math.round(item.fontSize)))]
    fontSizes.sort((a, b) => b - a)

    if (fontSizes.length > 1) {
      console.log('Using font size for levels, unique sizes:', fontSizes)
      const sizeToLevel = new Map<number, number>()
      fontSizes.forEach((size, index) => sizeToLevel.set(size, index))
      for (const item of items) {
        const roundedSize = Math.round(item.fontSize)
        item.level = sizeToLevel.get(roundedSize) || 0
      }
    } else {
      // 方法3：根据标题模式判断层级
      console.log('Using title pattern for levels')
      for (const item of items) {
        item.level = getTitleLevel(item.title)
      }
    }
  }

  // 构建树
  const root: OutlineItem[] = []
  const stack: { level: number; node: OutlineItem }[] = []

  for (const item of items) {
    const node: OutlineItem = {
      title: (item.title || '').trim(), // 去除首尾空格
      dest: item.dest,
      items: [],
      bold: item.level === 0,
      italic: false,
    }

    // 找到合适的父节点
    while (stack.length > 0 && stack[stack.length - 1].level >= (item.level || 0)) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(node)
    } else {
      stack[stack.length - 1].node.items?.push(node)
    }

    stack.push({ level: item.level || 0, node })
  }

  console.log('Tree built:', root.length, 'root items', root)

  return root
}

/**
 * 根据标题内容判断层级
 * @param title - 标题文本
 * @returns 层级数字
 */
export function getTitleLevel(title: string): number {
  // 先去除所有空白字符再判断
  const trimmed = title.replace(/\s+/g, '')

  // level 0: 第X部分/篇（最高级别）
  if (/^第[一二三四五六七八九十百千\d]+部分/.test(trimmed)) return 0
  if (/^第[一二三四五六七八九十百千\d]+篇/.test(trimmed)) return 0

  // level 0: 前言、附录等独立章节
  if (/^(前言|序言?|目录|引言|导[言论]|附录|后记|参考文献|索引|致谢)/.test(trimmed)) return 0

  // level 1: 第X章
  if (/^第[一二三四五六七八九十百千\d]+章/.test(trimmed)) return 1

  // level 2: 中文数字+顿号 (一、二、三、...)
  if (/^[一二三四五六七八九十]+、/.test(trimmed)) return 2

  // level 3: 阿拉伯数字+点+非数字 (1. 2. 3. ... 但不是 1.1 这种)
  if (/^\d+[\.、．][^\d]/.test(trimmed)) return 3
  // 单独的阿拉伯数字开头（如 "1采购人"）
  if (/^\d+[^\.、．\d]/.test(trimmed)) return 3

  // level 4: 括号+中文数字 ((一)(二)(三)...)
  if (/^[（\(][一二三四五六七八九十]+[）\)]/.test(trimmed)) return 4

  // level 4: 括号+阿拉伯数字 ((1)(2)(3)...)
  if (/^[（\(]\d+[）\)]/.test(trimmed)) return 4

  // 数字编号格式 (多级数字如 1.1, 1.1.1)
  const numMatch = trimmed.match(/^(\d+)(\.(\d+))?(\.(\d+))?(\.(\d+))?/)
  if (numMatch) {
    if (numMatch[7]) return 6 // X.X.X.X
    if (numMatch[5]) return 5 // X.X.X
    if (numMatch[3]) return 4 // X.X
    // 单个数字已在上面处理
  }

  // level 3: 第X包 (如 "第1包：详细设计服务")
  if (/^第\d+包/.test(trimmed)) return 3

  // 默认 level 2
  return 2
}

/**
 * 转换 PDF 内置 outline 为统一格式
 * 如果 outline 已有层级结构则保留，否则根据标题模式重建层级
 * @param outline - PDF 内置 outline 数组
 * @returns 统一格式的目录树
 */
export function convertPdfOutline(outline: any[]): OutlineItem[] {
  if (!outline || outline.length === 0) return []

  // 检查是否已有层级结构（任意节点有非空 items）
  function hasNestedStructure(nodes: any[]): boolean {
    for (const node of nodes) {
      if (node.items && node.items.length > 0) {
        return true
      }
    }
    return false
  }

  // 如果已有层级结构，直接保留
  if (hasNestedStructure(outline)) {
    function convert(nodes: any[], level: number = 0): OutlineItem[] {
      return nodes.map(node => {
        const cleanTitle = (node.title || '').trim()
        return {
          title: cleanTitle,
          dest: node.dest,
          items: node.items && node.items.length > 0 
            ? convert(node.items, level + 1) 
            : [],
          bold: node.bold || level === 0,
          italic: node.italic || false,
        }
      })
    }
    return convert(outline)
  }

  // 扁平结构，根据标题模式重建层级
  console.log('[convertPdfOutline] Flat outline detected, rebuilding tree by title pattern')
  
  interface FlatNode {
    title: string
    dest: any
    bold: boolean
    italic: boolean
    level: number
  }

  const flatItems: FlatNode[] = outline.map(node => {
    const cleanTitle = (node.title || '').trim()
    return {
      title: cleanTitle,
      dest: node.dest,
      bold: node.bold || false,
      italic: node.italic || false,
      level: getTitleLevel(cleanTitle)
    }
  })

  // 根据 level 构建树
  const root: OutlineItem[] = []
  const stack: { level: number; node: OutlineItem }[] = []

  for (const item of flatItems) {
    const node: OutlineItem = {
      title: item.title,
      dest: item.dest,
      items: [],
      bold: item.bold || item.level === 0,
      italic: item.italic,
    }

    // 找到合适的父节点：弹出所有 level >= 当前 level 的节点
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(node)
    } else {
      stack[stack.length - 1].node.items!.push(node)
    }

    stack.push({ level: item.level, node })
  }

  return root
}

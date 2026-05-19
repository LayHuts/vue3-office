/**
 * PDF 目录结构增强器
 *
 * 思路：当 PDF 内置 outline 缺失下钻条目时（典型场景：作者只把
 *      "8.3" 写进了 outline，但正文里其实还有 "8.3.1"、"8.3.2"），
 *      只在已知节点之间的页码区间里扫描 textContent，按编号 + 行首 +
 *      字号 baseline 找出缺失的子标题，并构造 PDF dest 数组挂回去。
 *
 * 默认 opt-in，由上层显式开启，避免对作者原始 outline 造成意外改动。
 */

import type { OutlineItem } from '../types'

/** 单条扫描出来的候选标题 */
interface FoundHeading {
  page: number
  x: number
  y: number
  fontSize: number
  title: string
  numbering: string
}

/** 给 outline 节点附加的内部元数据（处理完会清掉，不暴露给外部） */
interface AnnotatedItem extends OutlineItem {
  _page: number | null
  _numbering: string | null
  items?: AnnotatedItem[]
}

/** 增强器配置 */
export interface EnhanceOutlineOptions {
  /** 单个节点最多向后扫描的页数，避免恶性长扫描，默认 30 */
  maxScanPagesPerNode?: number
  /** 字号容差：扫描行字号 ≥ baseline - 该值 才算标题，默认 0.5 */
  fontSizeTolerance?: number
  /** 行首 X 容差（PDF 单位），默认 30 */
  leftMarginTolerance?: number
  /** 是否打印调试日志 */
  debug?: boolean
}

const DEFAULT_OPTIONS: Required<EnhanceOutlineOptions> = {
  maxScanPagesPerNode: 30,
  fontSizeTolerance: 0.5,
  leftMarginTolerance: 30,
  debug: false,
}

/**
 * 入口：为目录补全缺失的下级子项
 * @param doc - pdfjs PDFDocumentProxy
 * @param outline - 现有 outline（来自 convertPdfOutline 或 generateOutlineFromAnnotations）
 */
export async function enhanceOutline(
  doc: any,
  outline: OutlineItem[],
  options: EnhanceOutlineOptions = {}
): Promise<OutlineItem[]> {
  if (!doc || !outline || outline.length === 0) return outline

  const opts = { ...DEFAULT_OPTIONS, ...options }

  try {
    // 1. 标注每个节点的 page + numbering
    const annotated = await annotateOutline(doc, outline)

    // 2. 按 DFS 顺序收集所有"带数字编号"的节点
    const numbered: AnnotatedItem[] = []
    walk(annotated, (node) => {
      if (node._numbering && node._page) numbered.push(node)
    })

    if (numbered.length === 0) return outline

    // 3. 给每个没有子项的编号节点尝试补全
    for (let i = 0; i < numbered.length; i++) {
      const cur = numbered[i]
      if (!cur._page || !cur._numbering) continue
      if (cur.items && cur.items.length > 0) continue

      const endPage = findEndPage(cur, numbered, i, doc.numPages, opts.maxScanPagesPerNode)
      if (endPage <= cur._page) continue

      const childPrefix = cur._numbering + '.'
      const childPattern = new RegExp(`^${escapeRegExp(childPrefix)}\\d+(?!\\d)`)

      const found = await scanPagesForHeadings(
        doc,
        cur._page,
        endPage,
        childPattern,
        opts
      )

      if (found.length > 0) {
        const newChildren = await Promise.all(
          found.map(f => buildOutlineItem(doc, f))
        )
        cur.items = newChildren.map(child => ({
          ...child,
          _page: null,
          _numbering: extractNumbering(child.title),
          items: [],
        } as AnnotatedItem))
        if (opts.debug) {
          console.log(
            `[enhanceOutline] +${found.length} children for "${cur.title}" ` +
            `(${cur._page}~${endPage - 1}):`,
            found.map(f => f.title)
          )
        }
      }
    }

    // 4. 清理内部元数据
    return stripAnnotations(annotated)
  } catch (error) {
    console.error('[enhanceOutline] failed:', error)
    return outline
  }
}

// ============================================================================
// 内部实现
// ============================================================================

/** 递归遍历（含被增强出来的子项） */
function walk(items: AnnotatedItem[], fn: (node: AnnotatedItem) => void): void {
  for (const item of items) {
    fn(item)
    if (item.items && item.items.length > 0) {
      walk(item.items as AnnotatedItem[], fn)
    }
  }
}

/** 给整棵 outline 标注页码 + 编号前缀 */
async function annotateOutline(doc: any, outline: OutlineItem[]): Promise<AnnotatedItem[]> {
  async function annotate(items: OutlineItem[]): Promise<AnnotatedItem[]> {
    const result: AnnotatedItem[] = []
    for (const item of items) {
      const page = await resolvePageNumber(doc, item.dest)
      const numbering = extractNumbering(item.title)
      result.push({
        ...item,
        _page: page,
        _numbering: numbering,
        items: item.items ? await annotate(item.items) : [],
      })
    }
    return result
  }
  return annotate(outline)
}

/** 把内部 _page / _numbering 字段去掉，输出干净的 OutlineItem */
function stripAnnotations(items: AnnotatedItem[]): OutlineItem[] {
  return items.map(item => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _page, _numbering, items: children, ...rest } = item
    return {
      ...rest,
      items: children ? stripAnnotations(children) : [],
    }
  })
}

/** 从标题里提取数字编号前缀，如 "8.3.1 配置" -> "8.3.1" */
function extractNumbering(title: string): string | null {
  if (!title) return null
  const trimmed = title.trim()
  // 必须是数字 + 可选的 .数字 序列，且后面接非数字（空格、点+空白、中文等）
  const m = trimmed.match(/^(\d+(?:\.\d+)*)(?=\s|$|[^\d.])/)
  return m ? m[1] : null
}

/** 解析 dest 对应的实际页码（1-based） */
async function resolvePageNumber(doc: any, dest: any): Promise<number | null> {
  try {
    let arr: any[] | null = null
    if (typeof dest === 'string') {
      arr = await doc.getDestination(dest)
    } else if (Array.isArray(dest)) {
      arr = dest
    }
    if (!arr || arr.length === 0) return null

    const ref = arr[0]
    if (ref && typeof ref === 'object' && 'num' in ref) {
      return (await doc.getPageIndex(ref)) + 1
    }
    if (Number.isInteger(ref)) return ref + 1
    return null
  } catch {
    return null
  }
}

/**
 * 找当前节点子项扫描的结束页（不含）
 * 规则：在 numbered 后续节点中，找第一个 numbering 不是当前 prefix 子孙的节点页码。
 */
function findEndPage(
  cur: AnnotatedItem,
  all: AnnotatedItem[],
  index: number,
  totalPages: number,
  maxScanPages: number
): number {
  const childPrefix = (cur._numbering || '') + '.'
  let endPage = totalPages + 1

  for (let j = index + 1; j < all.length; j++) {
    const next = all[j]
    if (!next._page || !next._numbering) continue
    // 是当前节点的子孙：跳过（子孙之间不切分）
    if (next._numbering.startsWith(childPrefix)) continue
    endPage = next._page + 1
    break
  }

  // 限制最大扫描页数
  if (cur._page && endPage - cur._page > maxScanPages) {
    endPage = cur._page + maxScanPages
  }
  return endPage
}

/** 在指定页范围内扫描符合编号模式的标题行 */
async function scanPagesForHeadings(
  doc: any,
  startPage: number,
  endPage: number,
  pattern: RegExp,
  opts: Required<EnhanceOutlineOptions>
): Promise<FoundHeading[]> {
  const results: FoundHeading[] = []

  for (let pageNum = startPage; pageNum < endPage; pageNum++) {
    const page = await doc.getPage(pageNum)
    const textContent = await page.getTextContent()
    const items = (textContent.items as any[]).filter(it => it.str && it.transform)
    if (items.length === 0) continue

    // 计算该页的字号 baseline 和左边距 baseline（取众数）
    const fontSizes = items
      .filter(it => it.str.trim())
      .map(it => Math.abs(it.transform[0]) || Math.abs(it.transform[3]) || 12)
    const xCoords = items
      .filter(it => it.str.trim())
      .map(it => Math.round(it.transform[4] / 5) * 5)
    const baselineFontSize = mode(fontSizes) ?? 12
    const baselineX = mode(xCoords) ?? 0

    // 按行聚合（Y 坐标差小于 2 视为同一行）
    const lines = groupByLine(items)

    for (const line of lines) {
      const text = line.text.trim()
      const match = text.match(pattern)
      if (!match) continue

      const first = line.items[0]
      const x = first.transform[4]
      const y = first.transform[5]
      const fontSize = Math.abs(first.transform[0]) || Math.abs(first.transform[3]) || 12

      // 行首约束：X 不能比左边距 baseline 大太多
      if (x > baselineX + opts.leftMarginTolerance) continue

      // 字号约束：标题字号通常 ≥ 正文 baseline
      if (fontSize < baselineFontSize - opts.fontSizeTolerance) continue

      // 取一个紧凑的标题：去掉行内多余空白
      const title = text.replace(/\s+/g, ' ')

      results.push({
        page: pageNum,
        x,
        y,
        fontSize,
        title,
        numbering: match[0],
      })
    }
  }

  // 同 numbering 多次出现（页眉/正文重复）只保留第一次
  const seen = new Set<string>()
  const unique: FoundHeading[] = []
  for (const r of results) {
    if (seen.has(r.numbering)) continue
    seen.add(r.numbering)
    unique.push(r)
  }

  // 按 numbering 排序，保证 8.3.1, 8.3.2, 8.3.10 顺序合理
  unique.sort((a, b) => compareNumbering(a.numbering, b.numbering))
  return unique
}

/** 把行内的文本项聚成一行 */
interface LineGroup { items: any[]; text: string; y: number }
function groupByLine(items: any[]): LineGroup[] {
  // PDF 坐标 Y 轴向上，先按 Y 降序、再按 X 升序
  const sorted = [...items].sort((a, b) => {
    const dy = b.transform[5] - a.transform[5]
    if (Math.abs(dy) > 2) return dy
    return a.transform[4] - b.transform[4]
  })

  const lines: LineGroup[] = []
  for (const it of sorted) {
    const y = it.transform[5]
    const last = lines[lines.length - 1]
    if (last && Math.abs(last.y - y) <= 2) {
      last.items.push(it)
    } else {
      lines.push({ items: [it], text: '', y })
    }
  }

  // 行内拼接：如果两个 item 之间 X 间距 > 0.3 * fontSize，补一个空格
  for (const line of lines) {
    let text = ''
    for (let i = 0; i < line.items.length; i++) {
      const cur = line.items[i]
      if (i > 0) {
        const prev = line.items[i - 1]
        const prevRight = prev.transform[4] + (prev.width || 0)
        const fs = Math.abs(cur.transform[0]) || 12
        if (cur.transform[4] - prevRight > 0.3 * fs) text += ' '
      }
      text += cur.str
    }
    line.text = text
  }
  return lines
}

/** 用候选标题构造 OutlineItem，dest 用 XYZ 类型 */
async function buildOutlineItem(doc: any, found: FoundHeading): Promise<OutlineItem> {
  // PDF 坐标系：transform[5] 是文本基线（字符底部），向上才是字符主体。
  // XYZ 的 top 期望传"标题顶部"对齐视口顶部，所以这里加 fontSize 抬到字顶。
  // 再多加少量边距（约半行高）避免视觉贴边。
  const topY = found.y + found.fontSize * 1.5
  let dest: any = null
  try {
    const page = await doc.getPage(found.page)
    dest = [page.ref, { name: 'XYZ' }, found.x, topY, null]
  } catch {
    // 拿不到 ref 就退化到 [pageIndex, ...] 形式
    dest = [found.page - 1, { name: 'XYZ' }, found.x, topY, null]
  }
  return {
    title: found.title,
    dest,
    items: [],
    bold: false,
    italic: false,
  }
}

// ============================================================================
// 小工具
// ============================================================================

function mode(values: number[]): number | null {
  if (values.length === 0) return null
  const counts = new Map<number, number>()
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1)
  let best = values[0]
  let bestCount = 0
  for (const [v, c] of counts) {
    if (c > bestCount) { best = v; bestCount = c }
  }
  return best
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 编号比较：按 . 分段当数字比较 */
function compareNumbering(a: string, b: string): number {
  const ap = a.split('.').map(Number)
  const bp = b.split('.').map(Number)
  const n = Math.max(ap.length, bp.length)
  for (let i = 0; i < n; i++) {
    const av = ap[i] ?? -1
    const bv = bp[i] ?? -1
    if (av !== bv) return av - bv
  }
  return 0
}

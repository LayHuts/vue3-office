/**
 * PDF.js 风格的工具函数和常量
 * 参考: pdf.js/web/ui_utils.js
 */

// ============================================================================
// 常量定义
// ============================================================================

/** 默认缩放值字符串 */
export const DEFAULT_SCALE_VALUE = 'auto'

/** 默认缩放比例 */
export const DEFAULT_SCALE = 1.0

/** 缩放步进系数 */
export const DEFAULT_SCALE_DELTA = 1.1

/** 最小缩放比例 */
export const MIN_SCALE = 0.1

/** 最大缩放比例 */
export const MAX_SCALE = 10.0

/** 未知缩放值 */
export const UNKNOWN_SCALE = 0

/** 自动缩放最大值 */
export const MAX_AUTO_SCALE = 1.25

/** 滚动条内边距 */
export const SCROLLBAR_PADDING = 40

/** 垂直内边距 */
export const VERTICAL_PADDING = 5

/** PDF 到 CSS 单位转换系数 (96 DPI / 72 DPI) */
export const PDF_TO_CSS_UNITS = 96 / 72

/** 默认缓存大小 */
export const DEFAULT_CACHE_SIZE = 10

/** 绘制延迟（毫秒） */
export const DRAWING_DELAY = 400

/** 缩放差异阈值 */
export const SCALE_DIFF_THRESHOLD = 0.05

// ============================================================================
// 枚举定义
// ============================================================================

/** 渲染状态 */
export const RenderingStates = {
  INITIAL: 0,
  RUNNING: 1,
  PAUSED: 2,
  FINISHED: 3,
} as const

export type RenderingState = typeof RenderingStates[keyof typeof RenderingStates]

/** 演示模式状态 */
export const PresentationModeState = {
  UNKNOWN: 0,
  NORMAL: 1,
  CHANGING: 2,
  FULLSCREEN: 3,
} as const

/** 侧边栏视图类型 */
export const SidebarView = {
  UNKNOWN: -1,
  NONE: 0,
  THUMBS: 1,    // 默认值
  OUTLINE: 2,
  ATTACHMENTS: 3,
  LAYERS: 4,
} as const

export type SidebarViewType = typeof SidebarView[keyof typeof SidebarView]

/** 文本层模式 */
export const TextLayerMode = {
  DISABLE: 0,
  ENABLE: 1,
  ENABLE_PERMISSIONS: 2,
} as const

/** 滚动模式 */
export const ScrollMode = {
  UNKNOWN: -1,
  VERTICAL: 0,    // 默认值
  HORIZONTAL: 1,
  WRAPPED: 2,
  PAGE: 3,
} as const

export type ScrollModeType = typeof ScrollMode[keyof typeof ScrollMode]

/** 展开模式 */
export const SpreadMode = {
  UNKNOWN: -1,
  NONE: 0,        // 默认值
  ODD: 1,
  EVEN: 2,
} as const

export type SpreadModeType = typeof SpreadMode[keyof typeof SpreadMode]

/** 光标工具 */
export const CursorTool = {
  SELECT: 0,      // 默认值
  HAND: 1,
  ZOOM: 2,
} as const

// ============================================================================
// 接口定义
// ============================================================================

/** 滚动状态 */
export interface ScrollState {
  right: boolean
  down: boolean
  lastX: number
  lastY: number
  _eventHandler: (evt: Event) => void
}

/** 可见元素信息 */
export interface VisibleElement {
  id: number
  x: number
  y: number
  view: any
  percent: number
  widthPercent?: number
  visibleArea?: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  } | null
}

/** 可见元素结果 */
export interface VisibleElementsResult {
  first: VisibleElement | null
  last: VisibleElement | null
  views: VisibleElement[]
  ids: Set<number>
}

/** 视图位置 */
export interface ViewLocation {
  pageNumber: number
  scale: number | string
  top: number
  left: number
  rotation?: number
  pdfOpenParams?: string
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 将元素滚动到父容器的可见区域
 * @param element - 要滚动到可见的元素
 * @param spot - 可选的偏移量 { top, left }
 * @param scrollMatches - 是否为搜索结果滚动
 */
export function scrollIntoView(
  element: HTMLElement,
  spot?: { top?: number; left?: number } | null,
  scrollMatches = false
): void {
  let parent = element.offsetParent as HTMLElement | null
  if (!parent) {
    console.error('offsetParent is not set -- cannot scroll')
    return
  }

  let offsetY = element.offsetTop + element.clientTop
  let offsetX = element.offsetLeft + element.clientLeft

  while (
    (parent.clientHeight === parent.scrollHeight &&
      parent.clientWidth === parent.scrollWidth) ||
    (scrollMatches &&
      (parent.classList.contains('markedContent') ||
        getComputedStyle(parent).overflow === 'hidden'))
  ) {
    offsetY += parent.offsetTop
    offsetX += parent.offsetLeft

    parent = parent.offsetParent as HTMLElement | null
    if (!parent) {
      return // no need to scroll
    }
  }

  if (spot) {
    if (spot.top !== undefined) {
      offsetY += spot.top
    }
    if (spot.left !== undefined) {
      offsetX += spot.left
      parent.scrollLeft = offsetX
    }
  }
  parent.scrollTop = offsetY
}

/**
 * 监听滚动事件，提供防抖和滚动方向信息
 * @param viewAreaElement - 滚动容器元素
 * @param callback - 滚动回调函数
 * @param abortSignal - 可选的中止信号
 */
export function watchScroll(
  viewAreaElement: HTMLElement,
  callback: (state: ScrollState) => void,
  abortSignal?: AbortSignal
): ScrollState {
  let rAF: number | null = null

  const debounceScroll = (evt: Event) => {
    if (rAF) {
      return
    }
    rAF = window.requestAnimationFrame(() => {
      rAF = null

      const currentX = viewAreaElement.scrollLeft
      const lastX = state.lastX
      if (currentX !== lastX) {
        state.right = currentX > lastX
      }
      state.lastX = currentX

      const currentY = viewAreaElement.scrollTop
      const lastY = state.lastY
      if (currentY !== lastY) {
        state.down = currentY > lastY
      }
      state.lastY = currentY

      callback(state)
    })
  }

  const state: ScrollState = {
    right: true,
    down: true,
    lastX: viewAreaElement.scrollLeft,
    lastY: viewAreaElement.scrollTop,
    _eventHandler: debounceScroll,
  }

  viewAreaElement.addEventListener('scroll', debounceScroll, {
    capture: true,
    signal: abortSignal,
  })

  abortSignal?.addEventListener(
    'abort',
    () => {
      if (rAF) {
        window.cancelAnimationFrame(rAF)
      }
    },
    { once: true }
  )

  return state
}

/**
 * 二分查找第一个满足条件的元素索引
 * @param items - 数组
 * @param condition - 条件函数
 * @param start - 起始索引
 */
export function binarySearchFirstItem<T>(
  items: T[],
  condition: (item: T) => boolean,
  start = 0
): number {
  let minIndex = start
  let maxIndex = items.length - 1

  if (maxIndex < 0 || !condition(items[maxIndex])) {
    return items.length
  }
  if (condition(items[minIndex])) {
    return minIndex
  }

  while (minIndex < maxIndex) {
    const currentIndex = (minIndex + maxIndex) >> 1
    const currentItem = items[currentIndex]
    if (condition(currentItem)) {
      maxIndex = currentIndex
    } else {
      minIndex = currentIndex + 1
    }
  }
  return minIndex
}

/**
 * 回溯到所有可见元素之前
 * 用于处理 wrapped scrolling 或 spreads 的情况
 */
function backtrackBeforeAllVisibleElements(
  index: number,
  views: Array<{ div: HTMLElement }>,
  top: number
): number {
  if (index < 2) {
    return index
  }

  let elt = views[index].div
  let pageTop = elt.offsetTop + elt.clientTop

  if (pageTop >= top) {
    elt = views[index - 1].div
    pageTop = elt.offsetTop + elt.clientTop
  }

  for (let i = index - 2; i >= 0; --i) {
    elt = views[i].div
    if (elt.offsetTop + elt.clientTop + elt.clientHeight <= pageTop) {
      break
    }
    index = i
  }
  return index
}

/**
 * 获取可见元素
 * @param params - 参数对象
 */
export function getVisibleElements({
  scrollEl,
  views,
  sortByVisibility = false,
  horizontal = false,
  rtl = false,
}: {
  scrollEl: HTMLElement
  views: Array<{ id: number; div: HTMLElement }>
  sortByVisibility?: boolean
  horizontal?: boolean
  rtl?: boolean
}): VisibleElementsResult {
  const top = scrollEl.scrollTop
  const bottom = top + scrollEl.clientHeight
  const left = scrollEl.scrollLeft
  const right = left + scrollEl.clientWidth

  function isElementBottomAfterViewTop(view: { div: HTMLElement }): boolean {
    const element = view.div
    const elementBottom = element.offsetTop + element.clientTop + element.clientHeight
    return elementBottom > top
  }

  function isElementNextAfterViewHorizontally(view: { div: HTMLElement }): boolean {
    const element = view.div
    const elementLeft = element.offsetLeft + element.clientLeft
    const elementRight = elementLeft + element.clientWidth
    return rtl ? elementLeft < right : elementRight > left
  }

  const visible: VisibleElement[] = []
  const ids = new Set<number>()
  const numViews = views.length

  let firstVisibleElementInd = binarySearchFirstItem(
    views,
    horizontal ? isElementNextAfterViewHorizontally : isElementBottomAfterViewTop
  )

  if (firstVisibleElementInd > 0 && firstVisibleElementInd < numViews && !horizontal) {
    firstVisibleElementInd = backtrackBeforeAllVisibleElements(
      firstVisibleElementInd,
      views,
      top
    )
  }

  let lastEdge = horizontal ? right : -1

  for (let i = firstVisibleElementInd; i < numViews; i++) {
    const view = views[i]
    const element = view.div
    const currentWidth = element.offsetLeft + element.clientLeft
    const currentHeight = element.offsetTop + element.clientTop
    const viewWidth = element.clientWidth
    const viewHeight = element.clientHeight
    const viewRight = currentWidth + viewWidth
    const viewBottom = currentHeight + viewHeight

    if (lastEdge === -1) {
      if (viewBottom >= bottom) {
        lastEdge = viewBottom
      }
    } else if ((horizontal ? currentWidth : currentHeight) > lastEdge) {
      break
    }

    if (
      viewBottom <= top ||
      currentHeight >= bottom ||
      viewRight <= left ||
      currentWidth >= right
    ) {
      continue
    }

    const minY = Math.max(0, top - currentHeight)
    const minX = Math.max(0, left - currentWidth)

    const hiddenHeight = minY + Math.max(0, viewBottom - bottom)
    const hiddenWidth = minX + Math.max(0, viewRight - right)

    const fractionHeight = (viewHeight - hiddenHeight) / viewHeight
    const fractionWidth = (viewWidth - hiddenWidth) / viewWidth
    const percent = (fractionHeight * fractionWidth * 100) | 0

    visible.push({
      id: view.id,
      x: currentWidth,
      y: currentHeight,
      visibleArea:
        percent === 100
          ? null
          : {
              minX,
              minY,
              maxX: Math.min(viewRight, right) - currentWidth,
              maxY: Math.min(viewBottom, bottom) - currentHeight,
            },
      view,
      percent,
      widthPercent: (fractionWidth * 100) | 0,
    })
    ids.add(view.id)
  }

  const first = visible[0] || null
  const last = visible[visible.length - 1] || null

  if (sortByVisibility) {
    visible.sort((a, b) => {
      const pc = a.percent - b.percent
      if (Math.abs(pc) > 0.001) {
        return -pc
      }
      return a.id - b.id
    })
  }

  return { first, last, views: visible, ids }
}

/**
 * 近似分数
 * @param x - 正浮点数
 */
export function approximateFraction(x: number): [number, number] {
  if (Math.floor(x) === x) {
    return [x, 1]
  }
  const xinv = 1 / x
  const limit = 8
  if (xinv > limit) {
    return [1, limit]
  } else if (Math.floor(xinv) === xinv) {
    return [1, xinv]
  }

  const x_ = x > 1 ? xinv : x
  let a = 0, b = 1, c = 1, d = 1

  while (true) {
    const p = a + c
    const q = b + d
    if (q > limit) {
      break
    }
    if (x_ <= p / q) {
      c = p
      d = q
    } else {
      a = p
      b = q
    }
  }

  let result: [number, number]
  if (x_ - a / b < c / d - x_) {
    result = x_ === x ? [a, b] : [b, a]
  } else {
    result = x_ === x ? [c, d] : [d, c]
  }
  return result
}

/**
 * 向下取整到指定除数的倍数
 */
export function floorToDivide(x: number, div: number): number {
  return x - (x % div)
}

/**
 * 标准化滚轮事件方向
 */
export function normalizeWheelEventDirection(evt: WheelEvent): number {
  let delta = Math.hypot(evt.deltaX, evt.deltaY)
  const angle = Math.atan2(evt.deltaY, evt.deltaX)
  if (-0.25 * Math.PI < angle && angle < 0.75 * Math.PI) {
    delta = -delta
  }
  return delta
}

/**
 * 标准化滚轮事件增量
 */
export function normalizeWheelEventDelta(evt: WheelEvent): number {
  const deltaMode = evt.deltaMode
  let delta = normalizeWheelEventDirection(evt)

  const MOUSE_PIXELS_PER_LINE = 30
  const MOUSE_LINES_PER_PAGE = 30

  if (deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
    delta /= MOUSE_PIXELS_PER_LINE * MOUSE_LINES_PER_PAGE
  } else if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
    delta /= MOUSE_LINES_PER_PAGE
  }
  return delta
}

/**
 * 验证旋转角度是否有效
 */
export function isValidRotation(angle: number): boolean {
  return Number.isInteger(angle) && angle % 90 === 0
}

/**
 * 验证滚动模式是否有效
 */
export function isValidScrollMode(mode: number): boolean {
  return (
    Number.isInteger(mode) &&
    Object.values(ScrollMode).includes(mode as ScrollModeType) &&
    mode !== ScrollMode.UNKNOWN
  )
}

/**
 * 验证展开模式是否有效
 */
export function isValidSpreadMode(mode: number): boolean {
  return (
    Number.isInteger(mode) &&
    Object.values(SpreadMode).includes(mode as SpreadModeType) &&
    mode !== SpreadMode.UNKNOWN
  )
}

/**
 * 判断是否为纵向方向
 */
export function isPortraitOrientation(size: { width: number; height: number }): boolean {
  return size.width <= size.height
}

/**
 * 数学限制函数
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * 解析查询字符串
 */
export function parseQueryString(query: string): Map<string, string> {
  const params = new Map<string, string>()
  for (const [key, value] of new URLSearchParams(query)) {
    params.set(key.toLowerCase(), value)
  }
  return params
}

/**
 * 移除空字符
 */
export function removeNullCharacters(str: string, replaceInvisible = false): string {
  const InvisibleCharsRegExp = /[\x00-\x1F]/g
  if (!InvisibleCharsRegExp.test(str)) {
    return str
  }
  if (replaceInvisible) {
    return str.replace(InvisibleCharsRegExp, m => (m === '\x00' ? '' : ' '))
  }
  return str.replace(/\x00/g, '')
}

/**
 * 切换按钮选中状态
 */
export function toggleCheckedBtn(
  button: HTMLElement,
  toggle: boolean,
  view: HTMLElement | null = null
): void {
  button.classList.toggle('toggled', toggle)
  button.setAttribute('aria-checked', String(toggle))
  view?.classList.toggle('hidden', !toggle)
}

/**
 * 切换按钮选择状态
 */
export function toggleSelectedBtn(
  button: HTMLElement,
  toggle: boolean,
  view: HTMLElement | null = null
): void {
  button.classList.toggle('selected', toggle)
  button.setAttribute('aria-selected', String(toggle))
  view?.classList.toggle('hidden', !toggle)
}

/**
 * 切换按钮展开状态
 */
export function toggleExpandedBtn(
  button: HTMLElement,
  toggle: boolean,
  view: HTMLElement | null = null
): void {
  button.classList.toggle('toggled', toggle)
  button.setAttribute('aria-expanded', String(toggle))
  view?.classList.toggle('hidden', !toggle)
}

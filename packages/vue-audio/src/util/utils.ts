import type { LrcLine } from '../components/types'

/**
 * 解析 LRC 歌词格式
 * @see https://github.com/MoePlayer/APlayer/blob/master/src/js/lrc.js#L83
 * @author DIYgod(https://github.com/DIYgod)
 *
 * @param lrcString - LRC 格式字符串，支持以下格式:
 *   [mm:ss]lyric
 *   [mm:ss.xx]lyric
 *   [mm:ss.xxx]lyric
 *   [mm:ss.xx][mm:ss.xx][mm:ss.xx]lyric (多时间标签)
 *   [mm:ss.xx]<mm:ss.xx>lyric
 *
 * @returns 解析后的歌词数组 [[time, text], ...]
 */
export function parseLrc(lrcString: string | undefined | null): LrcLine[] {
  if (!lrcString) {
    return []
  }

  // 处理同一行多个时间标签的情况
  const normalized = lrcString.replace(/([^\]^\n])\[/g, (_, p1) => p1 + '\n[')
  const lines = normalized.split('\n')
  const result: LrcLine[] = []

  for (const line of lines) {
    // 匹配时间标签 [mm:ss] 或 [mm:ss.xx] 或 [mm:ss.xxx]
    const timeMatches = line.match(/\[(\d{2}):(\d{2})(\.(\d{2,3}))?]/g)
    if (!timeMatches) continue

    // 提取歌词文本（移除所有时间标签）
    const text = line
      .replace(/.*\[(\d{2}):(\d{2})(\.(\d{2,3}))?]/g, '')
      .replace(/<(\d{2}):(\d{2})(\.(\d{2,3}))?>/g, '')
      .trim()

    // 处理每个时间标签
    for (const timeTag of timeMatches) {
      const match = /\[(\d{2}):(\d{2})(\.(\d{2,3}))?]/.exec(timeTag)
      if (!match) continue

      const minutes = parseInt(match[1], 10)
      const seconds = parseInt(match[2], 10)
      const milliseconds = match[4]
        ? parseInt(match[4], 10) / (match[4].length === 2 ? 100 : 1000)
        : 0

      const time = minutes * 60 + seconds + milliseconds
      result.push([time, text])
    }
  }

  // 按时间排序
  return result.sort((a, b) => a[0] - b[0])
}

/**
 * 比较两个语义化版本号
 * @returns 1 如果 v1 > v2, -1 如果 v1 < v2, 0 如果相等
 */
export function versionCompare(v1: string, v2: string): number {
  if (v1 === v2) return 0

  const [major1, minor1, patch1] = v1.split('.').map(Number)
  const [major2, minor2, patch2] = v2.split('.').map(Number)

  if (major1 !== major2) return major1 > major2 ? 1 : -1
  if (minor1 !== minor2) return minor1 > minor2 ? 1 : -1
  if (patch1 !== patch2) return patch1 > patch2 ? 1 : -1

  return 0
}

/**
 * 输出警告信息
 */
export function warn(message: string): void {
  console.warn(`[Vue-APlayer] ${message}`)
}

/**
 * 废弃属性警告
 */
export function deprecatedProp(name: string, sinceVersion: string, alternative: string): void {
  warn(`'${name}' is deprecated since v${sinceVersion}, and will be removed in future releases, use '${alternative}' instead`)
}

/**
 * 获取元素相对于视口的左侧位置
 */
export function getElementViewLeft(element: HTMLElement): number {
  if (typeof document === 'undefined') return 0

  let actualLeft = element.offsetLeft
  let current = element.offsetParent as HTMLElement | null

  while (current !== null) {
    actualLeft += current.offsetLeft
    current = current.offsetParent as HTMLElement | null
  }

  const scrollLeft = document.body.scrollLeft + document.documentElement.scrollLeft
  return actualLeft - scrollLeft
}

/**
 * 获取元素相对于视口的顶部位置
 */
export function getElementViewTop(element: HTMLElement): number {
  if (typeof document === 'undefined') return 0

  let actualTop = element.offsetTop
  let current = element.offsetParent as HTMLElement | null

  while (current !== null) {
    actualTop += current.offsetTop
    current = current.offsetParent as HTMLElement | null
  }

  const scrollTop = document.body.scrollTop + document.documentElement.scrollTop
  return actualTop - scrollTop
}

/**
 * 将秒数转换为时间字符串 (mm:ss 或 hh:mm:ss)
 */
export function secondToTime(second: number): string {
  if (isNaN(second)) return '00:00'

  const pad = (num: number): string => num < 10 ? '0' + num : String(num)

  const hours = Math.floor(second / 3600)
  const minutes = Math.floor((second % 3600) / 60)
  const seconds = Math.floor(second % 60)

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${pad(minutes)}:${pad(seconds)}`
}

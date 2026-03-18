
/**
 * 音乐信息接口
 */
export interface Music {
  /** 音频源 URL（必需） */
  src: string
  /** 歌曲标题 */
  title?: string
  /** 艺术家/歌手 */
  artist?: string
  /** 封面图片 URL */
  pic?: string
  /** 歌词（LRC 格式字符串或 .lrc 文件 URL） */
  lrc?: string
  /** 单曲主题色 */
  theme?: string
}

/**
 * 播放统计信息
 */
export interface PlayStat {
  /** 音频总时长（秒） */
  duration: number
  /** 已加载时长（秒） */
  loadedTime: number
  /** 已播放时长（秒） */
  playedTime: number
}

/**
 * 循环模式
 */
export type RepeatMode = 'no-repeat' | 'repeat-one' | 'repeat-all'

/**
 * Fixed 模式位置
 */
export type FixedPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'

/**
 * 播放器 Props
 */
export interface APlayerProps {
  /** 当前播放的音乐（必需） */
  music: Music
  /** 播放列表 */
  list?: Music[]
  /** 迷你模式 */
  mini?: boolean
  /** 显示歌词 */
  showLrc?: boolean
  /** 互斥播放（同时只有一个播放器播放） */
  mutex?: boolean
  /** 主题色 */
  theme?: string
  /** 播放列表最大高度 */
  listMaxHeight?: string
  /** 初始折叠播放列表 */
  listFolded?: boolean
  /** 浮动模式 */
  float?: boolean
  /** 自动播放 */
  autoplay?: boolean
  /** 显示原生控件（仅开发环境） */
  controls?: boolean
  /** 静音 */
  muted?: boolean
  /** 预加载模式 */
  preload?: 'none' | 'metadata' | 'auto'
  /** 音量（0-1） */
  volume?: number
  /** 随机播放 */
  shuffle?: boolean
  /** 循环模式 */
  repeat?: RepeatMode
  /** Fixed 模式（固定在页面边缘） */
  fixed?: boolean
  /** Fixed 模式位置 */
  fixedPosition?: FixedPosition
  /** Fixed 模式下是否显示关闭按钮 */
  fixedClose?: boolean
}

/**
 * 播放器暴露的方法
 */
export interface APlayerExpose {
  /** 播放 */
  play: () => Promise<void> | undefined
  /** 暂停 */
  pause: () => void
  /** 切换播放/暂停 */
  toggle: () => void
}

/**
 * 解析后的歌词行
 */
export type LrcLine = [number, string]

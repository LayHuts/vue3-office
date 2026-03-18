import type {IPlayerOptions as XGPlayerOptions, IError} from 'xgplayer'
import type { IUrl } from "xgplayer/es/player";
import { Events } from 'xgplayer'

type VideoUrl = ArrayBuffer | Blob | IUrl;



type EventName =
  | LiteralEventNames
  | VideoEventNames
  | StatsEventNames

type ValueOf<T> = T[keyof T]

type LiteralEventNames = {
  [K in keyof typeof Events]:
  typeof Events[K] extends string
    ? typeof Events[K]
    : never
}[keyof typeof Events]

type VideoEventNames =
  typeof Events.VIDEO_EVENTS extends readonly (infer E)[]
    ? E
    : never

type StatsEventNames = ValueOf<typeof Events.STATS_EVENTS>

/**
 * 视频事件处理器类型
 * 自动从 xgplayer Events 推导，支持所有事件
 */
type VideoEventHandlers = {
  [K in EventName]?: (...args: any[]) => void
}

type VideoOptions = {
  url: VideoUrl;
  playerOptions?: Partial<Omit<XGPlayerOptions, 'url' | 'id' | 'el'>>;
  events?: VideoEventHandlers;
}

export {
  Events,
  IError,
  VideoUrl,
  VideoOptions,
  XGPlayerOptions,
  VideoEventHandlers
}

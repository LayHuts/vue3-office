/**
 * PDF.js 风格的事件总线
 * 参考: pdf.js/web/event_utils.js
 */

export const WaitOnType = {
  EVENT: 'event',
  TIMEOUT: 'timeout',
} as const

export type WaitOnTypeValue = typeof WaitOnType[keyof typeof WaitOnType]

type EventListener = (data: any) => void

interface ListenerEntry {
  listener: EventListener
  external: boolean
  once: boolean
  rmAbort: (() => void) | null
}

interface WaitOnEventOrTimeoutParams {
  target: EventBus | Window | Document | HTMLElement
  name: string
  delay: number
}

/**
 * 等待事件或超时，以先发生者为准
 */
export async function waitOnEventOrTimeout({
  target,
  name,
  delay = 0,
}: WaitOnEventOrTimeoutParams): Promise<WaitOnTypeValue> {
  if (
    typeof target !== 'object' ||
    !(name && typeof name === 'string') ||
    !(Number.isInteger(delay) && delay >= 0)
  ) {
    throw new Error('waitOnEventOrTimeout - invalid parameters.')
  }

  return new Promise((resolve) => {
    const ac = new AbortController()

    function handler(type: WaitOnTypeValue) {
      ac.abort()
      clearTimeout(timeout)
      resolve(type)
    }

    if (target instanceof EventBus) {
      target._on(name, () => handler(WaitOnType.EVENT), { signal: ac.signal })
    } else {
      target.addEventListener(name, () => handler(WaitOnType.EVENT), {
        signal: ac.signal,
      })
    }

    const timeout = setTimeout(() => handler(WaitOnType.TIMEOUT), delay)
  })
}

/**
 * PDF.js 风格的事件总线
 * 用于应用程序内部的事件通信
 */
export class EventBus {
  #listeners: Record<string, ListenerEntry[]> = Object.create(null)

  /**
   * 注册事件监听器（外部使用）
   */
  on(
    eventName: string,
    listener: EventListener,
    options?: { once?: boolean; signal?: AbortSignal } | null
  ): void {
    this._on(eventName, listener, {
      external: true,
      once: options?.once,
      signal: options?.signal,
    })
  }

  /**
   * 移除事件监听器
   */
  off(eventName: string, listener: EventListener): void {
    this._off(eventName, listener)
  }

  /**
   * 触发事件
   */
  dispatch(eventName: string, data?: any): void {
    const eventListeners = this.#listeners[eventName]
    if (!eventListeners || eventListeners.length === 0) {
      return
    }

    let externalListeners: EventListener[] | null = null

    for (const { listener, external, once } of eventListeners.slice(0)) {
      if (once) {
        this._off(eventName, listener)
      }
      if (external) {
        (externalListeners ||= []).push(listener)
        continue
      }
      listener(data)
    }

    if (externalListeners) {
      for (const listener of externalListeners) {
        listener(data)
      }
    }
  }

  /** @internal */
  _on(
    eventName: string,
    listener: EventListener,
    options?: {
      external?: boolean
      once?: boolean
      signal?: AbortSignal
    } | null
  ): void {
    let rmAbort: (() => void) | null = null

    if (options?.signal instanceof AbortSignal) {
      const { signal } = options
      if (signal.aborted) {
        console.error('Cannot use an `aborted` signal.')
        return
      }
      const onAbort = () => this._off(eventName, listener)
      rmAbort = () => signal.removeEventListener('abort', onAbort)
      signal.addEventListener('abort', onAbort)
    }

    const eventListeners = (this.#listeners[eventName] ||= [])
    eventListeners.push({
      listener,
      external: options?.external === true,
      once: options?.once === true,
      rmAbort,
    })
  }

  /** @internal */
  _off(eventName: string, listener: EventListener): void {
    const eventListeners = this.#listeners[eventName]
    if (!eventListeners) {
      return
    }

    for (let i = 0, ii = eventListeners.length; i < ii; i++) {
      const evt = eventListeners[i]
      if (evt.listener === listener) {
        evt.rmAbort?.()
        eventListeners.splice(i, 1)
        return
      }
    }
  }
}

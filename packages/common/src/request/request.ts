import { RequestOptions } from "../types";

interface ResultError {
  message: string
  status?: number
  code?: string
}

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: ResultError }


/**
 * request<ArrayBuffer>(url, init)
 * @param url 地址
 * @param init 请求配置
 */
const request = async <T>(url: string, init?: RequestOptions): Promise<Result<T>> => {
  const res = await fetch(url, init);
  try{

    if (!res.ok) {
      return {
        ok: false,
        error: {
          message: res.statusText,
          status: res.status
        }
      }
    }

    let data: any
    switch (init?.responseType) {
      case 'arraybuffer':
        data = await res.arrayBuffer()
        break
      case 'blob':
        data = await res.blob()
        break
      default:
        data = await res.json()
    }

    return { ok: true, data }
  } catch (error: any) {
    return {
      ok: false,
      error: {
        message: error?.message ?? 'Network Error'
      }
    }
  }
}

export {
  ResultError,
  Result,
  request
}



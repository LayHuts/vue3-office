import {FileSrc, MimeType} from "../types";
import {getCurrentInstance, onBeforeUnmount} from "vue";

export function useObjectUrl(){

  const urlSet = new Set<string>();

  /**
   * 创建资源 URL
   */
  const createUrl = (src: FileSrc, type?: string): string => {


    if (typeof src === 'string') {
      return src;
    }

    const blob = src instanceof Blob ? src : new Blob([src], { type: type || MimeType.UNKNOWN});

    const url = URL.createObjectURL(blob);
    urlSet.add(url);
    return url;
  }

  const revokeUrl = (url: string): void => {
    URL.revokeObjectURL(url);
    urlSet.delete(url);
  };

  const revokeUrlAll = (): void => {
    urlSet.forEach(url => URL.revokeObjectURL(url));
    urlSet.clear();
  };

  // 只在组件上下文中注册卸载钩子
  if (getCurrentInstance()) {
    // 组件卸载时自动清理
    onBeforeUnmount(revokeUrlAll);
  }

  return { createUrl, revokeUrl, revokeUrlAll };

}

export function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}





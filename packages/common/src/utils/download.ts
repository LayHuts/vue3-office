import {FileSrc, MimeType} from "../types";
import { useObjectUrl } from "./url";

const { createUrl } = useObjectUrl();

/**
 * 下载文件
 */
export function download(filename: string, src: FileSrc, type: MimeType): void {
  let href: string = createUrl(src, type);

  const link = document.createElement('a');
  link.download = filename;
  link.style.display = 'none';
  link.href = href;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

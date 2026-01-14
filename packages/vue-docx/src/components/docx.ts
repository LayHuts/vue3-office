import { renderAsync } from 'docx-preview';
import type { Options } from 'docx-preview';
import {FileSrc, request, Result, MimeType, RequestOptions} from "@vue3-office/common";
import {DocxRenderResult} from "./types";

const defaultOptions: Partial<Options> = {
  ignoreLastRenderedPageBreak: false
};

const useDocx = async (src: FileSrc, container: HTMLElement,
                       requestOptions?: RequestOptions,
                       docxOptions?: Partial<Options>): Promise<DocxRenderResult> => {
  const result: Result<Blob> = await requestFileData(src, requestOptions);
  if (!result.ok) {
    throw new Error(result.error?.message || '文件加载失败')
  }

  const wordDocument = await renderDocx(result.data, container, {...defaultOptions, ...docxOptions});
  return {
    data: result.data,
    wordDocument,
  };
}


const requestFileData = async (src: FileSrc,
                               options?: RequestOptions): Promise<Result<Blob>> => {
  if(typeof src === 'string') {
    return await request<Blob>(src, options);
  } else {
    if (src instanceof ArrayBuffer) {
      src = new Blob([src], {type: MimeType.DOCX});
    }
    const data: Result<Blob> = {ok: true, data: src as Blob};
    return Promise.resolve(data);
  }
}

const renderDocx = async (data: Blob, container: HTMLElement,
                          options: Partial<Options>): Promise<any> => {
  return renderAsync(data, container, container, options);
}

export {
  useDocx,
  renderDocx,
  requestFileData
};

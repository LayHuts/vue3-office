import type { Options as DocxOptions } from "docx-preview";
import {FileSrc, RequestOptions} from '@vue3-office/common'

interface DocxProps {
  url: FileSrc;
  requestOptions?: RequestOptions;
  docxOptions?: Partial<DocxOptions>;
}

interface DocxRenderResult {
  data: Blob;
  wordDocument: any;
}

export {
  DocxOptions,
  DocxProps,
  DocxRenderResult
}

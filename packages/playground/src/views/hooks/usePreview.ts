import { ref, type Ref } from 'vue';

interface UsePreviewOptions {
  defaultUrl?: string;
}

interface UsePreviewReturn {
  type: Ref<'url' | 'upload'>;
  inputUrl: Ref<string>;
  url: Ref<string | ArrayBuffer>;
  xls: Ref<boolean>;
  fileList: Ref<File[]>;
  beforeUpload: (file: File) => false;
}

/**
 * 文件预览 hook
 * @example
 * ```ts
 * const { type, inputSrc, src, xls, beforeUpload } = usePreview({ defaultUrl: 'https://example.com/file.pdf' });
 * ```
 */
export default function usePreview(options: UsePreviewOptions | string = {}): UsePreviewReturn {
  // 兼容旧的字符串参数方式
  const defaultUrl = typeof options === 'string' ? options : (options.defaultUrl ?? '');

  const type = ref<'url' | 'upload'>('url');
  const inputUrl = ref(defaultUrl);
  const url = ref<string | ArrayBuffer>(defaultUrl);
  const xls = ref(defaultUrl.endsWith('.xls'));
  const fileList = ref<File[]>([]);

  function beforeUpload(file: File): false {
    xls.value = file.name.endsWith('.xls');
    const reader = new FileReader();
    reader.onload = (e) => {
      url.value = e.target?.result as ArrayBuffer;
    };
    reader.readAsArrayBuffer(file);
    return false;
  }

  return {
    type,
    inputUrl,
    url,
    xls,
    fileList,
    beforeUpload,
  };
}

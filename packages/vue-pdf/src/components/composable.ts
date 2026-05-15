import * as PDFJS from 'pdfjs-dist'
import PDFWorker from 'pdfjs-dist/build/pdf.worker.min?url'
import { isRef, shallowRef, watch } from 'vue'

import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'
import type { Ref } from 'vue'
import type { OnPasswordCallback, PDFDestination, PDFInfo, PDFOptions, PDFSrc } from './types'
import { getDestinationArray, getDestinationRef, getLocation, isSpecLike } from './utils/destination'
import { addStylesToIframe, createIframe } from './utils/miscellaneous'

// Could not find a way to make this work with vite, importing the worker entry bundle the whole worker to the the final output
// https://erindoyle.dev/using-pdfjs-with-vite/
// PDFJS.GlobalWorkerOptions.workerSrc = PDFWorker
function configWorker(workerSrc: string) {
  PDFJS.GlobalWorkerOptions.workerSrc = workerSrc
}

/**
 * @typedef {Object} UsePDFParameters
 * @property {string} password
 * Document password to unlock content
 * @property {function} onProgress
 * Callback to request a password if a wrong or no password was provided. The callback receives two parameters: a function that should be called with the new password, and a reason (see PasswordResponses).
 * @property {function} onPassword
 * Callback to be able to monitor the loading progress of the PDF file (necessary to implement e.g. a loading bar). The callback receives an OnProgressParameters argument. if this function is used option.password is ignored
 * @property {function} onError
 * Callback to be able to handle errors during loading
 * */

/**
 *
 * @param {string | URL | TypedArray | PDFDataRangeTransport | DocumentInitParameters} src
 * Can be a URL where a PDF file is located, a typed array (Uint8Array) already populated with data, or a parameter object.
 * @param {UsePDFParameters} options
 * UsePDF object parameters
 */
export function usePDF(src: PDFSrc | Ref<PDFSrc>,
  options: PDFOptions = {
    onProgress: undefined,
    onPassword: undefined,
    onError: undefined,
    password: '',
  },
) {
  if (!PDFJS.GlobalWorkerOptions?.workerSrc)
    configWorker(PDFWorker)

  const pdf = shallowRef<PDFDocumentLoadingTask>()
  const pdfDoc = shallowRef<PDFDocumentProxy>()
  const pages = shallowRef(0)
  // const info = shallowRef<PDFInfo | {}>({})
  const info = shallowRef<Partial<PDFInfo>>({})

  function processLoadingTask(source: NonNullable<PDFSrc>) {
    if (pdf.value){
      void pdf.value.destroy();
    }
    if (pdfDoc.value){
      void pdfDoc.value.destroy();
    }

    const loadingTask = PDFJS.getDocument(source)

    // 立即设置 pdf.value，避免后续重复触发 watch
    pdf.value = loadingTask

    if (options.onProgress)
      loadingTask.onProgress = options.onProgress

    if (options.onPassword) {
      loadingTask.onPassword = options.onPassword
    }
    else if (options.password) {
      const onPassword: OnPasswordCallback = (updatePassword, _) => {
        updatePassword(options.password ?? '')
      }
      loadingTask.onPassword = onPassword
    }

    loadingTask.promise.then(
      async (doc) => {
        pdfDoc.value = doc
        // pdf.value 已经在上面设置过了，不需要再设置
        pages.value = doc.numPages

        const metadata = await doc.getMetadata()
        const attachments = (await doc.getAttachments()) as Record<string, unknown>
        const javascript = await doc.getJSActions()
        const outline = await doc.getOutline()

        info.value = {
          metadata,
          attachments,
          javascript,
          outline,
        }
      },
      (error) => {
        // PDF loading error
        if (typeof options.onError === 'function')
          options.onError(error)
      },
    )
  }

  async function getPDFDestination(destination: string | any[] | null): Promise<PDFDestination | null> {
    const document = await pdf.value?.promise
    if (!document)
      return null

    const destArray = await getDestinationArray(document, destination)
    const destRef = await getDestinationRef(document, destArray)
    if (!destRef || !destArray)
      return null

    const pageIndex = await document.getPageIndex(destRef)

    const name = destArray[1].name
    const rest = destArray.slice(2)

    const location = isSpecLike(rest) ? getLocation(name, rest) : null

    return { pageIndex, location: location ?? { type: 'Fit', spec: [] } }
  }

  async function getBytes() {
    if (!pdfDoc.value)
      throw new Error("Current PDFDocumentProxy have not loaded yet");
    try {
      return await pdfDoc.value.saveDocument();
    } catch (error) {
      console.error("Error saving PDF document:", error);
      return await pdfDoc.value.getData();
    }
  }

  async function download(filename = 'filename') {
    const bytes = await getBytes()
    const blobBytes = new Blob([bytes], { type: 'application/pdf' })
    const blobUrl = URL.createObjectURL(blobBytes)

    const anchorDownload = document.createElement('a')
    document.body.appendChild(anchorDownload)
    anchorDownload.href = blobUrl
    anchorDownload.download = filename
    anchorDownload.style.display = 'none'
    anchorDownload.click()

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl)
      document.body.removeChild(anchorDownload)
    }, 10)
  }

  // 打印取消控制器
  let printAbortController: AbortController | null = null

  async function print(dpi = 150, filename = 'filename', onProgress?: (current: number, total: number) => void) {
    if (!pdf.value)
      throw new Error("Current PDFDocumentLoadingTask have not loaded yet");

    const savedDocument = await pdf.value.promise;
    const totalPages = savedDocument.numPages;

    const PRINT_UNITS = dpi / 72
    const CSS_UNITS = 96 / 72

    const iframe = await createIframe()
    const contentWindow = iframe.contentWindow
    contentWindow!.document.title = filename

    // PDF.js 风格：使用单个 scratchCanvas 复用，减少内存分配
    const scratchCanvas = document.createElement('canvas')
    const scratchCtx = scratchCanvas.getContext('2d')!

    // 获取第一页的尺寸来设置打印样式
    const firstPage = await savedDocument.getPage(1)
    const firstViewport = firstPage.getViewport({ scale: 1 })!
    addStylesToIframe(
      contentWindow!,
      (firstViewport.width * PRINT_UNITS) / CSS_UNITS,
      (firstViewport.height * PRINT_UNITS) / CSS_UNITS,
    )

    // PDF.js 风格：逐页渲染，使用 img 代替 canvas 减少内存
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      // 报告进度
      if (onProgress) {
        onProgress(pageNumber, totalPages)
      }

      const pageToPrint = await savedDocument.getPage(pageNumber)
      const viewport = pageToPrint.getViewport({ scale: 1 })!

      // 设置 scratchCanvas 尺寸
      scratchCanvas.width = Math.floor(viewport.width * PRINT_UNITS)
      scratchCanvas.height = Math.floor(viewport.height * PRINT_UNITS)

      // 清空画布并填充白色背景
      scratchCtx.save()
      scratchCtx.fillStyle = 'rgb(255, 255, 255)'
      scratchCtx.fillRect(0, 0, scratchCanvas.width, scratchCanvas.height)
      scratchCtx.restore()

      // 渲染页面
      await pageToPrint.render({
        canvas: scratchCanvas,
        intent: 'print',
        transform: [PRINT_UNITS, 0, 0, PRINT_UNITS, 0, 0],
        viewport,
      }).promise

      // PDF.js 风格：转换为 img blob，减少内存占用
      const img = document.createElement('img')
      const wrapper = document.createElement('div')
      wrapper.className = 'printedPage'
      wrapper.style.pageBreakAfter = 'always'
      wrapper.append(img)
      contentWindow?.document.body.appendChild(wrapper)

      // 使用 toBlob 异步转换，避免阻塞
      await new Promise<void>((resolve, reject) => {
        scratchCanvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            img.onload = () => {
              URL.revokeObjectURL(url)
              resolve()
            }
            img.onerror = () => {
              URL.revokeObjectURL(url)
              reject(new Error(`Failed to load image for page ${pageNumber}`))
            }
            img.src = url
          } else {
            reject(new Error(`Failed to create blob for page ${pageNumber}`))
          }
        }, 'image/png')
      })

      // 清理页面引用，帮助 GC
      pageToPrint.cleanup()
    }

    // 清理 scratchCanvas
    scratchCanvas.width = 0
    scratchCanvas.height = 0

    contentWindow?.focus()
    contentWindow?.print()
    document.body.removeChild(iframe)
  }

  // PDF.js 风格：快速打印 - 使用较低 DPI 和并行渲染
  async function printFast(
    dpi = 100,
    filename = 'filename',
    onProgress?: (current: number, total: number) => void
  ): Promise<{ cancelled: boolean }> {
    if (!pdf.value)
      throw new Error("Current PDFDocumentLoadingTask have not loaded yet");

    // 创建取消控制器
    printAbortController = new AbortController()
    const signal = printAbortController.signal

    const savedDocument = await pdf.value.promise;
    const totalPages = savedDocument.numPages;

    const PRINT_UNITS = dpi / 72
    const CSS_UNITS = 96 / 72

    const iframe = await createIframe()
    const contentWindow = iframe.contentWindow
    contentWindow!.document.title = filename

    // 获取第一页的尺寸来设置打印样式
    const firstPage = await savedDocument.getPage(1)
    const firstViewport = firstPage.getViewport({ scale: 1 })!
    addStylesToIframe(
      contentWindow!,
      (firstViewport.width * PRINT_UNITS) / CSS_UNITS,
      (firstViewport.height * PRINT_UNITS) / CSS_UNITS,
    )

    // 并行渲染：分批处理，每批 4 页
    const BATCH_SIZE = 4
    const batches: number[][] = []
    for (let i = 1; i <= totalPages; i += BATCH_SIZE) {
      const batch: number[] = []
      for (let j = i; j < i + BATCH_SIZE && j <= totalPages; j++) {
        batch.push(j)
      }
      batches.push(batch)
    }

    // 预创建所有 wrapper 占位符
    const wrappers: HTMLDivElement[] = []
    for (let i = 1; i <= totalPages; i++) {
      const wrapper = document.createElement('div')
      wrapper.className = 'printedPage'
      wrapper.style.pageBreakAfter = 'always'
      contentWindow?.document.body.appendChild(wrapper)
      wrappers.push(wrapper)
    }

    let completedPages = 0
    let cancelled = false

    // 渲染单页的函数
    async function renderPage(pageNumber: number): Promise<void> {
      // 检查是否已取消
      if (signal.aborted) {
        throw new Error('Print cancelled')
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      const pageToPrint = await savedDocument.getPage(pageNumber)
      const viewport = pageToPrint.getViewport({ scale: 1 })!

      canvas.width = Math.floor(viewport.width * PRINT_UNITS)
      canvas.height = Math.floor(viewport.height * PRINT_UNITS)

      ctx.fillStyle = 'rgb(255, 255, 255)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      await pageToPrint.render({
        canvas: canvas,
        intent: 'print',
        transform: [PRINT_UNITS, 0, 0, PRINT_UNITS, 0, 0],
        viewport,
      }).promise

      // 检查是否已取消
      if (signal.aborted) {
        canvas.width = 0
        canvas.height = 0
        throw new Error('Print cancelled')
      }

      // 使用 toDataURL 代替 toBlob，避免 blob URL 问题
      const dataUrl = canvas.toDataURL('image/png')

      // 创建 img 并等待加载
      const img = document.createElement('img')
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error(`Failed to load image for page ${pageNumber}`))
        img.src = dataUrl
      })

      // 将 img 添加到对应的 wrapper
      wrappers[pageNumber - 1].appendChild(img)

      // 清理
      canvas.width = 0
      canvas.height = 0
      pageToPrint.cleanup()

      completedPages++
      if (onProgress) {
        onProgress(completedPages, totalPages)
      }
    }

    try {
      // 按批次并行渲染
      for (const batch of batches) {
        // 检查是否已取消
        if (signal.aborted) {
          cancelled = true
          break
        }
        await Promise.all(batch.map(pageNumber => renderPage(pageNumber)))
      }

      if (!cancelled) {
        contentWindow?.focus()
        contentWindow?.print()
      }
    } catch (error: any) {
      if (error.message === 'Print cancelled') {
        cancelled = true
      } else {
        throw error
      }
    } finally {
      document.body.removeChild(iframe)
      printAbortController = null
    }

    return { cancelled }
  }

  // 取消打印
  function cancelPrint() {
    if (printAbortController) {
      printAbortController.abort()
    }
  }

  if (isRef(src)) {
    if (src.value)
      processLoadingTask(src.value)
    watch(src, () => {
      if (src.value)
        processLoadingTask(src.value)
    })
  }
  else {
    if (src)
      processLoadingTask(src)
  }

  return {
    pdf,
    pages,
    info,
    print,
    printFast,
    cancelPrint,
    download,
    getPDFDestination,
  }
}

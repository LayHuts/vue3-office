// ==================== 类型定义 ====================
import {debounce, DebouncedFunc} from "lodash-es";

interface MediaData {
  buffer: {
    buffer: ArrayBuffer;
  };
  extension: string;
}

interface RenderOptions {
  widthOffset?: number;
  heightOffset?: number;
}

interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Range {
  tl?: {
    nativeCol?: number;
    nativeColOff?: number;
    nativeRow?: number;
    nativeRowOff?: number;
  };
  br?: {
    nativeCol?: number;
    nativeColOff?: number;
    nativeRow?: number;
    nativeRowOff?: number;
  };
  ext?: {
    width?: number;
    height?: number;
  };
}

interface Offset {
  scroll?: {
    x?: number;
    y?: number;
  };
}

// ==================== 常量 ====================
const CLIP_WIDTH = 60;  // 左侧序号列宽
const CLIP_HEIGHT = 25; // 顶部序号行高
const DEFAULT_COL_WIDTH = 80;
const DEFAULT_ROW_HEIGHT = 24;
const DEVICE_PIXEL_RATIO = window.devicePixelRatio;

// ==================== 缓存管理 ====================
let imageCache: HTMLImageElement[] = [];

/**
 * 清除图片缓存
 */
function clearImageCache(): void {
  imageCache = [];
}

// ==================== 图片渲染 ====================

/**
 * 计算图片位置
 */
function calcPosition(
  sheet: any,
  range: Range,
  offset: Offset | null,
  options: RenderOptions
): Position {
  const { widthOffset = 0, heightOffset = 0 } = options;
  const { tl, br, ext } = range;
  const {
    nativeCol = 0,
    nativeColOff = 0,
    nativeRow = 0,
    nativeRowOff = 0
  } = tl || {};

  // 计算基础位置
  let basicX = CLIP_WIDTH;
  let basicY = CLIP_HEIGHT;

  for (let i = 0; i < nativeCol; i++) {
    basicX += (sheet?._columns?.[i]?.width * 6 || DEFAULT_COL_WIDTH) + widthOffset;
  }

  for (let i = 0; i < nativeRow; i++) {
    basicY += (sheet?._rows?.[i]?.height || DEFAULT_ROW_HEIGHT) + heightOffset;
  }

  const x = basicX + nativeColOff / 12700;
  const y = basicY + nativeRowOff / 12700;

  // 计算宽度
  const width = calcWidth(sheet, tl, br, ext);

  // 计算高度
  const height = calcHeight(sheet, tl, br, ext);

  return {
    x: (x - (offset?.scroll?.x || 0)) * DEVICE_PIXEL_RATIO,
    y: (y - (offset?.scroll?.y || 0)) * DEVICE_PIXEL_RATIO,
    width: width * DEVICE_PIXEL_RATIO,
    height: height * DEVICE_PIXEL_RATIO
  };
}

/**
 * 计算图片宽度
 */
function calcWidth(sheet: any, tl: Range['tl'], br: Range['br'], ext: Range['ext']): number {
  const { nativeCol = 0, nativeColOff = 0 } = tl || {};
  const {
    nativeCol: nativeColEnd = 0,
    nativeColOff: nativeColOffEnd = 0
  } = br || {};

  if (nativeCol === nativeColEnd && br) {
    return (nativeColOffEnd - nativeColOff) / 12700;
  }

  if (br) {
    let width = (sheet?._columns?.[nativeCol]?.width * 6 || DEFAULT_COL_WIDTH) - nativeColOff / 12700;

    for (let i = nativeCol + 1; i < nativeColEnd; i++) {
      width += sheet?._columns?.[i]?.width * 6 || DEFAULT_COL_WIDTH;
    }

    return width + nativeColOffEnd / 12700;
  }

  if (ext?.width) {
    return ext.width / 1.333333;
  }

  return 0;
}

/**
 * 计算图片高度
 */
function calcHeight(sheet: any, tl: Range['tl'], br: Range['br'], ext: Range['ext']): number {
  const { nativeRow = 0, nativeRowOff = 0 } = tl || {};
  const {
    nativeRow: nativeRowEnd = 0,
    nativeRowOff: nativeRowOffEnd = 0
  } = br || {};

  if (nativeRow === nativeRowEnd && br) {
    return (nativeRowOffEnd - nativeRowOff) / 12700;
  }

  if (br) {
    let height = (sheet?._rows?.[nativeRow]?.height || DEFAULT_ROW_HEIGHT) - nativeRowOff / 12700;

    for (let i = nativeRow + 1; i < nativeRowEnd; i++) {
      height += sheet?._rows?.[i]?.height || DEFAULT_ROW_HEIGHT;
    }

    return height + nativeRowOffEnd / 12700;
  }

  if (ext?.height) {
    return ext.height / 1.333333;
  }

  return 0;
}

/**
 * 绘制图片到 canvas
 */
function drawImage(
  ctx: CanvasRenderingContext2D,
  index: number,
  data: MediaData,
  position: Position
): void {
  getImage(index, data)
    .then(image => {
      let sx = 0;
      let sy = 0;
      let sWidth = image.width;
      let sHeight = image.height;
      let dx = position.x;
      let dy = position.y;
      let dWidth = position.width;
      let dHeight = position.height;

      const scaleX = dWidth / sWidth;
      const scaleY = dHeight / sHeight;

      // 裁剪左侧超出部分
      if (dx < CLIP_WIDTH * DEVICE_PIXEL_RATIO) {
        const diff = CLIP_WIDTH * DEVICE_PIXEL_RATIO - dx;
        dx = CLIP_WIDTH * DEVICE_PIXEL_RATIO;
        dWidth -= diff;
        sWidth -= diff / scaleX;
        sx += diff / scaleX;
      }

      // 裁剪顶部超出部分
      if (dy < CLIP_HEIGHT * DEVICE_PIXEL_RATIO) {
        const diff = CLIP_HEIGHT * DEVICE_PIXEL_RATIO - dy;
        dy = CLIP_HEIGHT * DEVICE_PIXEL_RATIO;
        dHeight -= diff;
        sHeight -= diff / scaleY;
        sy += diff / scaleY;
      }

      const scale = window.outerWidth / window.innerWidth;
      ctx.drawImage(
        image,
        sx, sy, sWidth, sHeight,
        dx * scale, dy * scale, dWidth * scale, dHeight * scale
      );
    })
    .catch(e => {
      console.error('Failed to draw image:', e);
    });
}

/**
 * 获取或加载图片
 */
function getImage(index: number, data: MediaData): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // 使用缓存
    if (imageCache[index]) {
      return resolve(imageCache[index]);
    }

    const { buffer } = data.buffer;
    const blob = new Blob([buffer], { type: `image/${data.extension}` });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.src = url;

    image.onload = () => {
      imageCache[index] = image;
      resolve(image);
    };

    image.onerror = (e) => {
      reject(e);
    };
  });
}


/**
 * 渲染 Excel 中的图片
 */
function renderImage(
  ctx: CanvasRenderingContext2D | null,
  medias: MediaData[],
  sheet: any,
  offset: Offset | null,
  options: RenderOptions = {}
): void {

  if (!ctx || !sheet?._media?.length) return;

  sheet._media.forEach((media: any) => {
    const { imageId, range, type } = media;

    if (type === 'image') {
      const position = calcPosition(sheet, range, offset, options);
      drawImage(ctx, imageId, medias[imageId], position);
    }
  });
}

const renderImageDebounce: DebouncedFunc<typeof renderImage> = debounce(renderImage, 200, { leading: true });

export {
  clearImageCache,
  RenderOptions,
  renderImage,
  renderImageDebounce,
}

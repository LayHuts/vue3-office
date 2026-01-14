import tinycolor from "tinycolor2";
import { INDEXED_COLORS, THEME_COLORS } from "../constant";

type RGB = [number, number, number];

/**
 * Hex 转 RGB
 * @param value 例如 "#409EFF" 或 "409EFF"
 */
function hexToRgb(value: string): RGB {
  const hex = value.replace('#', '');

  if (hex.length !== 6) {
    throw new Error('Invalid hex color');
  }

  const result = hex.match(/../g);
  if (!result) {
    throw new Error('Invalid hex color');
  }

  return [
    parseInt(result[0], 16),
    parseInt(result[1], 16),
    parseInt(result[2], 16)
  ];
}

/**
 * RGB 转 Hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 获取加深颜色
 * @param color Hex 颜色
 * @param level 0 ~ 1
 */
function getDarkColor(color: string, level: number): string {
  const rgb = hexToRgb(color);

  for (let i = 0; i < 3; i++) {
    rgb[i] = Math.floor(rgb[i] * (1 - level));
  }

  return rgbToHex(rgb[0], rgb[1], rgb[2]);
}

/**
 * 获取变浅颜色
 * @param color Hex 颜色
 * @param level 0 ~ 1
 */
function getLightColor(color: string, level: number): string {
  const rgb = hexToRgb(color);

  for (let i = 0; i < 3; i++) {
    rgb[i] = Math.floor((255 - rgb[i]) * level + rgb[i]);
  }

  return rgbToHex(rgb[0], rgb[1], rgb[2]);
}


/**
 * 转换 ARGB 颜色格式为十六进制颜色
 */
function transferArgbColor(originColor: string | object): string {
  if (typeof originColor === 'object') {
    return '#000000';
  }

  // 6位颜色直接返回
  if (/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.test(originColor)) {
    return originColor.startsWith('#') ? originColor : `#${originColor}`;
  }

  // 8位 ARGB 颜色转换
  const trimmed = originColor.trim().toLowerCase();
  try {
    const argb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(trimmed);
    if (!argb) return '#000000';

    const color = {
      a: parseInt(argb[1], 16) / 255,
      r: parseInt(argb[2], 16),
      g: parseInt(argb[3], 16),
      b: parseInt(argb[4], 16)
    };
    return tinycolor(`rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`).toHexString();
  } catch (e) {
    console.warn(e);
    return '#000000';
  }
}

/**
 * 转换 Excel 主题颜色为十六进制颜色
 */
function transferThemeColor(themeIndex: number, tint?: number): string {
  if (themeIndex > 9) return '#C7C9CC';

  const baseColor = THEME_COLORS[themeIndex];
  if (typeof tint === 'undefined') return baseColor;

  return tint > 0
    ? getLightColor(baseColor, tint)
    : getDarkColor(baseColor, Math.abs(tint));
}

/**
 * 解析颜色对象
 */
function parseColor(colorObj: any, defaultColor: string): string {
  if (!colorObj) return defaultColor;

  if (colorObj.argb) {
    return transferArgbColor(colorObj.argb);
  }
  if (colorObj.hasOwnProperty('theme')) {
    return transferThemeColor(colorObj.theme, colorObj.tint);
  }
  if (colorObj.indexed) {
    return INDEXED_COLORS[colorObj.indexed] || defaultColor;
  }
  return defaultColor;
}


export {
  getDarkColor,
  getLightColor,
  parseColor,
}

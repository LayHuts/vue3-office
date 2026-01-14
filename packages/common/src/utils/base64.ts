const BASE64_ENCODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

let hexIn = false;

/**
 * 将 UTF-16 字符串转换为 UTF-8
 */
function utf16to8(str: string | number[]): string | number[] {
  const len = str.length;
  
  if (hexIn) {
    const out: number[] = [];
    for (let i = 0; i < len; i++) {
      const c = (str as number[])[i];
      if (c >= 0x0001 && c <= 0x007F) {
        out.push(c);
      } else if (c > 0x07FF) {
        out.push(0xE0 | ((c >> 12) & 0x0F));
        out.push(0x80 | ((c >> 6) & 0x3F));
        out.push(0x80 | (c & 0x3F));
      } else {
        out.push(0xC0 | ((c >> 6) & 0x1F));
        out.push(0x80 | (c & 0x3F));
      }
    }
    return out;
  }

  let out = '';
  for (let i = 0; i < len; i++) {
    const c = (str as string).charCodeAt(i);
    if (c >= 0x0001 && c <= 0x007F) {
      out += (str as string).charAt(i);
    } else if (c > 0x07FF) {
      out += String.fromCharCode(0xE0 | ((c >> 12) & 0x0F));
      out += String.fromCharCode(0x80 | ((c >> 6) & 0x3F));
      out += String.fromCharCode(0x80 | (c & 0x3F));
    } else {
      out += String.fromCharCode(0xC0 | ((c >> 6) & 0x1F));
      out += String.fromCharCode(0x80 | (c & 0x3F));
    }
  }
  return out;
}

/**
 * Base64 编码
 */
function base64encode(str: string | number[]): string {
  const len = str.length;
  let i = 0;
  let out = '';

  while (i < len) {
    const c1 = (hexIn ? (str as number[])[i++] : (str as string).charCodeAt(i++)) & 0xff;
    
    if (i === len) {
      out += BASE64_ENCODE_CHARS.charAt(c1 >> 2);
      out += BASE64_ENCODE_CHARS.charAt((c1 & 0x3) << 4);
      out += '==';
      break;
    }
    
    const c2 = hexIn ? (str as number[])[i++] : (str as string).charCodeAt(i++);
    
    if (i === len) {
      out += BASE64_ENCODE_CHARS.charAt(c1 >> 2);
      out += BASE64_ENCODE_CHARS.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
      out += BASE64_ENCODE_CHARS.charAt((c2 & 0xF) << 2);
      out += '=';
      break;
    }
    
    const c3 = hexIn ? (str as number[])[i++] : (str as string).charCodeAt(i++);
    out += BASE64_ENCODE_CHARS.charAt(c1 >> 2);
    out += BASE64_ENCODE_CHARS.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
    out += BASE64_ENCODE_CHARS.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6));
    out += BASE64_ENCODE_CHARS.charAt(c3 & 0x3F);
  }
  
  return out;
}

/**
 * 对字符串进行 Base64 编码
 */
export function base64_encode(src: string): string {
  return base64encode(utf16to8(src));
}

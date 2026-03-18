
type RequestResponseType = "arraybuffer" | "blob" | "json";

type FileSrc = string | ArrayBuffer | Blob;

enum MimeType {
  PDF  = 'application/pdf',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  PNG  = 'image/png',
  JPG  = 'image/jpeg',
  ZIP  = 'application/zip',
  MP4 = 'video/mp4',
  UNKNOWN = 'application/octet-stream'
}

interface RequestOptions extends RequestInit{
  responseType?: RequestResponseType;
}

export {
  FileSrc,
  MimeType,
  RequestOptions,
  RequestResponseType,
}

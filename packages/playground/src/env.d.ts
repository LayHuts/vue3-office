declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "@samples/*.pdf" {
  const pdfUrl: string;
  export default pdfUrl;
}

declare module "@samples/*.xlsx" {
  const xlsxUrl: string;
  export default xlsxUrl;
}

declare module "@samples/*.docx" {
  const docxUrl: string;
  export default docxUrl;
}

declare module "@samples/*.mp3" {
  const audioUrl: string;
  export default audioUrl;
}

declare module "@samples/*.mp4" {
  const videoUrl: string;
  export default videoUrl;
}

declare module "@samples/*.jpg" {
  const imageUrl: string;
  export default imageUrl;
}

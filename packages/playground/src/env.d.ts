declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "@samples/*.pdf" {
  const pdfurl: string;
  export default pdfurl;
}

declare module "@samples/*.xlsx" {
  const xlsxUrl: string;
  export default xlsxUrl;
}

declare module "@samples/*.docx" {
  const docxUrl: string;
  export default docxUrl;
}
